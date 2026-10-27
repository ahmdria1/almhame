import { colors } from "@elawyer/tokens";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { client } from "../src/api";

export default function Login() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [error, setError] = useState("");
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>تسجيل الدخول</Text>
      <TextInput style={styles.input} placeholder="الجوال أو البريد" value={identifier} onChangeText={setIdentifier} />
      {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
      <Pressable style={styles.button} onPress={async () => {
        try {
          const result = await client().login({ identifier });
          router.push({ pathname: "/otp", params: { challenge: result.challengeId, debug: result.debugCode || "" } });
        } catch (err) {
          setError(err instanceof Error ? err.message : "تعذر الإرسال");
        }
      }}>
        <Text style={styles.buttonText}>أرسل الرمز</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 24, justifyContent: "center", backgroundColor: colors.canvas },
  title: { fontSize: 28, fontWeight: "700", color: colors.navy700, marginBottom: 16 },
  input: { backgroundColor: "white", borderWidth: 1, borderColor: colors.slate200, borderRadius: 14, padding: 12 },
  button: { marginTop: 16, backgroundColor: colors.navy700, borderRadius: 14, padding: 14, alignItems: "center" },
  buttonText: { color: "white", fontWeight: "700" },
});
