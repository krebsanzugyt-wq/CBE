import React from "react";
import { View, Text, ScrollView, FlatList, Pressable } from "react-native";
import { styles } from "../styles";
import { GlassCard, PillButton, RowButton, ListEmpty, GlowTextInput } from "../components/ui";

export function TodayScreen({ t, note, setNote, logs, addLog, sessions, onOpenSession, todayAgenda, onDoneAgenda, onStartAgendaGym, onStartAgendaEndurance, onMoveAgendaTomorrow, onCopyAgendaNextWeek, onOpenLog }) {
  return (
    <ScrollView contentContainerStyle={styles.screenPad} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
      <Text style={styles.h1}>{t.today.title}</Text>
      <GlassCard title="Heute geplant">
        {todayAgenda.length === 0 ? <Text style={styles.muted}>Keine Einträge für heute geplant.</Text> : todayAgenda.map((e) => (
          <View key={e.id} style={styles.planItem}>
            <Text style={styles.listTitle}>{e.title}</Text>
            <Text style={styles.listMeta}>{e.startTime} • {e.durationMin} min • {e.sportType} • {e.status}</Text>
            <View style={styles.rowWrap}>
              {e.status !== "done" ? <PillButton label="Done" onPress={() => onDoneAgenda(e)} variant="primary" /> : null}
              {e.sportType === "Gym" && e.planId && e.status !== "done" ? <PillButton label="Start" onPress={() => onStartAgendaGym(e)} variant="secondary" /> : null}
              {(["Run","Bike","Swim"].includes(e.sportType) && e.status !== "done") ? <PillButton label="Start" onPress={() => onStartAgendaEndurance(e)} variant="secondary" /> : null}
              <PillButton label="Move → Tomorrow" onPress={() => onMoveAgendaTomorrow(e.id)} variant="secondary" />
              <PillButton label="Copy → Next Week" onPress={() => onCopyAgendaNextWeek(e.id)} variant="secondary" />
            </View>
          </View>
        ))}
      </GlassCard>
      <GlassCard title={t.today.quickLog}>
        <Text style={styles.label}>{t.today.note}</Text>
        <GlowTextInput value={note} onChangeText={setNote} placeholder='z.B. "Zone 2 45min"...' placeholderTextColor="#8B8B93" style={styles.input} multiline />
        <View style={styles.rowWrap}>
          {["Gym","Run","Bike","Swim"].map((x) => (<PillButton key={x} label={`${t.today.add} ${x}`} onPress={() => addLog(x)} variant="secondary" />))}
        </View>
      </GlassCard>
      <GlassCard title={t.today.workouts}>
        <FlatList data={sessions.slice(0, 8)} keyExtractor={(item) => item.id} scrollEnabled={false} initialNumToRender={6} ListEmptyComponent={<ListEmpty text={t.today.workoutsEmpty} />}
          renderItem={({ item: s }) => (
            <View style={styles.listItemRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.listTitle}>{s.planName}</Text>
                <Text style={styles.listMeta}>{new Date(s.startedAt).toLocaleString()} • {s.doneSets}/{s.totalSets} Sets • ~{s.durationMin} min</Text>
                {s.status === "incomplete" ? <Text style={styles.incompleteBadge}>Incomplete</Text> : null}
              </View>
              <RowButton label={t.today.open} onPress={() => onOpenSession(s)} variant="secondary" />
            </View>
          )}
        />
      </GlassCard>
      <GlassCard title={t.today.recent}>
        <FlatList data={logs.slice(0, 10)} keyExtractor={(item) => item.id} scrollEnabled={false} ListEmptyComponent={<ListEmpty text={t.today.empty} />}
          renderItem={({ item: l }) => (
            <Pressable style={styles.listItem} onPress={() => onOpenLog(l)}>
              <Text style={styles.listTitle}>{l.type}</Text>
              <Text style={styles.listMeta}>{new Date(l.createdAt).toLocaleString()}</Text>
              {l.note ? <Text style={styles.listBody}>{l.note}</Text> : null}
            </Pressable>
          )}
        />
      </GlassCard>
    </ScrollView>
  );
}
