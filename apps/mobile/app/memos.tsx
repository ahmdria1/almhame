import { colors } from "@elawyer/tokens";
import { useQuery } from "@tanstack/react-query";
import { Link } from "expo-router";
import { ScrollView, StyleSheet, Text } from "react-native";
import { client } from "../src/api";

export default function Memos() {
  const query = useQuery({ queryKey: ["memos"], queryFn: () => client().memos() });
  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 20 }}>
      <Text style={styles.title}>مذكراتي</Text>
      {(query.data?.memos || []).map((memo) => (
        <Link key={memo.id} href={{ pathname: "/memo/[id]", params: { id: memo.id } }} style={styles.card}>
          <Text style={styles.cardTitle}>{memo.title}</Text>
        </Link>
      ))}
      {(query.data?.memos.length || 0) === 0 ? <Text style={styles.empty}>لا مذكرات بعد</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  title: { fontSize: 28, fontWeight: "700", color: colors.navy700 },
  card: { marginTop: 10, backgroundColor: "white", borderRadius: 16, padding: 14 },
  cardTitle: { fontWeight: "700" },
  empty: { marginTop: 16, color: colors.slate500 },
});
