import { colors } from "@elawyer/tokens";
import { useQuery } from "@tanstack/react-query";
import { ScrollView, StyleSheet, Text } from "react-native";
import { client } from "../src/api";
import { formatSar } from "../src/format";

export default function Wallet() {
  const query = useQuery({ queryKey: ["wallet"], queryFn: () => client().wallet() });
  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 20 }}>
      <Text style={styles.title}>محفظتي</Text>
      <Text style={styles.balance}>{formatSar(query.data?.balanceHalalas || 0)} ر.س</Text>
      {(query.data?.transactions || []).map((row) => (
        <Text key={row.id} style={styles.row}>{row.description} · {formatSar(row.amountHalalas)}</Text>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  title: { fontSize: 28, fontWeight: "700", color: colors.navy700 },
  balance: { marginTop: 12, fontSize: 36, fontWeight: "700", color: colors.navy900 },
  row: { marginTop: 8, color: colors.slate700 },
});
