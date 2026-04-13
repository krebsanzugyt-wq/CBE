import React, { useState, useMemo } from "react";
import { View, Text, ScrollView, FlatList, Pressable, ActivityIndicator } from "react-native";
import { styles } from "../styles";
import { GlassCard, PillButton, RowButton, ListEmpty, Chip, GlowTextInput } from "../components/ui";
import { useDebouncedValue, smartSearch } from "../utils";
import { CATEGORIES, MUSCLES } from "../constants";

export function LibraryScreen({ t, allExercises, userExercises, onDeleteUserExercise, onOpenCreate, onOpenImportExercises, onOpenExport, onOpenImportData, packInstalling, packStatusText, onInstallPack, prefs, setPrefs, onOpenExerciseDetail }) {
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
