import React, { useState, useMemo } from "react";
import { View, Text, ScrollView, FlatList, Modal, SafeAreaView } from "react-native";
import { styles } from "../styles";
import { GlassCard, PillButton, RowButton, ListEmpty, Chip, GlowTextInput } from "../components/ui";
import { uid, getIncrementByCategory, smartSearch } from "../utils";
import { useDebouncedValue } from "../utils";
import { CATEGORIES, MUSCLES } from "../constants";
import { EditPlanModal } from "../modals";

function LibraryPickerList({ t, allExercises, onPick }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const [mus, setMus] = useState("All");
  const debouncedQ = useDebouncedValue(q, 250);
  const filtered = useMemo(() => smartSearch(allExercises, debouncedQ, cat, mus, 120), [allExercises, debouncedQ, cat, mus]);
  return (
    <ScrollView contentContainerStyle={styles.screenPad} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
      <GlassCard title={t.library.search}>
        <GlowTextInput value={q} onChangeText={setQ} placeholder={t.library.search} placeholderTextColor="#8B8B93" style={styles.input} autoCapitalize="none" autoCorrect={false} />
        <Text style={styles.label}>{t.library.filters.category}</Text>
        <View style={styles.rowWrap}>{CATEGORIES.map((x) => (<Chip key={x} label={x} active={cat === x} onPress={() => setCat(x)} />))}</View>
        <Text style={styles.label}>{t.library.filters.muscle}</Text>
        <View style={styles.rowWrap}>{MUSCLES.map((x) => (<Chip key={x} label={x} active={mus === x} onPress={() => setMus(x)} />))}</View>
      </GlassCard>
      <GlassCard title="Ergebnisse">
        <FlatList data={filtered} keyExtractor={(item) => item.id} scrollEnabled={false} initialNumToRender={12} ListEmptyComponent={<ListEmpty text={t.library.noResults} />}
          renderItem={({ item: e }) => (
            <View style={styles.listItemRow}>
              <View style={{ flex: 1 }}><Text style={styles.listTitle}>{e.name}</Text><Text style={styles.listMeta}>{e.category} • {e.muscle}</Text></View>
              <RowButton label={t.library.addToPlan} onPress={() => onPick(e)} variant="secondary" />
            </View>
          )}
        />
      </GlassCard>
    </ScrollView>
  );
}

export function PlansScreen({ t, plans, setPlans, activePlanId, setActivePlanId, onStartWorkout, allExercises }) {
  const [newPlanName, setNewPlanName] = useState("");
  const [editPlanOpen, setEditPlanOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const activePlan = useMemo(() => plans.find((p) => p.id === activePlanId) || null, [plans, activePlanId]);

  function createPlan() { const name = newPlanName.trim(); if (!name) return; setPlans((prev) => [{ id: uid(), name, restDefaultSeconds: 180, items: [] }, ...prev]); setNewPlanName(""); }
  function updatePlan(planId, patch) { setPlans((prev) => prev.map((p) => (p.id === planId ? { ...p, ...patch } : p))); }
  function savePlanMeta(nextPlan) { setPlans((prev) => prev.map((p) => (p.id === nextPlan.id ? { ...p, name: nextPlan.name, restDefaultSeconds: nextPlan.restDefaultSeconds } : p))); setEditPlanOpen(false); }
  function deletePlan(planId) { setPlans((prev) => prev.filter((p) => p.id !== planId)); setEditPlanOpen(false); setActivePlanId(null); }
  function duplicatePlan(plan) { setPlans((prev) => [{ ...plan, id: uid(), name: `${plan.name} (Copy)`, items: (plan.items || []).map((it) => ({ ...it, id: uid(), sets: (it.sets || []).map((s) => ({ ...s })) })) }, ...prev]); }
  function addExerciseToPlan(plan, exercise) {
    if (plan.items.some((it) => it.exerciseId === exercise.id)) return;
    updatePlan(plan.id, { items: [...plan.items, { id: uid(), exerciseId: exercise.id, progressionMode: "double", incrementKg: getIncrementByCategory(exercise.category), fixedReps: "5", backoffPercent: "12", sets: [{ targetKg: "", targetReps: "", targetRepMin: "6", targetRepMax: "10", targetRir: "2" }] }] });
  }
  function addSetToItem(plan, itemId) { updatePlan(plan.id, { items: plan.items.map((it) => it.id === itemId ? { ...it, sets: [...it.sets, { targetKg: "", targetReps: "", targetRepMin: "6", targetRepMax: "10", targetRir: "2" }] } : it) }); }
  function removePlanItem(plan, itemId) { updatePlan(plan.id, { items: plan.items.filter((it) => it.id !== itemId) }); }

  if (!activePlan) {
    return (
      <ScrollView contentContainerStyle={styles.screenPad} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        <Text style={styles.h1}>{t.plans.title}</Text>
        <GlassCard title={t.plans.create}>
          <GlowTextInput value={newPlanName} onChangeText={setNewPlanName} placeholder={t.plans.namePlaceholder} placeholderTextColor="#8B8B93" style={styles.input} />
          <View style={styles.rowWrap}><PillButton label={t.plans.create} onPress={createPlan} variant="primary" /></View>
        </GlassCard>
        <GlassCard title="Deine Pläne">
          <FlatList data={plans} keyExtractor={(item) => item.id} scrollEnabled={false} ListEmptyComponent={<ListEmpty text="No plans yet." />}
            renderItem={({ item: p }) => (
              <View style={styles.listItemRow}>
                <View style={{ flex: 1 }}><Text style={styles.listTitle}>{p.name}</Text><Text style={styles.listMeta}>Rest: {p.restDefaultSeconds}s • Übungen: {p.items.length}</Text></View>
                <RowButton label={t.plans.open} onPress={() => setActivePlanId(p.id)} variant="secondary" />
              </View>
            )}
          />
        </GlassCard>
      </ScrollView>
    );
  }

  const itemsWithExercise = activePlan.items.map((it) => ({ ...it, exercise: allExercises.find((e) => e.id === it.exerciseId) || null }));

  return (
    <ScrollView contentContainerStyle={styles.screenPad} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
      <View style={styles.rowBetween}>
        <Text style={styles.h1}>{activePlan.name}</Text>
        <View style={{ flexDirection: "row" }}>
          <PillButton label="Edit" onPress={() => setEditPlanOpen(true)} variant="secondary" />
          <PillButton label={t.plans.back} onPress={() => setActivePlanId(null)} variant="secondary" />
        </View>
      </View>
      <GlassCard title={t.plans.editorTitle}>
        <View style={styles.rowWrap}>
          <PillButton label={t.plans.addExercise} onPress={() => setLibraryOpen(true)} variant="primary" />
          <PillButton label={t.plans.startWorkout} onPress={() => onStartWorkout(activePlan)} variant="secondary" />
        </View>
        <Text style={styles.help}>{t.plans.hint}</Text>
      </GlassCard>
      <GlassCard title="Übungen im Plan">
        {itemsWithExercise.length === 0 ? <Text style={styles.muted}>{t.plans.exerciseEmpty}</Text> : itemsWithExercise.map((it) => (
          <View key={it.id} style={styles.planItem}>
            <View style={styles.rowBetween}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={styles.listTitle}>{it.exercise ? it.exercise.name : "Exercise"}</Text>
                <Text style={styles.listMeta}>{it.exercise ? `${it.exercise.category} • ${it.exercise.muscle}` : ""}</Text>
              </View>
              <PillButton label={t.plans.remove} onPress={() => removePlanItem(activePlan, it.id)} variant="secondary" />
            </View>
            <View style={styles.rowWrap}><PillButton label={t.plans.addSet} onPress={() => addSetToItem(activePlan, it.id)} variant="secondary" /></View>
          </View>
        ))}
      </GlassCard>
      <Modal visible={libraryOpen} animationType="slide" onRequestClose={() => setLibraryOpen(false)}>
        <SafeAreaView style={styles.modalRoot}>
          <View style={styles.modalHeader}><Text style={styles.modalTitle}>{t.library.title}</Text><PillButton label={t.library.close} onPress={() => setLibraryOpen(false)} variant="secondary" /></View>
          <LibraryPickerList t={t} allExercises={allExercises} onPick={(ex) => { addExerciseToPlan(activePlan, ex); setLibraryOpen(false); }} />
        </SafeAreaView>
      </Modal>
      <EditPlanModal visible={editPlanOpen} onClose={() => setEditPlanOpen(false)} plan={activePlan} onSave={savePlanMeta} onDelete={deletePlan} onDuplicate={duplicatePlan} />
    </ScrollView>
  );
}
