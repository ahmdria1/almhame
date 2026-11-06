import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { readToken } from "./api";

const API = process.env.EXPO_PUBLIC_API_URL || "http://127.0.0.1:4710/api";

export async function shareMemoPdf(id: string) {
  const token = await readToken();
  const dest = `${FileSystem.cacheDirectory}memo-${id}.pdf`;
  const result = await FileSystem.downloadAsync(`${API}/memos/${id}/export.pdf`, dest, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (result.status !== 200) throw new Error("pdf");
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(result.uri, { mimeType: "application/pdf", UTI: "com.adobe.pdf" });
  }
}
