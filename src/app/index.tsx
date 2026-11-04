import { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Calendar } from "react-native-calendars";

/**
 * Interface defining the structure of an Event object.
 * Helps TypeScript understand what data belongs to an event.
 */
interface Event {
  title: string;
  participant: string;
}

/**
 * Main Screen Component for the Shared Calendar.
 * This component handles the UI and local state for event management.
 */
export default function SharedCalendarScreen() {
  // State: Stores all events. The key is the date string (YYYY-MM-DD)
  const [events, setEvents] = useState<Record<string, Event[]>>({});

  // State: Stores the currently selected date on the calendar
  const [selectedDate, setSelectedDate] = useState<string>("");

  // State: Stores the text input for a new event title
  const [eventTitle, setEventTitle] = useState<string>("");

  // State: Tracks the selected participant for the event ('Me', 'Girlfriend', or 'Both')
  const [participant, setParticipant] = useState<string>("Both");

  /**
   * Checks if an event already exists on the selected date to prevent accidental double-booking.
   *
   * @param dateString - The date to check in YYYY-MM-DD format
   * @returns boolean - True if an event exists, false otherwise
   */
  const checkConflict = (dateString: string): boolean => {
    if (events[dateString] && events[dateString].length > 0) {
      return true;
    }
    return false;
  };

  /**
   * Handles the action when the "Add Event" button is pressed.
   * Includes validation for empty inputs and a warning prompt if a scheduling conflict exists.
   */
  const handleAddEvent = () => {
    // Validation: Prevent empty submissions
    if (!selectedDate || !eventTitle) {
      Alert.alert("Error", "Please select a date and enter an event title.");
      return;
    }

    // Check for scheduling conflicts
    if (checkConflict(selectedDate)) {
      Alert.alert(
        "Conflict Detected",
        "An event is already scheduled for this date. Do you want to proceed?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Add Anyway", onPress: () => saveEvent() },
        ],
      );
    } else {
      saveEvent();
    }
  };

  /**
   * Constructs the event object and saves it into the local state.
   * Also resets the input fields upon successful save.
   */
  const saveEvent = () => {
    const newEvent: Event = {
      title: eventTitle,
      participant: participant,
    };

    // Update state: Keep existing events and append the new one to the selected date
    setEvents((prevEvents) => ({
      ...prevEvents,
      [selectedDate]: [...(prevEvents[selectedDate] || []), newEvent],
    }));

    // Reset input and notify user
    setEventTitle("");
    Alert.alert("Success", "Event added successfully!");
  };

  /**
   * Formats the stored events into the specific object structure required
   * by the 'react-native-calendars' library to display visual markers (dots).
   */
  const getMarkedDates = () => {
    let marked: any = {};

    // Add a dot to every date that contains at least one event
    Object.keys(events).forEach((date) => {
      marked[date] = { marked: true, dotColor: "#50cebb" };
    });

    // Visually highlight the date the user has currently tapped on
    if (selectedDate) {
      marked[selectedDate] = {
        ...marked[selectedDate],
        selected: true,
        selectedColor: "#00adf5",
      };
    }
    return marked;
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Our Shared Calendar</Text>

      {/* Calendar Library Component */}
      <Calendar
        onDayPress={(day: any) => setSelectedDate(day.dateString)}
        markedDates={getMarkedDates()}
        theme={{
          selectedDayBackgroundColor: "#00adf5",
          todayTextColor: "#00adf5",
          arrowColor: "orange",
        }}
      />

      {/* Conditional Rendering: Show the form only when a date is selected */}
      {selectedDate ? (
        <View style={styles.formContainer}>
          <Text style={styles.dateLabel}>Selected Date: {selectedDate}</Text>

          <TextInput
            style={styles.input}
            placeholder="Event Title (e.g. Dinner, Movie)"
            value={eventTitle}
            onChangeText={setEventTitle}
          />

          <Text style={styles.label}>Who is this for?</Text>

          {/* Map through options to generate participant selection buttons */}
          <View style={styles.tagContainer}>
            {["Me", "Girlfriend", "Both"].map((tag) => (
              <TouchableOpacity
                key={tag}
                style={[
                  styles.tagButton,
                  participant === tag && styles.tagButtonSelected,
                ]}
                onPress={() => setParticipant(tag)}
              >
                <Text
                  style={
                    participant === tag
                      ? styles.tagTextSelected
                      : styles.tagText
                  }
                >
                  {tag}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.addButton} onPress={handleAddEvent}>
            <Text style={styles.addButtonText}>Add Event</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Text style={styles.instructions}>Select a date to add an event.</Text>
      )}

      {/* Map through the selected date's events to display them below the form */}
      <View style={styles.eventList}>
        <Text style={styles.listHeader}>
          Events for {selectedDate || "..."} :
        </Text>
        {events[selectedDate]?.map((ev, index) => (
          <View key={index} style={styles.eventItem}>
            <Text style={styles.eventTitle}>{ev.title}</Text>
            <Text style={styles.eventTag}>[{ev.participant}]</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

// Styling rules for the components
const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: "#fff",
    paddingTop: 50,
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  formContainer: {
    marginTop: 20,
  },
  dateLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 10,
  },
  tagContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  tagButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: "#00adf5",
    borderRadius: 20,
  },
  tagButtonSelected: {
    backgroundColor: "#00adf5",
  },
  tagText: {
    color: "#00adf5",
  },
  tagTextSelected: {
    color: "#fff",
    fontWeight: "bold",
  },
  addButton: {
    backgroundColor: "#28a745",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  instructions: {
    marginTop: 30,
    textAlign: "center",
    color: "#666",
    fontStyle: "italic",
  },
  eventList: {
    marginTop: 30,
  },
  listHeader: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  eventItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#f9f9f9",
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: "#00adf5",
  },
  eventTitle: {
    fontSize: 16,
  },
  eventTag: {
    fontSize: 14,
    color: "#888",
  },
});
