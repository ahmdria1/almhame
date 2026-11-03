import { translate } from "@elawyer/i18n";
import { colors } from "@elawyer/tokens";
import { COURTS, type CourtType } from "@elawyer/types";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { client } from "../../src/api";

export default function TrackedCase() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const detail = useQuery({ queryKey: ["tracked", id], queryFn: () => client().trackedCase(id || ""), enabled: Boolean(id) });
  const item = detail.data?.case;

  async function draftReply() {
    if (!item) return;
    const court = (COURTS as readonly string[]).includes(item.court) ? item.court as CourtType : "labor";
    const created = await client().createChat({ court, memoType: "reply" });
    router.push({ pathname: "/chat/[id]", params: { id: created.chat.id, caseNumber: item.caseNumber } });
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 20 }}>
      <Link href="/tracked" style={styles.link}>{translate("ar", "track.back")}</Link>
      <Text style={styles.title}>{item?.caseNumber || "…"}</Text>
      {detail.data && !detail.data.connected ? <Text style={styles.notice}>{translate("ar", "track.notConnected")}</Text> : null}
      <Pressable style={styles.primary} onPress={() => void draftReply()}>
        <Text style={styles.primaryText}>{translate("ar", "track.draftReply")}</Text>
      </Pressable>
      <Text style={styles.section}>{translate("ar", "track.filings")}</Text>
      {(item?.filings || []).length === 0 ? <Text style={styles.empty}>{translate("ar", "track.noFilings")}</Text> : (item?.filings || []).map((filing) => (
        <Text key={filing.id} style={styles.card}>{filing.title}{"\n"}{filing.filer}{filing.responseDeadline ? `\n${translate("ar", "track.deadline")}: ${filing.responseDeadline.slice(0, 10)}` : ""}</Text>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  link: { minHeight: 44, color: colors.teal700, fontWeight: "700", textAlign: "right" },
  title: { marginTop: 8, fontSize: 28, fontWeight: "700", color: colors.navy700, textAlign: "right", writingDirection: "rtl" },
  notice: { marginTop: 12, backgroundColor: "#E6F3F4", color: colors.teal700, borderRadius: 14, padding: 14, minHeight: 44, textAlign: "right", writingDirection: "rtl" },
  primary: { marginTop: 16, minHeight: 48, borderRadius: 14, backgroundColor: colors.navy700, alignItems: "center", justifyContent: "center", padding: 14 },
  primaryText: { color: "white", fontWeight: "700" },
  section: { marginTop: 20, fontWeight: "700", color: colors.navy700, textAlign: "right" },
  empty: { marginTop: 8, color: colors.slate700, textAlign: "right" },
  card: { marginTop: 10, minHeight: 44, backgroundColor: "white", borderRadius: 16, padding: 14, textAlign: "right", writingDirection: "rtl" },
});
