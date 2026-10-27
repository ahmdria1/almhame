import { colors } from "@elawyer/tokens";
import { Link, useRouter } from "expo-router";
import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { hydrate } from "../src/api";

export default function Splash() {
  const router = useRouter();
  useEffect(() => {
    hydrate().then((token) => {
      if (token) router.replace("/home");
    }).catch(() => undefined);
  }, [router]);
  return (
    <View style={styles.screen}>
      <View style={styles.mark} />
      <Text style={styles.title}>المحامي الإلكتروني المتقدم</Text>
      <Text style={styles.sub}>صياغة للجهات القضائية السعودية</Text>
      <Link href="/onboarding" asChild>
        <Pressable style={styles.button}><Text style={styles.buttonText}>ابدأ</Text></Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.navy900, alignItems: "center", justifyContent: "center", padding: 24 },
  mark: { width: 72, height: 72, borderRadius: 20, borderWidth: 3, borderColor: colors.teal300, marginBottom: 24 },
  title: { color: "white", fontSize: 28, fontWeight: "700", textAlign: "center" },
  sub: { color: colors.slate300, marginTop: 8, textAlign: "center" },
  button: { marginTop: 32, backgroundColor: "white", borderRadius: 14, paddingHorizontal: 28, paddingVertical: 12 },
  buttonText: { color: colors.navy700, fontWeight: "700" },
});
