import { translate } from "@elawyer/i18n";
import { colors } from "@elawyer/tokens";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { client } from "../src/api";

const COPY = {
  google_drive: "integrations.drive",
  onedrive: "integrations.one",
  email: "integrations.email",
  calendar: "integrations.calendar",
} as const;

export default function Integrations() {
  const query = useQuery({ queryKey: ["integrations"], queryFn: () => client().integrations() });
  const [note, setNote] = useState("");
  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 20 }}>
      <Text style={styles.title}>{translate("ar", "integrations.title")}</Text>
      {(query.data?.items || []).map((item) => {
        const key = COPY[item.provider as keyof typeof COPY];
        return (
          <Pressable
            key={item.provider}
            style={styles.card}
            onPress={() => {
              void client().startIntegration(item.provider).then(async (started) => {
                if (started.url) await Linking.openURL(started.url);
                else setNote(translate("ar", "integrations.notConfigured"));
              }).catch(() => setNote(translate("ar", "common.error")));
            }}
          >
            <Text style={styles.cardTitle}>{key ? translate("ar", key) : item.provider}</Text>
            <Text style={styles.meta}>
              {item.connected ? translate("ar", "integrations.connected") : translate("ar", "integrations.connect")}
            </Text>
          </Pressable>
        );
      })}
      {note ? <Text style={styles.note}>{note}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  title: { fontSize: 28, fontWeight: "700", color: colors.navy700, textAlign: "right" },
  card: { marginTop: 12, backgroundColor: "white", borderRadius: 16, padding: 14, minHeight: 48 },
  cardTitle: { fontWeight: "700", color: colors.navy700, textAlign: "right" },
  meta: { marginTop: 4, color: colors.teal700, textAlign: "right" },
  note: { marginTop: 16, color: colors.slate700, textAlign: "right" },
});
