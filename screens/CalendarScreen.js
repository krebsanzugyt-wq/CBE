import React, { useState } from "react";
import { View, Text, ScrollView, FlatList, Modal, SafeAreaView, TextInput } from "react-native";
import { styles } from "../styles";
import { GlassCard, PillButton, RowButton, ListEmpty, Chip } from "../components/ui";
import { uid, formatDateKey, parseDateKey, parseTimeToMin, addDays, startOfWeekMonday, getWeekRangeLabel, weekdayMonday1to7 } from "../utils";
import { SPORT_TYPES } from "../constants";

export function CalendarScreen({ t, plans, calendarEntries, setCalendarEntries, calendarTemplates, setCalendarTemplates, calendarWeekOffset, setCalendarWeekOffset, onApplyTemplatesToWeek }) {
  const [entryModalOpen, setEntryModalOpen] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState(null);
  const [entryDate, setEntryDate] = useState("");
  const [entryTime, setEntryTime] = useState("07:00");
  const [entryDuration, setEntryDuration] = useState("45");
  const [entryTitle, setEntryTitle] = useState("");
  const [entrySportType, setEntrySportType] = useState("Gym");
  const [entryPlanId, setEntryPlanId] = useState("");
  const [entryStatus, setEntryStatus] = useState("planned");
  const today = new Date();
  const weekStart = addDays(startOfWeekMonday(today), calendarWeekOffset * 7);
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));
  const weekdayLabel = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
  function openNewEntry(day) { setEditingEntryId(null); setEntryDate(formatDateKey(day)); setEntryTime("07:00"); setEntryDuration("45"); setEntryTitle(""); setEntrySportType("Gym"); setEntryPlanId(""); setEntryStatus("planned"); setEntryModalOpen(true); }
  function openEditEntry(e) { setEditingEntryId(e.id); setEntryDate(e.date || ""); setEntryTime(e.startTime || "07:00"); setEntryDuration(String(e.durationMin || 45)); setEntryTitle(e.title || ""); setEntrySportType(e.sportType || "Other"); setEntryPlanId(e.planId || ""); setEntryStatus(e.status || "planned"); setEntryModalOpen(true); }
  function saveEntry() {
    const date = String(entryDate || "").trim();
    const title = String(entryTitle || "").trim();
    if (!parseDateKey(date) || !title) return;
    const now = Date.now();
    setCalendarEntries((prev) => {
      const obj = { id: editingEntryId || uid(), date, startTime: entryTime || "07:00", durationMin: Math.max(1, parseInt(entryDuration || "45", 10) || 45), title, sportType: entrySportType || "Other", planId: entrySportType === "Gym" ? (entryPlanId || null) : null, status: entryStatus || "planned", templateId: editingEntryId ? prev.find((x) => x.id === editingEntryId)?.templateId || null : null, createdAt: editingEntryId ? prev.find((x) => x.id === editingEntryId)?.createdAt || now : now, updatedAt: now };
      if (editingEntryId) return prev.map((x) => (x.id === editingEntryId ? { ...x, ...obj } : x));
      return [obj, ...prev];
    });
    setEntryModalOpen(false);
  }
  function deleteEntry(id) { setCalendarEntries((prev) => prev.filter((x) => x.id !== id)); }
  function entriesForDate(dateKey) { return calendarEntries.filter((e) => e.date === dateKey).sort((a, b) => parseTimeToMin(a.startTime) - parseTimeToMin(b.startTime)); }
  return (
    <ScrollView contentContainerStyle={styles.screenPad} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
      <Text style={styles.h1}>{t.calendar.title}</Text>
      <GlassCard title="Week Planner">
        <View style={styles.rowBetween}>
          <Text style={styles.listTitle}>{getWeekRangeLabel(weekStart)}</Text>
          <View style={{ flexDirection: "row" }}>
            <PillButton label="Prev" onPress={() => setCalendarWeekOffset((v) => v - 1)} variant="secondary" />
            <PillButton label="Today" onPress={() => setCalendarWeekOffset(0)} variant="secondary" />
            <PillButton label="Next" onPress={() => setCalendarWeekOffset((v) => v + 1)} variant="secondary" />
          </View>
        </View>
      </GlassCard>
      <FlatList data={weekDays} keyExtractor={(d) => formatDateKey(d)} scrollEnabled={false} renderItem={({ item: d }) => {
        const dateKey = formatDateKey(d);
        const entries = entriesForDate(dateKey);
        return (
          <GlassCard title={`${weekdayLabel[weekdayMonday1to7(d) - 1]} • ${dateKey}`}>
            <View style={styles.rowWrap}><RowButton label="+ Add" onPress={() => openNewEntry(d)} variant="secondary" /></View>
            {entries.length === 0 ? <ListEmpty text={t.calendar.empty} /> : entries.map((e) => (
              <View key={e.id} style={styles.planItem}>
                <Text style={styles.listTitle}>{e.title}</Text>
                <Text style={styles.listMeta}>{e.startTime} • {e.durationMin} min • {e.sportType} • {e.status}</Text>
                <View style={styles.rowWrap}>
                  <RowButton label="Edit" onPress={() => openEditEntry(e)} variant="secondary" />
                  <RowButton label="Delete" onPress={() => deleteEntry(e.id)} variant="secondary" />
                </View>
              </View>
            ))}
          </GlassCard>
        );
      }} />
      <Modal visible={entryModalOpen} animationType="slide" onRequestClose={() => setEntryModalOpen(false)}>
        <SafeAreaView style={styles.modalRoot}>
          <View style={styles.modalHeader}><Text style={styles.modalTitle}>{editingEntryId ? "Edit Entry" : "New Entry"}</Text><PillButton label={t.today.close} onPress={() => setEntryModalOpen(false)} variant="secondary" /></View>
          <ScrollView contentContainerStyle={styles.screenPad}>
            <GlassCard title="Entry">
              <Text style={styles.label}>Date (YYYY-MM-DD)</Text><TextInput value={entryDate} onChangeText={setEntryDate} style={styles.input} placeholder="2026-01-01" placeholderTextColor="#8B8B93" autoCapitalize="none" />
              <Text style={styles.label}>Title</Text><TextInput value={entryTitle} onChangeText={setEntryTitle} style={styles.input} placeholder="Run Zone 2" placeholderTextColor="#8B8B93" />
              <Text style={styles.label}>Sport</Text>
              <View style={styles.rowWrap}>{SPORT_TYPES.map((x) => (<Chip key={x} label={x} active={entrySportType === x} onPress={() => setEntrySportType(x)} />))}</View>
              <View style={styles.setRow}>
                <View style={{ flex: 1, marginRight: 10 }}><Text style={styles.label}>Start (HH:MM)</Text><TextInput value={entryTime} onChangeText={setEntryTime} style={styles.inputSmall} placeholder="07:00" placeholderTextColor="#8B8B93" autoCapitalize="none" /></View>
                <View style={{ flex: 1 }}><Text style={styles.label}>Duration (min)</Text><TextInput value={entryDuration} onChangeText={(v) => setEntryDuration(v.replace(/[^\d]/g, ""))} style={styles.inputSmall} placeholder="45" placeholderTextColor="#8B8B93" keyboardType="number-pad" /></View>
              </View>
              <Text style={styles.label}>Status</Text>
              <View style={styles.rowWrap}>{["planned","done","skipped"].map((st) => (<Chip key={st} label={st} active={entryStatus === st} onPress={() => setEntryStatus(st)} />))}</View>
              <View style={styles.rowWrap}><PillButton label="Save" onPress={saveEntry} variant="primary" /></View>
            </GlassCard>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </ScrollView>
  );
}
