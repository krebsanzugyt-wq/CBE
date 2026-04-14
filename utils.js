import { useState, useEffect } from "react";
import { DEFAULT_PREFS, SEARCH_SYNONYMS } from "./constants";

export function useDebouncedValue(value, delay = 250) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

export function formatMMSS(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function minutesBetween(a, b) {
  return Math.max(1, Math.round((b - a) / 60000));
}

export function normalizeKey(ex) {
  const name = (ex.name || "").trim().toLowerCase();
  const category = (ex.category || "").trim().toLowerCase();
  const muscle = (ex.muscle || "").trim().toLowerCase();
  return `${name}__${category}__${muscle}`;
}

export function safeJsonParse(text) {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch (e) {
    return { ok: false, error: String(e?.message || e) };
  }
}

export function makeJoinCode(len = 8) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export function pad2(n) {
  return String(n).padStart(2, "0");
}

export function formatDateKey(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function parseDateKey(key) {
  const m = String(key || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function parseTimeToMin(hhmm) {
  const m = String(hhmm || "").match(/^(\d{2}):(\d{2})$/);
  if (!m) return 0;
  return Number(m[1]) * 60 + Number(m[2]);
}

export function startOfWeekMonday(d) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const wd = x.getDay();
  const delta = wd === 0 ? -6 : 1 - wd;
  x.setDate(x.getDate() + delta);
  return x;
}

export function addDays(d, n) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() + n);
  return x;
}

export function getWeekRangeLabel(weekStart) {
  const end = addDays(weekStart, 6);
  const a = weekStart.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const b = end.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return `${a} – ${b}`;
}

export function weekdayMonday1to7(d) {
  const wd = d.getDay();
  return wd === 0 ? 7 : wd;
}

export function normalizeCalendarEntry(raw) {
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

export function normalizeCalendarTemplate(raw) {
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

export function normalizePrefs(raw) {
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

export function normalizePerformedSet(s) {
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

export function normalizeGymSession(session) {
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

export function isSessionComplete(items) {
  for (const it of items || []) {
    for (const s of it.performed || []) {
      if (String(s?.kg || "").trim() === "" || String(s?.reps || "").trim() === "") return false;
    }
  }
  return true;
}

export function mapEquipmentToCategory(equipment) {
  const e = String(equipment || "").toLowerCase();
  if (e.includes("machine")) return "Machine";
  if (e.includes("barbell")) return "Barbell";
  if (e.includes("dumbbell")) return "Dumbbell";
  if (e.includes("cable")) return "Cable";
  if (e.includes("body")) return "Bodyweight";
  return "Other";
}

export function mapPrimaryMuscleToGroup(primaryMuscles) {
  const m = String((primaryMuscles && primaryMuscles[0]) || "").toLowerCase();
  if (m.includes("ab") || m.includes("oblique")) return "Core";
  if (m.includes("chest") || m.includes("pect")) return "Chest";
  if (m.includes("back") || m.includes("lat") || m.includes("trap")) return "Back";
  if (m.includes("quad") || m.includes("ham") || m.includes("calf") || m.includes("glute") || m.includes("adductor") || m.includes("abductor")) return "Legs";
  if (m.includes("shoulder") || m.includes("deltoid")) return "Shoulders";
  if (m.includes("bicep") || m.includes("tricep") || m.includes("forearm")) return "Arms";
  return "Other";
}

export function tokenize(q) {
  const s = q.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  return s ? s.split(/\s+/).filter(Boolean) : [];
}

export function expandTokens(tokens) {
  const out = [];
  for (const t of tokens) {
    out.push(t);
    if (SEARCH_SYNONYMS[t]) out.push(...SEARCH_SYNONYMS[t]);
  }
  return Array.from(new Set(out));
}

export function exerciseHaystack(ex) {
  const parts = [ex.name, ex.category, ex.muscle];
  if (ex.meta?.equipment) parts.push(ex.meta.equipment);
  if (Array.isArray(ex.meta?.primaryMuscles)) parts.push(ex.meta.primaryMuscles.join(" "));
  return parts.join(" ").toLowerCase();
}

export function scoreExercise(ex, raw, tokens) {
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

export function smartSearch(exercises, query, cat, mus, limit = 80) {
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

export function toNum(v) {
  const n = parseFloat(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

export function getIncrementByCategory(category) {
  if (category === "Barbell") return 2.5;
  if (category === "Dumbbell") return 1;
  if (category === "Machine") return 2.5;
  if (category === "Bodyweight") return 0;
  return 1;
}

export function formatRunPace(durationMin, distanceKm) {
  const d = toNum(distanceKm);
  const t = toNum(durationMin);
  if (d <= 0 || t <= 0) return "-";
  const p = t / d;
  const m = Math.floor(p);
  const sec = Math.round((p - m) * 60);
  return `${m}:${pad2(sec)} min/km`;
}

export function formatBikeSpeed(durationMin, distanceKm) {
  const d = toNum(distanceKm);
  const t = toNum(durationMin);
  if (d <= 0 || t <= 0) return "-";
  const kmh = d / (t / 60);
  return `${kmh.toFixed(1)} km/h`;
}

export function formatSwimPace(durationMin, distanceKm) {
  const dKm = toNum(distanceKm);
  const t = toNum(durationMin);
  const meters = dKm * 1000;
  if (meters <= 0 || t <= 0) return "-";
  const per100 = t / (meters / 100);
  const m = Math.floor(per100);
  const sec = Math.round((per100 - m) * 60);
  return `${m}:${pad2(sec)} /100m`;
}

export function enduranceMetricLabel(sportType, durationMin, distanceKm) {
  if (sportType === "Run") return formatRunPace(durationMin, distanceKm);
  if (sportType === "Bike") return formatBikeSpeed(durationMin, distanceKm);
  if (sportType === "Swim") return formatSwimPace(durationMin, distanceKm);
  return "-";
}

export function evaluateSetSuggestion(item, setEntry, allSets, setIdx) {
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

export function buildExerciseHistory(sessions) {
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
