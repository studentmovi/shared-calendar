import { useState } from 'react';
import { Alert } from 'react-native';

export interface Event {
  title: string;
  participantId: string;
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

// État initial (simule une base de données)
const INITIAL_MEMBERS: Member[] = [
  { id: '1', name: 'You', color: '#FFFFFF' }, // Blanc (texte noir géré dans le UI)
  { id: '2', name: 'Ivy', color: '#FBCFE8' }, // Rose clair
  { id: '3', name: 'Priya', color: '#FDE047' }, // Jaune
  { id: '4', name: 'Antonio', color: '#67E8F9' }, // Cyan
  { id: '5', name: 'Annabelle', color: '#FDBA74' }, // Orange
];

export const useSharedCalendar = () => {
  const [events, setEvents] = useState<Record<string, Event[]>>({});
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [eventTitle, setEventTitle] = useState<string>('');
  
  // Paramètres globaux
  const [members, setMembers] = useState<Member[]>(INITIAL_MEMBERS);
  const [appBackgroundColor, setAppBackgroundColor] = useState<string>('#FF4D4D'); // Rouge/Orange par défaut
  
  // Le participant sélectionné pour l'ajout (par défaut, le premier)
  const [selectedParticipantId, setSelectedParticipantId] = useState<string>(members[0]?.id || '');

  const [currentMonth, setCurrentMonth] = useState(new Date());

  const getMonthGrid = (): CalendarDay[] => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const grid: CalendarDay[] = [];
    
    for (let i = 0; i < firstDay; i++) {
      grid.push({ dateString: `empty-start-${i}`, dayNumber: '', isCurrentMonth: false });
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i);
      const dateString = d.toISOString().split('T')[0];
      grid.push({ dateString, dayNumber: i.toString(), isCurrentMonth: true });
    }
    
    const remainder = grid.length % 7;
    if (remainder !== 0) {
      for (let i = 0; i < (7 - remainder); i++) {
         grid.push({ dateString: `empty-end-${i}`, dayNumber: '', isCurrentMonth: false });
      }
    }
    return grid;
  };

  const saveEvent = () => {
    const newEvent: Event = { title: eventTitle.trim(), participantId: selectedParticipantId };
    setEvents(prev => ({
      ...prev,
      [selectedDate]: [...(prev[selectedDate] || []), newEvent]
    }));
    setEventTitle('');
    Alert.alert('Success', 'Event added!');
  };

  const handleAddEvent = () => {
    if (!eventTitle.trim()) {
      Alert.alert('Error', 'Please enter a title.');
      return;
    }
    saveEvent();
  };

  const addMember = (name: string, color: string) => {
      const newMember = { id: Date.now().toString(), name, color };
      setMembers([...members, newMember]);
  };

  return {
    events,
    selectedDate,
    setSelectedDate,
    eventTitle,
    setEventTitle,
    selectedParticipantId,
    setSelectedParticipantId,
    handleAddEvent,
    monthGrid: getMonthGrid(),
    currentMonthName: currentMonth.toLocaleString('en-US', { month: 'long' }),
    members,
    addMember,
    appBackgroundColor,
    setAppBackgroundColor
  };
};