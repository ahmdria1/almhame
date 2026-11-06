import { translate } from "@elawyer/i18n";
import { colors } from "@elawyer/tokens";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { client } from "../../src/api";
import { shareMemoPdf } from "../../src/pdf";

export default function MemoPreview() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [body, setBody] = useState("");
  const [title, setTitle] = useState("");
  const [failed, setFailed] = useState(false);
  const [note, setNote] = useState("");
  function load() {
    setFailed(false);
    client().memo(String(id)).then((result) => {
      setTitle(result.memo.title);
      setBody(result.memo.body);
    }).catch(() => setFailed(true));
  }
  useEffect(() => { load(); }, [id]);
  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 20 }}>
      {failed ? (
        <Pressable onPress={load}>
          <Text style={styles.body}>{translate("ar", "common.error")}</Text>
          <Text style={styles.link}>{translate("ar", "common.retry")}</Text>
        </Pressable>
      ) : title ? (
        <>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.body}>{body}</Text>
          <Pressable style={styles.button} onPress={() => void shareMemoPdf(String(id)).catch(() => setNote(translate("ar", "common.error")))}>
            <Text style={styles.buttonText}>{translate("ar", "memo.exportPdf")}</Text>
          </Pressable>
          {note ? <Text style={styles.link}>{note}</Text> : null}
        </>
      ) : (
        <Text style={styles.body}>{translate("ar", "common.loading")}</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "white" },
  title: { fontSize: 24, fontWeight: "700", color: colors.navy700, marginBottom: 12 },
  body: { fontSize: 16, lineHeight: 28, color: colors.slate900, textAlign: "right" },
  button: { marginTop: 20, backgroundColor: colors.navy700, borderRadius: 14, minHeight: 48, alignItems: "center", justifyContent: "center" },
  buttonText: { color: "white", fontWeight: "700" },
  link: { marginTop: 8, color: colors.teal700, fontWeight: "700", textAlign: "right" },
});
