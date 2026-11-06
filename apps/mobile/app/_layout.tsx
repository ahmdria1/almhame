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
  const title = { fontFamily: "Cairo", color: "#0B1E3B" };
  return (
    <QueryClientProvider client={client}>
      <Stack
        screenOptions={{
          headerShown: true,
          headerTintColor: "#0B1E3B",
          headerTitleStyle: title,
          headerStyle: { backgroundColor: "#F6F8FB" },
          contentStyle: { backgroundColor: "#F6F8FB" },
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
        <Stack.Screen name="chat/[id]" options={{ title: translate("ar", "workspace.tabPrepare") }} />
        <Stack.Screen name="memo/[id]" options={{ title: translate("ar", "workspace.tabMemo") }} />
      </Stack>
    </QueryClientProvider>
  );
}
