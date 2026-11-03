import { colors } from "@elawyer/tokens";
import { Link, useRouter } from "expo-router";
import { useEffect } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
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
      <Image source={require("../assets/icon.png")} style={styles.mark} />
      <Text style={styles.title}>المحامي الإلكتروني</Text>
      <Text style={styles.sub}>المتقدم</Text>
      <Link href="/onboarding" asChild>
        <Pressable style={styles.button}><Text style={styles.buttonText}>ابدأ</Text></Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.navy700, alignItems: "center", justifyContent: "center", padding: 24 },
  mark: { width: 104, height: 104, marginBottom: 20 },
  title: { color: "white", fontSize: 32, lineHeight: 48, fontWeight: "700", textAlign: "center" },
  sub: { color: colors.teal300, marginTop: 4, fontSize: 20, fontWeight: "700", textAlign: "center" },
  button: { marginTop: 32, backgroundColor: "white", borderRadius: 14, minHeight: 56, paddingHorizontal: 32, alignItems: "center", justifyContent: "center" },
  buttonText: { color: colors.navy700, fontWeight: "700", fontSize: 18 },
});
