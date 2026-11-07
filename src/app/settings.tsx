import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Share, Modal } from 'react-native';
import { useSharedCalendar } from '../hooks/useSharedCalendar';
import Constants from 'expo-constants';
import { signOut, sendPasswordResetEmail, deleteUser } from 'firebase/auth';
import { doc, getDoc, deleteDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase'; 
import Toast from 'react-native-toast-message';
import ColorPicker from 'react-native-wheel-color-picker';
import { Ionicons } from '@expo/vector-icons';

const APP_COLORS = ['#FF4D4D', '#F97316', '#10B981', '#3B82F6', '#8B5CF6', '#1E293B'];
const MEMBER_COLORS = ['#FFFFFF', '#FBCFE8', '#FDE047', '#67E8F9', '#FDBA74', '#D9F99D', '#E9D5FF'];

export default function SettingsScreen() {
  const { appBackgroundColor, setAppBackgroundColor, members, addMember, updateMember, deleteMember, importDeviceEvents, isImporting } = useSharedCalendar();
  const appVersion = `V${Constants.expoConfig?.version || '1.3.0'}`;

  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [memberName, setMemberName] = useState('');
  const [memberColor, setMemberColor] = useState(MEMBER_COLORS[0]);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const [isDeleteModalVisible, setDeleteModalVisible] = useState(false);
  const [familyCode, setFamilyCode] = useState<string>('Chargement...');
  const userEmail = auth.currentUser?.email || 'Non connecté';

  useEffect(() => {
    const fetchFamilyCode = async () => {
      if (auth.currentUser) {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userDoc.exists()) {
          setFamilyCode(userDoc.data().familyId);
        }
      }
    };
    fetchFamilyCode();
  }, []);

  const handleSaveMember = () => {
    if (editingMemberId) updateMember(editingMemberId, memberName, memberColor);
    else addMember(memberName, memberColor);
    resetForm();
  };

  const handleEdit = (m: any) => {
    setEditingMemberId(m.id); setMemberName(m.name); setMemberColor(m.color);
  };

  const handleDelete = () => {
    if (editingMemberId) { deleteMember(editingMemberId); resetForm(); }
  };

  const resetForm = () => {
    setEditingMemberId(null); setMemberName(''); setMemberColor(MEMBER_COLORS[0]); setShowColorPicker(false);
  };

  const handleShareFamilyCode = async () => {
    try {
      await Share.share({
        message: `Rejoins mon agenda partagé sur Syncro ! Télécharge l'app et utilise le code de famille : ${familyCode}`,
      });
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Erreur', text2: 'Impossible de partager le code.' });
    }
  };

  const handleResetPassword = async () => {
    try {
      if (auth.currentUser?.email) {
        await sendPasswordResetEmail(auth, auth.currentUser.email);
        Toast.show({ type: 'success', text1: 'Succès', text2: 'Un e-mail de réinitialisation vous a été envoyé.' });
      }
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Erreur', text2: 'Impossible d\'envoyer l\'e-mail.' });
    }
  };

  const confirmDeleteAccount = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        await deleteDoc(doc(db, 'users', user.uid));
        await deleteUser(user);
        setDeleteModalVisible(false);
      }
    } catch (error: any) {
      setDeleteModalVisible(false);
      if (error.code === 'auth/requires-recent-login') {
        Toast.show({ type: 'error', text1: 'Sécurité', text2: 'Veuillez vous déconnecter puis vous reconnecter avant de supprimer votre compte.' });
      } else {
        Toast.show({ type: 'error', text1: 'Erreur', text2: error.message });
      }
    }
  };

  const handleLogout = async () => {
    try { await signOut(auth); } catch (error) { Toast.show({ type: 'error', text1: 'Erreur', text2: 'Impossible de se déconnecter.' }); }
  };

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.headerTitle}>Paramètres</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mon Compte</Text>
          <Text style={styles.accountText}>Connecté en tant que :</Text>
          <Text style={styles.emailText}>{userEmail}</Text>

          <TouchableOpacity style={styles.secondaryBtn} onPress={handleResetPassword}>
            <Text style={styles.secondaryBtnText}>Changer mon mot de passe</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.dangerOutlineBtn} onPress={() => setDeleteModalVisible(true)}>
            <Text style={styles.dangerOutlineText}>Supprimer mon compte</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ma Famille</Text>
          <Text style={styles.hint}>Code d'invitation pour rejoindre ce calendrier :</Text>
          
          <View style={styles.codeContainer}>
            <Text style={styles.codeText}>{familyCode}</Text>
            <TouchableOpacity style={styles.shareBtn} onPress={handleShareFamilyCode}>
              <Text style={styles.shareBtnText}>Partager</Text>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => Toast.show({ type: 'info', text1: 'Bientôt', text2: 'Le système multi-familles arrive bientôt !' })}>
            <Text style={styles.secondaryBtnText}>Changer de famille</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Couleur de l'application</Text>
          <View style={styles.colorPalette}>
            {APP_COLORS.map(color => (
              <TouchableOpacity
                key={color}
                style={[styles.colorCircle, { backgroundColor: color }, appBackgroundColor === color && styles.colorCircleSelected]}
                onPress={() => setAppBackgroundColor(color)}
              />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Membres du groupe</Text>
          <Text style={styles.hint}>Touchez un membre pour le modifier</Text>
          <View style={styles.membersList}>
            {members.map((m: any) => (
              <TouchableOpacity key={m.id} onPress={() => handleEdit(m)} style={[styles.memberBadge, { backgroundColor: m.color }]}>
                <Text style={[styles.memberBadgeText, m.color === '#FFFFFF' ? {color: '#000'} : {}]}>{m.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{editingMemberId ? 'Modifier le membre' : 'Ajouter un membre'}</Text>
          <TextInput style={styles.input} placeholder="Nom du membre..." value={memberName} onChangeText={setMemberName} />
          
          <View style={styles.colorPalette}>
            {MEMBER_COLORS.map(color => (
              <TouchableOpacity
                key={color}
                style={[styles.colorSquare, { backgroundColor: color }, memberColor === color && styles.colorSquareSelected]}
                onPress={() => { setMemberColor(color); setShowColorPicker(false); }}
              />
            ))}
            <TouchableOpacity style={styles.customColorBtn} onPress={() => setShowColorPicker(!showColorPicker)}>
              <Ionicons name="color-palette" size={22} color="#64748B" />
            </TouchableOpacity>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity style={[styles.actionBtn, {backgroundColor: '#0F172A'}]} onPress={handleSaveMember}>
              <Text style={styles.actionBtnText}>{editingMemberId ? 'Mettre à jour' : 'Ajouter'}</Text>
            </TouchableOpacity>
            
            {editingMemberId && (
              <>
                <TouchableOpacity style={[styles.actionBtn, {backgroundColor: '#EF4444'}]} onPress={handleDelete}>
                  <Text style={styles.actionBtnText}>Supprimer</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, {backgroundColor: '#94A3B8'}]} onPress={resetForm}>
                  <Text style={styles.actionBtnText}>Annuler</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Roue chromatique enfermée dans un conteneur rigide (overflow: hidden) pour que rien ne dépasse */}
          {showColorPicker && (
            <View style={styles.pickerWrapper}>
              <Text style={styles.pickerHint}>Choisissez votre couleur personnalisée :</Text>
              <View style={styles.pickerContainer}>
                <ColorPicker
                  color={memberColor}
                  onColorChangeComplete={(color) => setMemberColor(color)}
                  thumbSize={20}
                  sliderSize={12}
                  noSnap={true}
                  row={false}
                />
              </View>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Importer le téléphone</Text>
          <Text style={styles.hint}>Choisissez à qui attribuer les événements :</Text>
          <View style={styles.importList}>
            {members.map((m: any) => (
              <TouchableOpacity key={m.id} style={[styles.importBtn, { backgroundColor: m.color }]} onPress={() => importDeviceEvents(m.id)} disabled={isImporting}>
                {isImporting ? (
                  <ActivityIndicator color={(m.color === '#FFFFFF' ? '#000000' : '#FFFFFF') as string} />
                ) : (
                  <Text style={[styles.importBtnText, m.color === '#FFFFFF' ? {color: '#000'} : {}]}>Importer pour {m.name}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutBtnText}>Se déconnecter</Text>
        </TouchableOpacity>

        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>{appVersion}</Text>
        </View>
      </ScrollView>

      <Modal visible={isDeleteModalVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconContainer}>
              <Ionicons name="warning" size={40} color="#EF4444" />
            </View>
            <Text style={styles.modalTitle}>Supprimer le compte ?</Text>
            <Text style={styles.modalText}>Cette action est irréversible. Toutes vos données personnelles et vos événements seront effacés.</Text>
            
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setDeleteModalVisible(false)}>
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalDeleteBtn} onPress={confirmDeleteAccount}>
                <Text style={styles.modalDeleteText}>Oui, supprimer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  // Marge de bas de page encore plus grande (140) pour passer largement au-dessus de la barre Android
  scrollContent: { padding: 20, paddingTop: 60, paddingBottom: 140 },
  headerTitle: { fontSize: 32, fontWeight: 'bold', color: '#0F172A', marginBottom: 30 },
  section: { backgroundColor: '#FFFFFF', padding: 20, borderRadius: 16, marginBottom: 20, elevation: 2 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  hint: { fontSize: 13, color: '#64748B', marginBottom: 15, fontStyle: 'italic' },
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
  colorPalette: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 15, alignItems: 'center' },
  colorCircle: { width: 40, height: 40, borderRadius: 20, borderWidth: 3, borderColor: 'transparent' },
  colorCircleSelected: { borderColor: '#0F172A' },
  colorSquare: { width: 36, height: 36, borderRadius: 8, borderWidth: 3, borderColor: '#E2E8F0' },
  colorSquareSelected: { borderColor: '#0F172A' },
  customColorBtn: { width: 36, height: 36, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC' },
  
  // Style rigide pour empêcher tout débordement de la roue
  pickerWrapper: { marginTop: 15, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 10, alignItems: 'center' },
  pickerHint: { fontSize: 12, color: '#64748B', marginBottom: 8, fontStyle: 'italic', alignSelf: 'flex-start' },
  pickerContainer: { width: '100%', height: 180, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },

  membersList: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  memberBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  memberBadgeText: { fontWeight: 'bold', color: '#333' },
  input: { backgroundColor: '#F1F5F9', padding: 14, borderRadius: 10, marginBottom: 15, borderWidth: 1, borderColor: '#E2E8F0' },
  
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 5 },
  actionBtn: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center' },
  actionBtnText: { color: '#FFF', fontWeight: 'bold' },
  
  importList: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  importBtn: { paddingHorizontal: 15, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', minWidth: 100, alignItems: 'center', justifyContent: 'center' },
  importBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },
  logoutBtn: { backgroundColor: '#EF4444', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 20, marginHorizontal: 20 },
  logoutBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  versionContainer: { alignItems: 'center', paddingVertical: 20 },
  versionText: { color: '#94A3B8', fontSize: 14, fontWeight: 'bold', letterSpacing: 1 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFFFFF', width: '100%', borderRadius: 24, padding: 25, elevation: 10 },
  modalIconContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#FEE2E2', justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#0F172A', textAlign: 'center', marginBottom: 10 },
  modalText: { fontSize: 15, color: '#64748B', textAlign: 'center', marginBottom: 25, lineHeight: 22 },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalCancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#F1F5F9', alignItems: 'center' },
  modalCancelText: { color: '#64748B', fontWeight: 'bold', fontSize: 16 },
  modalDeleteBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#EF4444', alignItems: 'center' },
  modalDeleteText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
});