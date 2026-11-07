import React, { createContext, useState, ReactNode, useEffect } from 'react';
import { Alert, Platform } from 'react-native';
import * as Calendar from 'expo-calendar/legacy';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase'; 

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface Event {
  id: string;
  title: string;
  participantId: string;
  description?: string;
  time?: string;
  endTime?: string;
  isAllDay?: boolean; 
  date?: string; 
}

export interface CalendarDay {
  dateString: string;
  dayNumber: string;
  isCurrentMonth: boolean;
}

export interface Member {
  id: string;
  name: string;
  color: string;
}

const INITIAL_MEMBERS: Member[] = [
  { id: '1', name: 'You', color: '#FFFFFF' },
  { id: '2', name: 'Ivy', color: '#FBCFE8' },
  { id: '3', name: 'Priya', color: '#FDE047' },
];

export const CalendarContext = createContext<any>(null);

export const CalendarProvider = ({ children, familyId }: { children: ReactNode, familyId: string }) => {
  const [events, setEvents] = useState<Record<string, Event[]>>({});
  
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [eventTitle, setEventTitle] = useState<string>('');
  const [eventDescription, setEventDescription] = useState<string>('');
  const [eventTime, setEventTime] = useState<string>(''); 
  const [eventEndTime, setEventEndTime] = useState<string>(''); 
  const [isEventAllDay, setIsEventAllDay] = useState<boolean>(false); 
  
  const [selectedParticipantId, setSelectedParticipantId] = useState<string>(INITIAL_MEMBERS[0].id);
  const [members, setMembers] = useState<Member[]>(INITIAL_MEMBERS);
  const [appBackgroundColor, setAppBackgroundColor] = useState<string>('#FF4D4D');
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const [isImporting, setIsImporting] = useState<boolean>(false);

  useEffect(() => {
    if (!familyId) return;
    const unsubscribe = onSnapshot(collection(db, 'families', familyId, 'events'), (snapshot) => {
      const cloudEvents: Record<string, Event[]> = {};
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const eventDate = data.date;
        if (!cloudEvents[eventDate]) cloudEvents[eventDate] = [];
        cloudEvents[eventDate].push({
          id: docSnap.id, 
          title: data.title,
          participantId: data.participantId,
          description: data.description,
          time: data.time,
          endTime: data.endTime,
          isAllDay: data.isAllDay,
          date: data.date
        });
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
        if (data.appBackgroundColor) setAppBackgroundColor(data.appBackgroundColor);
      } else {
        setDoc(doc(db, 'families', familyId), {
          members: INITIAL_MEMBERS,
          appBackgroundColor: '#FF4D4D'
        });
      }
    });
    return () => unsubscribe();
  }, [familyId]);

  useEffect(() => {
    const requestPermissions = async () => {
      if (Device.isDevice && Platform.OS !== 'web') {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (Platform.OS === 'android') {
          try {
            await Notifications.setNotificationChannelAsync('default', {
              name: 'default',
              importance: Notifications.AndroidImportance.MAX,
              vibrationPattern: [0, 250, 250, 250],
              lightColor: '#FF231F7C',
            });
          } catch (error) {
            console.log("Canal ignoré dans Expo Go : ", error);
          }
        }
      }
    };
    requestPermissions();
  }, []);

  const scheduleEventNotification = async (title: string, date: string) => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Nouvel événement ajouté 📅",
        body: `${title} a été programmé pour le ${date}.`,
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 2,
        channelId: 'default',
      },
    });
  };

  const getMonthGrid = (): CalendarDay[] => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const grid: CalendarDay[] = [];
    for (let i = 0; i < firstDay; i++) grid.push({ dateString: `empty-start-${i}`, dayNumber: '', isCurrentMonth: false });
    for (let i = 1; i <= daysInMonth; i++) {
      const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      grid.push({ dateString, dayNumber: i.toString(), isCurrentMonth: true });
    }
    const remainder = grid.length % 7;
    if (remainder !== 0) {
      for (let i = 0; i < (7 - remainder); i++) grid.push({ dateString: `empty-end-${i}`, dayNumber: '', isCurrentMonth: false });
    }
    return grid;
  };

  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));

  const handleAddEvent = async () => {
    if (!eventTitle.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer un titre.');
      return;
    }
    try {
      await addDoc(collection(db, 'families', familyId, 'events'), {
        date: selectedDate,
        title: eventTitle.trim(),
        participantId: selectedParticipantId,
        description: eventDescription.trim(),
        time: eventTime.trim(),
        endTime: eventEndTime.trim(),
        isAllDay: isEventAllDay
      });
      if (Platform.OS !== 'web') scheduleEventNotification(eventTitle.trim(), selectedDate);
      setEventTitle(''); setEventDescription(''); setEventTime(''); setEventEndTime(''); setIsEventAllDay(false);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de sauvegarder sur le cloud.');
    }
  };

  const updateEvent = async (dateString: string, updatedEvent: Event) => {
    try {
      await updateDoc(doc(db, 'families', familyId, 'events', updatedEvent.id), {
        title: updatedEvent.title, participantId: updatedEvent.participantId,
        description: updatedEvent.description, time: updatedEvent.time,
        endTime: updatedEvent.endTime, isAllDay: updatedEvent.isAllDay,
      });
    } catch (error) { Alert.alert('Erreur', 'Impossible de modifier cet événement.'); }
  };

  const deleteEvent = async (dateString: string, eventId: string) => {
    try { await deleteDoc(doc(db, 'families', familyId, 'events', eventId)); } 
    catch (error) { Alert.alert('Erreur', 'Impossible de supprimer cet événement.'); }
  };

  const addMember = async (name: string, color: string) => {
    if (!name.trim()) return;
    const newMembers = [...members, { id: Date.now().toString(), name, color }];
    setMembers(newMembers); 
    await setDoc(doc(db, 'families', familyId), { members: newMembers }, { merge: true });
  };

  const updateMember = async (id: string, name: string, color: string) => {
    if (!name.trim()) return;
    const newMembers = members.map(m => m.id === id ? { ...m, name, color } : m);
    setMembers(newMembers);
    await setDoc(doc(db, 'families', familyId), { members: newMembers }, { merge: true });
  };

  const deleteMember = async (id: string) => {
    if (members.length <= 1) return Alert.alert('Erreur', 'Vous devez garder au moins un membre.');
    const newMembers = members.filter(m => m.id !== id);
    setMembers(newMembers);
    if (selectedParticipantId === id) setSelectedParticipantId(newMembers[0].id);
    await setDoc(doc(db, 'families', familyId), { members: newMembers }, { merge: true });
  };

  const updateAppBackgroundColor = async (color: string) => {
    setAppBackgroundColor(color);
    await setDoc(doc(db, 'families', familyId), { appBackgroundColor: color }, { merge: true });
  };

  const importDeviceEvents = async (targetParticipantId: string) => {
    try {
      setIsImporting(true);
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      if (status !== 'granted') {
        setIsImporting(false);
        return Alert.alert('Erreur', 'Permission refusée.');
      }
      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      const calendarIds = calendars.map(c => c.id);
      if (calendarIds.length === 0) {
        setIsImporting(false);
        return Alert.alert('Info', 'Aucun calendrier trouvé.');
      }
      const startDate = new Date(); startDate.setMonth(startDate.getMonth() - 1);
      const endDate = new Date(); endDate.setMonth(endDate.getMonth() + 6);
      const nativeEvents = await Calendar.getEventsAsync(calendarIds, startDate, endDate);

      if (nativeEvents.length === 0) {
        setIsImporting(false);
        return Alert.alert('Info', 'Aucun événement à importer.');
      }

      let addedCount = 0; 
      for (const ev of nativeEvents) {
        const dStart = new Date(ev.startDate);
        const dEnd = new Date(ev.endDate); 
        const dateStr = `${dStart.getFullYear()}-${String(dStart.getMonth() + 1).padStart(2, '0')}-${String(dStart.getDate()).padStart(2, '0')}`;
        
        const isDuplicate = (events[dateStr] || []).some(existingEv => 
          existingEv.title === ev.title && existingEv.participantId === targetParticipantId
        );

        if (!isDuplicate) {
          await addDoc(collection(db, 'families', familyId, 'events'), {
            date: dateStr, title: ev.title, participantId: targetParticipantId,
            description: ev.notes || '',
            time: ev.allDay ? '' : dStart.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
            endTime: ev.allDay ? '' : dEnd.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
            isAllDay: ev.allDay
          });
          addedCount++;
        }
      }
      if (addedCount === 0) Alert.alert('Info', 'Tout est déjà à jour ! Aucun nouvel événement à importer.');
      else Alert.alert('Succès', `${addedCount} nouveaux événements synchronisés dans le cloud !`);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'importer les calendriers.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <CalendarContext.Provider value={{
      events, selectedDate, setSelectedDate, 
      eventTitle, setEventTitle, eventDescription, setEventDescription,
      eventTime, setEventTime, eventEndTime, setEventEndTime,
      isEventAllDay, setIsEventAllDay,
      selectedParticipantId, setSelectedParticipantId, 
      handleAddEvent, updateEvent, deleteEvent,
      monthGrid: getMonthGrid(), currentMonthName: currentMonth.toLocaleString('fr-FR', { month: 'long', year: 'numeric' }),
      nextMonth, prevMonth,
      members, addMember, updateMember, deleteMember, 
      appBackgroundColor, setAppBackgroundColor: updateAppBackgroundColor, importDeviceEvents,
      isImporting
    }}>
      {children}
    </CalendarContext.Provider>
  );
};