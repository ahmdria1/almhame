import { colors } from "@elawyer/tokens";
import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { client } from "../src/api";

export default function Signup() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>إنشاء حساب</Text>
      <TextInput style={styles.input} placeholder="الاسم" value={name} onChangeText={setName} />
      <TextInput style={styles.input} placeholder="الجوال" value={phone} onChangeText={setPhone} />
      <TextInput style={styles.input} placeholder="البريد" value={email} onChangeText={setEmail} autoCapitalize="none" />
      <Pressable onPress={() => setConsent((value) => !value)}><Text style={styles.consent}>{consent ? "☑" : "☐"} أوافق على معالجة بياناتي</Text></Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable style={styles.button} onPress={async () => {
        try {
          const result = await client().signup({ name, phone, email, consent });
          router.push({ pathname: "/otp", params: { challenge: result.challengeId, debug: result.debugCode || "" } });
        } catch (err) {
          setError(err instanceof Error ? err.message : "تعذر الإرسال");
        }
      }}>
        <Text style={styles.buttonText}>أرسل الرمز</Text>
      </Pressable>
      <Link href="/login" style={styles.link}>لديك حساب؟ دخول</Link>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas, padding: 24, justifyContent: "center" },
  title: { fontSize: 28, fontWeight: "700", color: colors.navy700, marginBottom: 16 },
  input: { backgroundColor: "white", borderWidth: 1, borderColor: colors.slate200, borderRadius: 14, padding: 12, marginBottom: 10 },
  consent: { color: colors.slate700, marginVertical: 8 },
  error: { color: colors.danger },
  button: { backgroundColor: colors.navy700, borderRadius: 14, padding: 14, alignItems: "center", marginTop: 8 },
  buttonText: { color: "white", fontWeight: "700" },
  link: { marginTop: 16, color: colors.teal600, textAlign: "center" },
});
