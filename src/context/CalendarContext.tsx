import React, { createContext, useState, ReactNode, useEffect } from 'react';
import { Platform, Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as Calendar from 'expo-calendar/legacy';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase'; 
import { useTranslation } from './LanguageContext';
import { Ionicons } from '@expo/vector-icons';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: true }),
});

export interface Reminder { amount: string; unit: string; }

export interface Event {
  id: string; title: string; participantId: string; description?: string; time?: string;
  endTime?: string; endDate?: string; isAllDay?: boolean; date?: string; reminders?: Reminder[];
  spanStatus?: 'single' | 'start' | 'middle' | 'end'; // NOUVEAU: Pour la gestion d'affichage continu
}

export interface CalendarDay { dateString: string; dayNumber: string; isCurrentMonth: boolean; }
export interface Member { id: string; name: string; color: string; }

const INITIAL_MEMBERS: Member[] = [ { id: '1', name: 'You', color: '#FFFFFF' } ];

export const CalendarContext = createContext<any>(null);

// UTILITAIRE : Trouver toutes les dates entre deux jours
const getDatesInRange = (startStr: string, endStr: string) => {
  if (!startStr || !endStr) return [startStr || endStr];
  const dates = [];
  const [sY, sM, sD] = startStr.split('-').map(Number);
  const [eY, eM, eD] = endStr.split('-').map(Number);
  
  if (!sY || !eY) return [startStr];
  const currentDate = new Date(sY, sM - 1, sD);
  const endDate = new Date(eY, eM - 1, eD);
  
  if (endDate < currentDate) return [startStr]; 
  while (currentDate <= endDate) {
    const y = currentDate.getFullYear();
    const m = String(currentDate.getMonth() + 1).padStart(2, '0');
    const d = String(currentDate.getDate()).padStart(2, '0');
    dates.push(`${y}-${m}-${d}`);
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return dates;
};

export const CalendarProvider = ({ children, familyId }: { children: ReactNode, familyId: string }) => {
  const { t } = useTranslation();
  
  const [events, setEvents] = useState<Record<string, Event[]>>({});
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedParticipantId, setSelectedParticipantId] = useState<string>(INITIAL_MEMBERS[0].id);
  const [members, setMembers] = useState<Member[]>(INITIAL_MEMBERS);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isImporting, setIsImporting] = useState<boolean>(false);
  
  const [theme, setTheme] = useState<'system' | 'light' | 'dark'>('system');
  const [appBackgroundColor, setAppBackgroundColor] = useState<string>('#FF4D4D');
  const [numberColor, setNumberColor] = useState<string>('#333333');
  const [fabColor, setFabColor] = useState<string>('#0F172A');
  
  const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', message: '', type: 'info' });

  const showAlert = (title: string, message: string, type: 'info' | 'error' | 'success' = 'info') => {
    setAlertConfig({ visible: true, title, message, type });
  };

  // NOUVEAU: Répartition intelligente des événements sur plusieurs jours
  useEffect(() => {
    if (!familyId) return;
    const unsubscribe = onSnapshot(collection(db, 'families', familyId, 'events'), (snapshot) => {
      const cloudEvents: Record<string, Event[]> = {};
      
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const ev = { id: docSnap.id, ...data } as Event;
        
        if (data.isAllDay && data.endDate) {
          const range = getDatesInRange(data.date, data.endDate);
          range.forEach((dStr, index) => {
            if (!cloudEvents[dStr]) cloudEvents[dStr] = [];
            let spanStatus: 'single' | 'start' | 'middle' | 'end' = 'middle';
            
            if (range.length === 1) spanStatus = 'single';
            else if (index === 0) spanStatus = 'start';
            else if (index === range.length - 1) spanStatus = 'end';
            
            cloudEvents[dStr].push({ ...ev, spanStatus });
          });
        } else {
          if (!cloudEvents[data.date]) cloudEvents[data.date] = [];
          cloudEvents[data.date].push({ ...ev, spanStatus: 'single' });
        }
      });
      setEvents(cloudEvents); 
    });
    return () => unsubscribe(); 
  }, [familyId]);

  useEffect(() => {
    if (!familyId) return;
    const unsubscribe = onSnapshot(doc(db, 'families', familyId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.members) setMembers(data.members);
        if (data.theme) setTheme(data.theme);
        if (data.appBackgroundColor) setAppBackgroundColor(data.appBackgroundColor);
        if (data.numberColor) setNumberColor(data.numberColor);
        if (data.fabColor) setFabColor(data.fabColor);
      } else {
        setDoc(doc(db, 'families', familyId), { members: INITIAL_MEMBERS, theme: 'system', appBackgroundColor: '#FF4D4D', numberColor: '#333333', fabColor: '#0F172A' });
      }
    });
    return () => unsubscribe();
  }, [familyId]);

  useEffect(() => {
    const requestPermissions = async () => {
      if (Device.isDevice && Platform.OS !== 'web') {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        if (existingStatus !== 'granted') await Notifications.requestPermissionsAsync();
        if (Platform.OS === 'android') {
          try { 
            await Notifications.setNotificationChannelAsync('default', { name: 'default', importance: Notifications.AndroidImportance.MAX, vibrationPattern: [0, 250, 250, 250], lightColor: '#FF231F7C' }); 
          } catch (error) {}
        }
      }
    };
    requestPermissions();
  }, []);

  const scheduleReminders = async (eventDate: string, ev: Event) => {
    if (Platform.OS === 'web' || !ev.reminders || ev.reminders.length === 0) return;
    const [year, month, day] = eventDate.split('-').map(Number);
    let startHour = 8; let startMinute = 0;
    
    if (!ev.isAllDay && ev.time) {
      const parts = ev.time.split(':');
      if(parts.length === 2) { startHour = Number(parts[0]); startMinute = Number(parts[1]); }
    }
    const eventDateTime = new Date(year, month - 1, day, startHour, startMinute);
    
    for (const reminder of ev.reminders) {
      const triggerTime = new Date(eventDateTime.getTime());
      const amt = parseInt(reminder.amount) || 0;
      
      if (reminder.unit === 'minutes') triggerTime.setMinutes(triggerTime.getMinutes() - amt);
      if (reminder.unit === 'hours') triggerTime.setHours(triggerTime.getHours() - amt);
      if (reminder.unit === 'days') triggerTime.setDate(triggerTime.getDate() - amt);
      
      if (triggerTime > new Date()) {
        await Notifications.scheduleNotificationAsync({ content: { title: ev.title, body: ev.description || '', sound: true }, trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: triggerTime, channelId: 'default' } });
      }
    }
  };

  const getMonthGrid = (): CalendarDay[] => {
    const year = currentMonth.getFullYear(); const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay(); const daysInMonth = new Date(year, month + 1, 0).getDate();
    const grid: CalendarDay[] = [];
    
    for (let i = 0; i < firstDay; i++) grid.push({ dateString: `empty-start-${i}`, dayNumber: '', isCurrentMonth: false });
    for (let i = 1; i <= daysInMonth; i++) {
      grid.push({ dateString: `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`, dayNumber: i.toString(), isCurrentMonth: true });
    }
    const remainder = grid.length % 7;
    if (remainder !== 0) { 
      for (let i = 0; i < (7 - remainder); i++) grid.push({ dateString: `empty-end-${i}`, dayNumber: '', isCurrentMonth: false }); 
    }
    return grid;
  };

  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));

  const handleAddEvent = async (dateStr: string, ev: Event) => {
    try {
      await addDoc(collection(db, 'families', familyId, 'events'), { date: dateStr, ...ev });
      scheduleReminders(dateStr, ev);
    } catch (error) { showAlert(t('error'), t('cloudError'), 'error'); }
  };

  const updateEvent = async (dateStr: string, ev: Event) => {
    try {
      await updateDoc(doc(db, 'families', familyId, 'events', ev.id), { ...ev });
      scheduleReminders(dateStr, ev);
    } catch (error) { showAlert(t('error'), t('editError'), 'error'); }
  };

  const deleteEvent = async (dateStr: string, eventId: string) => {
    try { await deleteDoc(doc(db, 'families', familyId, 'events', eventId)); } 
    catch (error) { showAlert(t('error'), t('deleteError'), 'error'); }
  };

  const addMember = async (name: string, color: string) => {
    if (!name.trim()) return;
    const newMembers = [...members, { id: Date.now().toString(), name, color }];
    setMembers(newMembers); await setDoc(doc(db, 'families', familyId), { members: newMembers }, { merge: true });
  };

  const updateMember = async (id: string, name: string, color: string) => {
    if (!name.trim()) return;
    const newMembers = members.map(m => m.id === id ? { ...m, name, color } : m);
    setMembers(newMembers); await setDoc(doc(db, 'families', familyId), { members: newMembers }, { merge: true });
  };

  const deleteMember = async (id: string) => {
    if (members.length <= 1) return showAlert(t('error'), t('keepOneMember'), 'error');
    const newMembers = members.filter(m => m.id !== id);
    setMembers(newMembers);
    if (selectedParticipantId === id) setSelectedParticipantId(newMembers[0].id);
    await setDoc(doc(db, 'families', familyId), { members: newMembers }, { merge: true });
  };

  const updateVisualPreferences = async (updates: any) => {
    if (updates.theme) setTheme(updates.theme);
    if (updates.appBackgroundColor) setAppBackgroundColor(updates.appBackgroundColor);
    if (updates.numberColor) setNumberColor(updates.numberColor);
    if (updates.fabColor) setFabColor(updates.fabColor);
    await setDoc(doc(db, 'families', familyId), updates, { merge: true });
  };

  const importDeviceEvents = async (targetParticipantId: string) => {
    try {
      setIsImporting(true);
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      if (status !== 'granted') { setIsImporting(false); return showAlert(t('error'), t('permDenied'), 'error'); }
      
      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      const calendarIds = calendars.map(c => c.id);
      if (calendarIds.length === 0) { setIsImporting(false); return showAlert(t('warning'), t('noCalendar'), 'warning'); }
      
      const startDate = new Date(); startDate.setMonth(startDate.getMonth() - 1);
      const endDate = new Date(); endDate.setMonth(endDate.getMonth() + 6);
      const nativeEvents = await Calendar.getEventsAsync(calendarIds, startDate, endDate);
      
      if (nativeEvents.length === 0) { setIsImporting(false); return showAlert(t('info'), t('noEvents'), 'info'); }

      let addedCount = 0; 
      for (const ev of nativeEvents) {
        const dStart = new Date(ev.startDate); const dEnd = new Date(ev.endDate); 
        const dateStr = `${dStart.getFullYear()}-${String(dStart.getMonth() + 1).padStart(2, '0')}-${String(dStart.getDate()).padStart(2, '0')}`;
        
        let checkArray = events[dateStr] || [];
        const isDuplicate = checkArray.some(existingEv => existingEv.title === ev.title && existingEv.participantId === targetParticipantId);

        if (!isDuplicate) {
          await addDoc(collection(db, 'families', familyId, 'events'), {
            date: dateStr, title: ev.title, participantId: targetParticipantId, description: ev.notes || '',
            time: ev.allDay ? '' : dStart.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
            endTime: ev.allDay ? '' : dEnd.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
            isAllDay: ev.allDay
          });
          addedCount++;
        }
      }
      if (addedCount === 0) showAlert(t('success'), t('upToDate'), 'success');
      else showAlert(t('success'), `${addedCount} ${t('eventsSynced')}`, 'success');
    } catch (error) { showAlert(t('error'), t('cloudError'), 'error'); } 
    finally { setIsImporting(false); }
  };

  return (
    <CalendarContext.Provider value={{
      events, selectedDate, setSelectedDate, selectedParticipantId, setSelectedParticipantId, 
      handleAddEvent, updateEvent, deleteEvent, monthGrid: getMonthGrid(), 
      currentMonthName: currentMonth.toLocaleString('fr-FR', { month: 'long', year: 'numeric' }),
      nextMonth, prevMonth, members, addMember, updateMember, deleteMember, 
      theme, appBackgroundColor, numberColor, fabColor, updateVisualPreferences,
      importDeviceEvents, isImporting, showAlert
    }}>
      {children}
      <Modal visible={alertConfig.visible} transparent={true} animationType="fade">
        <View style={styles.alertOverlay}>
          <View style={styles.alertBox}>
            <Ionicons name={alertConfig.type === 'error' ? 'close-circle' : alertConfig.type === 'success' ? 'checkmark-circle' : 'information-circle'} size={50} color={alertConfig.type === 'error' ? '#EF4444' : alertConfig.type === 'success' ? '#10B981' : '#3B82F6'} />
            <Text style={styles.alertTitle}>{alertConfig.title}</Text>
            <Text style={styles.alertMessage}>{alertConfig.message}</Text>
            <TouchableOpacity style={styles.alertBtn} onPress={() => setAlertConfig({...alertConfig, visible: false})}>
              <Text style={styles.alertBtnText}>{t('ok')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </CalendarContext.Provider>
  );
};

const styles = StyleSheet.create({
  alertOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  alertBox: { width: '85%', backgroundColor: '#FFFFFF', padding: 25, borderRadius: 24, alignItems: 'center', elevation: 10 },
  alertTitle: { fontSize: 20, fontWeight: 'bold', color: '#0F172A', marginTop: 15, marginBottom: 10, textAlign: 'center' },
  alertMessage: { fontSize: 15, color: '#64748B', textAlign: 'center', marginBottom: 25, lineHeight: 22 },
  alertBtn: { backgroundColor: '#0F172A', width: '100%', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  alertBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 }
});