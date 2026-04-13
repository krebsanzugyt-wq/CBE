/** =========================
 * i18n (DE UI, Exercise Names EN)
 * ========================= */
export const STR = {
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

export const LANG = "de";

export const DS = {
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

export const BASE_EXERCISES = [
  { id: "ex1", name: "Bench Press", category: "Barbell", muscle: "Chest", source: "base" },
  { id: "ex2", name: "Lat Pulldown", category: "Machine", muscle: "Back", source: "base" },
  { id: "ex3", name: "Back Squat", category: "Barbell", muscle: "Legs", source: "base" },
  { id: "ex4", name: "Leg Press", category: "Machine", muscle: "Legs", source: "base" },
  { id: "ex5", name: "Overhead Press", category: "Barbell", muscle: "Shoulders", source: "base" },
  { id: "ex6", name: "Cable Row", category: "Cable", muscle: "Back", source: "base" },
];

export const CATEGORIES = ["All", "Machine", "Barbell", "Dumbbell", "Cable", "Bodyweight", "Other"];
export const MUSCLES = ["All", "Chest", "Back", "Legs", "Shoulders", "Arms", "Core", "Full Body", "Other"];

export const STORAGE_KEY = "gymapp_state_v3";

export const SPORT_TYPES = ["Gym", "Run", "Bike", "Swim", "Other"];

export const DEFAULT_PREFS = {
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

export const FREE_EXERCISE_DB_URL =
  "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json";

export const SEARCH_SYNONYMS = {
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
