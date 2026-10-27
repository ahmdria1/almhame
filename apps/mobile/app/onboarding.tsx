import { colors } from "@elawyer/tokens";
import { Link } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

const STEPS = [
  ["ملف لكل قضية", "اجمع المستندات والمحادثة والمذكرة في مكان واحد."],
  ["مصادر يمكن فتحها", "الاستشهاد يأتي من المدونة ويعود إلى سجله."],
  ["لك وحدك", "يُشفّر الملف لحسابك."],
];

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const last = step === STEPS.length - 1;
  return (
    <View style={styles.screen}>
      <Text style={styles.kicker}>{step + 1} / 3</Text>
      <Text style={styles.title}>{STEPS[step][0]}</Text>
      <Text style={styles.body}>{STEPS[step][1]}</Text>
      {last ? (
        <Link href="/signup" asChild>
          <Pressable style={styles.button}><Text style={styles.buttonText}>ابدأ</Text></Pressable>
        </Link>
      ) : (
        <Pressable style={styles.button} onPress={() => setStep((value) => value + 1)}>
          <Text style={styles.buttonText}>التالي</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas, padding: 24, justifyContent: "center" },
  kicker: { color: colors.teal600, fontWeight: "700" },
  title: { marginTop: 12, fontSize: 32, fontWeight: "700", color: colors.navy700 },
  body: { marginTop: 12, fontSize: 16, lineHeight: 28, color: colors.slate500 },
  button: { marginTop: 28, backgroundColor: colors.navy700, borderRadius: 14, padding: 14, alignItems: "center" },
  buttonText: { color: "white", fontWeight: "700" },
});
