import { ApiError } from "@elawyer/api-client";
import { translate } from "@elawyer/i18n";
import { colors } from "@elawyer/tokens";
import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { client, writeToken } from "../src/api";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>تسجيل الدخول</Text>
      <TextInput style={styles.input} placeholder="البريد" value={email} onChangeText={setEmail} autoCapitalize="none" />
      <TextInput style={[styles.input, { marginTop: 10 }]} placeholder="كلمة المرور" value={password} onChangeText={setPassword} secureTextEntry />
      {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
      <Pressable style={styles.button} onPress={async () => {
        try {
          const result = await client().login({ email, password });
          await writeToken(result.accessToken);
          router.replace("/home");
        } catch (err) {
          const english = err instanceof ApiError && /^[\u0000-\u007f]*$/.test(err.message);
          setError(english || (err instanceof ApiError && (err.status === 401 || /unauthorized/i.test(err.message))) ? translate("ar", "auth.failed") : translate("ar", "common.error"));
        }
      }}>
        <Text style={styles.buttonText}>دخول</Text>
      </Pressable>
      <Link href="/signup" style={styles.link}>حساب جديد</Link>
      <Link href="/" style={styles.link}>{translate("ar", "common.back")}</Link>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 24, justifyContent: "center", backgroundColor: colors.canvas },
  title: { fontSize: 28, fontWeight: "700", color: colors.navy700, marginBottom: 16 },
  input: { backgroundColor: "white", borderWidth: 1, borderColor: colors.slate300, borderRadius: 12, minHeight: 48, paddingHorizontal: 16, textAlign: "right" },
  button: { marginTop: 16, backgroundColor: colors.navy700, borderRadius: 14, minHeight: 56, alignItems: "center", justifyContent: "center" },
  buttonText: { color: "white", fontWeight: "700", fontSize: 18 },
  link: { marginTop: 16, minHeight: 44, color: colors.blue500, textAlign: "center", fontWeight: "600" },
});
