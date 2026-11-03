import { LANGUAGE_NAMES, translate } from "@elawyer/i18n";
import { colors } from "@elawyer/tokens";
import { LOCALES } from "@elawyer/types";
import { Link, useRouter } from "expo-router";
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { clearToken, client } from "../src/api";

const LINKS = [
  ["/wallet", "nav.wallet"],
  ["/memos", "nav.memos"],
  ["/saved", "nav.saved"],
  ["/integrations", "nav.integrations"],
  ["/plans", "nav.subscription"],
  ["/settings", "nav.settings"],
] as const;

export default function Account() {
  const router = useRouter();
  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 20 }}>
      <Text style={styles.title}>{translate("ar", "nav.account")}</Text>
      {LINKS.map(([href, key]) => (
        <Link key={href} href={href} style={styles.item}>{translate("ar", key)}</Link>
      ))}
      <Text style={styles.section}>{translate("ar", "settings.language")}</Text>
      <View>
        {LOCALES.map((code) => (
          <Text key={code} style={styles.lang}>{LANGUAGE_NAMES[code]}</Text>
        ))}
      </View>
      <Pressable onPress={() => void Linking.openURL("https://emuhami.com/الخصوصية")}><Text style={styles.link}>{translate("ar", "footer.privacy")}</Text></Pressable>
      <Pressable onPress={() => void Linking.openURL("https://emuhami.com/الشروط")}><Text style={styles.link}>{translate("ar", "footer.terms")}</Text></Pressable>
      <Pressable style={styles.button} onPress={async () => { await client().logout().catch(() => undefined); await clearToken(); router.replace("/"); }}>
        <Text style={styles.buttonText}>{translate("ar", "nav.logout")}</Text>
      </Pressable>
      <Pressable style={styles.delete} onPress={() => {
        Alert.alert(translate("ar", "settings.delete"), translate("ar", "settings.deleteWarn"), [
          { text: translate("ar", "common.cancel"), style: "cancel" },
          { text: translate("ar", "settings.delete"), style: "destructive", onPress: () => {
            void client().deleteMe().then(async () => {
              await clearToken();
              router.replace("/");
            }).catch(() => undefined);
          } },
        ]);
      }}>
        <Text style={styles.buttonText}>{translate("ar", "settings.delete")}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  title: { fontSize: 28, fontWeight: "700", color: colors.navy700, textAlign: "right", writingDirection: "rtl" },
  item: { marginTop: 12, backgroundColor: "white", borderRadius: 14, padding: 14, minHeight: 48, fontWeight: "600", textAlign: "right", writingDirection: "rtl", color: colors.navy700 },
  section: { marginTop: 20, fontWeight: "700", color: colors.navy700, textAlign: "right", writingDirection: "rtl" },
  lang: { marginTop: 8, minHeight: 44, color: colors.slate700, textAlign: "right", writingDirection: "rtl" },
  link: { marginTop: 16, minHeight: 44, color: colors.teal600, fontWeight: "700", textAlign: "right", writingDirection: "rtl" },
  button: { marginTop: 24, backgroundColor: colors.navy700, borderRadius: 14, minHeight: 56, padding: 14, alignItems: "center", justifyContent: "center" },
  delete: { marginTop: 12, backgroundColor: colors.danger, borderRadius: 14, minHeight: 56, padding: 14, alignItems: "center", justifyContent: "center" },
  buttonText: { color: "white", fontWeight: "700" },
});
