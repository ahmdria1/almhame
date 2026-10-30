import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { registerNoticeChannels } from "../src/notices";

export default function RootLayout() {
  const [client] = useState(() => new QueryClient());
  useEffect(() => {
    void registerNoticeChannels().catch(() => undefined);
  }, []);
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={client}>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#F8FAFC" } }} />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
