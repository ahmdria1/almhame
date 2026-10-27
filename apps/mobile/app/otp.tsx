import { colors } from "@elawyer/tokens";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { client, writeToken } from "../src/api";

export default function Otp() {
  const params = useLocalSearchParams<{ challenge?: string; debug?: string }>();
  const router = useRouter();
  const [code, setCode] = useState(params.debug || "");
  const [error, setError] = useState("");
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>أدخل الرمز</Text>
      <TextInput style={styles.input} value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} />
      {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
      <Pressable style={styles.button} onPress={async () => {
        try {
          const result = await client().verify({ challengeId: String(params.challenge || ""), code });
          await writeToken(result.accessToken);
          router.replace("/home");
        } catch (err) {
          setError(err instanceof Error ? err.message : "الرمز غير صحيح");
        }
      }}>
        <Text style={styles.buttonText}>تأكيد</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 24, justifyContent: "center", backgroundColor: colors.canvas },
  title: { fontSize: 28, fontWeight: "700", color: colors.navy700 },
  input: { marginTop: 16, backgroundColor: "white", borderRadius: 14, borderWidth: 1, borderColor: colors.slate200, padding: 12, fontSize: 24, textAlign: "center" },
  button: { marginTop: 16, backgroundColor: colors.navy700, borderRadius: 14, padding: 14, alignItems: "center" },
  buttonText: { color: "white", fontWeight: "700" },
});
