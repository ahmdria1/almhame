import { translate } from "@elawyer/i18n";
import { colors } from "@elawyer/tokens";
import { Link } from "expo-router";
import { StyleSheet, View } from "react-native";

export function Hub() {
  return (
    <View style={styles.row}>
      <Link href="/home" style={styles.link}>{translate("ar", "nav.home")}</Link>
      <Link href="/memos" style={styles.link}>{translate("ar", "nav.memos")}</Link>
      <Link href="/wallet" style={styles.link}>{translate("ar", "nav.wallet")}</Link>
      <Link href="/plans" style={styles.link}>{translate("ar", "nav.plans")}</Link>
      <Link href="/saved" style={styles.link}>{translate("ar", "nav.saved")}</Link>
      <Link href="/integrations" style={styles.link}>{translate("ar", "nav.integrations")}</Link>
      <Link href="/settings" style={styles.link}>{translate("ar", "nav.settings")}</Link>
      <Link href="/account" style={styles.link}>{translate("ar", "nav.account")}</Link>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 16 },
  link: { color: colors.teal700, fontWeight: "700", minHeight: 44, textAlignVertical: "center" },
});
