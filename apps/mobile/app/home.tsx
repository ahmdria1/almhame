import { translate } from "@elawyer/i18n";
import { colors } from "@elawyer/tokens";
import { useQuery } from "@tanstack/react-query";
import { Link, useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { client } from "../src/api";

export default function Home() {
  const router = useRouter();
  const me = useQuery({ queryKey: ["me"], queryFn: () => client().me() });
  const chats = useQuery({ queryKey: ["chats"], queryFn: () => client().chats() });
  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 20 }}>
      <Text style={styles.kicker}>{translate("ar", "nav.home")}</Text>
      <Text style={styles.title}>{me.data?.user.name || "…"}</Text>
      <Pressable style={styles.primary} onPress={async () => {
        const result = await client().createChat({ court: "labor", memoType: "lawsuit" });
        router.push({ pathname: "/chat/[id]", params: { id: result.chat.id } });
      }}>
        <Text style={styles.primaryText}>{translate("ar", "workspace.newChat")}</Text>
      </Pressable>
      {(chats.data?.chats || []).map((chat) => (
        <Link key={chat.id} href={{ pathname: "/chat/[id]", params: { id: chat.id } }} style={styles.card}>
          <Text style={styles.cardTitle}>{chat.title}</Text>
        </Link>
      ))}
      <View style={styles.row}>
        <Link href="/memos" style={styles.link}>{translate("ar", "nav.memos")}</Link>
        <Link href="/tracked" style={styles.link}>{translate("ar", "nav.tracked")}</Link>
        <Link href="/wallet" style={styles.link}>{translate("ar", "nav.wallet")}</Link>
        <Link href="/plans" style={styles.link}>{translate("ar", "nav.plans")}</Link>
        <Link href="/account" style={styles.link}>{translate("ar", "nav.account")}</Link>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  kicker: { color: colors.teal600, fontWeight: "700", marginTop: 8 },
  title: { fontSize: 28, lineHeight: 40, fontWeight: "700", color: colors.navy700, marginTop: 8, marginBottom: 16 },
  primary: { backgroundColor: colors.navy700, borderRadius: 14, padding: 14, alignItems: "center" },
  primaryText: { color: "white", fontWeight: "700" },
  card: { marginTop: 10, backgroundColor: "white", borderRadius: 16, padding: 14 },
  cardTitle: { fontWeight: "700", color: colors.navy700 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 20 },
  link: { color: colors.teal700, fontWeight: "700", minHeight: 44 },
});
