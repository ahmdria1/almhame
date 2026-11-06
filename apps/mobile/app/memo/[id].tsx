import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { client } from "../../src/api";
import { mobileError } from "../../src/errors";
import { shareMemoPdf } from "../../src/pdf";
import { usePrefs, useT } from "../../src/use-prefs";

export default function MemoPreview() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, locale } = usePrefs();
  const t = useT();
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
    <ScrollView style={[styles.screen, { backgroundColor: colors.canvas }]} contentContainerStyle={{ padding: 20 }}>
      {failed ? (
        <Pressable onPress={load}>
          <Text style={{ color: colors.ink }}>{t("common.error")}</Text>
          <Text style={{ color: colors.link, marginTop: 8 }}>{t("common.retry")}</Text>
        </Pressable>
      ) : title ? (
        <>
          <Text style={[styles.title, { color: colors.ink }]}>{title}</Text>
          <Text style={[styles.body, { color: colors.ink }]}>{body}</Text>
          <Pressable style={[styles.button, { backgroundColor: colors.button }]} onPress={() => void shareMemoPdf(String(id)).catch((err) => setNote(mobileError(err, locale)))}>
            <Text style={{ color: colors.buttonText, fontWeight: "700" }}>{t("memo.exportPdf")}</Text>
          </Pressable>
          {note ? <Text style={{ color: colors.link, marginTop: 8 }}>{note}</Text> : null}
        </>
      ) : (
        <Text style={{ color: colors.muted }}>{t("common.loading")}</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 12, textAlign: "right" },
  body: { fontSize: 16, lineHeight: 28, textAlign: "right" },
  button: { marginTop: 20, minHeight: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
});
