import { colors } from "@elawyer/tokens";
import { PUBLISHED_PLANS, SERVICE_CODES, SERVICE_PRICES_HALALAS, PLAN_CODES } from "@elawyer/types";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { formatSar } from "../src/format";

const SERVICE_LABEL = {
  review: "مراجعة أو تدقيق",
  defense: "مذكرة دفاع أو جوابية",
  lawsuit: "صحيفة دعوى",
  objection: "لائحة اعتراضية",
  chat_pack: "حزمة 50 سؤالاً",
} as const;

export default function Plans() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 20 }}>
      <Text style={styles.title}>الباقات</Text>
      {PLAN_CODES.map((code) => (
        <View key={code} style={styles.card}>
          <Text style={styles.name}>{code}</Text>
          <Text style={styles.price}>{formatSar(PUBLISHED_PLANS[code].priceHalalas)} ر.س</Text>
        </View>
      ))}
      <Text style={styles.title}>الخدمة</Text>
      {SERVICE_CODES.map((code) => (
        <View key={code} style={styles.card}>
          <Text style={styles.name}>{SERVICE_LABEL[code]}</Text>
          <Text style={styles.price}>{formatSar(SERVICE_PRICES_HALALAS[code])} ر.س</Text>
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
