import React, { useState, useRef } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Modal, KeyboardAvoidingView, Platform, Switch, useColorScheme } from 'react-native';
import { useSharedCalendar, CalendarDay, Event, Reminder } from '../hooks/useSharedCalendar';
import { useTranslation } from '../context/LanguageContext';
import { Ionicons } from '@expo/vector-icons';

// Import de notre logique métier séparée
import { fetchAddressSuggestions, PlaceSuggestion } from '../services/googlePlaces';

const formatToFR = (dbDate: string) => {
  if (!dbDate) return '';
  const parts = dbDate.split('-');
  if (parts.length !== 3) return dbDate;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

const parseToDB = (frDate: string) => {
  if (!frDate) return '';
  const sanitized = frDate.replace(/[-.]/g, '/'); 
  const parts = sanitized.split('/');
  if (parts.length === 3) return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  return frDate;
};

const PERSONAL_KEYWORDS_RULES = [
  { keywords: ['pompier', 'feu', 'caserne'], bg: '#DC2626', text: '#FFFFFF', icon: '🚒' },
  { keywords: ['garde', 'astreinte'], bg: '#2563EB', text: '#FFFFFF', icon: '🛡️' },
  { keywords: ['amour', 'resto', 'date'], bg: '#DB2777', text: '#FFFFFF', icon: '💕' },
  { keywords: ['médecin', 'rdv'], bg: '#059669', text: '#FFFFFF', icon: '🩺' }
];

const applyPersonalRules = (title: string, defaultColor: string) => {
  const lowerTitle = title.toLowerCase();
  for (const rule of PERSONAL_KEYWORDS_RULES) {
    if (rule.keywords.some(kw => lowerTitle.includes(kw))) {
      return { bg: rule.bg, text: rule.text, icon: rule.icon, isCustom: true };
    }
  }
  return { bg: defaultColor, text: defaultColor === '#FFFFFF' ? '#000000' : '#FFFFFF', icon: '', isCustom: false };
};

const getMonthDecoration = (monthIndex: number) => {
  if (monthIndex === 9) return { left: '🕸️', right: '🎃', subtitle: "Halloween !" };
  if (monthIndex === 11) return { left: '🎄', right: '🎁', subtitle: "Fêtes !" };
  if (monthIndex === 0) return { left: '🥂', right: '🎆', subtitle: `Année ${new Date().getFullYear()} !` };
  if (monthIndex === 1) return { left: '💘', right: '🍫', subtitle: "Amour" };
  return { left: '', right: '', subtitle: '' };
};

export default function SharedCalendarScreen() {
  const { t } = useTranslation();
  const systemTheme = useColorScheme(); 
  
  const { 
    events, selectedDate, setSelectedDate, handleAddEvent, updateEvent, deleteEvent, 
    monthGrid, currentMonthName, nextMonth, prevMonth, members, showAlert,
    theme, appBackgroundColor, numberColor, fabColor 
  } = useSharedCalendar();

  const currentTheme = theme === 'system' ? systemTheme : theme;
  const isDark = currentTheme === 'dark';
  const safeFabColor = (!fabColor || fabColor === '#FFFFFF' || fabColor === '#FFF') ? '#3B82F6' : fabColor;

  const [isModalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  
  const [modalTitle, setModalTitle] = useState(''); 
  const [modalDescription, setModalDescription] = useState('');
  const [modalLocation, setModalLocation] = useState(''); 
  
  const [addressSuggestions, setAddressSuggestions] = useState<PlaceSuggestion[]>([]);
  
  // Chronomètre pour limiter les appels API Google (Debounce)
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  const [modalTime, setModalTime] = useState(''); 
  const [modalEndTime, setModalEndTime] = useState('');
  const [modalEndDate, setModalEndDate] = useState(''); 
  const [modalIsAllDay, setModalIsAllDay] = useState(false);
  const [modalParticipantId, setModalParticipantId] = useState('');
  
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [tempRemAmount, setTempRemAmount] = useState('15');
  const [tempRemUnit, setTempRemUnit] = useState('minutes');

  const daysOfWeek = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  const todayDate = new Date();
  const todayString = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, '0')}-${String(todayDate.getDate()).padStart(2, '0')}`;
  
  const displayedMonthIndex = monthGrid.find((d: CalendarDay) => d.isCurrentMonth) 
    ? new Date(monthGrid.find((d: CalendarDay) => d.isCurrentMonth)!.dateString).getMonth() 
    : todayDate.getMonth();
    
  const decorations = getMonthDecoration(displayedMonthIndex);
  const getMemberColor = (id: string) => members.find((m: any) => m.id === id)?.color || '#CCCCCC';

  const openModal = (mode: 'add' | 'edit', ev?: Event, dateString?: string) => {
    setModalMode(mode);
    setAddressSuggestions([]); 
    
    // Nettoyer le chronomètre si on ouvre/ferme
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (mode === 'add') {
      if (!selectedDate) setSelectedDate(todayString);
      setModalTitle(''); setModalDescription(''); setModalLocation('');
      setModalTime(''); setModalEndTime(''); setModalEndDate(''); setModalIsAllDay(false); 
      setModalParticipantId(members[0]?.id || ''); setReminders([]);
    } else if (ev && dateString) {
      setSelectedDate(ev.date || dateString); 
      setEditingEventId(ev.id);
      setModalTitle(ev.title); setModalDescription(ev.description || ''); 
      setModalLocation(ev.location || '');
      setModalTime(ev.time || ''); setModalEndTime(ev.endTime || ''); 
      setModalEndDate(ev.endDate ? formatToFR(ev.endDate) : ''); 
      setModalIsAllDay(ev.isAllDay || false); setModalParticipantId(ev.participantId); setReminders(ev.reminders || []);
    }
    setModalVisible(true);
  };

  // NOUVELLE FONCTION AVEC DEBOUNCE (ÉCONOMIE API)
  const handleAddressInput = (text: string) => {
    setModalLocation(text);
    
    // 1. On annule la requête précédente si l'utilisateur est toujours en train de taper
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    
    // 2. Si le texte est vide ou trop court, on vide les suggestions et on s'arrête là
    if (text.length < 3) {
      setAddressSuggestions([]);
      return;
    }

    // 3. On déclenche un nouveau chrono de 600ms
    debounceTimer.current = setTimeout(async () => {
      const suggestions = await fetchAddressSuggestions(text);
      setAddressSuggestions(suggestions);
    }, 600);
  };

  const selectAddress = (address: string) => {
    setModalLocation(address);
    setAddressSuggestions([]);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
  };

  const handleAddReminder = () => {
    if (!tempRemAmount) return;
    setReminders([...reminders, { amount: tempRemAmount, unit: tempRemUnit }]);
    setTempRemAmount('');
  };

  const handleSave = () => {
    if (!modalTitle.trim()) return showAlert(t('error'), t('emptyTitle'), 'error'); 
    const parsedEndDate = modalIsAllDay ? parseToDB(modalEndDate) : '';
    
    const eventData = { 
      title: modalTitle, description: modalDescription, location: modalLocation,
      time: modalTime, endTime: modalEndTime, endDate: parsedEndDate, 
      isAllDay: modalIsAllDay, participantId: modalParticipantId, reminders 
    };
    
    if (modalMode === 'add') handleAddEvent(selectedDate, eventData);
    else if (editingEventId) updateEvent(selectedDate, { ...eventData, id: editingEventId });
    
    setModalVisible(false);
  };

  const handleDelete = () => { 
    if (editingEventId && selectedDate) deleteEvent(selectedDate, editingEventId); 
    setModalVisible(false); 
  };

  const renderDayCell = (day: CalendarDay, index: number) => {
    if (!day.isCurrentMonth) return <View key={index} style={[styles.emptyCell, { borderTopWidth: 1, borderColor: isDark ? '#334155' : '#F1F5F9' }]} />;
    const isSelected = selectedDate === day.dateString; 
    const rawEvents = events[day.dateString] || [];
    const uniqueEventsMap = new Map();
    rawEvents.forEach((ev: Event) => uniqueEventsMap.set(ev.id, ev));
    const dayEvents = Array.from(uniqueEventsMap.values());
    dayEvents.sort((a, b) => a.id.localeCompare(b.id)); 
    const isToday = day.dateString === todayString; 
    
    return (
      <TouchableOpacity key={index} style={[styles.dayCell, { borderColor: isDark ? '#334155' : '#F1F5F9' }, isSelected && { borderWidth: 2, borderColor: isDark ? '#FFFFFF' : '#333', borderRadius: 8 }, isToday && { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]} onPress={() => setSelectedDate(day.dateString)} activeOpacity={0.6}>
        <Text style={[styles.dayNumber, isToday && styles.textBold, { color: (isDark && numberColor === '#333333') ? '#FFFFFF' : numberColor }]}>{day.dayNumber}</Text>
        <View style={styles.pillContainer}>
          {dayEvents.map((ev: Event, i: number) => {
             const styleData = applyPersonalRules(ev.title, getMemberColor(ev.participantId));
             const span = ev.spanStatus || 'single';
             const isConnectedLeft = (span === 'middle' || span === 'end') && index % 7 !== 0; 
             const isConnectedRight = (span === 'start' || span === 'middle') && index % 7 !== 6; 
             const showText = span === 'start' || span === 'single' || index % 7 === 0;

             return (
               <TouchableOpacity key={i} style={[styles.eventPill, { backgroundColor: styleData.bg }, styleData.isCustom && styles.customPillBorder, isConnectedLeft && { marginLeft: 0, borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }, isConnectedRight && { marginRight: 0, borderTopRightRadius: 0, borderBottomRightRadius: 0 }]} onPress={() => openModal('edit', ev, day.dateString)} activeOpacity={0.7}>
                 <Text style={[styles.pillText, {color: showText ? styleData.text : 'transparent'}]} numberOfLines={1}>{showText ? `${styleData.icon} ${ev.title}` : ' '}</Text>
               </TouchableOpacity>
             );
          })}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: appBackgroundColor }]}>
      <View style={styles.headerArea}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={prevMonth} style={styles.navBtn}><Text style={styles.navBtnText}>&lt;</Text></TouchableOpacity>
          <View style={styles.titleContainer}>
            <Text style={styles.monthTitle}>{decorations.left} {currentMonthName} {decorations.right}</Text>
            {decorations.subtitle ? <Text style={styles.monthSubtitle}>{decorations.subtitle}</Text> : null}
          </View>
          <TouchableOpacity onPress={nextMonth} style={styles.navBtn}><Text style={styles.navBtnText}>&gt;</Text></TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.membersScroll}>
          {members.map((m: any) => (
             <View key={m.id} style={[styles.memberBadge, { backgroundColor: m.color }]}><Text style={[styles.memberBadgeText, m.color === '#FFFFFF' ? {color: '#000'} : {}]}>{m.name}</Text></View>
          ))}
        </ScrollView>
      </View>

      <View style={[styles.calendarArea, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
        <View style={styles.daysRow}>
          {daysOfWeek.map((day, i) => <Text key={i} style={[styles.dayOfWeekText, { color: isDark ? '#94A3B8' : '#94A3B8' }]}>{day}</Text>)}
        </View>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollPadding}>
          <View style={styles.grid}>{monthGrid.map((day: CalendarDay, index: number) => renderDayCell(day, index))}</View>
        </ScrollView>
      </View>

      <View style={styles.premiumBottomAction}>
        <TouchableOpacity style={[styles.premiumAddBtn, { backgroundColor: safeFabColor }, isDark && safeFabColor === '#0F172A' ? { borderWidth: 1, borderColor: '#334155' } : {}]} onPress={() => openModal('add')} activeOpacity={0.8}>
          <Ionicons name="add" size={22} color="#FFF" style={{ marginRight: 6 }} />
          <Text style={styles.premiumAddBtnText}>{t('addEvent')}</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={isModalVisible} transparent={true} animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: isDark ? '#0F172A' : '#FFFFFF' }]}>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.modalScrollContent}>
              
              <View style={styles.modalHeaderRow}>
                <Text style={[styles.modalHeader, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
                  {modalMode === 'add' ? t('addEvent') : t('editEvent')}
                </Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Ionicons name="close-circle" size={32} color="#94A3B8" />
                </TouchableOpacity>
              </View>
              
              <TextInput style={[styles.input, isDark && styles.inputDark]} placeholderTextColor={isDark ? '#94A3B8' : '#94A3B8'} placeholder={t('titlePlaceholder')} value={modalTitle} onChangeText={setModalTitle} />
              
              {/* Champ Adresse avec Suggestions */}
              <View style={{ zIndex: 10, marginBottom: 12 }}>
                <TextInput 
                  style={[styles.input, isDark && styles.inputDark, { marginBottom: 0 }]} 
                  placeholderTextColor={isDark ? '#94A3B8' : '#94A3B8'} 
                  placeholder="📍 Adresse (ex: Pairi Daiza)" 
                  value={modalLocation} 
                  onChangeText={handleAddressInput} 
                />
                
                {addressSuggestions.length > 0 && (
                  <View style={[styles.suggestionBox, { backgroundColor: isDark ? '#1E293B' : '#FFF' }]}>
                    {addressSuggestions.map((item) => (
                      <TouchableOpacity 
                        key={item.id} 
                        style={styles.suggestionRow} 
                        onPress={() => selectAddress(item.description)}
                      >
                        <Ionicons name="location-outline" size={20} color={isDark ? '#94A3B8' : '#64748B'} style={{marginRight: 10}}/>
                        <Text style={{ color: isDark ? '#FFF' : '#333', flexShrink: 1 }}>{item.description}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              <TextInput style={[styles.input, isDark && styles.inputDark, { height: 70, textAlignVertical: 'top' }]} placeholderTextColor={isDark ? '#94A3B8' : '#94A3B8'} placeholder="Notes additionnelles..." value={modalDescription} onChangeText={setModalDescription} multiline />

              <View style={[styles.timeSection, isDark && styles.timeSectionDark]}>
                  <View style={styles.switchContainer}>
                    <Text style={[styles.subLabel, {color: isDark ? '#FFF' : '#333'}]}>{t('allDay')}</Text>
                    <Switch value={modalIsAllDay} onValueChange={setModalIsAllDay} />
                  </View>
                  {!modalIsAllDay ? (
                      <View style={styles.timesContainer}>
                          <TextInput style={[styles.input, isDark && styles.inputDark, { flex: 1, marginBottom: 0 }]} placeholderTextColor={isDark ? '#94A3B8' : '#94A3B8'} placeholder={t('start')} value={modalTime} onChangeText={setModalTime} />
                          <TextInput style={[styles.input, isDark && styles.inputDark, { flex: 1, marginBottom: 0 }]} placeholderTextColor={isDark ? '#94A3B8' : '#94A3B8'} placeholder={t('end')} value={modalEndTime} onChangeText={setModalEndTime} />
                      </View>
                  ) : (
                      <TextInput style={[styles.input, isDark && styles.inputDark, { marginTop: 10 }]} placeholderTextColor={isDark ? '#94A3B8' : '#94A3B8'} placeholder={t('endDate')} value={modalEndDate} onChangeText={setModalEndDate} />
                  )}
              </View>

              <Text style={[styles.subLabel, {marginTop: 15, marginBottom: 10, color: isDark ? '#FFF' : '#333'}]}>{t('reminders')}</Text>
              {reminders.map((rem, i) => (
                <View key={i} style={styles.reminderRow}>
                  <Text style={styles.reminderBadge}>{rem.amount} {t(rem.unit as keyof typeof t)} {t('before')}</Text>
                  <TouchableOpacity onPress={() => setReminders(reminders.filter((_, idx) => idx !== i))}><Ionicons name="trash" size={20} color="#EF4444" /></TouchableOpacity>
                </View>
              ))}
              
              <View style={styles.addReminderRow}>
                <TextInput style={[styles.remInput, isDark && styles.inputDark]} keyboardType="numeric" value={tempRemAmount} onChangeText={setTempRemAmount} placeholderTextColor={isDark ? '#94A3B8' : '#94A3B8'} placeholder="15" />
                <TouchableOpacity style={[styles.remUnitBtn, isDark && styles.remUnitBtnDark, tempRemUnit === 'minutes' && styles.remUnitActive]} onPress={() => setTempRemUnit('minutes')}><Text style={[tempRemUnit === 'minutes' ? styles.remTextActive : {color: isDark ? '#FFF' : '#333'}]}>{t('minutes')}</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.remUnitBtn, isDark && styles.remUnitBtnDark, tempRemUnit === 'hours' && styles.remUnitActive]} onPress={() => setTempRemUnit('hours')}><Text style={[tempRemUnit === 'hours' ? styles.remTextActive : {color: isDark ? '#FFF' : '#333'}]}>{t('hours')}</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.remUnitBtn, isDark && styles.remUnitBtnDark, tempRemUnit === 'days' && styles.remUnitActive]} onPress={() => setTempRemUnit('days')}><Text style={[tempRemUnit === 'days' ? styles.remTextActive : {color: isDark ? '#FFF' : '#333'}]}>{t('days')}</Text></TouchableOpacity>
                <TouchableOpacity style={styles.remAddBtn} onPress={handleAddReminder}><Ionicons name="add" size={20} color="#FFF" /></TouchableOpacity>
              </View>

              <Text style={[styles.subLabel, {marginTop: 15, color: isDark ? '#FFF' : '#333'}]}>{t('assignTo')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.formParticipantScroll}>
                  {members.map((m: any) => (
                    <TouchableOpacity key={m.id} style={[styles.formParticipantBtn, { backgroundColor: m.color }, modalParticipantId === m.id && {borderColor: isDark ? '#FFF' : '#333'}]} onPress={() => setModalParticipantId(m.id)}>
                      <Text style={m.color === '#FFFFFF' ? {color: '#000', fontWeight:'bold'} : {fontWeight:'bold', color:'#FFF'}}>{m.name}</Text>
                    </TouchableOpacity>
                  ))}
              </ScrollView>

              <View style={styles.modalActionRow}>
                <TouchableOpacity style={[styles.modalActionBtn, { backgroundColor: safeFabColor }]} onPress={handleSave}>
                  <Text style={styles.addBtnText}>{modalMode === 'add' ? t('createEvent') : t('save')}</Text>
                </TouchableOpacity>
                {modalMode === 'edit' && (
                  <TouchableOpacity style={[styles.modalActionBtn, { backgroundColor: '#EF4444', flex: 0.4 }]} onPress={handleDelete}>
                    <Ionicons name="trash" size={20} color="#FFF" />
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerArea: { paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  navBtn: { padding: 10, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10 },
  navBtnText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  titleContainer: { alignItems: 'center' },
  monthTitle: { fontSize: 24, fontWeight: 'bold', color: '#FFFFFF', textTransform: 'capitalize' },
  monthSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.8)', fontStyle: 'italic', marginTop: 2 },
  membersScroll: { flexDirection: 'row' },
  memberBadge: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 10 },
  memberBadgeText: { fontWeight: 'bold', color: '#333' },
  calendarArea: { flex: 1, borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingTop: 20, paddingHorizontal: 10 },
  daysRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 10 },
  dayOfWeekText: { fontSize: 14, fontWeight: '600', color: '#94A3B8', width: '14.28%', textAlign: 'center' },
  scrollPadding: { paddingBottom: 110 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start' },
  emptyCell: { width: '14.28%', height: 105, paddingVertical: 2 },
  dayCell: { width: '14.28%', height: 105, paddingVertical: 2, borderTopWidth: 1, alignItems: 'center', overflow: 'hidden' },
  dayNumber: { fontSize: 13, marginBottom: 4, marginTop: 4, zIndex: 2 },
  textBold: { fontWeight: 'bold' },
  pillContainer: { width: '100%', gap: 2, zIndex: 2 },
  eventPill: { marginHorizontal: 4, paddingVertical: 4, paddingHorizontal: 2, borderRadius: 4 },
  customPillBorder: { borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)' },
  pillText: { fontSize: 9, fontWeight: '700', textAlign: 'center', minHeight: 12 },
  premiumBottomAction: { position: 'absolute', bottom: 25, width: '100%', alignItems: 'center', zIndex: 10 },
  premiumAddBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 24, borderRadius: 30, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8 },
  premiumAddBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContainer: { borderTopLeftRadius: 30, borderTopRightRadius: 30, maxHeight: '90%' },
  modalScrollContent: { padding: 24, paddingBottom: 50 },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalHeader: { fontSize: 20, fontWeight: 'bold' },
  
  suggestionBox: { position: 'absolute', top: 55, left: 0, right: 0, zIndex: 20, borderRadius: 10, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 },
  suggestionRow: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: 'rgba(150,150,150,0.2)' },
  
  input: { backgroundColor: '#F8FAFC', color: '#333333', padding: 14, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0', fontSize: 15 },
  inputDark: { backgroundColor: '#1E293B', color: '#FFFFFF', borderColor: '#334155' },
  timeSection: { backgroundColor: '#F1F5F9', padding: 15, borderRadius: 12, marginBottom: 15, zIndex: 1 },
  timeSectionDark: { backgroundColor: '#1E293B' },
  switchContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  timesContainer: { flexDirection: 'row', gap: 10, marginTop: 10 },
  subLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  reminderRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#FEF2F2', padding: 12, borderRadius: 10, marginBottom: 10, alignItems: 'center' },
  reminderBadge: { color: '#DC2626', fontWeight: 'bold' },
  addReminderRow: { flexDirection: 'row', gap: 8, marginBottom: 25 },
  remInput: { flex: 1, backgroundColor: '#F1F5F9', borderRadius: 10, paddingHorizontal: 10, textAlign: 'center', fontSize: 16, color: '#333333' }, 
  remUnitBtn: { paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#F1F5F9', borderRadius: 10, justifyContent: 'center' },
  remUnitBtnDark: { backgroundColor: '#1E293B' },
  remUnitActive: { backgroundColor: '#3B82F6' },
  remTextActive: { color: '#FFF', fontWeight: 'bold' },
  remAddBtn: { backgroundColor: '#10B981', padding: 12, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  formParticipantScroll: { marginBottom: 20, flexDirection: 'row' },
  formParticipantBtn: { paddingHorizontal: 15, paddingVertical: 10, borderRadius: 12, marginRight: 10, borderWidth: 2, borderColor: 'transparent' },
  modalActionRow: { flexDirection: 'row', gap: 10 },
  modalActionBtn: { flex: 1, padding: 16, borderRadius: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  addBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 }
});