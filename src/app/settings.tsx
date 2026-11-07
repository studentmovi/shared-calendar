import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { useSharedCalendar } from '../hooks/useSharedCalendar';
import Constants from 'expo-constants';

const APP_COLORS = ['#FF4D4D', '#F97316', '#10B981', '#3B82F6', '#8B5CF6', '#1E293B'];
const MEMBER_COLORS = ['#FFFFFF', '#FBCFE8', '#FDE047', '#67E8F9', '#FDBA74', '#D9F99D', '#E9D5FF'];

export default function SettingsScreen() {
  const { appBackgroundColor, setAppBackgroundColor, members, addMember, updateMember, deleteMember, importDeviceEvents } = useSharedCalendar();
  
  // On calcule la version ICI, au moment où la page s'affiche, pour éviter les crashs au démarrage
  const appVersion = `V${Constants.expoConfig?.version || '0.6.0'}`;

  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [memberName, setMemberName] = useState('');
  const [memberColor, setMemberColor] = useState(MEMBER_COLORS[0]);

  const handleSaveMember = () => {
    if (editingMemberId) {
      updateMember(editingMemberId, memberName, memberColor);
    } else {
      addMember(memberName, memberColor);
    }
    resetForm();
  };

  const handleEdit = (m: any) => {
    setEditingMemberId(m.id);
    setMemberName(m.name);
    setMemberColor(m.color);
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
    setMemberColor(MEMBER_COLORS[0]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.headerTitle}>Paramètres</Text>

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
        <Text style={styles.sectionTitle}>Importer le téléphone</Text>
        <Text style={styles.hint}>Choisissez à qui attribuer les événements de ce téléphone :</Text>
        <View style={styles.importList}>
          {members.map((m: any) => (
            <TouchableOpacity 
              key={m.id} 
              style={[styles.importBtn, { backgroundColor: m.color }]} 
              onPress={() => importDeviceEvents(m.id)}
            >
              <Text style={[styles.importBtnText, m.color === '#FFFFFF' ? {color: '#000'} : {}]}>
                Importer pour {m.name}
              </Text>
            </TouchableOpacity>
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
        <TextInput
          style={styles.input}
          placeholder="Nom du membre..."
          value={memberName}
          onChangeText={setMemberName}
        />
        <View style={styles.colorPalette}>
          {MEMBER_COLORS.map(color => (
            <TouchableOpacity
              key={color}
              style={[styles.colorSquare, { backgroundColor: color }, memberColor === color && styles.colorSquareSelected]}
              onPress={() => setMemberColor(color)}
            />
          ))}
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
      </View>

      {/* Affichage de la version */}
      <View style={styles.versionContainer}>
        <Text style={styles.versionText}>{appVersion}</Text>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollContent: { padding: 20, paddingTop: 60, paddingBottom: 40 },
  headerTitle: { fontSize: 32, fontWeight: 'bold', color: '#0F172A', marginBottom: 30 },
  section: { backgroundColor: '#FFFFFF', padding: 20, borderRadius: 16, marginBottom: 20, elevation: 2 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  hint: { fontSize: 13, color: '#64748B', marginBottom: 15, fontStyle: 'italic' },
  colorPalette: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 15 },
  colorCircle: { width: 40, height: 40, borderRadius: 20, borderWidth: 3, borderColor: 'transparent' },
  colorCircleSelected: { borderColor: '#0F172A' },
  colorSquare: { width: 40, height: 40, borderRadius: 8, borderWidth: 3, borderColor: '#E2E8F0' },
  colorSquareSelected: { borderColor: '#0F172A' },
  membersList: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  memberBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  memberBadgeText: { fontWeight: 'bold', color: '#333' },
  input: { backgroundColor: '#F1F5F9', padding: 14, borderRadius: 10, marginBottom: 10, borderWidth: 1, borderColor: '#E2E8F0' },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  actionBtn: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center' },
  actionBtnText: { color: '#FFF', fontWeight: 'bold' },
  importList: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  importBtn: { paddingHorizontal: 15, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0' },
  importBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },
  versionContainer: { alignItems: 'center', paddingVertical: 20 },
  versionText: { color: '#94A3B8', fontSize: 14, fontWeight: 'bold', letterSpacing: 1 }
});