import { translate } from "@elawyer/i18n";
import { colors } from "@elawyer/tokens";
import { useQuery } from "@tanstack/react-query";
import { Link, useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { client } from "../src/api";
import { Hub } from "../src/nav";

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
      <Hub />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  kicker: { color: colors.teal600, fontWeight: "700", marginTop: 8 },
  title: { fontSize: 28, lineHeight: 40, fontWeight: "700", color: colors.navy700, marginTop: 8, marginBottom: 16 },
  primary: { backgroundColor: colors.navy700, borderRadius: 14, minHeight: 56, alignItems: "center", justifyContent: "center" },
  primaryText: { color: "white", fontWeight: "700", fontSize: 18 },
  card: { marginTop: 10, backgroundColor: "white", borderRadius: 16, padding: 16, minHeight: 48, borderWidth: 1, borderColor: colors.slate200 },
  cardTitle: { fontWeight: "700", color: colors.navy700 },
});
