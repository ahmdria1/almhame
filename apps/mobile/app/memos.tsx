import { COURTS, MEMO_TYPES } from "@elawyer/types";
import { useQuery } from "@tanstack/react-query";
import { Link } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput } from "react-native";
import { client } from "../src/api";
import { filterMemos } from "../src/memo-query";
import { usePrefs, useT } from "../src/use-prefs";

export default function Memos() {
  const { colors } = usePrefs();
  const t = useT();
  const query = useQuery({ queryKey: ["memos"], queryFn: () => client().memos() });
  const [q, setQ] = useState("");
  const [court, setCourt] = useState("");
  const [memoType, setMemoType] = useState("");
  const rows = filterMemos(query.data?.memos || [], { q, court, memoType });
  return (
    <ScrollView style={[styles.screen, { backgroundColor: colors.canvas }]} contentContainerStyle={{ padding: 20 }}>
      <Text style={[styles.title, { color: colors.ink }]}>{t("nav.memos")}</Text>
      <TextInput
        value={q}
        onChangeText={setQ}
        placeholder={t("workspace.search")}
        placeholderTextColor={colors.muted}
        style={[styles.input, { backgroundColor: colors.card, color: colors.ink, borderColor: colors.muted }]}
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        <Pressable onPress={() => setCourt("")} style={[styles.chip, { backgroundColor: court ? colors.card : colors.button }]}>
          <Text style={{ color: court ? colors.ink : colors.buttonText }}>{t("memo.filterAll")}</Text>
        </Pressable>
        {COURTS.map((item) => (
          <Pressable key={item} onPress={() => setCourt(item)} style={[styles.chip, { backgroundColor: court === item ? colors.button : colors.card }]}>
            <Text style={{ color: court === item ? colors.buttonText : colors.ink }}>{t(`courts.${item}`)}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        <Pressable onPress={() => setMemoType("")} style={[styles.chip, { backgroundColor: memoType ? colors.card : colors.button }]}>
          <Text style={{ color: memoType ? colors.ink : colors.buttonText }}>{t("workspace.tabMemo")}</Text>
        </Pressable>
        {MEMO_TYPES.map((item) => (
          <Pressable key={item} onPress={() => setMemoType(item)} style={[styles.chip, { backgroundColor: memoType === item ? colors.button : colors.card }]}>
            <Text style={{ color: memoType === item ? colors.buttonText : colors.ink }}>{t(`memos.${item}`)}</Text>
          </Pressable>
        ))}
      </ScrollView>
      {query.isError ? (
        <Pressable onPress={() => void query.refetch()} style={styles.block}>
          <Text style={{ color: colors.ink }}>{t("common.error")}</Text>
          <Text style={[styles.link, { color: colors.link }]}>{t("common.retry")}</Text>
        </Pressable>
      ) : query.isLoading ? (
        <Text style={{ color: colors.muted, marginTop: 16 }}>{t("common.loading")}</Text>
      ) : rows.length === 0 ? (
        <Text style={{ color: colors.muted, marginTop: 16 }}>{q || court || memoType ? null : t("memo.empty")}</Text>
      ) : (
        rows.map((memo) => (
          <Link key={memo.id} href={{ pathname: "/memo/[id]", params: { id: memo.id } }} style={[styles.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.cardTitle, { color: colors.ink }]}>{memo.title}</Text>
            <Text style={{ color: colors.muted }}>{t(`courts.${memo.court}`)} · {t(`memos.${memo.memoType}`)}</Text>
          </Link>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  title: { fontSize: 28, fontWeight: "700" },
  input: { marginTop: 12, minHeight: 48, borderWidth: 1, borderRadius: 14, paddingHorizontal: 12 },
  filters: { gap: 8, paddingVertical: 10 },
  chip: { borderRadius: 999, paddingHorizontal: 12, minHeight: 44, justifyContent: "center" },
  card: { marginTop: 10, borderRadius: 16, padding: 14 },
  cardTitle: { fontWeight: "700" },
  block: { marginTop: 16, minHeight: 48 },
  link: { marginTop: 8, fontWeight: "700" },
});
