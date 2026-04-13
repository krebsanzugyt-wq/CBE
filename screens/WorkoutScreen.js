import React, { useState, useEffect, useRef, useMemo } from "react";
import { View, Text, ScrollView } from "react-native";
import { styles } from "../styles";
import { GlassCard, PillButton, GlowTextInput, PulsePressable } from "../components/ui";
import { evaluateSetSuggestion, formatMMSS } from "../utils";
import { NoteModal } from "../modals";

export function WorkoutScreen({ t, plan, workout, setWorkout, onFinish, allExercises, onOpenExerciseDetail }) {
  const restIntervalRef = useRef(null);
  const [exerciseNoteModal, setExerciseNoteModal] = useState({ open: false, itemId: null });
  const [setNoteModal, setSetNoteModal] = useState({ open: false, itemId: null, setIdx: -1 });

  useEffect(() => {
    if (!workout.restRunning) return;
    restIntervalRef.current = setInterval(() => {
      setWorkout((prev) => { if (!prev) return prev; const next = prev.restRemaining <= 1 ? 0 : prev.restRemaining - 1; const stop = next === 0; return { ...prev, restRemaining: next, restRunning: stop ? false : true }; });
    }, 1000);
    return () => { if (restIntervalRef.current) clearInterval(restIntervalRef.current); restIntervalRef.current = null; };
  }, [workout.restRunning, setWorkout]);

  const items = useMemo(() => plan.items.map((it) => ({ ...it, exercise: allExercises.find((e) => e.id === it.exerciseId) || { name: "Exercise", category: "", muscle: "", source: "unknown" } })), [plan, allExercises]);
  const totals = useMemo(() => { let totalSets = 0; let doneSets = 0; items.forEach((it) => { const sets = workout.sets[it.id] || []; totalSets += sets.length; doneSets += sets.filter((s) => s.done).length; }); return { totalSets, doneSets }; }, [items, workout]);

  function beginRest() { const seconds = plan.restDefaultSeconds || 0; if (seconds <= 0) return; setWorkout((prev) => ({ ...prev, restRemaining: seconds, restRunning: true })); }
  function updateWorkoutSet(itemId, setIdx, field, value) { setWorkout((prev) => { const current = prev.sets[itemId] || []; const nextArr = current.map((s, idx) => (idx === setIdx ? { ...s, [field]: value } : s)); return { ...prev, sets: { ...prev.sets, [itemId]: nextArr } }; }); }
  function updateExerciseNote(itemId, value) { setWorkout((prev) => ({ ...prev, exerciseNotes: { ...(prev.exerciseNotes || {}), [itemId]: value } })); }
  function toggleDone(itemId, setIdx) {
    const wasDone = (workout.sets[itemId] || [])[setIdx]?.done;
    setWorkout((prev) => { const current = prev.sets[itemId] || []; const nextArr = current.map((s, idx) => (idx === setIdx ? { ...s, done: !s.done } : s)); const item = items.find((x) => x.id === itemId) || {}; const tip = evaluateSetSuggestion(item, nextArr[setIdx], nextArr, setIdx); return { ...prev, sets: { ...prev.sets, [itemId]: nextArr }, suggestions: { ...(prev.suggestions || {}), [`${itemId}_${setIdx}`]: !wasDone ? tip : "" } }; });
    if (!wasDone) beginRest();
  }

  return (
    <ScrollView contentContainerStyle={styles.screenPad} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
      <View style={styles.rowBetween}>
        <Text style={styles.h1}>{t.workout.title}</Text>
        <PillButton label={t.workout.back} onPress={() => setWorkout(null)} variant="secondary" />
      </View>
      <GlassCard title={plan.name}>
        <Text style={styles.help}>{t.workout.doneHint}</Text>
        <View style={styles.row}>
          <View style={[styles.statBox, { marginRight: 10 }]}>
            <Text style={styles.statLabel}>{t.workout.progress}</Text>
            <Text style={styles.statValue}>{totals.doneSets}/{totals.totalSets}</Text>
          </View>
        </View>
      </GlassCard>
      <GlassCard title={t.workout.rest}>
        <View style={styles.rowBetween}>
          <Text style={styles.timerBig}>{formatMMSS(workout.restRemaining)}</Text>
          <View style={{ flexDirection: "row" }}>
            <PillButton label={workout.restRunning ? t.workout.pause : t.workout.resume} onPress={() => { if (workout.restRemaining <= 0) beginRest(); else setWorkout((prev) => ({ ...prev, restRunning: !prev.restRunning })); }} variant="primary" />
            <PillButton label={t.workout.skip} onPress={() => setWorkout((prev) => ({ ...prev, restRunning: false, restRemaining: 0 }))} variant="secondary" />
          </View>
        </View>
      </GlassCard>
      <GlassCard title="Übungen">
        {items.map((it) => {
          const sets = workout.sets[it.id] || [];
          return (
            <View key={it.id} style={styles.planItem}>
              <Text style={styles.listTitle}>{it.exercise.name}</Text>
              <View style={styles.rowWrap}><PillButton label="Exercise Note" onPress={() => setExerciseNoteModal({ open: true, itemId: it.id })} variant="secondary" /></View>
              {workout.exerciseNotes?.[it.id] ? <Text style={styles.help}>Note: {workout.exerciseNotes[it.id]}</Text> : null}
              <View style={{ marginTop: 10 }}>
                {sets.map((s, idx) => (
                  <View key={`${it.id}-w-${idx}`}>
                    <View style={styles.workoutSetRow}>
                      <View style={{ flex: 1, marginRight: 10 }}>
                        <Text style={styles.smallLabel}>{t.workout.kg}</Text>
                        <GlowTextInput value={s.kg} onChangeText={(v) => updateWorkoutSet(it.id, idx, "kg", v.replace(",", "."))} keyboardType="decimal-pad" placeholder="" placeholderTextColor="#8B8B93" style={styles.inputSmall} />
                      </View>
                      <View style={{ flex: 1, marginRight: 10 }}>
                        <Text style={styles.smallLabel}>{t.workout.reps}</Text>
                        <GlowTextInput value={s.reps} onChangeText={(v) => updateWorkoutSet(it.id, idx, "reps", v.replace(/[^\d]/g, ""))} keyboardType="number-pad" placeholder="" placeholderTextColor="#8B8B93" style={styles.inputSmall} />
                      </View>
                      <PulsePressable onPress={() => toggleDone(it.id, idx)} style={[styles.doneBtn, s.done ? styles.doneBtnOn : styles.doneBtnOff]}>
                        <Text style={s.done ? styles.doneTextOn : styles.doneTextOff}>{s.done ? t.workout.undo : t.workout.done}</Text>
                      </PulsePressable>
                    </View>
                    <Text style={styles.help}>Suggestion: {(workout.suggestions || {})[`${it.id}_${idx}`] || "—"}</Text>
                  </View>
                ))}
              </View>
            </View>
          );
        })}
      </GlassCard>
      <View style={styles.rowWrap}><PillButton label={t.workout.finish} onPress={onFinish} variant="primary" /></View>
      <NoteModal visible={exerciseNoteModal.open} onClose={() => setExerciseNoteModal({ open: false, itemId: null })} title="Exercise Note" value={workout.exerciseNotes?.[exerciseNoteModal.itemId] || ""} onSave={(txt) => updateExerciseNote(exerciseNoteModal.itemId, txt)} />
      <NoteModal visible={setNoteModal.open} onClose={() => setSetNoteModal({ open: false, itemId: null, setIdx: -1 })} title="Set Note" value={(workout.sets?.[setNoteModal.itemId] || [])[setNoteModal.setIdx]?.note || ""} onSave={(txt) => updateWorkoutSet(setNoteModal.itemId, setNoteModal.setIdx, "note", txt)} />
    </ScrollView>
  );
}
