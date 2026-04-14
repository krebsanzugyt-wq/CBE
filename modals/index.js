import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Modal,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TextInput,
} from "react-native";
import { styles } from "../styles";
import { GlassCard, PillButton, Chip, GlowTextInput, ListEmpty } from "../components/ui";
import { uid, safeJsonParse, normalizeGymSession, isSessionComplete } from "../utils";
import { CATEGORIES, MUSCLES } from "../constants";

export function CreateExerciseModal({ visible, onClose, t, onSave }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Machine");
  const [muscle, setMuscle] = useState("Legs");
  useEffect(() => { if (visible) { setName(""); setCategory("Machine"); setMuscle("Legs"); } }, [visible]);
  function save() { const n = name.trim(); if (!n) return; onSave({ id: `cx_${uid()}`, name: n, category, muscle, source: "custom" }); onClose(); }
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalRoot}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <View style={styles.modalHeader}><Text style={styles.modalTitle}>{t.library.addCustom}</Text><PillButton label={t.today.close} onPress={onClose} variant="secondary" /></View>
          <ScrollView contentContainerStyle={styles.screenPad} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
            <GlassCard title={t.library.name}><TextInput value={name} onChangeText={setName} placeholder="z.B. Hack Squat" placeholderTextColor="#8B8B93" style={styles.input} /></GlassCard>
            <GlassCard title={t.library.category}><View style={styles.rowWrap}>{CATEGORIES.filter((x) => x !== "All").map((x) => (<Chip key={x} label={x} active={category === x} onPress={() => setCategory(x)} />))}</View></GlassCard>
            <GlassCard title={t.library.muscle}><View style={styles.rowWrap}>{MUSCLES.filter((x) => x !== "All").map((x) => (<Chip key={x} label={x} active={muscle === x} onPress={() => setMuscle(x)} />))}</View></GlassCard>
            <View style={styles.rowWrap}><PillButton label={t.library.save} onPress={save} variant="primary" /></View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

export function ImportExercisesModal({ visible, onClose, t, onImport }) {
  const [text, setText] = useState("");
  const [msg, setMsg] = useState("");
  useEffect(() => { if (visible) { setText(""); setMsg(""); } }, [visible]);
  function doImport() {
    const parsed = safeJsonParse(text);
    if (!parsed.ok) { setMsg(`${t.common.error}: ${parsed.error}`); return; }
    const v = parsed.value;
    const arr = Array.isArray(v) ? v : Array.isArray(v?.exercises) ? v.exercises : null;
    if (!arr) { setMsg(`${t.common.error}: JSON muss ein Array sein oder { "exercises": [...] }`); return; }
    const cleaned = [];
    for (const raw of arr) {
      const name = String(raw?.name || "").trim();
      const category = String(raw?.category || "Other").trim();
      const muscle = String(raw?.muscle || "Other").trim();
      if (!name) continue;
      cleaned.push({ id: raw?.id ? String(raw.id) : `ix_${uid()}`, name, category, muscle, source: "import" });
    }
    if (cleaned.length === 0) { setMsg(`${t.common.error}: Keine gültigen Übungen gefunden.`); return; }
    const result = onImport(cleaned);
    setMsg(`${t.common.success}: Importiert ${result.added} • Übersprungen ${result.skipped}`);
  }
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalRoot}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <View style={styles.modalHeader}><Text style={styles.modalTitle}>{t.library.importExercises}</Text><PillButton label={t.today.close} onPress={onClose} variant="secondary" /></View>
          <ScrollView contentContainerStyle={styles.screenPad} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
            <GlassCard title="JSON">
              <TextInput value={text} onChangeText={setText} placeholder={t.common.pasteHere} placeholderTextColor="#8B8B93" style={[styles.input, { minHeight: 180 }]} multiline autoCapitalize="none" />
              <View style={styles.rowWrap}><PillButton label="Importieren" onPress={doImport} variant="primary" /></View>
              {msg ? <Text style={styles.help}>{msg}</Text> : null}
            </GlassCard>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

export function ExportDataModal({ visible, onClose, t, data }) {
  const [text, setText] = useState("");
  useEffect(() => { if (visible) setText(JSON.stringify(data, null, 2)); }, [visible, data]);
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalRoot}>
        <View style={styles.modalHeader}><Text style={styles.modalTitle}>{t.library.exportData}</Text><PillButton label={t.today.close} onPress={onClose} variant="secondary" /></View>
        <ScrollView contentContainerStyle={styles.screenPad}>
          <GlassCard title="Export JSON"><Text style={styles.help}>Markieren → Kopieren → an Freunde schicken.</Text><TextInput value={text} editable={false} style={[styles.input, { minHeight: 260 }]} multiline /></GlassCard>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

export function ImportDataModal({ visible, onClose, t, onImport }) {
  const [text, setText] = useState("");
  const [msg, setMsg] = useState("");
  useEffect(() => { if (visible) { setText(""); setMsg(""); } }, [visible]);
  function doImport() {
    const parsed = safeJsonParse(text);
    if (!parsed.ok) { setMsg(`${t.common.error}: ${parsed.error}`); return; }
    const result = onImport(parsed.value);
    if (!result.ok) setMsg(`${t.common.error}: ${result.error}`);
    else setMsg(`${t.common.success}: Importiert.`);
  }
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalRoot}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <View style={styles.modalHeader}><Text style={styles.modalTitle}>{t.library.importData}</Text><PillButton label={t.today.close} onPress={onClose} variant="secondary" /></View>
          <ScrollView contentContainerStyle={styles.screenPad} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
            <GlassCard title="Import JSON">
              <TextInput value={text} onChangeText={setText} placeholder={t.common.pasteHere} placeholderTextColor="#8B8B93" style={[styles.input, { minHeight: 240 }]} multiline autoCapitalize="none" />
              <View style={styles.rowWrap}><PillButton label="Importieren" onPress={doImport} variant="primary" /></View>
              {msg ? <Text style={styles.help}>{msg}</Text> : null}
            </GlassCard>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

export function WorkoutDetailModal({ visible, onClose, t, session, onSaveSession }) {
  const [editMode, setEditMode] = useState(false);
  const [draft, setDraft] = useState(null);
  useEffect(() => { if (!visible || !session) return; setEditMode(false); setDraft(normalizeGymSession(session)); }, [visible, session]);
  if (!session) return null;
  function updateSet(itemId, setIdx, field, value) {
    setDraft((prev) => { if (!prev) return prev; const nextItems = (prev.items || []).map((it) => { if (it.itemId !== itemId) return it; const nextPerformed = (it.performed || []).map((s, idx) => (idx === setIdx ? { ...s, [field]: value } : s)); return { ...it, performed: nextPerformed }; }); return { ...prev, items: nextItems }; });
  }
  function updateExerciseNote(itemId, value) {
    setDraft((prev) => { if (!prev) return prev; return { ...prev, items: (prev.items || []).map((it) => (it.itemId === itemId ? { ...it, exerciseNote: value } : it)) }; });
  }
  function saveLaterEdits() {
    if (!draft) return;
    const nextItems = (draft.items || []).map((it) => ({ ...it, performed: (it.performed || []).map((s) => { const missing = String(s?.kg || "").trim() === "" || String(s?.reps || "").trim() === ""; return { ...s, note: s?.note || "", missing }; }) }));
    const complete = isSessionComplete(nextItems);
    onSaveSession({ ...draft, items: nextItems, status: complete ? "complete" : "incomplete" });
    setEditMode(false);
  }
  const data = draft || session;
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalRoot}>
        <View style={styles.modalHeader}><Text style={styles.modalTitle}>{t.history.title}</Text><PillButton label={t.today.close} onPress={onClose} variant="secondary" /></View>
        <ScrollView contentContainerStyle={styles.screenPad}>
          <GlassCard title={t.history.summary}>
            <Text style={styles.listTitle}>{session.planName}</Text>
            <Text style={styles.listMeta}>{new Date(session.startedAt).toLocaleString()} • {t.history.duration}: ~{session.durationMin} min</Text>
            <Text style={[styles.listMeta, { marginTop: 6 }]}>{t.workout.progress}: {session.doneSets}/{session.totalSets}</Text>
            {session.status === "incomplete" ? <Text style={styles.incompleteBadge}>Incomplete</Text> : null}
          </GlassCard>
          <GlassCard title="Übungen">
            {(data.items || []).map((it) => (
              <View key={it.itemId} style={styles.planItem}>
                <Text style={styles.listTitle}>{it.name}</Text>
                {it.performed.map((s, idx) => (
                  <View key={`${it.itemId}-${idx}`} style={[styles.detailSetRow, s.done ? styles.detailSetDone : null]}>
                    <Text style={s.done ? styles.detailSetTextDone : styles.detailSetText}>{idx + 1}. {s.kg || "-"} kg × {s.reps || "-"} reps</Text>
                    <Text style={s.done ? styles.detailBadgeDone : styles.detailBadge}>{s.done ? t.history.done : ""}</Text>
                  </View>
                ))}
              </View>
            ))}
          </GlassCard>
          {session.status === "incomplete" ? (
            <View style={styles.rowWrap}>
              {!editMode ? <PillButton label="Complete later" onPress={() => setEditMode(true)} variant="secondary" /> : null}
              {editMode ? <PillButton label="Save" onPress={saveLaterEdits} variant="primary" /> : null}
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

export function ExerciseDetailModal({ visible, onClose, exercise, prefs, setPrefs, onSaveExerciseDefaults }) {
  const [tipText, setTipText] = useState("");
  if (!exercise) return null;
  const tipsByExercise = prefs?.localTipsByExercise || {};
  const tips = tipsByExercise[exercise.id] || [];
  function addTip() {
    const txt = String(tipText || "").trim();
    if (!txt) return;
    setPrefs((prev) => { const byEx = { ...(prev.localTipsByExercise || {}) }; const arr = byEx[exercise.id] || []; byEx[exercise.id] = [{ id: uid(), text: txt, createdAt: Date.now() }, ...arr].slice(0, 20); return { ...prev, localTipsByExercise: byEx }; });
    setTipText("");
  }
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalRoot}>
        <View style={styles.modalHeader}><Text style={styles.modalTitle}>Exercise Detail</Text><PillButton label="Close" onPress={onClose} variant="secondary" /></View>
        <ScrollView contentContainerStyle={styles.screenPad}>
          <GlassCard title={exercise.name}><Text style={styles.listMeta}>{exercise.category} • {exercise.muscle}</Text></GlassCard>
          <GlassCard title="Tips">
            <TextInput value={tipText} onChangeText={setTipText} placeholder="Add a tip..." placeholderTextColor="#8B8B93" style={styles.input} />
            <View style={styles.rowWrap}><PillButton label="Add tip" onPress={addTip} variant="secondary" /></View>
            {(tips || []).length === 0 ? <Text style={styles.help}>No tips yet.</Text> : (tips || []).map((x) => <Text key={x.id} style={styles.help}>• {x.text}</Text>)}
          </GlassCard>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

export function NoteModal({ visible, onClose, title, value, onSave }) {
  const [text, setText] = useState("");
  useEffect(() => { if (visible) setText(value || ""); }, [visible, value]);
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalRoot}>
        <View style={styles.modalHeader}><Text style={styles.modalTitle}>{title || "Note"}</Text><PillButton label="Close" onPress={onClose} variant="secondary" /></View>
        <ScrollView contentContainerStyle={styles.screenPad}>
          <GlassCard title="Note">
            <TextInput value={text} onChangeText={setText} multiline style={[styles.input, { minHeight: 140 }]} placeholder="Write note..." placeholderTextColor="#8B8B93" />
            <View style={styles.rowWrap}><PillButton label="Save" onPress={() => { onSave(text); onClose(); }} variant="primary" /></View>
          </GlassCard>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

export function EditLogModal({ visible, onClose, log, onSave, onDelete }) {
  const [type, setType] = useState("Gym");
  const [note, setNote] = useState("");
  useEffect(() => { if (!visible || !log) return; setType(log.type || "Gym"); setNote(log.note || ""); }, [visible, log]);
  if (!log) return null;
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalRoot}>
        <View style={styles.modalHeader}><Text style={styles.modalTitle}>Edit Log</Text><PillButton label="Cancel" onPress={onClose} variant="secondary" /></View>
        <ScrollView contentContainerStyle={styles.screenPad}>
          <GlassCard title="Type"><View style={styles.rowWrap}>{["Gym","Run","Bike","Swim","Other"].map((x) => (<Chip key={x} label={x} active={type === x} onPress={() => setType(x)} />))}</View></GlassCard>
          <GlassCard title="Note">
            <GlowTextInput value={note} onChangeText={setNote} multiline style={styles.input} placeholder="Note" placeholderTextColor="#8B8B93" />
            <View style={styles.rowWrap}>
              <PillButton label="Save" onPress={() => onSave({ ...log, type, note: note.trim() || undefined })} variant="primary" />
              <PillButton label="Delete" onPress={() => onDelete(log.id)} variant="secondary" />
            </View>
          </GlassCard>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

export function EditPlanModal({ visible, onClose, plan, onSave, onDelete, onDuplicate }) {
  const [name, setName] = useState("");
  const [rest, setRest] = useState("180");
  const [confirmDelete, setConfirmDelete] = useState(false);
  useEffect(() => { if (!visible || !plan) return; setName(plan.name || ""); setRest(String(plan.restDefaultSeconds || 180)); setConfirmDelete(false); }, [visible, plan]);
  if (!plan) return null;
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalRoot}>
        <View style={styles.modalHeader}><Text style={styles.modalTitle}>Edit Plan</Text><PillButton label="Cancel" onPress={onClose} variant="secondary" /></View>
        <ScrollView contentContainerStyle={styles.screenPad}>
          <GlassCard title="Plan Meta">
            <Text style={styles.label}>Name</Text>
            <GlowTextInput value={name} onChangeText={setName} style={styles.input} placeholder="Plan Name" placeholderTextColor="#8B8B93" />
            <Text style={styles.label}>Rest default (sec)</Text>
            <GlowTextInput value={rest} onChangeText={(v) => setRest(v.replace(/[^\d]/g, ""))} keyboardType="number-pad" style={styles.input} placeholder="180" placeholderTextColor="#8B8B93" />
            <View style={styles.rowWrap}>
              <PillButton label="Save" onPress={() => onSave({ ...plan, name: name.trim() || plan.name, restDefaultSeconds: Number(rest || 0) || 0 })} variant="primary" />
              <PillButton label="Duplicate" onPress={() => onDuplicate(plan)} variant="secondary" />
            </View>
            <View style={styles.rowWrap}>
              {!confirmDelete ? <PillButton label="Delete Plan" onPress={() => setConfirmDelete(true)} variant="secondary" /> : <PillButton label="Confirm Delete" onPress={() => onDelete(plan.id)} variant="secondary" />}
            </View>
          </GlassCard>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
