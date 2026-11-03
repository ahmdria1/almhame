import { translate } from "@elawyer/i18n";
import { colors } from "@elawyer/tokens";
import { PLAN_CODES, PUBLISHED_PLANS, SERVICE_CODES, SERVICE_PRICES_HALALAS, type PlanCode, type ServiceCode } from "@elawyer/types";
import { useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { client } from "../src/api";
import { formatSar } from "../src/format";
import { Hub } from "../src/nav";

const SERVICE_KEY: Record<ServiceCode, string> = {
  review: "plans.serviceReview",
  defense: "plans.serviceDefense",
  lawsuit: "plans.serviceClaim",
  objection: "plans.serviceObjection",
  chat_pack: "plans.serviceChatPack",
};

export default function Plans() {
  const [note, setNote] = useState("");
  async function buyPlan(code: PlanCode) {
    if (code === "free") return;
    try {
      const result = await client().checkout({ purpose: "subscription", planCode: code, cycle: "monthly" });
      if (result.redirectUrl) await Linking.openURL(result.redirectUrl);
    } catch {
      setNote(translate("ar", "common.error"));
    }
  }
  async function buyService(code: ServiceCode) {
    try {
      const result = await client().checkout({ purpose: "service", serviceCode: code });
      if (result.redirectUrl) await Linking.openURL(result.redirectUrl);
    } catch {
      setNote(translate("ar", "common.error"));
    }
  }
  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 20 }}>
      <Text style={styles.title}>{translate("ar", "plans.title")}</Text>
      {PLAN_CODES.map((code) => (
        <View key={code} style={styles.card}>
          <Text style={styles.name}>{translate("ar", `plans.${code}Name`)}</Text>
          <Text style={styles.price}>{formatSar(PUBLISHED_PLANS[code].priceHalalas)} {translate("ar", "common.sar")}</Text>
          {code === "free" ? null : (
            <Pressable style={styles.button} onPress={() => void buyPlan(code)}>
              <Text style={styles.buttonText}>{translate("ar", "plans.choose")}</Text>
            </Pressable>
          )}
        </View>
      ))}
      <Text style={styles.title}>{translate("ar", "plans.payg")}</Text>
      {SERVICE_CODES.map((code) => (
        <Pressable key={code} style={styles.card} onPress={() => void buyService(code)}>
          <Text style={styles.name}>{translate("ar", SERVICE_KEY[code], { price: formatSar(SERVICE_PRICES_HALALAS[code]) })}</Text>
        </Pressable>
      ))}
      {note ? <Text style={styles.note}>{note}</Text> : null}
      <Hub />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  title: { fontSize: 22, fontWeight: "700", color: colors.navy700, marginBottom: 12, marginTop: 8 },
  card: { backgroundColor: "white", borderRadius: 16, padding: 16, marginBottom: 10 },
  name: { fontWeight: "700", color: colors.navy700 },
  price: { marginTop: 6, fontSize: 22, fontWeight: "700", color: colors.navy900 },
  button: { marginTop: 12, backgroundColor: colors.navy700, borderRadius: 14, minHeight: 56, alignItems: "center", justifyContent: "center" },
  buttonText: { color: "white", fontWeight: "700" },
  note: { marginTop: 12, color: colors.danger, textAlign: "right" },
});
