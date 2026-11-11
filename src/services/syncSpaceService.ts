import { collection, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Member } from '../context/CalendarContext';

export interface UserProfile {
  uid: string;
  email: string;
  username: string;
  groupIds: string[];
  activeGroupId: string | null;
}

const DEFAULT_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6', '#EF4444'];

/**
 * Generate an alphanumeric invitation code based on the SyncSpace name (e.g. "Maison" -> "MAISON482").
 */
export const generateInviteCodeFromName = (spaceName: string): string => {
  const cleaned = spaceName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-zA-Z0-9]/g, '')    // Keep only letters and numbers
    .toUpperCase();

  const prefix = cleaned.slice(0, 6) || 'SYNC';
  const randomDigits = Math.floor(100 + Math.random() * 900); // 3 random digits (100-999)
  return `${prefix}${randomDigits}`;
};

/**
 * Resolve an input code (either an inviteCode or a direct document ID) to the actual SyncSpace document ID.
 */
export const resolveSyncSpaceIdByCode = async (inputCode: string): Promise<{ groupId: string; exists: boolean }> => {
  const cleanCode = inputCode.trim().toUpperCase();

  // 1. Check if a document has this exact inviteCode field
  const q = query(collection(db, 'families'), where('inviteCode', '==', cleanCode));
  const querySnap = await getDocs(q);
  if (!querySnap.empty) {
    return { groupId: querySnap.docs[0].id, exists: true };
  }

  // 2. Fallback: check if a document exists with this ID directly (backward compatibility)
  const directSnap = await getDoc(doc(db, 'families', cleanCode));
  if (directSnap.exists()) {
    return { groupId: cleanCode, exists: true };
  }

  // 3. Otherwise, it's a brand new SyncSpace
  return { groupId: cleanCode, exists: false };
};

/**
 * Normalize legacy user documents (familyId -> groupIds) and return the profile.
 */
export const getOrMigrateUserProfile = async (uid: string, fallbackEmail = ''): Promise<UserProfile | null> => {
  const userRef = doc(db, 'users', uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) return null;

  const data = snap.data();
  let groupIds: string[] = Array.isArray(data.groupIds) ? data.groupIds : [];

  if (data.familyId && !groupIds.includes(data.familyId)) {
    groupIds.push(data.familyId);
  }
  groupIds = groupIds.filter(Boolean).slice(0, 2);

  const activeGroupId = data.activeGroupId !== undefined
    ? data.activeGroupId
    : (groupIds[0] || null);

  const username = data.username || (data.email ? data.email.split('@')[0] : 'Membre');

  if (!Array.isArray(data.groupIds) || !data.username) {
    await setDoc(userRef, {
      email: data.email || fallbackEmail,
      username,
      groupIds,
      activeGroupId,
    }, { merge: true });
  }

  return {
    uid,
    email: data.email || fallbackEmail,
    username,
    groupIds,
    activeGroupId,
  };
};

/**
 * Ensure the user is registered as a member inside the target SyncSpace document.
 */
export const ensureUserInSyncSpace = async (
  groupId: string,
  uid: string,
  username: string,
  customSpaceName?: string
): Promise<void> => {
  const spaceRef = doc(db, 'families', groupId);
  const snap = await getDoc(spaceRef);

  if (!snap.exists()) {
    const finalName = customSpaceName?.trim() || `SyncSpace ${groupId}`;
    const generatedCode = customSpaceName?.trim()
      ? generateInviteCodeFromName(customSpaceName)
      : groupId.toUpperCase();

    const initialMember: Member = {
      id: uid,
      userId: uid,
      name: username,
      color: DEFAULT_COLORS[0],
    };

    await setDoc(spaceRef, {
      name: finalName,
      inviteCode: generatedCode,
      members: [initialMember],
      theme: 'system',
      appBackgroundColor: '#FF4D4D',
      numberColor: '#333333',
      fabColor: '#0F172A',
    });
    return;
  }

  const data = snap.data();
  const members: Member[] = Array.isArray(data.members) ? [...data.members] : [];
  const existingIndex = members.findIndex(m => m.id === uid || m.userId === uid);

  const updates: Record<string, any> = {};

  if (!data.inviteCode) {
    updates.inviteCode = groupId.toUpperCase();
  }
  if (!data.name) {
    updates.name = customSpaceName?.trim() || `SyncSpace ${groupId}`;
  }

  if (existingIndex === -1) {
    if (members.length === 1 && members[0].id === '1' && members[0].name === 'You') {
      members[0] = { id: uid, userId: uid, name: username, color: DEFAULT_COLORS[0] };
    } else {
      const assignedColor = DEFAULT_COLORS[members.length % DEFAULT_COLORS.length];
      members.push({
        id: uid,
        userId: uid,
        name: username,
        color: assignedColor,
      });
    }
    updates.members = members;
  }

  if (Object.keys(updates).length > 0) {
    await setDoc(spaceRef, updates, { merge: true });
  }
};

/**
 * Join an existing SyncSpace by inviteCode or create a new one (max 2 SyncSpaces per user).
 */
export const joinOrCreateSyncSpace = async (
  uid: string,
  rawGroupCode: string,
  customSpaceName?: string
): Promise<{ success: boolean; error?: string; profile?: UserProfile }> => {
  const cleanInput = rawGroupCode.trim().toUpperCase();
  if (!cleanInput && !customSpaceName?.trim()) {
    return { success: false, error: 'Veuillez entrer un code ou un nom de SyncSpace.' };
  }

  const profile = await getOrMigrateUserProfile(uid);
  if (!profile) {
    return { success: false, error: 'Profil introuvable.' };
  }

  // Resolve invite code or generate a new one from the custom name
  const codeToResolve = cleanInput || generateInviteCodeFromName(customSpaceName!);
  const { groupId } = await resolveSyncSpaceIdByCode(codeToResolve);

  if (profile.groupIds.includes(groupId)) {
    await updateDoc(doc(db, 'users', uid), { activeGroupId: groupId, familyId: groupId });
    return {
      success: true,
      profile: { ...profile, activeGroupId: groupId },
    };
  }

  if (profile.groupIds.length >= 2) {
    return { success: false, error: 'MAX_GROUPS_REACHED' };
  }

  await ensureUserInSyncSpace(groupId, uid, profile.username, customSpaceName);

  const updatedGroups = [...profile.groupIds, groupId];
  const updatedProfile: UserProfile = {
    ...profile,
    groupIds: updatedGroups,
    activeGroupId: groupId,
  };

  await setDoc(doc(db, 'users', uid), {
    groupIds: updatedGroups,
    activeGroupId: groupId,
    familyId: groupId,
  }, { merge: true });

  return { success: true, profile: updatedProfile };
};

/**
 * Leave a SyncSpace and remove the user from its member list.
 */
export const leaveSyncSpace = async (
  uid: string,
  groupIdToLeave: string
): Promise<{ success: boolean; nextActiveGroupId: string | null }> => {
  const profile = await getOrMigrateUserProfile(uid);
  if (!profile) return { success: false, nextActiveGroupId: null };

  const updatedGroups = profile.groupIds.filter(id => id !== groupIdToLeave);
  const nextActiveGroupId = updatedGroups[0] || null;

  await setDoc(doc(db, 'users', uid), {
    groupIds: updatedGroups,
    activeGroupId: nextActiveGroupId,
    familyId: nextActiveGroupId,
  }, { merge: true });

  const spaceRef = doc(db, 'families', groupIdToLeave);
  const snap = await getDoc(spaceRef);
  if (snap.exists()) {
    const data = snap.data();
    const members: Member[] = Array.isArray(data.members) ? data.members : [];
    if (members.length > 1) {
      const filteredMembers = members.filter(m => m.id !== uid && m.userId !== uid);
      await setDoc(spaceRef, { members: filteredMembers }, { merge: true });
    }
  }

  return { success: true, nextActiveGroupId };
};

/**
 * Switch the active SyncSpace for the user.
 */
export const switchActiveSyncSpace = async (uid: string, groupId: string): Promise<void> => {
  await setDoc(doc(db, 'users', uid), {
    activeGroupId: groupId,
    familyId: groupId,
  }, { merge: true });
};

/**
 * Rename a SyncSpace AND regenerate its alphanumeric invitation code automatically.
 */
export const updateSyncSpaceName = async (groupId: string, newName: string): Promise<string> => {
  const trimmed = newName.trim();
  if (!trimmed) return '';

  const newInviteCode = generateInviteCodeFromName(trimmed);
  await setDoc(doc(db, 'families', groupId), {
    name: trimmed,
    inviteCode: newInviteCode,
  }, { merge: true });

  return newInviteCode;
};

/**
 * Update the user's display name in a specific SyncSpace (or all joined SyncSpaces).
 */
export const updateUsernameInSpaces = async (
  uid: string,
  newUsername: string,
  targetGroupIds: string[]
): Promise<void> => {
  const trimmed = newUsername.trim();
  if (!trimmed) return;

  await setDoc(doc(db, 'users', uid), { username: trimmed }, { merge: true });

  for (const gId of targetGroupIds) {
    const spaceRef = doc(db, 'families', gId);
    const snap = await getDoc(spaceRef);
    if (snap.exists()) {
      const data = snap.data();
      const members: Member[] = Array.isArray(data.members) ? data.members : [];
      const updatedMembers = members.map(m =>
        (m.id === uid || m.userId === uid) ? { ...m, name: trimmed } : m
      );
      await setDoc(spaceRef, { members: updatedMembers }, { merge: true });
    }
  }
};

/**
 * Fetch metadata (id + name + inviteCode) for all SyncSpaces a user belongs to.
 */
export const fetchUserSyncSpacesMeta = async (groupIds: string[]): Promise<{ id: string; name: string; inviteCode: string }[]> => {
  const results: { id: string; name: string; inviteCode: string }[] = [];
  for (const gId of groupIds) {
    const snap = await getDoc(doc(db, 'families', gId));
    if (snap.exists()) {
      const data = snap.data();
      results.push({
        id: gId,
        name: data.name || `SyncSpace ${gId}`,
        inviteCode: data.inviteCode || gId,
      });
    } else {
      results.push({ id: gId, name: `SyncSpace ${gId}`, inviteCode: gId });
    }
  }
  return results;
};