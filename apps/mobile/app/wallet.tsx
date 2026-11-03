import { translate } from "@elawyer/i18n";
import { colors } from "@elawyer/tokens";
import { useQuery } from "@tanstack/react-query";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
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
      ) : (
        <View style={styles.card}>
          <Text style={styles.kicker}>{translate("ar", "wallet.balance")}</Text>
          <Text style={styles.balance}>
            {query.data ? `${formatSar(query.data.balanceHalalas)} ${translate("ar", "common.sar")}` : translate("ar", "common.loading")}
          </Text>
        </View>
      )}
      {(query.data?.transactions || []).map((row) => (
        <Text key={row.id} style={styles.row}>{row.description} · {formatSar(row.amountHalalas)}</Text>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  title: { fontSize: 32, fontWeight: "700", color: colors.navy700, textAlign: "right" },
  card: { marginTop: 16, backgroundColor: colors.navy700, borderRadius: 24, padding: 24 },
  kicker: { color: colors.slate300, textAlign: "right" },
  balance: { marginTop: 8, fontSize: 40, fontWeight: "700", color: "white", textAlign: "right" },
  row: { marginTop: 8, color: colors.slate700, backgroundColor: "white", borderRadius: 16, padding: 14, minHeight: 48, textAlign: "right" },
  retry: { marginTop: 16, minHeight: 48, justifyContent: "center" },
  retryText: { marginTop: 8, color: colors.teal700, fontWeight: "700" },
});
