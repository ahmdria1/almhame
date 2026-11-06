import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { client, writeToken } from "../src/api";
import { mobileError } from "../src/errors";
import { usePrefs, useT } from "../src/use-prefs";

export default function Login() {
  const router = useRouter();
  const { colors, locale } = usePrefs();
  const t = useT();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  return (
    <View style={[styles.screen, { backgroundColor: colors.canvas }]}>
      <Text style={[styles.title, { color: colors.ink }]}>{t("auth.loginTitle")}</Text>
      <TextInput style={[styles.input, { backgroundColor: colors.card, color: colors.ink }]} placeholder={t("auth.email")} placeholderTextColor={colors.muted} value={email} onChangeText={setEmail} autoCapitalize="none" />
      <TextInput style={[styles.input, { marginTop: 10, backgroundColor: colors.card, color: colors.ink }]} placeholder={t("auth.password")} placeholderTextColor={colors.muted} value={password} onChangeText={setPassword} secureTextEntry />
      {error ? <Text style={{ color: "#B42318" }}>{error}</Text> : null}
      <Pressable style={[styles.button, { backgroundColor: colors.button }]} onPress={async () => {
        try {
          const result = await client().login({ email, password });
          await writeToken(result.accessToken);
          router.replace("/home");
        } catch (err) {
          setError(mobileError(err, locale));
        }
      }}>
        <Text style={[styles.buttonText, { color: colors.buttonText }]}>{t("auth.submitLogin")}</Text>
      </Pressable>
      <Link href="/signup" style={[styles.link, { color: colors.link }]}>{t("auth.noAccount")}</Link>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 24, justifyContent: "center" },
  title: { fontSize: 28, fontWeight: "700", marginBottom: 16 },
  input: { borderWidth: 1, borderColor: "#E3E8EF", borderRadius: 14, padding: 12 },
  button: { marginTop: 16, borderRadius: 14, padding: 14, alignItems: "center" },
  buttonText: { fontWeight: "700" },
  link: { marginTop: 16, textAlign: "center" },
});
