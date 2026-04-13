import React, { useEffect, useMemo, useRef, useState } from "react";
import { SafeAreaView, View, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StatusBar } from "expo-status-bar";

import { STR, LANG, BASE_EXERCISES, STORAGE_KEY, DEFAULT_PREFS, FREE_EXERCISE_DB_URL } from "./constants";
import {
  uid, formatDateKey, parseDateKey, parseTimeToMin, addDays, startOfWeekMonday,
  normalizeCalendarEntry, normalizeCalendarTemplate, normalizePrefs,
  normalizeGymSession, normalizeKey, isSessionComplete,
  mapEquipmentToCategory, mapPrimaryMuscleToGroup,
  minutesBetween, toNum,
} from "./utils";
import { styles } from "./styles";
import { TabButton, ToastBanner, CelebrationOverlay } from "./components/ui";
import {
  WorkoutDetailModal, EditLogModal, ExerciseDetailModal,
  CreateExerciseModal, ImportExercisesModal, ExportDataModal, ImportDataModal,
} from "./modals";
import { TodayScreen } from "./screens/TodayScreen";
import { PlansScreen } from "./screens/PlansScreen";
import { WorkoutScreen } from "./screens/WorkoutScreen";
import { LibraryScreen } from "./screens/LibraryScreen";
import { ProgressScreen } from "./screens/ProgressScreen";
import { CalendarScreen } from "./screens/CalendarScreen";
import { EnduranceScreen } from "./screens/EnduranceScreen";

export default function App() {
  const t = STR[LANG];
  const [hydrated, setHydrated] = useState(false);
  const [tab, setTab] = useState("today");
  const [note, setNote] = useState("");
  const [logs, setLogs] = useState([]);
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);
  const [userExercises, setUserExercises] = useState([]);
  const allExercises = useMemo(() => [...BASE_EXERCISES, ...userExercises], [userExercises]);
  const [plans, setPlans] = useState([{ id: "p1", name: "Full Body A", restDefaultSeconds: 180, items: [] }]);
  const [activePlanId, setActivePlanId] = useState(null);
  const [calendarEntries, setCalendarEntries] = useState([]);
  const [calendarTemplates, setCalendarTemplates] = useState([]);
  const [calendarWeekOffset, setCalendarWeekOffset] = useState(0);
  const [sessions, setSessions] = useState([]);
  const [workout, setWorkout] = useState(null);
  const [enduranceTemplates, setEnduranceTemplates] = useState([]);
  const [enduranceSessions, setEnduranceSessions] = useState([]);
  const [enduranceWorkout, setEnduranceWorkout] = useState(null);
  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [editLogOpen, setEditLogOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [exerciseDetailOpen, setExerciseDetailOpen] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [createExerciseOpen, setCreateExerciseOpen] = useState(false);
  const [importExercisesOpen, setImportExercisesOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [importDataOpen, setImportDataOpen] = useState(false);
  const [packInstalling, setPackInstalling] = useState(false);
  const [packStatusText, setPackStatusText] = useState("");
  const [toast, setToast] = useState({ text: "", type: "info" });
  const [celebrateDone, setCelebrateDone] = useState(false);
  const TAB_BOTTOM = Platform.OS === "ios" ? 34 : 14;

  function addLog(type, overrideNote) {
    setLogs((prev) => [{ id: uid(), type, note: (overrideNote ?? note).trim() ? (overrideNote ?? note).trim() : undefined, createdAt: Date.now() }, ...prev]);
    setNote("");
  }

  function showToast(text, type = "info") { setToast({ text, type }); setTimeout(() => setToast({ text: "", type: "info" }), 1800); }

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!raw) { setHydrated(true); return; }
        const parsed = JSON.parse(raw);
        if (!parsed || (parsed.v !== 3 && parsed.v !== 4 && parsed.v !== 5)) { setHydrated(true); return; }
        if (Array.isArray(parsed.logs)) setLogs(parsed.logs);
        if (Array.isArray(parsed.plans)) setPlans(parsed.plans);
        if (Array.isArray(parsed.sessions)) setSessions(parsed.sessions.map(normalizeGymSession));
        if (Array.isArray(parsed.calendarEntries)) setCalendarEntries(parsed.calendarEntries.map(normalizeCalendarEntry));
        if (Array.isArray(parsed.calendarTemplates)) setCalendarTemplates(parsed.calendarTemplates.map(normalizeCalendarTemplate));
        if (Array.isArray(parsed.enduranceTemplates)) setEnduranceTemplates(parsed.enduranceTemplates);
        if (Array.isArray(parsed.enduranceSessions)) setEnduranceSessions(parsed.enduranceSessions);
        if (parsed.prefs) setPrefs(normalizePrefs(parsed.prefs));
        if (Array.isArray(parsed.userExercises)) setUserExercises(parsed.userExercises);
      } catch (e) { } finally { setHydrated(true); }
    })();
  }, []);

  const saveTimerRef = useRef(null);
  useEffect(() => {
    if (!hydrated) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try { await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ v: 5, logs, plans, sessions, calendarEntries, calendarTemplates, enduranceTemplates, enduranceSessions, userExercises, prefs })); } catch (e) { }
    }, 400);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [hydrated, logs, plans, sessions, calendarEntries, calendarTemplates, enduranceTemplates, enduranceSessions, userExercises, prefs]);

  function addCustomExercise(ex) { setUserExercises((prev) => [ex, ...prev]); }
  function deleteUserExercise(exId) { setUserExercises((prev) => prev.filter((e) => e.id !== exId)); }
  function importExercises(list) {
    const existingKeys = new Set(allExercises.map(normalizeKey));
    let added = 0; let skipped = 0; const toAdd = [];
    for (const ex of list) { const key = normalizeKey(ex); if (!key || key.startsWith("__") || existingKeys.has(key)) { skipped++; continue; } existingKeys.add(key); toAdd.push({ id: ex.id || `ix_${uid()}`, name: ex.name, category: ex.category || "Other", muscle: ex.muscle || "Other", source: ex.source || "import" }); added++; }
    if (toAdd.length > 0) setUserExercises((prev) => [...toAdd, ...prev]);
    return { added, skipped };
  }

  async function installFreeExerciseDbPack() {
    try {
      setPackInstalling(true); setPackStatusText("Downloading…");
      const res = await fetch(FREE_EXERCISE_DB_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setPackStatusText("Parsing…");
      const arr = await res.json();
      if (!Array.isArray(arr)) throw new Error("Not an array.");
      const mapped = arr.map((raw) => ({ id: `fedb_${String(raw?.id || raw?.name || uid())}`, name: String(raw?.name || "").trim() || "Exercise", category: mapEquipmentToCategory(raw?.equipment), muscle: mapPrimaryMuscleToGroup(raw?.primaryMuscles), source: "pack:free-exercise-db", meta: { equipment: raw?.equipment ?? "", primaryMuscles: raw?.primaryMuscles ?? [] } }));
      const result = importExercises(mapped);
      setPackStatusText(`Done. Added ${result.added} • Skipped ${result.skipped}`);
    } catch (e) { setPackStatusText(`Error: ${String(e?.message || e)}`); } finally { setPackInstalling(false); }
  }

  const exportPayload = useMemo(() => ({ v: 5, logs, plans, sessions, calendarEntries, calendarTemplates, enduranceTemplates, enduranceSessions, userExercises, prefs }), [logs, plans, sessions, calendarEntries, calendarTemplates, enduranceTemplates, enduranceSessions, userExercises, prefs]);

  function importAppData(obj) {
    if (!obj || typeof obj !== "object") return { ok: false, error: "JSON muss ein Objekt sein." };
    if (obj.v !== 3 && obj.v !== 4 && obj.v !== 5) return { ok: false, error: "Version passt nicht." };
    if (!Array.isArray(obj.logs) || !Array.isArray(obj.plans) || !Array.isArray(obj.sessions)) return { ok: false, error: "Struktur unvollständig." };
    setLogs(obj.logs); setPlans(obj.plans); setSessions(obj.sessions.map(normalizeGymSession));
    setCalendarEntries(Array.isArray(obj.calendarEntries) ? obj.calendarEntries.map(normalizeCalendarEntry) : []);
    setCalendarTemplates(Array.isArray(obj.calendarTemplates) ? obj.calendarTemplates.map(normalizeCalendarTemplate) : []);
    setEnduranceTemplates(Array.isArray(obj.enduranceTemplates) ? obj.enduranceTemplates : []);
    setEnduranceSessions(Array.isArray(obj.enduranceSessions) ? obj.enduranceSessions : []);
    setUserExercises(Array.isArray(obj.userExercises) ? obj.userExercises : []);
    setPrefs(normalizePrefs(obj.prefs));
    setTab("today"); setActivePlanId(null);
    return { ok: true };
  }

  function onStartWorkout(plan) {
    if (!plan || plan.items.length === 0) return;
    const lastByExercise = {};
    if (prefs.autoFillFromLastSession) { for (const sess of sessions) { for (const it of sess.items || []) { if (!lastByExercise[it.exerciseId]) lastByExercise[it.exerciseId] = it; } } }
    const sets = {};
    plan.items.forEach((it) => {
      const lastItem = lastByExercise[it.exerciseId];
      sets[it.id] = it.sets.map((st, idx) => { const lastSet = lastItem?.performed?.[idx] || {}; return { kg: prefs.autoFillFromLastSession ? String(lastSet.kg || st.targetKg || "") : String(st.targetKg || ""), reps: prefs.autoFillFromLastSession ? String(lastSet.reps || "") : "", rir: String(st.targetRir || ""), done: false, note: "", missing: false, targetRepMin: String(st.targetRepMin || ""), targetRepMax: String(st.targetRepMax || "") }; });
    });
    setWorkout({ id: uid(), planId: plan.id, startedAt: Date.now(), sets, restRunning: false, restRemaining: plan.restDefaultSeconds || prefs.defaultRestSeconds || 0, suggestions: {} });
  }

  function finishWorkout() {
    if (!workout) return;
    const plan = plans.find((p) => p.id === workout.planId);
    if (!plan) { setWorkout(null); return; }
    const endedAt = Date.now();
    let totalSets = 0; let doneSets = 0; let totalVolumeKg = 0; let totalReps = 0;
    const items = plan.items.map((it) => {
      const ex = allExercises.find((e) => e.id === it.exerciseId) || { id: it.exerciseId, name: "Exercise", category: "", muscle: "" };
      const performed = workout.sets[it.id] || [];
      totalSets += performed.length; doneSets += performed.filter((s2) => s2.done).length;
      performed.forEach((s2) => { if (!s2.done) return; const kg = toNum(s2.kg); const reps = toNum(s2.reps); totalVolumeKg += kg * reps; totalReps += reps; });
      return { itemId: it.id, exerciseId: ex.id, name: ex.name, category: ex.category, muscle: ex.muscle, exerciseNote: workout.exerciseNotes?.[it.id] || "", performed };
    });
    const session = { id: uid(), type: "Gym", planId: plan.id, planName: plan.name, startedAt: workout.startedAt, endedAt, durationMin: minutesBetween(workout.startedAt, endedAt), totalSets, doneSets, totalVolumeKg: Number(totalVolumeKg.toFixed(1)), totalReps, status: isSessionComplete(items) ? "complete" : "incomplete", items };
    setSessions((prev) => [session, ...prev]);
    addLog("Gym", `Workout: ${plan.name}\nSets: ${doneSets}/${totalSets}`);
    setWorkout(null); setCelebrateDone(true); setTimeout(() => setCelebrateDone(false), 800);
  }

  function openSession(session) { setSelectedSession(session); setSessionModalOpen(true); }
  function openLog(log) { setSelectedLog(log); setEditLogOpen(true); }
  function saveLog(nextLog) { setLogs((prev) => prev.map((l) => (l.id === nextLog.id ? { ...l, ...nextLog } : l))); setEditLogOpen(false); }
  function deleteLog(logId) { setLogs((prev) => prev.filter((l) => l.id !== logId)); setEditLogOpen(false); }
  function openExerciseDetail(exercise) { setSelectedExercise(exercise); setExerciseDetailOpen(true); }
  function saveSessionEdits(updatedSession) { const normalized = normalizeGymSession(updatedSession); setSessions((prev) => prev.map((s) => (s.id === normalized.id ? normalized : s))); setSelectedSession((prev) => (prev?.id === normalized.id ? normalized : prev)); }

  const todayKey = formatDateKey(new Date());
  const todayAgenda = useMemo(() => calendarEntries.filter((e) => e.date === todayKey).sort((a, b) => parseTimeToMin(a.startTime) - parseTimeToMin(b.startTime)), [calendarEntries, todayKey]);

  function markAgendaDone(entry) { setCalendarEntries((prev) => prev.map((e) => (e.id === entry.id ? { ...e, status: "done", updatedAt: Date.now() } : e))); addLog(entry.sportType || "Other", `${entry.title} ${entry.durationMin || 0}min`); }
  function startAgendaGym(entry) { if (!entry?.planId) return; const plan = plans.find((p) => p.id === entry.planId); if (!plan) return; onStartWorkout(plan); }
  function moveAgendaToTomorrow(entryId) { setCalendarEntries((prev) => prev.map((e) => { if (e.id !== entryId) return e; const d = parseDateKey(e.date); if (!d) return e; return { ...e, date: formatDateKey(addDays(d, 1)), updatedAt: Date.now() }; })); }
  function copyAgendaToNextWeek(entryId) { setCalendarEntries((prev) => { const src = prev.find((e) => e.id === entryId); if (!src) return prev; const d = parseDateKey(src.date); if (!d) return prev; const targetDate = formatDateKey(addDays(d, 7)); if (prev.some((e) => e.date === targetDate && e.title === src.title)) return prev; return [{ ...src, id: uid(), date: targetDate, status: "planned", createdAt: Date.now(), updatedAt: Date.now() }, ...prev]; }); }
  function applyTemplatesToWeek(weekStartDate) {
    const start = new Date(weekStartDate.getFullYear(), weekStartDate.getMonth(), weekStartDate.getDate());
    setCalendarEntries((prev) => { const next = [...prev]; const now = Date.now(); for (const tpl of calendarTemplates) { if (!tpl?.active) continue; const wd = Math.min(7, Math.max(1, Number(tpl.weekday) || 1)); const date = formatDateKey(addDays(start, wd - 1)); const existingIdx = next.findIndex((e) => e.date === date && e.templateId === tpl.id); const mapped = { id: existingIdx >= 0 ? next[existingIdx].id : uid(), date, startTime: tpl.startTime || "07:00", durationMin: Math.max(1, parseInt(String(tpl.durationMin || 45), 10) || 45), title: tpl.title || "Template", sportType: tpl.sportType || "Other", planId: tpl.sportType === "Gym" ? tpl.planId || null : null, status: existingIdx >= 0 ? next[existingIdx].status : "planned", templateId: tpl.id, createdAt: existingIdx >= 0 ? next[existingIdx].createdAt : now, updatedAt: now }; if (existingIdx >= 0) next[existingIdx] = { ...next[existingIdx], ...mapped }; else next.unshift(mapped); } return next; });
  }

  if (workout) {
    const plan = plans.find((p) => p.id === workout.planId);
    if (!plan) return null;
    return (<SafeAreaView style={styles.root}><StatusBar style="dark" /><WorkoutScreen t={t} plan={plan} workout={workout} setWorkout={setWorkout} onFinish={finishWorkout} allExercises={allExercises} onOpenExerciseDetail={openExerciseDetail} /></SafeAreaView>);
  }

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="dark" />
      {tab === "today" ? <TodayScreen t={t} note={note} setNote={setNote} logs={logs} addLog={addLog} sessions={sessions} onOpenSession={openSession} todayAgenda={todayAgenda} onDoneAgenda={markAgendaDone} onStartAgendaGym={startAgendaGym} onStartAgendaEndurance={() => {}} onMoveAgendaTomorrow={moveAgendaToTomorrow} onCopyAgendaNextWeek={copyAgendaToNextWeek} onOpenLog={openLog} /> : null}
      {tab === "plans" ? <PlansScreen t={t} plans={plans} setPlans={setPlans} activePlanId={activePlanId} setActivePlanId={setActivePlanId} onStartWorkout={onStartWorkout} allExercises={allExercises} /> : null}
      {tab === "library" ? <LibraryScreen t={t} allExercises={allExercises} userExercises={userExercises} onDeleteUserExercise={deleteUserExercise} onOpenCreate={() => setCreateExerciseOpen(true)} onOpenImportExercises={() => setImportExercisesOpen(true)} onOpenExport={() => setExportOpen(true)} onOpenImportData={() => setImportDataOpen(true)} packInstalling={packInstalling} packStatusText={packStatusText} onInstallPack={installFreeExerciseDbPack} prefs={prefs} setPrefs={setPrefs} onOpenExerciseDetail={openExerciseDetail} /> : null}
      {tab === "progress" ? <ProgressScreen sessions={sessions} logs={logs} calendarEntries={calendarEntries} allExercises={allExercises} prefs={prefs} setPrefs={setPrefs} /> : null}
      {tab === "endurance" ? <EnduranceScreen templates={enduranceTemplates} sessions={enduranceSessions} plans={plans} onSaveTemplate={(t) => setEnduranceTemplates((prev) => { const i = prev.findIndex((x) => x.id === t.id); if (i >= 0) { const n = [...prev]; n[i] = t; return n; } return [t, ...prev]; })} onDeleteTemplate={(id) => setEnduranceTemplates((prev) => prev.filter((x) => x.id !== id))} onStartTemplate={() => {}} onScheduleTemplate={() => {}} onOpenSession={() => {}} /> : null}
      {tab === "calendar" ? <CalendarScreen t={t} plans={plans} calendarEntries={calendarEntries} setCalendarEntries={setCalendarEntries} calendarTemplates={calendarTemplates} setCalendarTemplates={setCalendarTemplates} calendarWeekOffset={calendarWeekOffset} setCalendarWeekOffset={setCalendarWeekOffset} onApplyTemplatesToWeek={applyTemplatesToWeek} /> : null}

      <View style={[styles.tabBar, { bottom: TAB_BOTTOM + 8 }]}>
        <TabButton label={t.tabs.today} active={tab === "today"} onPress={() => setTab("today")} />
        <TabButton label={t.tabs.plans} active={tab === "plans"} onPress={() => setTab("plans")} />
        <TabButton label={t.tabs.library} active={tab === "library"} onPress={() => setTab("library")} />
        <TabButton label={t.tabs.progress} active={tab === "progress"} onPress={() => setTab("progress")} />
        <TabButton label={t.tabs.endurance} active={tab === "endurance"} onPress={() => setTab("endurance")} />
        <TabButton label={t.tabs.calendar} active={tab === "calendar"} onPress={() => setTab("calendar")} />
      </View>

      <WorkoutDetailModal visible={sessionModalOpen} onClose={() => setSessionModalOpen(false)} t={t} session={selectedSession} onSaveSession={saveSessionEdits} />
      <EditLogModal visible={editLogOpen} onClose={() => setEditLogOpen(false)} log={selectedLog} onSave={saveLog} onDelete={deleteLog} />
      <ExerciseDetailModal visible={exerciseDetailOpen} onClose={() => setExerciseDetailOpen(false)} exercise={selectedExercise} prefs={prefs} setPrefs={setPrefs} onSaveExerciseDefaults={() => {}} />
      <CreateExerciseModal visible={createExerciseOpen} onClose={() => setCreateExerciseOpen(false)} t={t} onSave={addCustomExercise} />
      <ImportExercisesModal visible={importExercisesOpen} onClose={() => setImportExercisesOpen(false)} t={t} onImport={importExercises} />
      <ExportDataModal visible={exportOpen} onClose={() => setExportOpen(false)} t={t} data={exportPayload} />
      <ImportDataModal visible={importDataOpen} onClose={() => setImportDataOpen(false)} t={t} onImport={importAppData} />
      <ToastBanner toast={toast} />
      <CelebrationOverlay visible={celebrateDone} />
    </SafeAreaView>
  );
}
