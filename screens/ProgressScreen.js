import React, { useState, useMemo } from "react";
import { View, Text, ScrollView, FlatList } from "react-native";
import { styles } from "../styles";
import { GlassCard, PillButton } from "../components/ui";
import { addDays, startOfWeekMonday, formatDateKey, getWeekRangeLabel } from "../utils";

export function ProgressScreen({ sessions, logs, calendarEntries, allExercises, prefs, setPrefs }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const weekStart = addDays(startOfWeekMonday(new Date()), weekOffset * 7);
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));
  const sessionsByDay = useMemo(() => { const map = {}; for (const s of sessions || []) { const k = formatDateKey(new Date(s.startedAt)); map[k] = map[k] || []; map[k].push(s); } return map; }, [sessions]);
  const trends = useMemo(() => { const arr = []; for (let w = 7; w >= 0; w--) { const start = addDays(startOfWeekMonday(new Date()), -w * 7); const end = addDays(start, 6); let workouts = 0; for (const s of sessions || []) { const d = new Date(s.startedAt); if (d >= start && d <= new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59)) workouts += 1; } arr.push({ k: formatDateKey(start), workouts }); } return arr; }, [sessions]);
  const maxTrend = Math.max(1, ...trends.map((x) => x.workouts));
  return (
    <ScrollView contentContainerStyle={styles.screenPad}>
      <Text style={styles.h1}>Progress</Text>
      <GlassCard title="Week Navigation">
        <View style={styles.rowBetween}>
          <PillButton label="Prev" onPress={() => setWeekOffset((v) => v - 1)} variant="secondary" />
          <Text style={styles.listMeta}>{getWeekRangeLabel(weekStart)}</Text>
          <PillButton label="Next" onPress={() => setWeekOffset((v) => v + 1)} variant="secondary" />
        </View>
      </GlassCard>
      <GlassCard title="Trend (8 weeks)">
        <View style={styles.trendRow}>
          {trends.map((x) => (<View key={x.k} style={styles.trendBarWrap}><View style={[styles.trendBar, { height: Math.max(8, (x.workouts / maxTrend) * 90) }]} /><Text style={styles.trendLabel}>{x.workouts}</Text></View>))}
        </View>
      </GlassCard>
      <GlassCard title="Recent Workouts">
        <FlatList data={sessions.slice(0, 20)} keyExtractor={(item) => item.id} scrollEnabled={false} ListEmptyComponent={<Text style={styles.muted}>No sessions yet.</Text>}
          renderItem={({ item: s }) => (<View style={styles.listItem}><Text style={styles.listTitle}>{s.planName}</Text><Text style={styles.listMeta}>{new Date(s.startedAt).toLocaleString()} • {s.doneSets}/{s.totalSets} sets</Text></View>)}
        />
      </GlassCard>
    </ScrollView>
  );
}
