import { translate } from "@elawyer/i18n";
import { colors } from "@elawyer/tokens";
import { useQuery } from "@tanstack/react-query";
import { Link } from "expo-router";
import { ScrollView, StyleSheet, Text } from "react-native";
import { client } from "../src/api";

export default function Saved() {
  const query = useQuery({ queryKey: ["saved"], queryFn: () => client().saved() });
  const items = query.data?.items || [];
  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 20 }}>
      <Text style={styles.title}>{translate("ar", "saved.title")}</Text>
      {query.isError ? <Text style={styles.empty}>{translate("ar", "common.error")}</Text> : null}
      {items.length === 0 && !query.isLoading ? <Text style={styles.empty}>{translate("ar", "saved.empty")}</Text> : null}
      {items.map((item) => (
        item.kind === "memo" ? (
          <Link key={item.id} href={{ pathname: "/memo/[id]", params: { id: item.refId } }} style={styles.card}>
            <Text style={styles.cardTitle}>{item.title}</Text>
          </Link>
        ) : (
          <Text key={item.id} style={styles.card}>{item.title}</Text>
        )
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  title: { fontSize: 28, fontWeight: "700", color: colors.navy700, textAlign: "right" },
  empty: { marginTop: 16, color: colors.slate500, textAlign: "right" },
  card: { marginTop: 12, backgroundColor: "white", borderRadius: 16, padding: 14, minHeight: 48, color: colors.navy700 },
  cardTitle: { fontWeight: "700", color: colors.navy700, textAlign: "right" },
});
