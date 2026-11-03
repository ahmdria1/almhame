import { translate } from "@elawyer/i18n";
import { colors } from "@elawyer/tokens";
import { COURTS, type CourtType } from "@elawyer/types";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { client } from "../../src/api";

export default function TrackedCases() {
  const queryClient = useQueryClient();
  const list = useQuery({ queryKey: ["tracked"], queryFn: () => client().tracked() });
  const [caseNumber, setCaseNumber] = useState("");
  const [court, setCourt] = useState<CourtType>("labor");
  const [role, setRole] = useState("plaintiff");
  const [error, setError] = useState("");
  const connected = list.data?.connected;

  async function add() {
    setError("");
    try {
      await client().addTracked({ caseNumber, court, role });
      setCaseNumber("");
      await queryClient.invalidateQueries({ queryKey: ["tracked"] });
    } catch {
      setError(translate("ar", "errors.busy"));
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 20 }}>
      <Text style={styles.title}>{translate("ar", "track.title")}</Text>
      {connected === false ? <Text style={styles.notice}>{translate("ar", "track.notConnected")}</Text> : null}
      <Text style={styles.label}>{translate("ar", "track.number")}</Text>
      <TextInput value={caseNumber} onChangeText={setCaseNumber} style={styles.input} />
      <Text style={styles.label}>{translate("ar", "track.court")}</Text>
      <View style={styles.row}>
        {COURTS.map((item) => (
          <Pressable key={item} onPress={() => setCourt(item)} style={[styles.choice, court === item ? styles.choiceOn : null]}>
            <Text style={styles.choiceText}>{translate("ar", `courts.${item}`)}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.label}>{translate("ar", "track.role")}</Text>
      <View style={styles.row}>
        {(["plaintiff", "defendant"] as const).map((item) => (
          <Pressable key={item} onPress={() => setRole(item)} style={[styles.choice, role === item ? styles.choiceOn : null]}>
            <Text style={styles.choiceText}>{translate("ar", item === "defendant" ? "track.defendant" : "track.plaintiff")}</Text>
          </Pressable>
        ))}
      </View>
      <Pressable style={styles.primary} onPress={() => void add()}>
        <Text style={styles.primaryText}>{translate("ar", "track.submit")}</Text>
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Link href="/tracked/settings" style={styles.link}>{translate("ar", "track.settings")}</Link>
      {(list.data?.cases || []).length === 0 ? <Text style={styles.empty}>{translate("ar", "track.empty")}</Text> : (list.data?.cases || []).map((row) => (
        <Link key={row.id} href={{ pathname: "/tracked/[id]", params: { id: row.id } }} style={styles.card}>
          <Text style={styles.cardTitle}>{row.caseNumber}</Text>
          <Text style={styles.meta}>{translate("ar", `courts.${row.court}`)}</Text>
        </Link>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  title: { fontSize: 28, fontWeight: "700", color: colors.navy700, textAlign: "right", writingDirection: "rtl" },
  notice: { marginTop: 12, backgroundColor: "#E6F3F4", color: colors.teal700, borderRadius: 14, padding: 14, minHeight: 44, textAlign: "right", writingDirection: "rtl" },
  label: { marginTop: 16, fontWeight: "700", color: colors.navy700, textAlign: "right", writingDirection: "rtl" },
  input: { marginTop: 8, minHeight: 44, borderRadius: 12, backgroundColor: "white", paddingHorizontal: 12, textAlign: "right" },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  choice: { minHeight: 44, justifyContent: "center", borderRadius: 12, backgroundColor: "white", paddingHorizontal: 12 },
  choiceOn: { backgroundColor: "#D7E4F2" },
  choiceText: { color: colors.navy700, fontWeight: "600" },
  primary: { marginTop: 16, minHeight: 48, borderRadius: 14, backgroundColor: colors.navy700, alignItems: "center", justifyContent: "center" },
  primaryText: { color: "white", fontWeight: "700" },
  error: { marginTop: 8, color: colors.danger, textAlign: "right" },
  link: { marginTop: 16, minHeight: 44, color: colors.teal700, fontWeight: "700", textAlign: "right" },
  empty: { marginTop: 16, color: colors.slate700, textAlign: "right" },
  card: { marginTop: 10, minHeight: 44, backgroundColor: "white", borderRadius: 16, padding: 14 },
  cardTitle: { fontWeight: "700", color: colors.navy700, textAlign: "right" },
  meta: { color: colors.slate700, textAlign: "right" },
});
