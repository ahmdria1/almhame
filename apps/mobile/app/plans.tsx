import { translate } from "@elawyer/i18n";
import { colors } from "@elawyer/tokens";
import { PLAN_CODES, PUBLISHED_PLANS, SERVICE_CODES, SERVICE_PRICES_HALALAS, type ServiceCode } from "@elawyer/types";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { formatSar } from "../src/format";

const SERVICE_KEY: Record<ServiceCode, string> = {
  review: "plans.serviceReview",
  defense: "plans.serviceDefense",
  lawsuit: "plans.serviceClaim",
  objection: "plans.serviceObjection",
  chat_pack: "plans.serviceChatPack",
};

export default function Plans() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 20 }}>
      <Text style={styles.title}>{translate("ar", "plans.title")}</Text>
      {PLAN_CODES.map((code) => (
        <View key={code} style={styles.card}>
          <Text style={styles.name}>{translate("ar", `plans.${code}Name`)}</Text>
          <Text style={styles.price}>{formatSar(PUBLISHED_PLANS[code].priceHalalas)} {translate("ar", "common.sar")}</Text>
        </View>
      ))}
      <Text style={styles.title}>{translate("ar", "plans.payg")}</Text>
      {SERVICE_CODES.map((code) => (
        <View key={code} style={styles.card}>
          <Text style={styles.name}>{translate("ar", SERVICE_KEY[code], { price: formatSar(SERVICE_PRICES_HALALAS[code]) })}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  title: { fontSize: 22, fontWeight: "700", color: colors.navy700, marginBottom: 12, marginTop: 8 },
  card: { backgroundColor: "white", borderRadius: 16, padding: 16, marginBottom: 10 },
  name: { fontWeight: "700", color: colors.navy700 },
  price: { marginTop: 6, fontSize: 22, fontWeight: "700" },
});
