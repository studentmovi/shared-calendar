import { useContext } from 'react';
import { CalendarContext } from '../context/CalendarContext';
// On ré-exporte les types pour index.tsx
export * from '../context/CalendarContext';

export const useSharedCalendar = () => {
  const context = useContext(CalendarContext);
  if (!context) {
    throw new Error("useSharedCalendar doit être utilisé dans un CalendarProvider");
  }
  return context;
};