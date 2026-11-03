import { translate } from "@elawyer/i18n";
import { colors } from "@elawyer/tokens";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput } from "react-native";
import { client } from "../src/api";

export default function Settings() {
  const query = useQuery({ queryKey: ["me"], queryFn: () => client().me() });
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  useEffect(() => {
    if (query.data) setName(query.data.user.name);
  }, [query.data]);
  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 20 }}>
      <Text style={styles.title}>{translate("ar", "settings.title")}</Text>
      <Text style={styles.label}>{translate("ar", "settings.profile")}</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} />
      <Pressable
        style={styles.button}
        onPress={() => {
          void client().updateMe({ name }).then(() => setNote(translate("ar", "settings.saved"))).catch(() => setNote(translate("ar", "common.error")));
        }}
      >
        <Text style={styles.buttonText}>{translate("ar", "common.save")}</Text>
      </Pressable>
      {note ? <Text style={styles.note}>{note}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  title: { fontSize: 28, fontWeight: "700", color: colors.navy700, textAlign: "right" },
  label: { marginTop: 16, fontWeight: "700", color: colors.navy700, textAlign: "right" },
  input: { marginTop: 8, backgroundColor: "white", borderRadius: 14, minHeight: 48, paddingHorizontal: 14, textAlign: "right" },
  button: { marginTop: 16, backgroundColor: colors.navy700, borderRadius: 14, minHeight: 48, alignItems: "center", justifyContent: "center" },
  buttonText: { color: "white", fontWeight: "700" },
  note: { marginTop: 12, color: colors.teal700, textAlign: "right" },
});