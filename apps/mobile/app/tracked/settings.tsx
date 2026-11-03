import { translate } from "@elawyer/i18n";
import { colors } from "@elawyer/tokens";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { client } from "../../src/api";

export default function TrackedSettings() {
  const queryClient = useQueryClient();
  const prefs = useQuery({ queryKey: ["tracked-settings"], queryFn: () => client().trackedSettings() });
  const [saved, setSaved] = useState(false);
  const row = prefs.data || { inApp: true, email: true, sms: false };

  async function toggle(key: "inApp" | "email" | "sms") {
    const next = { inApp: row.inApp, email: row.email, sms: row.sms, [key]: !row[key] };
    await client().saveTrackedSettings(next);
    setSaved(true);
    await queryClient.invalidateQueries({ queryKey: ["tracked-settings"] });
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 20 }}>
      <Text style={styles.title}>{translate("ar", "track.settings")}</Text>
      {(["inApp", "email", "sms"] as const).map((key) => (
        <Pressable key={key} style={styles.item} onPress={() => void toggle(key)}>
          <Text style={styles.itemText}>{translate("ar", `track.${key}`)} · {row[key] ? "✓" : "–"}</Text>
        </Pressable>
      ))}
      {saved ? <Text style={styles.saved}>{translate("ar", "settings.saved")}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  title: { fontSize: 28, fontWeight: "700", color: colors.navy700, textAlign: "right", writingDirection: "rtl" },
  item: { marginTop: 12, minHeight: 44, justifyContent: "center", backgroundColor: "white", borderRadius: 14, padding: 14 },
  itemText: { fontWeight: "700", color: colors.navy700, textAlign: "right", writingDirection: "rtl" },
  saved: { marginTop: 12, color: colors.teal700, textAlign: "right" },
});
