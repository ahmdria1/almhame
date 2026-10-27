import { colors } from "@elawyer/tokens";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { client } from "../../src/api";

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [messages, setMessages] = useState<{ id: string; role: string; content: string }[]>([]);
  const [text, setText] = useState("");

  useEffect(() => {
    client().chat(String(id)).then((result) => setMessages(result.messages)).catch(() => undefined);
  }, [id]);

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {messages.map((message) => (
          <Text key={message.id} style={message.role === "user" ? styles.user : styles.counsel}>{message.content}</Text>
        ))}
      </ScrollView>
      <View style={styles.bar}>
        <TextInput style={styles.input} value={text} onChangeText={setText} placeholder="اكتب رسالتك" />
        <Pressable onPress={async () => {
          const result = await client().sendMessage(String(id), text);
          setMessages((rows) => [...rows, result.user, result.counsel]);
          setText("");
        }}><Text style={styles.send}>إرسال</Text></Pressable>
      </View>
      <Pressable style={styles.draft} onPress={async () => {
        const result = await client().draft(String(id));
        router.push({ pathname: "/memo/[id]", params: { id: result.memo.id } });
      }}>
        <Text style={styles.primaryText}>صياغة المذكرة</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  user: { alignSelf: "flex-start", backgroundColor: colors.navy700, color: "white", padding: 12, borderRadius: 16, marginBottom: 8, maxWidth: "80%" },
  counsel: { alignSelf: "flex-end", backgroundColor: "white", color: colors.slate900, padding: 12, borderRadius: 16, marginBottom: 8, maxWidth: "80%" },
  bar: { flexDirection: "row", gap: 8, padding: 12, alignItems: "center" },
  input: { flex: 1, backgroundColor: "white", borderRadius: 14, padding: 12 },
  send: { color: colors.navy700, fontWeight: "700" },
  draft: { margin: 12, backgroundColor: colors.navy700, borderRadius: 14, padding: 14, alignItems: "center" },
  primaryText: { color: "white", fontWeight: "700" },
});
