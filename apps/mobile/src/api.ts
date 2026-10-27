import { ElawyerClient } from "@elawyer/api-client";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const API = process.env.EXPO_PUBLIC_API_URL || "http://127.0.0.1:4710/api";
let memory = "";

export async function readToken() {
  if (memory) return memory;
  if (Platform.OS === "web") return globalThis.localStorage?.getItem("elw_token") || "";
  return (await SecureStore.getItemAsync("elw_token")) || "";
}

export async function writeToken(token: string) {
  memory = token;
  if (Platform.OS === "web") globalThis.localStorage?.setItem("elw_token", token);
  else await SecureStore.setItemAsync("elw_token", token);
}

export async function clearToken() {
  memory = "";
  if (Platform.OS === "web") globalThis.localStorage?.removeItem("elw_token");
  else await SecureStore.deleteItemAsync("elw_token");
}

export function client() {
  return new ElawyerClient({ baseUrl: API, getToken: () => memory, credentials: "omit" });
}

export async function hydrate() {
  memory = await readToken();
  return memory;
}
