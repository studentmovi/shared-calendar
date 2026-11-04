import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
// Ensure the Event interface is exported from your hook
import { Event } from '../hooks/useSharedCalendar'; 

/**
 * THEME COLORS
 * Matches the colors defined in the EventForm for consistency.
 */
const COLORS = {
  textMain: '#0F172A',
  textMuted: '#64748B',
  cardBg: '#FFFFFF',
  
  // Participant specific colors mapped to borders
  me: '#3B82F6',
  girlfriend: '#EC4899',
  both: '#8B5CF6',
};

/**
 * Interface defining the properties expected by the EventList component.
 */
interface EventListProps {
  eventsForDate: Event[] | undefined;
}

/**
 * EventList Component
 * Renders a list of scheduled events for the selected date.
 */
export default function EventList({ eventsForDate }: EventListProps) {
  
  /**
   * Determines the border color of the event card based on who is involved.
   */
  const getParticipantColor = (tag: string) => {
    switch(tag) {
      case 'Me': return COLORS.me;
      case 'Girlfriend': return COLORS.girlfriend;
      default: return COLORS.both;
    }
  };

  // If there are no events, don't render the list section at all
  if (!eventsForDate || eventsForDate.length === 0) {
    return null;
  }

  return (
    <View style={styles.listContainer}>
      <Text style={styles.listHeader}>Scheduled Events</Text>
      
      {/* Iterate through the events and render a card for each */}
      {eventsForDate.map((ev, index) => (
        <View 
          key={index} 
          style={[
            styles.eventItem, 
            { borderLeftColor: getParticipantColor(ev.participant) }
          ]}
        >
          <View>
            <Text style={styles.eventTitle}>{ev.title}</Text>
            <Text style={styles.eventTag}>{ev.participant}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  listContainer: { 
    marginTop: 10,
    paddingBottom: 20
  },
  listHeader: { 
    fontSize: 22, 
    fontWeight: '800', 
    color: COLORS.textMain, 
    marginBottom: 16,
    letterSpacing: -0.5
  },
  eventItem: { 
    backgroundColor: COLORS.cardBg, 
    padding: 18, 
    borderRadius: 16, 
    marginBottom: 14, 
    borderLeftWidth: 6, // The colored accent line
    // Soft shadow for list items
    shadowColor: '#64748B', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.04, 
    shadowRadius: 8, 
    elevation: 2 
  },
  eventTitle: { 
    fontSize: 17, 
    fontWeight: '700', 
    color: COLORS.textMain, 
    marginBottom: 6 
  },
  eventTag: { 
    fontSize: 14, 
    color: COLORS.textMuted, 
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  }
});