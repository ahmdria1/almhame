import { colors } from "@elawyer/tokens";
import { LANGUAGE_NAMES } from "@elawyer/i18n";
import { LOCALES } from "@elawyer/types";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { clearToken, client } from "../src/api";

const LINKS = ["محفظتي", "مذكراتي", "المحفوظات", "التكاملات", "الاشتراك والباقات", "الإعدادات"];

export default function Account() {
  const router = useRouter();
  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 20 }}>
      <Text style={styles.title}>الحساب</Text>
      {LINKS.map((item) => <Text key={item} style={styles.item}>{item}</Text>)}
      <Text style={styles.section}>اللغة</Text>
      {LOCALES.map((code) => <Text key={code} style={styles.lang}>{LANGUAGE_NAMES[code]}</Text>)}
      <Pressable style={styles.button} onPress={async () => { await client().logout().catch(() => undefined); await clearToken(); router.replace("/"); }}>
        <Text style={styles.buttonText}>تسجيل الخروج</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  title: { fontSize: 28, fontWeight: "700", color: colors.navy700 },
  item: { marginTop: 12, backgroundColor: "white", borderRadius: 14, padding: 14, fontWeight: "600" },
  section: { marginTop: 20, fontWeight: "700", color: colors.navy700 },
  lang: { marginTop: 6, color: colors.slate700 },
  button: { marginTop: 24, backgroundColor: colors.danger, borderRadius: 14, padding: 14, alignItems: "center" },
  buttonText: { color: "white", fontWeight: "700" },
});
