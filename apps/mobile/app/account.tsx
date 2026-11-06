import { LANGUAGE_NAMES } from "@elawyer/i18n";
import { LOCALES, type Locale } from "@elawyer/types";
import { useQuery } from "@tanstack/react-query";
import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { clearToken, client } from "../src/api";
import { mobileError } from "../src/errors";
import { usePrefs, useT } from "../src/use-prefs";

export default function Account() {
  const router = useRouter();
  const { colors, locale, theme, setLocale, setTheme } = usePrefs();
  const t = useT();
  const me = useQuery({ queryKey: ["me"], queryFn: () => client().me() });
  const [note, setNote] = useState("");
  const notify = me.data?.user.notifyHearings ?? false;
  async function saveLocale(next: Locale) {
    await setLocale(next);
    await client().updateMe({ locale: next }).catch((err) => setNote(mobileError(err, next)));
  }
  async function saveTheme(next: "light" | "dark") {
    await setTheme(next);
    await client().updateMe({ theme: next }).catch((err) => setNote(mobileError(err, locale)));
  }
  async function saveNotify(next: boolean) {
    await client().updateMe({ notifyHearings: next }).then(() => me.refetch()).catch((err) => setNote(mobileError(err, locale)));
  }
  return (
    <ScrollView style={[styles.screen, { backgroundColor: colors.canvas }]} contentContainerStyle={{ padding: 20 }}>
      <Text style={[styles.title, { color: colors.ink }]}>{me.data?.user.name || t("nav.account")}</Text>
      {me.isError ? <Text style={{ color: colors.ink }}>{t("common.error")}</Text> : null}
      <Link href="/wallet" style={[styles.item, { backgroundColor: colors.card, color: colors.ink }]}>{t("nav.wallet")}</Link>
      <Link href="/memos" style={[styles.item, { backgroundColor: colors.card, color: colors.ink }]}>{t("nav.memos")}</Link>
      <Link href="/plans" style={[styles.item, { backgroundColor: colors.card, color: colors.ink }]}>{t("nav.plans")}</Link>
      <Text style={[styles.section, { color: colors.ink }]}>{t("settings.language")}</Text>
      <View>
        {LOCALES.map((code) => (
          <Pressable key={code} onPress={() => void saveLocale(code)} style={styles.lang}>
            <Text style={{ color: code === locale ? colors.link : colors.ink, fontWeight: code === locale ? "700" : "400", textAlign: "right" }}>{LANGUAGE_NAMES[code]}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={[styles.section, { color: colors.ink }]}>{t("settings.appearance")}</Text>
      <View style={styles.row}>
        <Pressable onPress={() => void saveTheme("light")} style={[styles.choice, { backgroundColor: theme === "light" ? colors.button : colors.card }]}>
          <Text style={{ color: theme === "light" ? colors.buttonText : colors.ink }}>{t("settings.light")}</Text>
        </Pressable>
        <Pressable onPress={() => void saveTheme("dark")} style={[styles.choice, { backgroundColor: theme === "dark" ? colors.button : colors.card }]}>
          <Text style={{ color: theme === "dark" ? colors.buttonText : colors.ink }}>{t("settings.dark")}</Text>
        </Pressable>
      </View>
      <Pressable onPress={() => void saveNotify(!notify)} style={styles.lang}>
        <Text style={{ color: colors.ink, textAlign: "right" }}>{notify ? "☑" : "☐"} {t("settings.hearingsToggle")}</Text>
      </Pressable>
      {note ? <Text style={{ color: colors.link, marginTop: 8 }}>{note}</Text> : null}
      <Pressable onPress={() => void Linking.openURL("https://emuhami.com/الخصوصية")}><Text style={[styles.link, { color: colors.link }]}>{t("footer.privacy")}</Text></Pressable>
      <Pressable onPress={() => void Linking.openURL("https://emuhami.com/الشروط")}><Text style={[styles.link, { color: colors.link }]}>{t("footer.terms")}</Text></Pressable>
      <Pressable style={[styles.button, { backgroundColor: colors.button }]} onPress={async () => { await client().logout().catch(() => undefined); await clearToken(); router.replace("/"); }}>
        <Text style={[styles.buttonText, { color: colors.buttonText }]}>{t("nav.logout")}</Text>
      </Pressable>
      <Pressable style={[styles.delete, { backgroundColor: "#B42318" }]} onPress={() => {
        Alert.alert(t("settings.delete"), t("settings.deleteWarn"), [
          { text: t("common.cancel"), style: "cancel" },
          { text: t("settings.delete"), style: "destructive", onPress: () => {
            void client().deleteMe().then(async () => {
              await clearToken();
              router.replace("/");
            }).catch((err) => setNote(mobileError(err, locale)));
          } },
        ]);
      }}>
        <Text style={styles.buttonText}>{t("settings.delete")}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  title: { fontSize: 28, fontWeight: "700", textAlign: "right" },
  item: { marginTop: 12, borderRadius: 14, padding: 14, minHeight: 44, fontWeight: "600", textAlign: "right", overflow: "hidden" },
  section: { marginTop: 20, fontWeight: "700", textAlign: "right" },
  lang: { marginTop: 8, minHeight: 44, justifyContent: "center" },
  row: { flexDirection: "row", gap: 8, marginTop: 8 },
  choice: { flex: 1, minHeight: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  link: { marginTop: 16, minHeight: 44, fontWeight: "700", textAlign: "right" },
  button: { marginTop: 24, borderRadius: 14, minHeight: 48, padding: 14, alignItems: "center", justifyContent: "center" },
  delete: { marginTop: 12, borderRadius: 14, minHeight: 48, padding: 14, alignItems: "center", justifyContent: "center" },
  buttonText: { color: "white", fontWeight: "700" },
});
