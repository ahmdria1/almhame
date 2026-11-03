import { translate } from "@elawyer/i18n";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { useState } from "react";
import { Text, TextInput } from "react-native";

type WithDefault = { defaultProps?: { style?: object } };

export default function RootLayout() {
  const [client] = useState(() => new QueryClient());
  const [loaded] = useFonts({ Cairo: require("../assets/fonts/Cairo-Variable.ttf") });
  if (!loaded) return null;
  const text = Text as unknown as WithDefault;
  const input = TextInput as unknown as WithDefault;
  text.defaultProps = { ...text.defaultProps, style: [{ fontFamily: "Cairo" }, text.defaultProps?.style] };
  input.defaultProps = { ...input.defaultProps, style: [{ fontFamily: "Cairo" }, input.defaultProps?.style] };
  const title = { fontFamily: "Cairo", color: "#17345F" };
  return (
    <QueryClientProvider client={client}>
      <Stack
        screenOptions={{
          headerShown: true,
          headerTintColor: "#17345F",
          headerTitleStyle: title,
          headerStyle: { backgroundColor: "#F8FAFC" },
          contentStyle: { backgroundColor: "#F8FAFC" },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="signup" options={{ headerShown: false }} />
        <Stack.Screen name="otp" options={{ headerShown: false }} />
        <Stack.Screen name="home" options={{ title: translate("ar", "nav.home"), headerBackVisible: false }} />
        <Stack.Screen name="account" options={{ title: translate("ar", "nav.account") }} />
        <Stack.Screen name="plans" options={{ title: translate("ar", "plans.title") }} />
        <Stack.Screen name="wallet" options={{ title: translate("ar", "wallet.title") }} />
        <Stack.Screen name="memos" options={{ title: translate("ar", "nav.memos") }} />
        <Stack.Screen name="saved" options={{ title: translate("ar", "nav.saved") }} />
        <Stack.Screen name="integrations" options={{ title: translate("ar", "nav.integrations") }} />
        <Stack.Screen name="settings" options={{ title: translate("ar", "nav.settings") }} />
        <Stack.Screen name="chat/[id]" options={{ title: translate("ar", "workspace.tabPrepare") }} />
        <Stack.Screen name="memo/[id]" options={{ title: translate("ar", "workspace.tabMemo") }} />
      </Stack>
    </QueryClientProvider>
  );
}
