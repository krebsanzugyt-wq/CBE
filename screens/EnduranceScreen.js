import React from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { styles } from "../styles";
import { GlassCard } from "../components/ui";

export function EnduranceScreen({ templates, sessions, plans, onSaveTemplate, onDeleteTemplate, onStartTemplate, onScheduleTemplate, onOpenSession }) {
  return (
    <ScrollView contentContainerStyle={styles.screenPad}>
      <Text style={styles.h1}>Ausdauer</Text>
      <GlassCard title="Sessions">
        {sessions.length === 0 ? <Text style={styles.muted}>No sessions yet.</Text> : sessions.slice(0, 40).map((s) => (
          <Pressable key={s.id} onPress={() => onOpenSession(s)} style={styles.listItem}>
            <Text style={styles.listTitle}>{s.title}</Text>
            <Text style={styles.listMeta}>{s.date} • {s.sportType} • {s.actual?.durationMin || "-"} min</Text>
          </Pressable>
        ))}
      </GlassCard>
    </ScrollView>
  );
}
