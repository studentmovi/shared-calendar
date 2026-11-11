import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Share, Platform, Modal, useColorScheme } from 'react-native';
import { useSharedCalendar } from '../hooks/useSharedCalendar';
import { useTranslation } from '../context/LanguageContext';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { signOut, sendPasswordResetEmail, deleteUser } from 'firebase/auth';
import { doc, deleteDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import Toast from 'react-native-toast-message';
import ColorPicker from 'react-native-wheel-color-picker';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';

export default function SettingsScreen() {
  const { lang, setLang, t } = useTranslation();

  const systemTheme = useColorScheme();
  const {
    familyId, spaceName, inviteCode, userProfile, userSpaces,
    renameCurrentSpace, handleJoinOrCreateSpace, handleLeaveSpace, handleSwitchSpace, handleUpdateUsername,
    members, addMember, updateMember, deleteMember, importDeviceEvents, isImporting, showAlert,
    theme, appBackgroundColor, numberColor, fabColor, updateVisualPreferences
  } = useSharedCalendar();

  const currentTheme = theme === 'system' ? systemTheme : theme;
  const isDark = currentTheme === 'dark';
  const safeFabColor = (!fabColor || fabColor === '#FFFFFF' || fabColor === '#FFF') ? '#3B82F6' : fabColor;

  const appVersion = `V${Constants.expoConfig?.version || '1.3.0'}`;
  const userEmail = auth.currentUser?.email || t('notConnected');

  const [editableSpaceName, setEditableSpaceName] = useState(spaceName || '');
  const [newSpaceCode, setNewSpaceCode] = useState('');
  const [newSpaceCustomName, setNewSpaceCustomName] = useState('');

  const [editableUsername, setEditableUsername] = useState('');
  const [selectedTargetSpace, setSelectedTargetSpace] = useState<string>('ALL');

  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [memberName, setMemberName] = useState('');
  const [tempMemberColor, setTempMemberColor] = useState('#3B82F6');

  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);

  const [visualPicker, setVisualPicker] = useState<{
    visible: boolean;
    target: 'appBackgroundColor' | 'numberColor' | 'fabColor' | 'memberColor' | null;
    currentColor: string;
  }>({ visible: false, target: null, currentColor: '#000000' });

  useEffect(() => {
    setEditableSpaceName(spaceName || '');
  }, [spaceName]);

  useEffect(() => {
    if (userProfile?.username) {
      setEditableUsername(userProfile.username);
    }
  }, [userProfile]);

  const handleSaveMember = () => {
    if (!memberName.trim()) return showAlert(t('error'), 'Veuillez entrer un nom.', 'error');
    if (editingMemberId) updateMember(editingMemberId, memberName, tempMemberColor);
    else addMember(memberName, tempMemberColor);
    resetForm();
  };

  const handleEdit = (m: any) => {
    setEditingMemberId(m.id);
    setMemberName(m.name);
    setTempMemberColor(m.color);
  };

  const handleDelete = () => {
    if (editingMemberId) {
      deleteMember(editingMemberId);
      resetForm();
    }
  };

  const resetForm = () => {
    setEditingMemberId(null);
    setMemberName('');
    setTempMemberColor('#3B82F6');
  };

  const onSaveUsername = async () => {
    if (!editableUsername.trim()) return;
    const targets = selectedTargetSpace === 'ALL'
      ? (userProfile?.groupIds || [])
      : [selectedTargetSpace];
    await handleUpdateUsername(editableUsername, targets);
  };

  const onJoinSpace = async () => {
    if (!newSpaceCode.trim() && !newSpaceCustomName.trim()) return;
    await handleJoinOrCreateSpace(newSpaceCode, newSpaceCustomName);
    setNewSpaceCode('');
    setNewSpaceCustomName('');
  };

  const handleShareInviteCode = async () => {
    const activeCode = inviteCode || familyId;
    if (!activeCode) return;
    const shareMessage = `${t('shareMessage')} ${activeCode}`;
    if (Platform.OS === 'web') {
      await Clipboard.setStringAsync(shareMessage);
      Toast.show({ type: 'success', text1: t('copied'), text2: t('copiedDesc') });
    } else {
      try {
        await Share.share({ message: shareMessage });
      } catch (error) {
        showAlert(t('error'), t('shareError'), 'error');
      }
    }
  };

  const handleResetPassword = async () => {
    try {
      if (auth.currentUser?.email) {
        await sendPasswordResetEmail(auth, auth.currentUser.email);
        Toast.show({ type: 'success', text1: t('success'), text2: t('passwordResetSent') });
      }
    } catch (error) {
      showAlert(t('error'), t('passwordResetError'), 'error');
    }
  };

  const confirmDeleteAccount = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        await deleteDoc(doc(db, 'users', user.uid));
        await deleteUser(user);
      }
    } catch (error: any) {
      if (error.code === 'auth/requires-recent-login') showAlert(t('warning'), t('reloginRequired'), 'warning');
      else showAlert(t('error'), error.message, 'error');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      showAlert(t('error'), t('logoutError'), 'error');
    }
  };

  const saveVisualColor = () => {
    if (visualPicker.target === 'memberColor') setTempMemberColor(visualPicker.currentColor);
    else if (visualPicker.target) updateVisualPreferences({ [visualPicker.target]: visualPicker.currentColor });
    setVisualPicker({ visible: false, target: null, currentColor: '#000' });
  };

  const handleCheckUpdate = async () => {
    try {
      setIsCheckingUpdate(true);
      const update = await Updates.checkForUpdateAsync();

      if (update.isAvailable) {
        Toast.show({ type: 'info', text1: 'Info', text2: t('updateAvailable') });
        await Updates.fetchUpdateAsync();
        Toast.show({ type: 'success', text1: t('success'), text2: t('updateReady') });
        setTimeout(() => { Updates.reloadAsync(); }, 1500);
      } else {
        showAlert('Info', t('upToDateApp'), 'success');
      }
    } catch (error) {
      showAlert('Info', t('upToDateApp'), 'success');
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  return (
    <>
      <ScrollView style={[styles.container, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]} contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.headerTitle, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>{t('settings')}</Text>

        {/* ============================================================
            1. MON COMPTE & PSEUDO
        ============================================================ */}
        <View style={[styles.section, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
          <Text style={[styles.sectionTitle, { color: isDark ? '#E2E8F0' : '#333' }]}>{t('myAccount')}</Text>
          <Text style={[styles.accountText, { color: isDark ? '#94A3B8' : '#64748B' }]}>{t('loggedInAs')}</Text>
          <Text style={[styles.emailText, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>{userEmail}</Text>

          <Text style={[styles.subTitle, { color: isDark ? '#94A3B8' : '#64748B' }]}>{t('usernameLabel')}</Text>
          <TextInput
            style={[styles.input, isDark && styles.inputDark]}
            placeholderTextColor="#94A3B8"
            placeholder={t('usernamePlaceholder')}
            value={editableUsername}
            onChangeText={setEditableUsername}
          />

          {userSpaces && userSpaces.length > 1 && (
            <>
              <Text style={[styles.subTitle, { color: isDark ? '#94A3B8' : '#64748B' }]}>{t('applyUsernameIn')}</Text>
              <View style={styles.rowWrapper}>
                <TouchableOpacity
                  style={[styles.optionBtn, isDark && styles.optionBtnDark, selectedTargetSpace === 'ALL' && styles.optionBtnActive]}
                  onPress={() => setSelectedTargetSpace('ALL')}
                >
                  <Text style={selectedTargetSpace === 'ALL' ? styles.optionTextActive : [styles.optionText, isDark && { color: '#CBD5E1' }]}>
                    {t('allMySpaces')}
                  </Text>
                </TouchableOpacity>
                {userSpaces.map((sp: { id: string; name: string }) => (
                  <TouchableOpacity
                    key={sp.id}
                    style={[styles.optionBtn, isDark && styles.optionBtnDark, selectedTargetSpace === sp.id && styles.optionBtnActive]}
                    onPress={() => setSelectedTargetSpace(sp.id)}
                  >
                    <Text style={selectedTargetSpace === sp.id ? styles.optionTextActive : [styles.optionText, isDark && { color: '#CBD5E1' }]} numberOfLines={1}>
                      {sp.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: safeFabColor, marginBottom: 15 }]} onPress={onSaveUsername}>
            <Text style={styles.actionBtnText}>{t('updateUsername')}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.secondaryBtn, isDark && styles.optionBtnDark]} onPress={handleResetPassword}>
            <Text style={[styles.secondaryBtnText, isDark && { color: '#FFF' }]}>{t('changePassword')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dangerOutlineBtn} onPress={confirmDeleteAccount}>
            <Text style={styles.dangerOutlineText}>{t('deleteAccount')}</Text>
          </TouchableOpacity>
        </View>

        {/* ============================================================
            2. APPARENCE & COULEURS
        ============================================================ */}
        <View style={[styles.section, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
          <Text style={[styles.sectionTitle, { color: isDark ? '#E2E8F0' : '#333' }]}>{t('appearance')}</Text>

          <Text style={[styles.subTitle, { color: isDark ? '#94A3B8' : '#64748B' }]}>{t('theme')}</Text>
          <View style={styles.rowWrapper}>
            <TouchableOpacity style={[styles.optionBtn, isDark && styles.optionBtnDark, theme === 'system' && styles.optionBtnActive]} onPress={() => updateVisualPreferences({ theme: 'system' })}>
              <Text style={theme === 'system' ? styles.optionTextActive : [styles.optionText, isDark && { color: '#CBD5E1' }]}>{t('themeSystem')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.optionBtn, isDark && styles.optionBtnDark, theme === 'light' && styles.optionBtnActive]} onPress={() => updateVisualPreferences({ theme: 'light' })}>
              <Text style={theme === 'light' ? styles.optionTextActive : [styles.optionText, isDark && { color: '#CBD5E1' }]}>{t('themeLight')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.optionBtn, isDark && styles.optionBtnDark, theme === 'dark' && styles.optionBtnActive]} onPress={() => updateVisualPreferences({ theme: 'dark' })}>
              <Text style={theme === 'dark' ? styles.optionTextActive : [styles.optionText, isDark && { color: '#CBD5E1' }]}>{t('themeDark')}</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.visualColorRow, isDark && styles.visualColorRowDark]}>
            <Text style={[styles.visualLabel, { color: isDark ? '#FFFFFF' : '#333' }]}>{t('appBgColor')}</Text>
            <TouchableOpacity style={[styles.colorPreview, { backgroundColor: appBackgroundColor }]} onPress={() => setVisualPicker({ visible: true, target: 'appBackgroundColor', currentColor: appBackgroundColor })} />
          </View>

          <View style={[styles.visualColorRow, isDark && styles.visualColorRowDark]}>
            <Text style={[styles.visualLabel, { color: isDark ? '#FFFFFF' : '#333' }]}>{t('numberColor')}</Text>
            <TouchableOpacity style={[styles.colorPreview, { backgroundColor: numberColor }]} onPress={() => setVisualPicker({ visible: true, target: 'numberColor', currentColor: numberColor })} />
          </View>

          <View style={[styles.visualColorRow, isDark && styles.visualColorRowDark]}>
            <Text style={[styles.visualLabel, { color: isDark ? '#FFFFFF' : '#333' }]}>{t('fabColor')}</Text>
            <TouchableOpacity style={[styles.colorPreview, { backgroundColor: fabColor }]} onPress={() => setVisualPicker({ visible: true, target: 'fabColor', currentColor: fabColor })} />
          </View>
        </View>

        {/* ============================================================
            3. MES SYNCSPACES (GROUPES & CODE DYNAMIQUE)
        ============================================================ */}
        <View style={[styles.section, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
          <Text style={[styles.sectionTitle, { color: isDark ? '#E2E8F0' : '#333' }]}>{t('myFamily')}</Text>

          {userSpaces && userSpaces.length > 0 && (
            <>
              <Text style={[styles.subTitle, { color: isDark ? '#94A3B8' : '#64748B' }]}>{t('switchSpace')}</Text>
              <View style={styles.rowWrapper}>
                {userSpaces.map((sp: { id: string; name: string }) => (
                  <TouchableOpacity
                    key={sp.id}
                    style={[styles.optionBtn, isDark && styles.optionBtnDark, familyId === sp.id && styles.optionBtnActive]}
                    onPress={() => handleSwitchSpace(sp.id)}
                  >
                    <Text style={familyId === sp.id ? styles.optionTextActive : [styles.optionText, isDark && { color: '#CBD5E1' }]} numberOfLines={1}>
                      {sp.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {familyId && (
            <>
              <Text style={[styles.subTitle, { color: isDark ? '#94A3B8' : '#64748B' }]}>{t('spaceNameLabel')}</Text>
              <TextInput
                style={[styles.input, isDark && styles.inputDark]}
                placeholderTextColor="#94A3B8"
                placeholder={t('spaceNamePlaceholder')}
                value={editableSpaceName}
                onChangeText={setEditableSpaceName}
              />
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: safeFabColor, marginBottom: 18 }]} onPress={() => renameCurrentSpace(editableSpaceName)}>
                <Text style={styles.actionBtnText}>{t('renameSpace')}</Text>
              </TouchableOpacity>

              <Text style={[styles.hint, { color: isDark ? '#94A3B8' : '#64748B' }]}>{t('inviteCode')}</Text>
              <View style={[styles.codeContainer, isDark && styles.optionBtnDark]}>
                <Text style={[styles.codeText, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>{inviteCode || familyId}</Text>
                <TouchableOpacity style={styles.shareBtn} onPress={handleShareInviteCode}>
                  <Text style={styles.shareBtnText}>{Platform.OS === 'web' ? t('copy') : t('share')}</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.dangerOutlineBtn} onPress={handleLeaveSpace}>
                <Text style={styles.dangerOutlineText}>{t('leaveSpace')}</Text>
              </TouchableOpacity>
            </>
          )}

          {(!userSpaces || userSpaces.length < 2) && (
            <View style={{ marginTop: 15, paddingTop: 15, borderTopWidth: 1, borderTopColor: isDark ? '#334155' : '#E2E8F0' }}>
              <Text style={[styles.subTitle, { color: isDark ? '#94A3B8' : '#64748B' }]}>{t('joinOrCreateSpace')}</Text>
              <TextInput
                style={[styles.input, isDark && styles.inputDark]}
                placeholderTextColor="#94A3B8"
                placeholder={t('spaceCodePlaceholder')}
                value={newSpaceCode}
                onChangeText={setNewSpaceCode}
                autoCapitalize="characters"
              />
              <TextInput
                style={[styles.input, isDark && styles.inputDark]}
                placeholderTextColor="#94A3B8"
                placeholder={t('spaceNamePlaceholder')}
                value={newSpaceCustomName}
                onChangeText={setNewSpaceCustomName}
              />
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#10B981' }]} onPress={onJoinSpace}>
                <Text style={styles.actionBtnText}>{t('joinOrCreateSpace')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ============================================================
            4. MEMBRES DU SYNCSPACE
        ============================================================ */}
        {familyId && (
          <>
            <View style={[styles.section, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
              <Text style={[styles.sectionTitle, { color: isDark ? '#E2E8F0' : '#333' }]}>{t('groupMembers')}</Text>
              <Text style={[styles.hint, { color: isDark ? '#94A3B8' : '#64748B' }]}>{t('eventsColorHint')}</Text>
              <Text style={[styles.hint, { marginTop: 10, color: isDark ? '#94A3B8' : '#64748B' }]}>{t('tapToEdit')}</Text>
              <View style={styles.membersList}>
                {members.map((m: any) => (
                  <TouchableOpacity key={m.id} onPress={() => handleEdit(m)} style={[styles.memberBadge, { backgroundColor: m.color }]}>
                    <Text style={[styles.memberBadgeText, m.color === '#FFFFFF' ? { color: '#000' } : {}]}>{m.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={[styles.section, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
              <Text style={[styles.sectionTitle, { color: isDark ? '#E2E8F0' : '#333' }]}>{editingMemberId ? t('editMember') : t('addMember')}</Text>
              <TextInput style={[styles.input, isDark && styles.inputDark]} placeholderTextColor="#94A3B8" placeholder={t('memberNamePlaceholder')} value={memberName} onChangeText={setMemberName} />

              <View style={[styles.visualColorRow, isDark && styles.visualColorRowDark]}>
                <Text style={[styles.visualLabel, { color: isDark ? '#FFFFFF' : '#333' }]}>Couleur :</Text>
                <TouchableOpacity style={[styles.colorPreview, { backgroundColor: tempMemberColor }]} onPress={() => setVisualPicker({ visible: true, target: 'memberColor', currentColor: tempMemberColor })} />
              </View>

              <View style={styles.actionRow}>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: safeFabColor }]} onPress={handleSaveMember}>
                  <Text style={styles.actionBtnText}>{editingMemberId ? t('update') : t('addMember')}</Text>
                </TouchableOpacity>
                {editingMemberId && (
                  <>
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#EF4444' }]} onPress={handleDelete}><Text style={styles.actionBtnText}>{t('delete')}</Text></TouchableOpacity>
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#94A3B8' }]} onPress={resetForm}><Text style={styles.actionBtnText}>{t('cancel')}</Text></TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          </>
        )}

        {/* ============================================================
            5. IMPORTATION TÉLÉPHONE, LANGUE & SYSTÈME
        ============================================================ */}
        {Platform.OS !== 'web' && familyId && (
          <View style={[styles.section, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
            <Text style={[styles.sectionTitle, { color: isDark ? '#E2E8F0' : '#333' }]}>{t('importPhone')}</Text>
            <Text style={[styles.hint, { color: isDark ? '#94A3B8' : '#64748B' }]}>{t('assignEventsTo')}</Text>
            <View style={styles.importList}>
              {members.map((m: any) => (
                <TouchableOpacity key={m.id} style={[styles.importBtn, { backgroundColor: m.color }]} onPress={() => importDeviceEvents(m.id)} disabled={isImporting}>
                  {isImporting ? <ActivityIndicator color={(m.color === '#FFFFFF' ? '#000000' : '#FFFFFF') as string} /> : <Text style={[styles.importBtnText, m.color === '#FFFFFF' ? { color: '#000' } : {}]}>{t('importFor')} {m.name}</Text>}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <View style={[styles.section, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
          <Text style={[styles.sectionTitle, { color: isDark ? '#E2E8F0' : '#333' }]}>{t('language')}</Text>
          <View style={styles.rowWrapper}>
            <TouchableOpacity style={[styles.optionBtn, isDark && styles.optionBtnDark, lang === 'fr' && styles.optionBtnActive]} onPress={() => setLang('fr')}><Text style={lang === 'fr' ? styles.optionTextActive : [styles.optionText, isDark && { color: '#CBD5E1' }]}>Français 🇫🇷</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.optionBtn, isDark && styles.optionBtnDark, lang === 'en' && styles.optionBtnActive]} onPress={() => setLang('en')}><Text style={lang === 'en' ? styles.optionTextActive : [styles.optionText, isDark && { color: '#CBD5E1' }]}>English 🇬🇧</Text></TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}><Text style={styles.logoutBtnText}>{t('logout')}</Text></TouchableOpacity>

        <View style={styles.versionContainer}>
          <Text style={[styles.versionText, { color: '#94A3B8' }]}>{appVersion}</Text>
          <TouchableOpacity
            style={[styles.updateBtn, isDark && styles.updateBtnDark]}
            onPress={handleCheckUpdate}
            disabled={isCheckingUpdate}
          >
            {isCheckingUpdate ? (
              <ActivityIndicator color={isDark ? '#FFF' : '#0F172A'} size="small" />
            ) : (
              <>
                <Ionicons name="cloud-download-outline" size={18} color={isDark ? '#FFF' : '#0F172A'} style={{ marginRight: 6 }} />
                <Text style={[styles.updateBtnText, isDark && { color: '#FFF' }]}>{t('checkUpdate')}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

      </ScrollView>

      <Modal visible={visualPicker.visible} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.colorModalContent, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
            <Text style={[styles.modalTitle, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>{t('selectColor')}</Text>
            <View style={styles.fullPickerContainer}>
              <ColorPicker color={visualPicker.currentColor} onColorChangeComplete={(color) => setVisualPicker({ ...visualPicker, currentColor: color })} thumbSize={24} sliderSize={16} noSnap={true} row={false} />
            </View>
            <View style={styles.actionRow}>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#94A3B8' }]} onPress={() => setVisualPicker({ visible: false, target: null, currentColor: '#000' })}><Text style={styles.actionBtnText}>{t('cancel')}</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: safeFabColor }]} onPress={saveVisualColor}><Text style={styles.actionBtnText}>{t('save')}</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollContent: { padding: 20, paddingTop: 60, paddingBottom: 140 },
  headerTitle: { fontSize: 32, fontWeight: 'bold', color: '#0F172A', marginBottom: 30 },
  section: { backgroundColor: '#FFFFFF', padding: 20, borderRadius: 16, marginBottom: 20, elevation: 2 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  subTitle: { fontSize: 14, fontWeight: 'bold', color: '#64748B', marginBottom: 10 },
  hint: { fontSize: 13, color: '#64748B', marginBottom: 15, fontStyle: 'italic' },
  rowWrapper: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  optionBtn: { flex: 1, minWidth: 100, padding: 12, backgroundColor: '#F1F5F9', borderRadius: 10, alignItems: 'center' },
  optionBtnDark: { backgroundColor: '#0F172A' },
  optionBtnActive: { backgroundColor: '#3B82F6' },
  optionText: { color: '#64748B', fontWeight: 'bold' },
  optionTextActive: { color: '#FFF', fontWeight: 'bold' },
  visualColorRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 12, borderRadius: 10, marginBottom: 10 },
  visualColorRowDark: { backgroundColor: '#0F172A' },
  visualLabel: { fontSize: 15, fontWeight: '600', color: '#333' },
  colorPreview: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: '#E2E8F0', elevation: 2 },
  accountText: { fontSize: 14, color: '#64748B' },
  emailText: { fontSize: 16, fontWeight: 'bold', color: '#0F172A', marginBottom: 15 },
  codeContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', borderRadius: 10, padding: 10, marginBottom: 15 },
  codeText: { flex: 1, fontSize: 20, fontWeight: 'bold', color: '#0F172A', letterSpacing: 2, textAlign: 'center' },
  shareBtn: { backgroundColor: '#3B82F6', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 8 },
  shareBtnText: { color: '#FFF', fontWeight: 'bold' },
  secondaryBtn: { backgroundColor: '#F1F5F9', padding: 15, borderRadius: 10, alignItems: 'center', marginBottom: 10 },
  secondaryBtnText: { color: '#333', fontWeight: 'bold' },
  dangerOutlineBtn: { borderWidth: 1, borderColor: '#EF4444', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 5, borderStyle: 'dashed' },
  dangerOutlineText: { color: '#EF4444', fontWeight: 'bold' },
  membersList: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  memberBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  memberBadgeText: { fontWeight: 'bold', color: '#FFF' },
  input: { backgroundColor: '#F1F5F9', color: '#0F172A', padding: 14, borderRadius: 10, marginBottom: 15, borderWidth: 1, borderColor: '#E2E8F0' },
  inputDark: { backgroundColor: '#0F172A', color: '#FFFFFF', borderColor: '#334155' },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 5 },
  actionBtn: { flex: 1, padding: 14, borderRadius: 10, alignItems: 'center' },
  actionBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },
  importList: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  importBtn: { paddingHorizontal: 15, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', minWidth: 100, alignItems: 'center', justifyContent: 'center' },
  importBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },
  logoutBtn: { backgroundColor: '#EF4444', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 20, marginHorizontal: 20 },
  logoutBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  versionContainer: { alignItems: 'center', paddingVertical: 25 },
  versionText: { fontSize: 14, fontWeight: 'bold', letterSpacing: 1 },
  updateBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 20, marginTop: 15, elevation: 1 },
  updateBtnDark: { backgroundColor: '#1E293B' },
  updateBtnText: { color: '#0F172A', fontWeight: 'bold', fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  colorModalContent: { backgroundColor: '#FFFFFF', width: '100%', borderRadius: 24, padding: 25, elevation: 10 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#0F172A', textAlign: 'center', marginBottom: 20 },
  fullPickerContainer: { width: '100%', height: 300, marginBottom: 20 }
});