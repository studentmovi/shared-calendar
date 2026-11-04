import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  CalendarDay,
  useSharedCalendar
} from "../hooks/useSharedCalendar";
// Note: Dans un projet réel, utilisez expo-linear-gradient pour le vrai fond dégradé

export default function SharedCalendarScreen() {
  const {
    events,
    selectedDate,
    setSelectedDate,
    eventTitle,
    setEventTitle,
    selectedParticipantId,
    setSelectedParticipantId,
    handleAddEvent,
    monthGrid,
    currentMonthName,
    members,
    appBackgroundColor,
  } = useSharedCalendar();

  const daysOfWeek = ["S", "M", "T", "W", "T", "F", "S"];

  // Trouve la couleur du membre
  const getMemberColor = (id: string) => {
    return members.find((m) => m.id === id)?.color || "#CCCCCC";
  };

  const renderDayCell = (day: CalendarDay, index: number) => {
    if (!day.isCurrentMonth) {
      return <View key={index} style={styles.emptyCell} />;
    }

    const isSelected = selectedDate === day.dateString;
    const dayEvents = events[day.dateString] || [];
    // Simuler le 14 du mois comme "Aujourd'hui" (Fond gris clair)
    const isToday = day.dayNumber === "14";

    return (
      <TouchableOpacity
        key={index}
        style={[
          styles.dayCell,
          isSelected && styles.dayCellSelected,
          isToday && styles.dayCellToday,
        ]}
        onPress={() => setSelectedDate(day.dateString)}
        activeOpacity={0.6}
      >
        <Text style={[styles.dayNumber, isToday && styles.textBold]}>
          {day.dayNumber}
        </Text>

        <View style={styles.pillContainer}>
          {dayEvents.map((ev, i) => (
            <View
              key={i}
              style={[
                styles.eventPill,
                { backgroundColor: getMemberColor(ev.participantId) },
              ]}
            >
              <Text
                style={[
                  styles.pillText,
                  // Si la pilule est blanche ou très claire, on met le texte en noir
                  getMemberColor(ev.participantId) === "#FFFFFF"
                    ? { color: "#000" }
                    : {},
                ]}
                numberOfLines={1}
              >
                {ev.title}
              </Text>
            </View>
          ))}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: appBackgroundColor }]}>
      {/* HEADER SECTION (Top colored area) */}
      <View style={styles.headerArea}>
        <View style={styles.topBar}>
          <Text style={styles.monthTitle}>{currentMonthName}</Text>
          {/* Ici viendront les icônes de liste et de paramètres */}
        </View>

        {/* Members Horizontal List */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.membersScroll}
        >
          {members.map((member) => (
            <View
              key={member.id}
              style={[styles.memberBadge, { backgroundColor: member.color }]}
            >
              <Text
                style={[
                  styles.memberBadgeText,
                  member.color === "#FFFFFF" ? { color: "#000" } : {},
                ]}
              >
                {member.name}
              </Text>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* CALENDAR SECTION (White background area) */}
      <View style={styles.calendarArea}>
        <View style={styles.daysRow}>
          {daysOfWeek.map((day, i) => (
            <Text key={i} style={styles.dayOfWeekText}>
              {day}
            </Text>
          ))}
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.grid}>
            {monthGrid.map((day, index) => renderDayCell(day, index))}
          </View>

          {/* Form Section (appears below calendar when a date is selected) */}
          {selectedDate && (
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Add event for {selectedDate}</Text>
              <TextInput
                style={styles.input}
                placeholder="Event title..."
                value={eventTitle}
                onChangeText={setEventTitle}
              />

              {/* Quick participant selector for the form */}
              <ScrollView horizontal style={styles.formParticipantScroll}>
                {members.map((m) => (
                  <TouchableOpacity
                    key={m.id}
                    style={[
                      styles.formParticipantBtn,
                      { backgroundColor: m.color },
                      selectedParticipantId === m.id &&
                        styles.formParticipantBtnSelected,
                    ]}
                    onPress={() => setSelectedParticipantId(m.id)}
                  >
                    <Text
                      style={m.color === "#FFFFFF" ? { color: "#000" } : {}}
                    >
                      {m.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <TouchableOpacity style={styles.addBtn} onPress={handleAddEvent}>
                <Text style={styles.addBtnText}>Add</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, // Color defined inline

  // Header Area
  headerArea: { paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20 },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  monthTitle: { fontSize: 32, fontWeight: "bold", color: "#FFFFFF" },

  membersScroll: { flexDirection: "row" },
  memberBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
  },
  memberBadgeText: { fontWeight: "bold", color: "#333" },

  // Calendar Area
  calendarArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 20,
    paddingHorizontal: 10,
  },
  daysRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 10,
  },
  dayOfWeekText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#94A3B8",
    width: "14.28%",
    textAlign: "center",
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
  },

  // Cells
  emptyCell: { width: "14.28%", height: 100, padding: 2 },
  dayCell: {
    width: "14.28%",
    height: 100,
    padding: 2,
    borderTopWidth: 1,
    borderColor: "#F1F5F9",
    alignItems: "center",
  },
  dayCellSelected: { borderWidth: 2, borderColor: "#333", borderRadius: 8 },
  dayCellToday: { backgroundColor: "#F1F5F9" },
  dayNumber: { fontSize: 14, color: "#333", marginBottom: 4, marginTop: 4 },
  textBold: { fontWeight: "bold" },

  // Pills
  pillContainer: { width: "100%", alignItems: "center", gap: 2 },
  eventPill: {
    width: "98%",
    paddingVertical: 3,
    paddingHorizontal: 2,
    borderRadius: 4,
  },
  pillText: {
    color: "#333",
    fontSize: 10,
    fontWeight: "600",
    textAlign: "center",
  },

  // Form
  formSection: {
    padding: 20,
    marginTop: 20,
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
  },
  formLabel: { fontWeight: "bold", marginBottom: 10 },
  input: {
    backgroundColor: "#FFF",
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  formParticipantScroll: { marginBottom: 15, flexDirection: "row" },
  formParticipantBtn: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 12,
    marginRight: 10,
    borderWidth: 2,
    borderColor: "transparent",
  },
  formParticipantBtnSelected: { borderColor: "#333" },
  addBtn: {
    backgroundColor: "#0F172A",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  addBtnText: { color: "#FFF", fontWeight: "bold" },
});
