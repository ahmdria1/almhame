import { colors } from "@elawyer/tokens";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";
import { client } from "../../src/api";

export default function MemoPreview() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [body, setBody] = useState("");
  const [title, setTitle] = useState("");
  useEffect(() => {
    client().memo(String(id)).then((result) => {
      setTitle(result.memo.title);
      setBody(result.memo.body);
    }).catch(() => undefined);
  }, [id]);
  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 20 }}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "white" },
  title: { fontSize: 24, fontWeight: "700", color: colors.navy700, marginBottom: 12 },
  body: { fontSize: 16, lineHeight: 28, color: colors.slate900, textAlign: "right" },
});
