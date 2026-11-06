import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { Linking, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { client } from "../src/api";
import { mobileError } from "../src/errors";
import { usePrefs, useT } from "../src/use-prefs";

export default function Signup() {
  const router = useRouter();
  const { colors, locale } = usePrefs();
  const t = useT();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");

  return (
    <View style={[styles.screen, { backgroundColor: colors.canvas }]}>
      <Text style={[styles.title, { color: colors.ink }]}>{t("auth.signupTitle")}</Text>
      <TextInput style={[styles.input, { backgroundColor: colors.card, color: colors.ink }]} placeholder={t("auth.name")} placeholderTextColor={colors.muted} value={name} onChangeText={setName} />
      <TextInput style={[styles.input, { backgroundColor: colors.card, color: colors.ink }]} placeholder={t("auth.phone")} placeholderTextColor={colors.muted} value={phone} onChangeText={setPhone} />
      <TextInput style={[styles.input, { backgroundColor: colors.card, color: colors.ink }]} placeholder={t("auth.email")} placeholderTextColor={colors.muted} value={email} onChangeText={setEmail} autoCapitalize="none" />
      <TextInput style={[styles.input, { backgroundColor: colors.card, color: colors.ink }]} placeholder={t("auth.password")} placeholderTextColor={colors.muted} value={password} onChangeText={setPassword} secureTextEntry />
      <Pressable onPress={() => setConsent((value) => !value)}><Text style={[styles.consent, { color: colors.ink }]}>{consent ? "☑" : "☐"} {t("auth.consent")}</Text></Pressable>
      <View style={styles.legalRow}>
        <Pressable onPress={() => void Linking.openURL("https://emuhami.com/الخصوصية")}><Text style={[styles.link, { color: colors.link }]}>{t("footer.privacy")}</Text></Pressable>
        <Pressable onPress={() => void Linking.openURL("https://emuhami.com/الشروط")}><Text style={[styles.link, { color: colors.link }]}>{t("footer.terms")}</Text></Pressable>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable style={[styles.button, { backgroundColor: colors.button }]} onPress={async () => {
        try {
          const result = await client().signup({ name, phone, email, password, consent });
          router.push({ pathname: "/otp", params: { challenge: result.challengeId, debug: result.debugCode || "" } });
        } catch (err) {
          setError(mobileError(err, locale));
        }
      }}>
        <Text style={styles.buttonText}>{t("auth.submitSignup")}</Text>
      </Pressable>
      <Link href="/login" style={[styles.link, { color: colors.link }]}>{t("auth.haveAccount")}</Link>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 24, justifyContent: "center" },
  title: { fontSize: 28, fontWeight: "700", marginBottom: 16 },
  input: { borderWidth: 1, borderColor: "#E3E8EF", borderRadius: 14, padding: 12, marginBottom: 10 },
  consent: { marginVertical: 8, lineHeight: 24 },
  error: { color: "#B42318" },
  button: { borderRadius: 14, padding: 14, alignItems: "center", marginTop: 8 },
  buttonText: { color: "white", fontWeight: "700" },
  legalRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  link: { marginTop: 16, textAlign: "center" },
});
