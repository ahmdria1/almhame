import { colors } from "@elawyer/tokens";
import { useQuery } from "@tanstack/react-query";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { client } from "../src/api";
import { formatSar } from "../src/format";

export default function Plans() {
  const query = useQuery({ queryKey: ["plans"], queryFn: () => client().plans() });
  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 20 }}>
      <Text style={styles.title}>الباقات</Text>
      {(query.data?.plans || []).map((plan) => (
        <View key={plan.code} style={styles.card}>
          <Text style={styles.name}>{plan.code}</Text>
          <Text style={styles.price}>{formatSar(plan.priceHalalas)} ر.س</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  title: { fontSize: 28, fontWeight: "700", color: colors.navy700, marginBottom: 12 },
  card: { backgroundColor: "white", borderRadius: 16, padding: 16, marginBottom: 10 },
  name: { fontWeight: "700", color: colors.navy700 },
  price: { marginTop: 6, fontSize: 22, fontWeight: "700" },
});
