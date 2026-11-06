import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { useState } from "react";
import { Text, TextInput } from "react-native";
import { usePrefs, useT } from "../src/use-prefs";

type WithDefault = { defaultProps?: { style?: object } };

export default function RootLayout() {
  const [client] = useState(() => new QueryClient());
  const { colors } = usePrefs();
  const t = useT();
  const [loaded] = useFonts({ Cairo: require("../assets/fonts/Cairo-Variable.ttf") });
  if (!loaded) return null;
  const text = Text as unknown as WithDefault;
  const input = TextInput as unknown as WithDefault;
  text.defaultProps = { ...text.defaultProps, style: [{ fontFamily: "Cairo" }, text.defaultProps?.style] };
  input.defaultProps = { ...input.defaultProps, style: [{ fontFamily: "Cairo" }, input.defaultProps?.style] };
  const title = { fontFamily: "Cairo", color: colors.ink };
  return (
    <QueryClientProvider client={client}>
      <Stack
        screenOptions={{
          headerShown: true,
          headerTintColor: colors.ink,
          headerTitleStyle: title,
          headerStyle: { backgroundColor: colors.canvas },
          contentStyle: { backgroundColor: colors.canvas },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="signup" options={{ headerShown: false }} />
        <Stack.Screen name="otp" options={{ headerShown: false }} />
        <Stack.Screen name="home" options={{ title: t("nav.home"), headerBackVisible: false }} />
        <Stack.Screen name="account" options={{ title: t("nav.account") }} />
        <Stack.Screen name="plans" options={{ title: t("plans.title") }} />
        <Stack.Screen name="wallet" options={{ title: t("wallet.title") }} />
        <Stack.Screen name="memos" options={{ title: t("nav.memos") }} />
        <Stack.Screen name="chat/[id]" options={{ title: t("workspace.tabPrepare") }} />
        <Stack.Screen name="memo/[id]" options={{ title: t("workspace.tabMemo") }} />
      </Stack>
    </QueryClientProvider>
  );
}
