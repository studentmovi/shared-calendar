import React, { createContext, useState, ReactNode } from 'react';
import { Alert } from 'react-native';
import * as Calendar from 'expo-calendar/legacy';

export interface Event {
  id: string;
  title: string;
  participantId: string;
  description?: string;
  time?: string;
  endTime?: string; // NOUVEAU : Heure de fin
  isAllDay?: boolean; 
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

export const CalendarProvider = ({ children }: { children: ReactNode }) => {
  const [events, setEvents] = useState<Record<string, Event[]>>({});
  
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [eventTitle, setEventTitle] = useState<string>('');
  const [eventDescription, setEventDescription] = useState<string>('');
  const [eventTime, setEventTime] = useState<string>(''); 
  const [eventEndTime, setEventEndTime] = useState<string>(''); // NOUVEAU : État pour l'heure de fin
  const [isEventAllDay, setIsEventAllDay] = useState<boolean>(false); 
  
  const [selectedParticipantId, setSelectedParticipantId] = useState<string>(INITIAL_MEMBERS[0].id);
  
  const [members, setMembers] = useState<Member[]>(INITIAL_MEMBERS);
  const [appBackgroundColor, setAppBackgroundColor] = useState<string>('#FF4D4D');
  const [currentMonth, setCurrentMonth] = useState(new Date());

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

  const handleAddEvent = () => {
    if (!eventTitle.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer un titre.');
      return;
    }
    const newEvent: Event = { 
      id: Date.now().toString(),
      title: eventTitle.trim(), 
      participantId: selectedParticipantId,
      description: eventDescription.trim(),
      time: eventTime.trim(),
      endTime: eventEndTime.trim(),
      isAllDay: isEventAllDay
    };
    
    setEvents(prev => ({
      ...prev,
      [selectedDate]: [...(prev[selectedDate] || []), newEvent]
    }));
    
    setEventTitle('');
    setEventDescription('');
    setEventTime('');
    setEventEndTime('');
    setIsEventAllDay(false);
  };

  const updateEvent = (dateString: string, updatedEvent: Event) => {
    setEvents(prev => ({
      ...prev,
      [dateString]: prev[dateString].map(ev => ev.id === updatedEvent.id ? updatedEvent : ev)
    }));
  };

  const deleteEvent = (dateString: string, eventId: string) => {
    setEvents(prev => ({
      ...prev,
      [dateString]: prev[dateString].filter(ev => ev.id !== eventId)
    }));
  };

  const addMember = (name: string, color: string) => {
    if (!name.trim()) return;
    setMembers([...members, { id: Date.now().toString(), name, color }]);
  };
  const updateMember = (id: string, name: string, color: string) => {
    if (!name.trim()) return;
    setMembers(members.map(m => m.id === id ? { ...m, name, color } : m));
  };
  const deleteMember = (id: string) => {
    if (members.length <= 1) return Alert.alert('Erreur', 'Vous devez garder au moins un membre.');
    setMembers(members.filter(m => m.id !== id));
    if (selectedParticipantId === id) setSelectedParticipantId(members[0].id);
  };

  const importDeviceEvents = async (targetParticipantId: string) => {
    try {
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      if (status !== 'granted') return Alert.alert('Erreur', 'Permission refusée.');

      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      const calendarIds = calendars.map(c => c.id);
      if (calendarIds.length === 0) return Alert.alert('Info', 'Aucun calendrier trouvé.');

      const startDate = new Date(); startDate.setMonth(startDate.getMonth() - 1);
      const endDate = new Date(); endDate.setMonth(endDate.getMonth() + 6);
      const nativeEvents = await Calendar.getEventsAsync(calendarIds, startDate, endDate);

      if (nativeEvents.length === 0) return Alert.alert('Info', 'Aucun événement à importer.');

      const importedData: Record<string, Event[]> = {};

      nativeEvents.forEach(ev => {
        const dStart = new Date(ev.startDate);
        const dEnd = new Date(ev.endDate); // NOUVEAU : On récupère l'heure de fin
        const dateStr = `${dStart.getFullYear()}-${String(dStart.getMonth() + 1).padStart(2, '0')}-${String(dStart.getDate()).padStart(2, '0')}`;
        
        if (!importedData[dateStr]) importedData[dateStr] = [];
        
        importedData[dateStr].push({
          id: ev.id || Date.now().toString() + Math.random(),
          title: ev.title,
          participantId: targetParticipantId,
          description: ev.notes || '',
          time: ev.allDay ? undefined : dStart.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
          endTime: ev.allDay ? undefined : dEnd.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
          isAllDay: ev.allDay
        });
      });

      setEvents(prev => {
        const nextState = { ...prev };
        Object.keys(importedData).forEach(date => {
          const existingIds = new Set((nextState[date] || []).map(e => e.id));
          const newEvents = importedData[date].filter(e => !existingIds.has(e.id));
          nextState[date] = [...(nextState[date] || []), ...newEvents];
        });
        return nextState;
      });

      Alert.alert('Succès', `${nativeEvents.length} événements synchronisés !`);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de lire les calendriers.');
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
      appBackgroundColor, setAppBackgroundColor, importDeviceEvents
    }}>
      {children}
    </CalendarContext.Provider>
  );
};