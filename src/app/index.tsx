import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Modal, KeyboardAvoidingView, Platform, Switch } from 'react-native';
import { useSharedCalendar, CalendarDay, Event } from '../hooks/useSharedCalendar';

export default function SharedCalendarScreen() {
  const {
    events, selectedDate, setSelectedDate, 
    eventTitle, setEventTitle, eventDescription, setEventDescription,
    eventTime, setEventTime, eventEndTime, setEventEndTime,
    isEventAllDay, setIsEventAllDay,
    selectedParticipantId, setSelectedParticipantId, 
    handleAddEvent, updateEvent, deleteEvent,
    monthGrid, currentMonthName, nextMonth, prevMonth,
    members, appBackgroundColor
  } = useSharedCalendar();

  const [isModalVisible, setModalVisible] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [editingDate, setEditingDate] = useState<string>('');
  
  const [modalTitle, setModalTitle] = useState('');
  const [modalDescription, setModalDescription] = useState('');
  const [modalTime, setModalTime] = useState('');
  const [modalEndTime, setModalEndTime] = useState('');
  const [modalIsAllDay, setModalIsAllDay] = useState(false);
  const [modalParticipantId, setModalParticipantId] = useState('');

  const daysOfWeek = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
  const todayDate = new Date();
  const todayString = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, '0')}-${String(todayDate.getDate()).padStart(2, '0')}`;

  const getMemberColor = (id: string) => members.find((m: any) => m.id === id)?.color || '#CCCCCC';

  const handleEventPress = (ev: Event, dateString: string) => {
    setEditingEvent(ev);
    setEditingDate(dateString);
    setModalTitle(ev.title);
    setModalDescription(ev.description || '');
    setModalTime(ev.time || '');
    setModalEndTime(ev.endTime || '');
    setModalIsAllDay(ev.isAllDay || false);
    setModalParticipantId(ev.participantId);
    setModalVisible(true);
  };

  const handleSaveEdit = () => {
    if (editingEvent && editingDate) {
      updateEvent(editingDate, {
        ...editingEvent,
        title: modalTitle,
        description: modalDescription,
        time: modalTime,
        endTime: modalEndTime,
        isAllDay: modalIsAllDay,
        participantId: modalParticipantId
      });
    }
    setModalVisible(false);
  };

  const handleDelete = () => {
    if (editingEvent && editingDate) {
      deleteEvent(editingDate, editingEvent.id);
    }
    setModalVisible(false);
  };

  const renderDayCell = (day: CalendarDay, index: number) => {
    if (!day.isCurrentMonth) return <View key={index} style={styles.emptyCell} />;

    const isSelected = selectedDate === day.dateString;
    const dayEvents = events[day.dateString] || [];
    const isToday = day.dateString === todayString; 

    return (
      <TouchableOpacity 
        key={index} 
        style={[styles.dayCell, isSelected && styles.dayCellSelected, isToday && styles.dayCellToday]}
        onPress={() => setSelectedDate(day.dateString)}
        activeOpacity={0.6}
      >
        <Text style={[styles.dayNumber, isToday && styles.textBold]}>{day.dayNumber}</Text>
        <View style={styles.pillContainer}>
          {dayEvents.map((ev: Event, i: number) => (
             <TouchableOpacity 
               key={i} 
               style={[styles.eventPill, { backgroundColor: getMemberColor(ev.participantId) }]}
               onPress={() => handleEventPress(ev, day.dateString)}
               activeOpacity={0.7}
             >
               {/* On affiche juste le titre, pour ne plus couper le texte */}
               <Text style={[styles.pillText, getMemberColor(ev.participantId) === '#FFFFFF' ? {color: '#000'} : {}]} numberOfLines={1}>
                 {ev.title}
               </Text>
             </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: appBackgroundColor }]}>
      
      <View style={styles.headerArea}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={prevMonth} style={styles.navBtn}><Text style={styles.navBtnText}>&lt;</Text></TouchableOpacity>
          <Text style={styles.monthTitle}>{currentMonthName}</Text>
          <TouchableOpacity onPress={nextMonth} style={styles.navBtn}><Text style={styles.navBtnText}>&gt;</Text></TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.membersScroll}>
          {members.map((member: any) => (
            <View key={member.id} style={[styles.memberBadge, { backgroundColor: member.color }]}>
              <Text style={[styles.memberBadgeText, member.color === '#FFFFFF' ? {color: '#000'} : {}]}>{member.name}</Text>
            </View>
          ))}
        </ScrollView>
      </View>

      <View style={styles.calendarArea}>
        <View style={styles.daysRow}>
          {daysOfWeek.map((day, i) => <Text key={i} style={styles.dayOfWeekText}>{day}</Text>)}
        </View>
        
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollPadding}>
          <View style={styles.grid}>
            {monthGrid.map((day: CalendarDay, index: number) => renderDayCell(day, index))}
          </View>

          {selectedDate !== '' && (
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Ajouter un événement le {selectedDate}</Text>
              
              <TextInput style={styles.input} placeholder="Titre de l'événement..." value={eventTitle} onChangeText={setEventTitle} />
              <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} placeholder="Détails, adresse, notes..." value={eventDescription} onChangeText={setEventDescription} multiline />
              
              <View style={styles.timeRow}>
                  <View style={styles.switchContainer}>
                      <Text style={styles.subLabel}>Toute la journée</Text>
                      <Switch value={isEventAllDay} onValueChange={setIsEventAllDay} />
                  </View>
                  {!isEventAllDay && (
                      <View style={styles.timesContainer}>
                        <TextInput style={[styles.input, { flex: 1, marginBottom: 0 }]} placeholder="Début (14:30)" value={eventTime} onChangeText={setEventTime} />
                        <TextInput style={[styles.input, { flex: 1, marginBottom: 0 }]} placeholder="Fin (15:30)" value={eventEndTime} onChangeText={setEventEndTime} />
                      </View>
                  )}
              </View>

              <Text style={[styles.subLabel, {marginTop: 10}]}>Attribuer à :</Text>
              <ScrollView horizontal style={styles.formParticipantScroll}>
                {members.map((m: any) => (
                  <TouchableOpacity
                    key={m.id}
                    style={[styles.formParticipantBtn, { backgroundColor: m.color }, selectedParticipantId === m.id && styles.formParticipantBtnSelected]}
                    onPress={() => setSelectedParticipantId(m.id)}
                  >
                    <Text style={m.color === '#FFFFFF' ? {color: '#000', fontWeight:'bold'} : {fontWeight:'bold', color:'#FFF'}}>{m.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity style={styles.addBtn} onPress={handleAddEvent}>
                <Text style={styles.addBtnText}>Ajouter au calendrier</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>

      <Modal visible={isModalVisible} transparent={true} animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalHeader}>Détails de l'événement</Text>
            
            <TextInput style={styles.input} placeholder="Titre" value={modalTitle} onChangeText={setModalTitle} />
            <TextInput style={[styles.input, { height: 100, textAlignVertical: 'top' }]} placeholder="Détails, notes importées..." value={modalDescription} onChangeText={setModalDescription} multiline />

            <View style={styles.timeRow}>
                <View style={styles.switchContainer}>
                    <Text style={styles.subLabel}>Toute la journée</Text>
                    <Switch value={modalIsAllDay} onValueChange={setModalIsAllDay} />
                </View>
                {!modalIsAllDay && (
                    <View style={styles.timesContainer}>
                        <TextInput style={[styles.input, { flex: 1, marginBottom: 0 }]} placeholder="Début" value={modalTime} onChangeText={setModalTime} />
                        <TextInput style={[styles.input, { flex: 1, marginBottom: 0 }]} placeholder="Fin" value={modalEndTime} onChangeText={setModalEndTime} />
                    </View>
                )}
            </View>

            <Text style={[styles.subLabel, {marginTop: 15}]}>Attribuer à :</Text>
            <ScrollView horizontal style={styles.formParticipantScroll}>
                {members.map((m: any) => (
                  <TouchableOpacity
                    key={m.id}
                    style={[styles.formParticipantBtn, { backgroundColor: m.color }, modalParticipantId === m.id && styles.formParticipantBtnSelected]}
                    onPress={() => setModalParticipantId(m.id)}
                  >
                    <Text style={m.color === '#FFFFFF' ? {color: '#000', fontWeight:'bold'} : {fontWeight:'bold', color:'#FFF'}}>{m.name}</Text>
                  </TouchableOpacity>
                ))}
            </ScrollView>

            <View style={styles.modalActionRow}>
              <TouchableOpacity style={[styles.modalActionBtn, { backgroundColor: '#0F172A' }]} onPress={handleSaveEdit}>
                <Text style={styles.addBtnText}>Sauvegarder</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalActionBtn, { backgroundColor: '#EF4444' }]} onPress={handleDelete}>
                <Text style={styles.addBtnText}>Supprimer</Text>
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
              <Text style={styles.cancelBtnText}>Fermer</Text>
            </TouchableOpacity>

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
  monthTitle: { fontSize: 24, fontWeight: 'bold', color: '#FFFFFF', textTransform: 'capitalize' },
  membersScroll: { flexDirection: 'row' },
  memberBadge: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 10 },
  memberBadgeText: { fontWeight: 'bold', color: '#333' },
  
  calendarArea: { flex: 1, backgroundColor: '#FFFFFF', borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingTop: 20, paddingHorizontal: 10 },
  daysRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 10 },
  dayOfWeekText: { fontSize: 14, fontWeight: '600', color: '#94A3B8', width: '14.28%', textAlign: 'center' },
  scrollPadding: { paddingBottom: 40 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start' },
  emptyCell: { width: '14.28%', height: 105, padding: 2 },
  dayCell: { width: '14.28%', height: 105, padding: 2, borderTopWidth: 1, borderColor: '#F1F5F9', alignItems: 'center' },
  dayCellSelected: { borderWidth: 2, borderColor: '#333', borderRadius: 8 },
  dayCellToday: { backgroundColor: '#F1F5F9' },
  dayNumber: { fontSize: 13, color: '#333', marginBottom: 4, marginTop: 4 },
  textBold: { fontWeight: 'bold' },
  
  pillContainer: { width: '100%', alignItems: 'center', gap: 3 },
  eventPill: { width: '98%', paddingVertical: 4, paddingHorizontal: 2, borderRadius: 4 },
  pillText: { color: '#333', fontSize: 9, fontWeight: '700', textAlign: 'center' },
  
  formSection: { padding: 20, marginTop: 20, backgroundColor: '#F8FAFC', borderRadius: 16 },
  formLabel: { fontWeight: 'bold', marginBottom: 10, fontSize: 16 },
  input: { backgroundColor: '#FFF', padding: 14, borderRadius: 10, marginBottom: 10, borderWidth: 1, borderColor: '#E2E8F0' },
  timeRow: { flexDirection: 'column', gap: 10, marginBottom: 10 },
  switchContainer: { flexDirection: 'row', alignItems: 'center', gap: 10, alignSelf: 'flex-start' },
  timesContainer: { flexDirection: 'row', gap: 10 },
  formParticipantScroll: { marginBottom: 15, flexDirection: 'row' },
  formParticipantBtn: { paddingHorizontal: 15, paddingVertical: 10, borderRadius: 12, marginRight: 10, borderWidth: 2, borderColor: 'transparent' },
  formParticipantBtnSelected: { borderColor: '#333' },
  addBtn: { backgroundColor: '#0F172A', padding: 16, borderRadius: 12, alignItems: 'center' },
  addBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },
  subLabel: { fontSize: 14, fontWeight: '600', color: '#333' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', padding: 24, borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingBottom: 50 },
  modalHeader: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, color: '#0F172A' },
  modalActionRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  modalActionBtn: { flex: 1, padding: 16, borderRadius: 12, alignItems: 'center' },
  cancelBtn: { marginTop: 15, alignItems: 'center', padding: 10 },
  cancelBtnText: { color: '#94A3B8', fontWeight: 'bold', fontSize: 16 }
});