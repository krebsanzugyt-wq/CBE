import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  Animated,
  Easing,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

/** =========================
 * i18n (DE UI, Exercise Names EN)
 * ========================= */
const STR = {
  de: {
    tabs: { today: "Heute", plans: "Pläne", library: "Übungen", progress: "Progress", calendar: "Kalender", endurance: "Ausdauer" },
    today: {
      title: "Heute",
      quickLog: "Schnell-Log",
      note: "Notiz (optional)",
      add: "Hinzufügen",
      recent: "Letzte Einträge",
      workouts: "Letzte Workouts",
      empty: "Noch keine Einträge.",
      workoutsEmpty: "Noch keine Workouts gespeichert.",
      open: "Öffnen",
      close: "Schließen",
    },
    plans: {
      title: "Pläne",
      create: "Plan erstellen",
      namePlaceholder: "z.B. Full Body A",
      open: "Öffnen",
      back: "Zurück",
      editorTitle: "Plan bearbeiten",
      addExercise: "Übung hinzufügen",
      restDefault: "Standard-Pause (Sek.)",
      exerciseEmpty: "Noch keine Übungen im Plan.",
      sets: "Sätze",
      addSet: "+ Satz",
      remove: "Entfernen",
      startWorkout: "Workout starten",
      hint: "Plan = Vorlage. Werte trägst du im Workout ein.",
    },
    workout: {
      title: "Workout",
      back: "Zurück",
      finish: "Workout beenden",
      progress: "Fortschritt",
      rest: "Pause",
      skip: "Skip",
      resume: "Weiter",
      pause: "Pause",
      doneHint: "Trage kg/reps ein. Tippe dann auf „Done" → Pause startet automatisch.",
      kg: "kg",
      reps: "reps",
      done: "Done",
      undo: "Undo",
    },
    history: {
      title: "Workout Details",
      summary: "Zusammenfassung",
      duration: "Dauer",
      done: "Done",
    },
    library: {
      title: "Übungsbibliothek",
      search: "Suchen (englischer Name)…",
      filters: { category: "Kategorie", muscle: "Muskel" },
      addToPlan: "Zum Plan",
      close: "Schließen",
      noResults: "Keine Treffer.",
      customTitle: "Eigene Übungen",
      addCustom: "Eigene Übung anlegen",
      name: "Name (Englisch)",
      category: "Kategorie",
      muscle: "Muskelgruppe",
      save: "Speichern",
      delete: "Löschen",
      emptyCustom: "Noch keine eigenen Übungen.",
      dataTitle: "Daten / Import / Export",
      importExercises: "Übungen importieren (JSON)",
      exportData: "Export (App-Daten)",
      importData: "Import (App-Daten)",
      tip: "Tipp: Mit Export/Import kannst du deinen Stand 1:1 an Freunde schicken.",
    },
    calendar: {
      title: "Kalender (MVP)",
      add: "Eintrag hinzufügen",
      date: "Datum (YYYY-MM-DD)",
      label: "Titel (z.B. Run Zone 2)",
      empty: "Noch keine geplanten Einträge.",
    },
    common: {
      pasteHere: "Hier JSON einfügen…",
      error: "Fehler",
      success: "Erfolg",
    },
  },
};
const LANG = "de";


const DS = {
  spacing: { xs: 8, s: 12, m: 16, l: 20, xl: 26 },
  radius: { card: 20, button: 999, input: 16 },
  colors: {
    bg: "#F2F4F8",
    text: "#0B0B0F",
    muted: "#5C5C66",
    border: "rgba(12,20,38,0.08)",
    surface: "rgba(255,255,255,0.92)",
    surfaceSoft: "rgba(0,0,0,0.03)",
  },
  typography: {
    h1: { fontSize: 27, fontWeight: "700" },
    h2: { fontSize: 18, fontWeight: "800" },
    body: { fontSize: 14, fontWeight: "500" },
    small: { fontSize: 12, fontWeight: "600" },
  },
};

function useDebouncedValue(value, delay = 250) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

const BASE_EXERCISES = [
  { id: "ex1", name: "Bench Press", category: "Barbell", muscle: "Chest", source: "base" },
  { id: "ex2", name: "Lat Pulldown", category: "Machine", muscle: "Back", source: "base" },
  { id: "ex3", name: "Back Squat", category: "Barbell", muscle: "Legs", source: "base" },
  { id: "ex4", name: "Leg Press", category: "Machine", muscle: "Legs", source: "base" },
  { id: "ex5", name: "Overhead Press", category: "Barbell", muscle: "Shoulders", source: "base" },
  { id: "ex6", name: "Cable Row", category: "Cable", muscle: "Back", source: "base" },
];

const CATEGORIES = ["All", "Machine", "Barbell", "Dumbbell", "Cable", "Bodyweight", "Other"];
const MUSCLES = ["All", "Chest", "Back", "Legs", "Shoulders", "Arms", "Core", "Full Body", "Other"];

const STORAGE_KEY = "gymapp_state_v3";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = SUPABASE_URL && SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}
function formatMMSS(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
function minutesBetween(a, b) {
  return Math.max(1, Math.round((b - a) / 60000));
}
function normalizeKey(ex) {
  const name = (ex.name || "").trim().toLowerCase();
  const category = (ex.category || "").trim().toLowerCase();
  const muscle = (ex.muscle || "").trim().toLowerCase();
  return `${name}__${category}__${muscle}`;
}
function safeJsonParse(text) {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch (e) {
    return { ok: false, error: String(e?.message || e) };
  }
}

function makeJoinCode(len = 8) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

const SPORT_TYPES = ["Gym", "Run", "Bike", "Swim", "Other"];

function pad2(n) {
  return String(n).padStart(2, "0");
}

function formatDateKey(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function parseDateKey(key) {
  const m = String(key || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseTimeToMin(hhmm) {
  const m = String(hhmm || "").match(/^(\d{2}):(\d{2})$/);
  if (!m) return 0;
  return Number(m[1]) * 60 + Number(m[2]);
}

function startOfWeekMonday(d) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const wd = x.getDay();
  const delta = wd === 0 ? -6 : 1 - wd;
  x.setDate(x.getDate() + delta);
  return x;
}

function addDays(d, n) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() + n);
  return x;
}

function getWeekRangeLabel(weekStart) {
  const end = addDays(weekStart, 6);
  const a = weekStart.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const b = end.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return `${a} – ${b}`;
}

function weekdayMonday1to7(d) {
  const wd = d.getDay();
  return wd === 0 ? 7 : wd;
}

function normalizeCalendarEntry(raw) {
  const d = parseDateKey(raw?.date) ? raw.date : formatDateKey(new Date());
  return {
    id: raw?.id || uid(),
    date: d,
    startTime: raw?.startTime || "07:00",
    durationMin: Math.max(1, parseInt(String(raw?.durationMin || 45), 10) || 45),
    title: raw?.title || raw?.label || "Entry",
    sportType: raw?.sportType || "Other",
    planId: raw?.planId || null,
    status: raw?.status || "planned",
    templateId: raw?.templateId || null,
    createdAt: raw?.createdAt || Date.now(),
    updatedAt: raw?.updatedAt || Date.now(),
  };
}

function normalizeCalendarTemplate(raw) {
  return {
    id: raw?.id || uid(),
    title: raw?.title || "Template",
    sportType: raw?.sportType || "Other",
    weekday: Math.min(7, Math.max(1, parseInt(String(raw?.weekday || 1), 10) || 1)),
    startTime: raw?.startTime || "07:00",
    durationMin: Math.max(1, parseInt(String(raw?.durationMin || 45), 10) || 45),
    planId: raw?.planId || null,
    notes: raw?.notes || "",
    active: raw?.active !== false,
    createdAt: raw?.createdAt || Date.now(),
    updatedAt: raw?.updatedAt || Date.now(),
  };
}

const DEFAULT_PREFS = {
  defaultRestSeconds: 180,
  defaultRepRange: { min: 6, max: 10 },
  increments: { Barbell: 2.5, Dumbbell: 1, Machine: 2.5, Cable: 1.25, Bodyweight: 0, Other: 1 },
  autoFillFromLastSession: true,
  communityEnabled: false,
  communityVisibility: "private",
  communityApproveRequired: true,
  exerciseDefaultsOverrides: {},
  exerciseSetupOverrides: {},
  localTipsByExercise: {},
};

function normalizePrefs(raw) {
  const p0 = raw && typeof raw === "object" ? raw : {};
  const out = {
    ...DEFAULT_PREFS,
    ...p0,
    defaultRepRange: {
      min: Number(p0?.defaultRepRange?.min ?? DEFAULT_PREFS.defaultRepRange.min),
      max: Number(p0?.defaultRepRange?.max ?? DEFAULT_PREFS.defaultRepRange.max),
    },
    increments: {
      ...DEFAULT_PREFS.increments,
      ...(p0?.increments || {}),
    },
  };
  if (!out.communityVisibility || !["private", "friends"].includes(out.communityVisibility)) out.communityVisibility = "private";
  return out;
}

function normalizePerformedSet(s) {
  const kgRaw = s?.kg ?? "";
  const repsRaw = s?.reps ?? "";
  const kgMissing = String(kgRaw).trim() === "";
  const repsMissing = String(repsRaw).trim() === "";
  return {
    ...s,
    kg: String(kgRaw),
    reps: String(repsRaw),
    note: s?.note || "",
    missing: Boolean(s?.missing || kgMissing || repsMissing),
  };
}

function normalizeGymSession(session) {
  const items = (session?.items || []).map((it) => ({
    ...it,
    exerciseNote: it?.exerciseNote || "",
    performed: (it?.performed || []).map(normalizePerformedSet),
  }));
  const hasMissing = items.some((it) => it.performed.some((x) => x.missing));
  return {
    ...session,
    status: session?.status || (hasMissing ? "incomplete" : "complete"),
    items,
  };
}

function isSessionComplete(items) {
  for (const it of items || []) {
    for (const s of it.performed || []) {
      if (String(s?.kg || "").trim() === "" || String(s?.reps || "").trim() === "") return false;
    }
  }
  return true;
}

const FREE_EXERCISE_DB_URL =
  "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json";

function mapEquipmentToCategory(equipment) {
  const e = String(equipment || "").toLowerCase();
  if (e.includes("machine")) return "Machine";
  if (e.includes("barbell")) return "Barbell";
  if (e.includes("dumbbell")) return "Dumbbell";
  if (e.includes("cable")) return "Cable";
  if (e.includes("body")) return "Bodyweight";
  return "Other";
}

function mapPrimaryMuscleToGroup(primaryMuscles) {
  const m = String((primaryMuscles && primaryMuscles[0]) || "").toLowerCase();
  if (m.includes("ab") || m.includes("oblique")) return "Core";
  if (m.includes("chest") || m.includes("pect")) return "Chest";
  if (m.includes("back") || m.includes("lat") || m.includes("trap")) return "Back";
  if (m.includes("quad") || m.includes("ham") || m.includes("calf") || m.includes("glute") || m.includes("adductor") || m.includes("abductor")) return "Legs";
  if (m.includes("shoulder") || m.includes("deltoid")) return "Shoulders";
  if (m.includes("bicep") || m.includes("tricep") || m.includes("forearm")) return "Arms";
  return "Other";
}

const SEARCH_SYNONYMS = {
  ohp: ["overhead", "press"],
  rdl: ["romanian", "deadlift"],
  bp: ["bench", "press"],
  lp: ["leg", "press"],
  abs: ["abs", "abdominals", "core"],
  quads: ["quads", "quadriceps"],
  hams: ["hams", "hamstrings"],
  tris: ["tris", "triceps"],
  bis: ["bis", "biceps"],
  db: ["dumbbell"],
  bb: ["barbell"],
};

function tokenize(q) {
  const s = q.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  return s ? s.split(/\s+/).filter(Boolean) : [];
}

function expandTokens(tokens) {
  const out = [];
  for (const t of tokens) {
    out.push(t);
    if (SEARCH_SYNONYMS[t]) out.push(...SEARCH_SYNONYMS[t]);
  }
  return Array.from(new Set(out));
}

function exerciseHaystack(ex) {
  const parts = [ex.name, ex.category, ex.muscle];
  if (ex.meta?.equipment) parts.push(ex.meta.equipment);
  if (Array.isArray(ex.meta?.primaryMuscles)) parts.push(ex.meta.primaryMuscles.join(" "));
  return parts.join(" ").toLowerCase();
}

function scoreExercise(ex, raw, tokens) {
  if (!raw) return 0;
  const name = ex.name.toLowerCase();
  const cat = ex.category.toLowerCase();
  const mus = ex.muscle.toLowerCase();
  const eq = String(ex.meta?.equipment || "").toLowerCase();
  let s = 0;
  if (name === raw) s += 1400;
  if (name.startsWith(raw)) s += 900;
  if (name.includes(raw)) s += 500;
  for (const t of tokens) {
    if (!t) continue;
    if (name.startsWith(t)) s += 220;
    if (name.includes(t)) s += 140;
    if (mus.includes(t)) s += 90;
    if (cat.includes(t)) s += 90;
    if (eq.includes(t)) s += 60;
  }
  s += Math.max(0, 30 - Math.min(30, Math.floor(name.length / 4)));
  return s;
}

function smartSearch(exercises, query, cat, mus, limit = 80) {
  const raw = query.trim().toLowerCase();
  const tokens = expandTokens(tokenize(raw));
  const filtered = [];
  for (const ex of exercises) {
    if (cat && cat !== "All" && ex.category !== cat) continue;
    if (mus && mus !== "All" && ex.muscle !== mus) continue;
    if (!raw) { filtered.push({ ex, s: 0 }); continue; }
    const hay = exerciseHaystack(ex);
    const ok = hay.includes(raw) || tokens.some((t) => (t.length <= 1 ? false : hay.includes(t)));
    if (!ok) continue;
    filtered.push({ ex, s: scoreExercise(ex, raw, tokens) });
  }
  filtered.sort((a, b) => {
    if (!raw) return a.ex.name.localeCompare(b.ex.name);
    if (b.s !== a.s) return b.s - a.s;
    return a.ex.name.localeCompare(b.ex.name);
  });
  return filtered.slice(0, limit).map((x) => x.ex);
}

function toNum(v) {
  const n = parseFloat(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function getIncrementByCategory(category) {
  if (category === "Barbell") return 2.5;
  if (category === "Dumbbell") return 1;
  if (category === "Machine") return 2.5;
  if (category === "Bodyweight") return 0;
  return 1;
}

function formatRunPace(durationMin, distanceKm) {
  const d = toNum(distanceKm);
  const t = toNum(durationMin);
  if (d <= 0 || t <= 0) return "-";
  const p = t / d;
  const m = Math.floor(p);
  const sec = Math.round((p - m) * 60);
  return `${m}:${pad2(sec)} min/km`;
}

function formatBikeSpeed(durationMin, distanceKm) {
  const d = toNum(distanceKm);
  const t = toNum(durationMin);
  if (d <= 0 || t <= 0) return "-";
  const kmh = d / (t / 60);
  return `${kmh.toFixed(1)} km/h`;
}

function formatSwimPace(durationMin, distanceKm) {
  const dKm = toNum(distanceKm);
  const t = toNum(durationMin);
  const meters = dKm * 1000;
  if (meters <= 0 || t <= 0) return "-";
  const per100 = t / (meters / 100);
  const m = Math.floor(per100);
  const sec = Math.round((per100 - m) * 60);
  return `${m}:${pad2(sec)} /100m`;
}

function enduranceMetricLabel(sportType, durationMin, distanceKm) {
  if (sportType === "Run") return formatRunPace(durationMin, distanceKm);
  if (sportType === "Bike") return formatBikeSpeed(durationMin, distanceKm);
  if (sportType === "Swim") return formatSwimPace(durationMin, distanceKm);
  return "-";
}

function evaluateSetSuggestion(item, setEntry, allSets, setIdx) {
  const reps = toNum(setEntry?.reps);
  const kg = toNum(setEntry?.kg);
  const rir = toNum(setEntry?.rir);
  const repMin = toNum(setEntry?.targetRepMin || 0) || 6;
  const repMax = toNum(setEntry?.targetRepMax || 0) || Math.max(repMin, 10);
  const inc = toNum(item?.incrementKg || 0) || 1;
  const mode = item?.progressionMode || "double";
  if (mode === "top_backoff") {
    if (setIdx === 0) {
      if (reps >= repMax) return `Next backoff: ${Math.max(0, kg * (1 - (toNum(item?.backoffPercent) || 10) / 100)).toFixed(1)} kg`;
      if (reps < repMin) return "Next set: reduce 5% (fatigue)";
      return "Next set: keep weight";
    }
    return reps < repMin ? "Next set: reduce 5% (fatigue)" : "Next set: keep weight";
  }
  if (mode === "fixed_load") {
    const fixed = toNum(item?.fixedReps || 5) || 5;
    if (reps >= fixed && rir >= 1) return `Next session: +${inc} kg`;
    if (reps < fixed - 1) return "Next set: reduce 5% (fatigue)";
    return "Next set: keep weight";
  }
  const allDone = allSets.every((x) => x?.done);
  const allAtTop = allSets.every((x) => toNum(x?.reps) >= repMax);
  if (reps < repMin) return "Next set: reduce 5% (fatigue)";
  if (allDone && allAtTop) return `Next session: +${inc} kg`;
  return "Next set: keep weight";
}

function buildExerciseHistory(sessions) {
  const out = {};
  for (const s of sessions || []) {
    const date = formatDateKey(new Date(s.startedAt || s.endedAt || Date.now()));
    for (const it of s.items || []) {
      let bestKg = 0;
      let bestReps = 0;
      let totalVolume = 0;
      for (const set of it.performed || []) {
        const kgTxt = String(set?.kg ?? "").trim();
        const repsTxt = String(set?.reps ?? "").trim();
        if (!kgTxt || !repsTxt) continue;
        const kg = toNum(kgTxt);
        const reps = toNum(repsTxt);
        if (kg <= 0 || reps <= 0) continue;
        bestKg = Math.max(bestKg, kg);
        bestReps = Math.max(bestReps, reps);
        totalVolume += kg * reps;
      }
      if (bestKg <= 0 && totalVolume <= 0) continue;
      const est1RM = Number((bestKg * (1 + bestReps / 30)).toFixed(1));
      const row = { sessionId: s.id, date, ts: Number(s.startedAt || s.endedAt || Date.now()), bestKg: Number(bestKg.toFixed(1)), bestReps, totalVolume: Number(totalVolume.toFixed(1)), est1RM };
      if (!out[it.exerciseId]) out[it.exerciseId] = [];
      out[it.exerciseId].push(row);
    }
  }
  for (const key of Object.keys(out)) { out[key].sort((a, b) => b.ts - a.ts); }
  return out;
}

function GlassCard({ title, children, style }) {
  return (
    <View style={[styles.card, style]}>
      {title ? <Text style={styles.cardTitle}>{title}</Text> : null}
      {children}
    </View>
  );
}
function PillButton({ label, onPress, variant = "primary", accessibilityLabel }) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel || label}
      onPress={onPress}
      style={({ pressed }) => [styles.pill, variant === "primary" ? styles.pillPrimary : styles.pillSecondary, pressed ? { opacity: 0.72, transform: [{ scale: 0.985 }] } : null]}
    >
      <Text style={variant === "primary" ? styles.pillTextPrimary : styles.pillTextSecondary}>{label}</Text>
    </Pressable>
  );
}
function Chip({ label, active, onPress }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active ? styles.chipActive : null]}>
      <Text style={active ? styles.chipTextActive : styles.chipText}>{label}</Text>
    </Pressable>
  );
}
function TabButton({ label, active, onPress }) {
  return (
    <Pressable onPress={onPress} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={({ pressed }) => [styles.tabBtn, active ? styles.tabBtnActive : null, pressed ? { opacity: 0.75 } : null]}>
      <Text style={active ? styles.tabTextActive : styles.tabText}>{label}</Text>
    </Pressable>
  );
}
function HeaderBar({ title, right }) {
  return (<View style={styles.rowBetween}><Text style={styles.h1}>{title}</Text>{right || null}</View>);
}
function ListEmpty({ text }) {
  return <Text style={styles.muted}>{text}</Text>;
}
function RowButton({ label, onPress, variant = "secondary", accessibilityLabel }) {
  return <PillButton label={label} onPress={onPress} variant={variant} accessibilityLabel={accessibilityLabel} />;
}
function ToastBanner({ toast }) {
  if (!toast?.text) return null;
  return (
    <View style={[styles.toastWrap, toast.type === "error" ? styles.toastError : toast.type === "success" ? styles.toastSuccess : null]}>
      <Text style={styles.toastText}>{toast.text}</Text>
    </View>
  );
}
function CelebrationOverlay({ visible }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: visible ? 1 : 0, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [visible, anim]);
  if (!visible) return null;
  return (
    <Animated.View style={[styles.celebrationOverlay, { opacity: anim, transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }] }]}>
      <View style={styles.celebrationCard}><Text style={styles.h1}>Done</Text><Text style={styles.help}>Workout complete</Text></View>
    </Animated.View>
  );
}
function GlowTextInput({ style, ...props }) {
  const focus = useRef(new Animated.Value(0)).current;
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    Animated.timing(focus, { toValue: focused ? 1 : 0, duration: 180, easing: Easing.out(Easing.quad), useNativeDriver: false }).start();
  }, [focused, focus]);
  const borderColor = focus.interpolate({ inputRange: [0, 1], outputRange: ["rgba(0,0,0,0.08)", "rgba(48,118,255,0.42)"] });
  return (
    <View style={{ position: "relative" }}>
      <Animated.View pointerEvents="none" style={[styles.glowBlobBlue, { opacity: focus }]} />
      <Animated.View pointerEvents="none" style={[styles.glowBlobGreen, { opacity: focus.interpolate({ inputRange: [0, 1], outputRange: [0, 0.7] }) }]} />
      <Animated.View style={[styles.inputGlowWrap, { borderColor }, style]}>
        <TextInput {...props} onFocus={(e) => { setFocused(true); props.onFocus?.(e); }} onBlur={(e) => { setFocused(false); props.onBlur?.(e); }} style={[styles.input, { borderWidth: 0, backgroundColor: "transparent", paddingHorizontal: 0, paddingVertical: 0 }, props.multiline ? { minHeight: 44, textAlignVertical: "top" } : null]} />
      </Animated.View>
    </View>
  );
}
function PulsePressable({ children, onPress, style }) {
  const scale = useRef(new Animated.Value(1)).current;
  function doPress() {
    Animated.sequence([Animated.timing(scale, { toValue: 0.95, duration: 70, useNativeDriver: true }), Animated.spring(scale, { toValue: 1, friction: 4, tension: 120, useNativeDriver: true })]).start();
    onPress?.();
  }
  return (<Pressable onPress={doPress}><Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View></Pressable>);
}

function CreateExerciseModal({ visible, onClose, t, onSave }) {
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

function ImportExercisesModal({ visible, onClose, t, onImport }) {
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

function ExportDataModal({ visible, onClose, t, data }) {
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

function ImportDataModal({ visible, onClose, t, onImport }) {
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

function WorkoutDetailModal({ visible, onClose, t, session, onSaveSession }) {
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

function ExerciseDetailModal({ visible, onClose, exercise, prefs, setPrefs, onSaveExerciseDefaults }) {
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

function NoteModal({ visible, onClose, title, value, onSave }) {
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

function EditLogModal({ visible, onClose, log, onSave, onDelete }) {
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

function EditPlanModal({ visible, onClose, plan, onSave, onDelete, onDuplicate }) {
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

function TodayScreen({ t, note, setNote, logs, addLog, sessions, onOpenSession, todayAgenda, onDoneAgenda, onStartAgendaGym, onStartAgendaEndurance, onMoveAgendaTomorrow, onCopyAgendaNextWeek, onOpenLog }) {
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

function PlansScreen({ t, plans, setPlans, activePlanId, setActivePlanId, onStartWorkout, allExercises }) {
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

function WorkoutScreen({ t, plan, workout, setWorkout, onFinish, allExercises, onOpenExerciseDetail }) {
  const restIntervalRef = useRef(null);
  const [exerciseNoteModal, setExerciseNoteModal] = useState({ open: false, itemId: null });
  const [setNoteModal, setSetNoteModal] = useState({ open: false, itemId: null, setIdx: -1 });

  // NB: setWorkout stammt aus useState im Parent und ist garantiert stabil.
  // Absichtlich NICHT in der Dep-Liste, damit der Interval nicht bei jedem Parent-Re-Render neu startet.
  useEffect(() => {
    if (!workout.restRunning) return;
    restIntervalRef.current = setInterval(() => {
      setWorkout((prev) => { if (!prev) return prev; const next = prev.restRemaining <= 1 ? 0 : prev.restRemaining - 1; const stop = next === 0; return { ...prev, restRemaining: next, restRunning: stop ? false : true }; });
    }, 1000);
    return () => { if (restIntervalRef.current) clearInterval(restIntervalRef.current); restIntervalRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workout.restRunning]);

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

function LibraryScreen({ t, allExercises, userExercises, onDeleteUserExercise, onOpenCreate, onOpenImportExercises, onOpenExport, onOpenImportData, packInstalling, packStatusText, onInstallPack, prefs, setPrefs, onOpenExerciseDetail }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const [mus, setMus] = useState("All");
  const debouncedQ = useDebouncedValue(q, 250);
  const filtered = useMemo(() => smartSearch(allExercises, debouncedQ, cat, mus, 60), [allExercises, debouncedQ, cat, mus]);
  return (
    <ScrollView contentContainerStyle={styles.screenPad} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
      <Text style={styles.h1}>{t.library.title}</Text>
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
            <Pressable style={styles.listItem} onPress={() => onOpenExerciseDetail(e)}>
              <Text style={styles.listTitle}>{e.name}</Text>
              <Text style={styles.listMeta}>{e.category} • {e.muscle}</Text>
            </Pressable>
          )}
        />
      </GlassCard>
      <GlassCard title={t.library.customTitle}>
        <View style={styles.rowWrap}><PillButton label={t.library.addCustom} onPress={onOpenCreate} variant="primary" /></View>
        <FlatList data={userExercises.slice(0, 30)} keyExtractor={(item) => item.id} scrollEnabled={false} ListEmptyComponent={<ListEmpty text={t.library.emptyCustom} />}
          renderItem={({ item: e }) => (
            <View style={styles.listItemRow}>
              <View style={{ flex: 1 }}><Text style={styles.listTitle}>{e.name}</Text><Text style={styles.listMeta}>{e.category} • {e.muscle}</Text></View>
              <RowButton label={t.library.delete} onPress={() => onDeleteUserExercise(e.id)} variant="secondary" />
            </View>
          )}
        />
      </GlassCard>
      <GlassCard title={t.library.dataTitle}>
        <View style={styles.rowWrap}>
          <PillButton label={t.library.importExercises} onPress={onOpenImportExercises} variant="secondary" />
          <PillButton label={t.library.exportData} onPress={onOpenExport} variant="secondary" />
          <PillButton label={t.library.importData} onPress={onOpenImportData} variant="secondary" />
        </View>
        <Text style={styles.help}>{t.library.tip}</Text>
      </GlassCard>
      <GlassCard title="Exercise Pack (800+)">
        <View style={styles.rowWrap}><PillButton label={packInstalling ? "Installing…" : "Install Free Exercise DB (800+)"} onPress={onInstallPack} variant="primary" /></View>
        {packInstalling ? (<View style={{ flexDirection: "row", alignItems: "center", marginTop: 10 }}><ActivityIndicator /><Text style={[styles.help, { marginTop: 0, marginLeft: 10 }]}>{packStatusText}</Text></View>) : packStatusText ? (<Text style={styles.help}>{packStatusText}</Text>) : null}
      </GlassCard>
    </ScrollView>
  );
}

function ProgressScreen({ sessions, logs, calendarEntries, allExercises, prefs, setPrefs }) {
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

function CalendarScreen({ t, plans, calendarEntries, setCalendarEntries, calendarTemplates, setCalendarTemplates, calendarWeekOffset, setCalendarWeekOffset, onApplyTemplatesToWeek }) {
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

function EnduranceScreen({ templates, sessions, plans, onSaveTemplate, onDeleteTemplate, onStartTemplate, onScheduleTemplate, onOpenSession }) {
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
    return (<SafeAreaView style={styles.root}><WorkoutScreen t={t} plan={plan} workout={workout} setWorkout={setWorkout} onFinish={finishWorkout} allExercises={allExercises} onOpenExerciseDetail={openExerciseDetail} /></SafeAreaView>);
  }

  return (
    <SafeAreaView style={styles.root}>
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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F2F4F8" },
  screenPad: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 132 },
  h1: { fontSize: 27, fontWeight: "700", color: "#0B0B0F", marginBottom: 16, letterSpacing: 0.2 },
  card: { backgroundColor: "rgba(255,255,255,0.92)", borderRadius: 20, paddingHorizontal: 16, paddingVertical: 16, borderWidth: 1, borderColor: "rgba(12,20,38,0.08)", shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 14, shadowOffset: { width: 0, height: 7 }, marginBottom: 16 },
  cardTitle: { fontSize: 15, fontWeight: "700", color: "#0B0B0F", marginBottom: 12, letterSpacing: 0.2 },
  label: { fontSize: 12, fontWeight: "600", color: "#3A3A44", marginBottom: 8, marginTop: 8 },
  smallLabel: { fontSize: 11, fontWeight: "600", color: "#3A3A44", marginBottom: 6 },
  input: { backgroundColor: "rgba(255,255,255,0.9)", borderWidth: 1, borderColor: "rgba(0,0,0,0.08)", paddingHorizontal: 14, paddingVertical: 13, borderRadius: 16, color: "#0B0B0F" },
  inputGlowWrap: { backgroundColor: "rgba(255,255,255,0.9)", borderWidth: 1, paddingHorizontal: 14, paddingVertical: 13, borderRadius: 16 },
  glowBlobBlue: { position: "absolute", left: 8, right: 8, top: 4, bottom: 4, backgroundColor: "rgba(68,142,255,0.08)", borderRadius: 16 },
  glowBlobGreen: { position: "absolute", left: 22, right: 22, top: 9, bottom: 9, backgroundColor: "rgba(47,204,141,0.06)", borderRadius: 16 },
  inputSmall: { backgroundColor: "rgba(255,255,255,0.9)", borderWidth: 1, borderColor: "rgba(0,0,0,0.08)", paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14, color: "#0B0B0F" },
  help: { marginTop: 10, color: "#5C5C66", fontSize: 12, lineHeight: 18 },
  muted: { color: "#5C5C66", fontSize: 13, lineHeight: 20 },
  row: { flexDirection: "row", alignItems: "center", marginTop: 12 },
  rowWrap: { flexDirection: "row", flexWrap: "wrap", marginTop: 12 },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  statBox: { flex: 1, backgroundColor: "rgba(0,0,0,0.03)", borderRadius: 16, padding: 12, borderWidth: 1, borderColor: "rgba(0,0,0,0.05)" },
  statLabel: { fontSize: 12, color: "#5C5C66", fontWeight: "600" },
  statValue: { fontSize: 22, fontWeight: "800", color: "#0B0B0F", marginTop: 4 },
  statValueSmall: { fontSize: 14, fontWeight: "700", color: "#0B0B0F", marginTop: 4 },
  timerBig: { fontSize: 28, fontWeight: "800", color: "#0B0B0F" },
  pill: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 999, marginRight: 10, marginBottom: 10, borderWidth: 1 },
  pillPrimary: { backgroundColor: "#0B0B0F", borderColor: "#0B0B0F" },
  pillSecondary: { backgroundColor: "rgba(255,255,255,0.9)", borderColor: "rgba(0,0,0,0.12)" },
  pillTextPrimary: { color: "white", fontWeight: "700", fontSize: 13 },
  pillTextSecondary: { color: "#0B0B0F", fontWeight: "700", fontSize: 13 },
  listItem: { backgroundColor: "rgba(0,0,0,0.03)", borderRadius: 16, padding: 12, borderWidth: 1, borderColor: "rgba(0,0,0,0.05)", marginBottom: 12 },
  listItemRow: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(0,0,0,0.03)", borderRadius: 16, padding: 12, borderWidth: 1, borderColor: "rgba(0,0,0,0.05)", marginBottom: 12 },
  listTitle: { color: "#0B0B0F", fontWeight: "800", fontSize: 14 },
  listMeta: { color: "#5C5C66", marginTop: 4, fontSize: 12, fontWeight: "600" },
  listBody: { color: "#0B0B0F", marginTop: 8, fontSize: 13, lineHeight: 18 },
  badge: { color: "#5C5C66", fontSize: 12, fontWeight: "800" },
  incompleteBadge: { marginTop: 6, color: "#9A2C2C", fontWeight: "900", fontSize: 12 },
  accordionBtn: { backgroundColor: "rgba(0,0,0,0.03)", borderRadius: 12, borderWidth: 1, borderColor: "rgba(0,0,0,0.06)", paddingVertical: 10, paddingHorizontal: 12 },
  chip: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 999, marginRight: 10, marginBottom: 10, backgroundColor: "rgba(255,255,255,0.9)", borderWidth: 1, borderColor: "rgba(0,0,0,0.12)" },
  chipActive: { backgroundColor: "#0B0B0F", borderColor: "#0B0B0F" },
  chipText: { color: "#0B0B0F", fontWeight: "700", fontSize: 12 },
  chipTextActive: { color: "white", fontWeight: "800", fontSize: 12 },
  progressDayChip: { width: 68, borderRadius: 14, padding: 10, marginRight: 8, alignItems: "center", borderWidth: 1, borderColor: "rgba(0,0,0,0.08)", backgroundColor: "rgba(255,255,255,0.9)" },
  progressDayChipActive: { borderColor: "rgba(68,142,255,0.42)", backgroundColor: "rgba(68,142,255,0.08)" },
  progressDot: { width: 8, height: 8, borderRadius: 999, marginTop: 6 },
  progressDone: { backgroundColor: "#2ECC8D" },
  progressPlanned: { backgroundColor: "#448EFF" },
  progressNone: { backgroundColor: "rgba(0,0,0,0.2)" },
  statMini: { minWidth: 110, backgroundColor: "rgba(0,0,0,0.03)", borderRadius: 14, padding: 10, marginRight: 8, marginBottom: 8, borderWidth: 1, borderColor: "rgba(0,0,0,0.05)" },
  trendRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", height: 120, marginTop: 8 },
  trendBarWrap: { width: 28, alignItems: "center", justifyContent: "flex-end" },
  trendBar: { width: 18, borderRadius: 8, backgroundColor: "rgba(68,142,255,0.6)" },
  trendLabel: { marginTop: 6, fontSize: 11, color: "#5C5C66", fontWeight: "700" },
  planItem: { backgroundColor: "rgba(0,0,0,0.03)", borderRadius: 16, padding: 12, borderWidth: 1, borderColor: "rgba(0,0,0,0.05)", marginBottom: 14 },
  setRow: { flexDirection: "row", marginTop: 10 },
  workoutSetRow: { flexDirection: "row", alignItems: "flex-end", marginTop: 10 },
  doneBtn: { height: 42, paddingHorizontal: 12, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  doneBtnOn: { backgroundColor: "#0B0B0F", borderColor: "#0B0B0F" },
  doneBtnOff: { backgroundColor: "rgba(255,255,255,0.9)", borderColor: "rgba(0,0,0,0.12)" },
  doneTextOn: { color: "white", fontWeight: "900", fontSize: 12 },
  doneTextOff: { color: "#0B0B0F", fontWeight: "900", fontSize: 12 },
  tabBar: { position: "absolute", left: 12, right: 12, flexDirection: "row", backgroundColor: "rgba(255,255,255,0.9)", borderRadius: 24, borderWidth: 1, borderColor: "rgba(0,0,0,0.08)", minHeight: 68, paddingVertical: 12, paddingHorizontal: 8, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } },
  tabBtn: { flex: 1, minHeight: 52, borderRadius: 16, alignItems: "center", justifyContent: "center", marginHorizontal: 2, paddingHorizontal: 6 },
  tabBtnActive: { backgroundColor: "rgba(0,0,0,0.06)" },
  tabText: { color: "#5C5C66", fontWeight: "700", fontSize: 12 },
  tabTextActive: { color: "#0B0B0F", fontWeight: "900", fontSize: 12 },
  modalRoot: { flex: 1, backgroundColor: "#F2F4F8" },
  modalHeader: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  modalTitle: { fontSize: 18, fontWeight: "900", color: "#0B0B0F" },
  detailSetRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 10, paddingHorizontal: 12, borderRadius: 14, borderWidth: 1, borderColor: "rgba(0,0,0,0.08)", backgroundColor: "rgba(255,255,255,0.9)", marginBottom: 10 },
  detailSetDone: { backgroundColor: "rgba(11,11,15,0.92)", borderColor: "rgba(11,11,15,0.92)" },
  detailSetText: { color: "#0B0B0F", fontWeight: "800", fontSize: 12 },
  detailSetTextDone: { color: "white", fontWeight: "900", fontSize: 12 },
  detailBadge: { color: "#5C5C66", fontSize: 12, fontWeight: "800" },
  detailBadgeDone: { color: "white", fontSize: 12, fontWeight: "900" },
  toastWrap: { position: "absolute", top: 48, left: 16, right: 16, backgroundColor: "rgba(11,11,15,0.92)", borderRadius: 14, paddingVertical: 10, paddingHorizontal: 12, zIndex: 40 },
  toastError: { backgroundColor: "rgba(120,20,20,0.92)" },
  toastSuccess: { backgroundColor: "rgba(20,90,40,0.92)" },
  toastText: { color: "white", fontWeight: "700", fontSize: 13 },
  celebrationOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(11,11,15,0.12)", zIndex: 35 },
  celebrationCard: { backgroundColor: "rgba(255,255,255,0.94)", borderRadius: 22, paddingHorizontal: 22, paddingVertical: 18, borderWidth: 1, borderColor: "rgba(12,20,38,0.08)", alignItems: "center" },
});
