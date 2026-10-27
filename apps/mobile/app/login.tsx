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
          setError(err instanceof Error ? err.message : "تعذر الدخول");
        }
      }}>
        <Text style={styles.buttonText}>دخول</Text>
      </Pressable>
      <Link href="/signup" style={styles.link}>حساب جديد</Link>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 24, justifyContent: "center", backgroundColor: colors.canvas },
  title: { fontSize: 28, fontWeight: "700", color: colors.navy700, marginBottom: 16 },
  input: { backgroundColor: "white", borderWidth: 1, borderColor: colors.slate200, borderRadius: 14, padding: 12 },
  button: { marginTop: 16, backgroundColor: colors.navy700, borderRadius: 14, padding: 14, alignItems: "center" },
  buttonText: { color: "white", fontWeight: "700" },
  link: { marginTop: 16, color: colors.teal600, textAlign: "center" },
});
