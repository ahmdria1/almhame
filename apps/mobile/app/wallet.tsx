import { translate } from "@elawyer/i18n";
import { colors } from "@elawyer/tokens";
import { useQuery } from "@tanstack/react-query";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { client } from "../src/api";
import { formatSar } from "../src/format";

export default function Wallet() {
  const query = useQuery({ queryKey: ["wallet"], queryFn: () => client().wallet() });
  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 20 }}>
      <Text style={styles.title}>{translate("ar", "wallet.title")}</Text>
      {query.isError ? (
        <Pressable onPress={() => void query.refetch()} style={styles.retry}>
          <Text>{translate("ar", "common.error")}</Text>
          <Text style={styles.retryText}>{translate("ar", "common.retry")}</Text>
        </Pressable>
      ) : query.data ? (
        <Text style={styles.balance}>{formatSar(query.data.balanceHalalas)} {translate("ar", "common.sar")}</Text>
      ) : (
        <Text style={styles.balance}>{translate("ar", "common.loading")}</Text>
      )}
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
  retry: { marginTop: 16, minHeight: 48, justifyContent: "center" },
  retryText: { marginTop: 8, color: colors.teal700, fontWeight: "700" },
});
