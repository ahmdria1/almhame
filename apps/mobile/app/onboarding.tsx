import { Link } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { usePrefs, useT } from "../src/use-prefs";

const STEPS = [
  ["landing.s2Title", "landing.s2Body"],
  ["landing.s3Title", "landing.s3Body"],
  ["landing.s4Title", "landing.s4Body"],
] as const;

export default function Onboarding() {
  const { colors } = usePrefs();
  const t = useT();
  const [step, setStep] = useState(0);
  const last = step === STEPS.length - 1;
  const [title, body] = STEPS[step];
  const button = (
    <Pressable style={[styles.button, { backgroundColor: colors.button }]} onPress={last ? undefined : () => setStep((value) => value + 1)}>
      <Text style={[styles.buttonText, { color: colors.buttonText }]}>{last ? t("nav.startFree") : t("list.more")}</Text>
    </Pressable>
  );
  return (
    <View style={[styles.screen, { backgroundColor: colors.canvas }]}>
      <Text style={[styles.kicker, { color: colors.link }]}>{step + 1} / {STEPS.length}</Text>
      <Text style={[styles.title, { color: colors.ink }]}>{t(title)}</Text>
      <Text style={[styles.body, { color: colors.muted }]}>{t(body)}</Text>
      {last ? <Link href="/signup" asChild>{button}</Link> : button}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 24, justifyContent: "center" },
  kicker: { fontWeight: "700" },
  title: { marginTop: 12, fontSize: 32, fontWeight: "700" },
  body: { marginTop: 12, fontSize: 16, lineHeight: 28 },
  button: { marginTop: 28, borderRadius: 14, padding: 14, alignItems: "center" },
  buttonText: { fontWeight: "700" },
});
