import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';

/**
 * THEME COLORS
 * Easily modify these values to change the entire look of the form.
 */
const COLORS = {
  primary: '#6366F1',       // Main accent color (Indigo)
  primaryLight: '#EEF2FF',  // Light background for selected items
  background: '#F1F5F9',    // Input background
  textMain: '#0F172A',      // Dark slate for main text
  textMuted: '#64748B',     // Gray for labels and placeholders
  cardBg: '#FFFFFF',        // Form background
  border: '#E2E8F0',        // Subtle borders
  
  // Participant specific colors
  me: '#3B82F6',            // Blue
  girlfriend: '#EC4899',    // Pink
  both: '#8B5CF6',          // Purple
};

/**
 * Interface defining the properties expected by the EventForm component.
 */
interface EventFormProps {
  selectedDate: string;
  eventTitle: string;
  setEventTitle: (title: string) => void;
  participant: string;
  setParticipant: (participant: string) => void;
  handleAddEvent: () => void;
}

/**
 * EventForm Component
 * Renders a modern card containing the input fields to create a new event.
 */
export default function EventForm({
  selectedDate,
  eventTitle,
  setEventTitle,
  participant,
  setParticipant,
  handleAddEvent
}: EventFormProps) {
  
  /**
   * Returns the specific color associated with a participant tag.
   */
  const getParticipantColor = (tag: string) => {
    switch(tag) {
      case 'Me': return COLORS.me;
      case 'Girlfriend': return COLORS.girlfriend;
      default: return COLORS.both;
    }
  };

  return (
    <View style={styles.card}>
      {/* Header showing the selected date */}
      <View style={styles.dateHeader}>
        <Text style={styles.dateLabel}>Plan for</Text>
        <Text style={styles.dateValue}>{selectedDate}</Text>
      </View>
      
      {/* Text Input for the event title */}
      <TextInput
        style={styles.input}
        placeholder="What are we doing? (e.g., Dinner, Movie)"
        placeholderTextColor={COLORS.textMuted}
        value={eventTitle}
        onChangeText={setEventTitle}
      />

      <Text style={styles.subLabel}>Who is involved?</Text>
      
      {/* Participant Selection Buttons */}
      <View style={styles.tagContainer}>
        {['Me', 'Both', 'Girlfriend'].map((tag) => {
          const isSelected = participant === tag;
          const tagColor = getParticipantColor(tag);
          
          return (
            <TouchableOpacity
              key={tag}
              style={[
                styles.tagButton, 
                isSelected && { backgroundColor: tagColor, borderColor: tagColor }
              ]}
              onPress={() => setParticipant(tag)}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.tagText, 
                isSelected && styles.tagTextSelected
              ]}>
                {tag}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Submit Button */}
      <TouchableOpacity style={styles.addButton} onPress={handleAddEvent} activeOpacity={0.8}>
        <Text style={styles.addButtonText}>Add Event</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { 
    backgroundColor: COLORS.cardBg, 
    borderRadius: 24, 
    padding: 20, 
    marginBottom: 20, 
    // Modern soft shadow
    shadowColor: '#64748B', 
    shadowOffset: { width: 0, height: 12 }, 
    shadowOpacity: 0.06, 
    shadowRadius: 16, 
    elevation: 4 
  },
  dateHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 20 
  },
  dateLabel: { 
    fontSize: 16, 
    color: COLORS.textMuted, 
    fontWeight: '600' 
  },
  dateValue: { 
    fontSize: 15, 
    color: COLORS.primary, 
    fontWeight: '700', 
    backgroundColor: COLORS.primaryLight, 
    paddingHorizontal: 14, 
    paddingVertical: 8, 
    borderRadius: 12,
    overflow: 'hidden'
  },
  input: { 
    backgroundColor: COLORS.background, 
    borderRadius: 16, 
    padding: 16, 
    fontSize: 16, 
    color: COLORS.textMain, 
    marginBottom: 24,
    fontWeight: '500'
  },
  subLabel: { 
    fontSize: 14, 
    fontWeight: '700', 
    color: COLORS.textMain, 
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  tagContainer: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginBottom: 28, 
    gap: 10 
  },
  tagButton: { 
    flex: 1, 
    paddingVertical: 14, 
    borderRadius: 14, 
    borderWidth: 1.5, 
    borderColor: COLORS.border, 
    backgroundColor: COLORS.cardBg, 
    alignItems: 'center' 
  },
  tagText: { 
    color: COLORS.textMuted, 
    fontWeight: '600', 
    fontSize: 14 
  },
  tagTextSelected: { 
    color: '#FFFFFF', 
    fontWeight: '700' 
  },
  addButton: { 
    backgroundColor: COLORS.textMain, 
    paddingVertical: 18, 
    borderRadius: 16, 
    alignItems: 'center',
    shadowColor: COLORS.textMain,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  addButtonText: { 
    color: '#FFFFFF', 
    fontWeight: '800', 
    fontSize: 16,
    letterSpacing: 0.5
  },
});