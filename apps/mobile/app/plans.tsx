import type { ServiceCode } from "@elawyer/types";
import { useQuery } from "@tanstack/react-query";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { client } from "../src/api";
import { formatSar } from "../src/format";
import { usePrefs, useT } from "../src/use-prefs";

const SERVICE_KEY: Record<ServiceCode, string> = {
  review: "plans.serviceReview",
  defense: "plans.serviceDefense",
  lawsuit: "plans.serviceClaim",
  objection: "plans.serviceObjection",
  chat_pack: "plans.serviceChatPack",
};

export default function Plans() {
  const { colors, locale } = usePrefs();
  const t = useT();
  const me = useQuery({ queryKey: ["me"], queryFn: () => client().me() });
  const plans = useQuery({ queryKey: ["plans"], queryFn: () => client().plans() });
  const current = me.data?.user.planCode;
  return (
    <ScrollView style={[styles.screen, { backgroundColor: colors.canvas }]} contentContainerStyle={{ padding: 20 }}>
      <Text style={[styles.title, { color: colors.ink }]}>{t("plans.title")}</Text>
      {plans.isError ? (
        <Pressable onPress={() => void plans.refetch()}>
          <Text style={{ color: colors.ink }}>{t("common.error")}</Text>
          <Text style={{ color: colors.link, fontWeight: "700", marginTop: 8 }}>{t("common.retry")}</Text>
        </Pressable>
      ) : plans.isLoading || !plans.data ? (
        <Text style={{ color: colors.muted }}>{t("common.loading")}</Text>
      ) : (
        plans.data.plans.map((plan) => {
          const active = current === plan.code;
          return (
            <View key={plan.code} style={[styles.card, { backgroundColor: colors.card }]}>
              <Text style={[styles.name, { color: colors.ink }]}>{t(`plans.${plan.code}Name`)}</Text>
              <Text style={[styles.price, { color: colors.ink }]}>{formatSar(plan.priceHalalas)} {t("common.sar")}</Text>
              <Text style={{ color: colors.muted, marginTop: 6 }}>{t(`plans.${plan.code}Desc`)}</Text>
              <Pressable
                disabled={active || plan.code === "free"}
                onPress={() => void Linking.openURL(`https://emuhami.com/${locale}/app/plans`)}
                style={[styles.button, { backgroundColor: active || plan.code === "free" ? colors.card : colors.button, borderColor: colors.link, borderWidth: active || plan.code === "free" ? 1 : 0 }]}
              >
                <Text style={{ color: active || plan.code === "free" ? colors.muted : colors.buttonText, fontWeight: "700" }}>
                  {active ? t("plans.current") : t("plans.choose")}
                </Text>
              </Pressable>
            </View>
          );
        })
      )}
      <Text style={[styles.title, { color: colors.ink }]}>{t("plans.payg")}</Text>
      {(plans.data?.services || []).map((service) => (
        <Pressable key={service.code} onPress={() => void Linking.openURL(`https://emuhami.com/${locale}/app/plans`)} style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.name, { color: colors.ink }]}>{t(SERVICE_KEY[service.code], { price: formatSar(service.priceHalalas) })}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 12, marginTop: 8 },
  card: { borderRadius: 16, padding: 16, marginBottom: 10 },
  name: { fontWeight: "700" },
  price: { marginTop: 6, fontSize: 22, fontWeight: "700" },
  button: { marginTop: 12, minHeight: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
});
