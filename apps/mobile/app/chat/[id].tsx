import { ApiError } from "@elawyer/api-client";
import { translate, uploadErrorKey } from "@elawyer/i18n";
import { colors } from "@elawyer/tokens";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { client } from "../../src/api";

const t = (key: string) => translate("ar", key);

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [messages, setMessages] = useState<{ id: string; role: string; content: string }[]>([]);
  const [text, setText] = useState("");
  const [caseId, setCaseId] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    client().chat(String(id)).then((result) => {
      setMessages(result.messages);
      setCaseId(result.caseFile?.id || "");
    }).catch(() => undefined);
  }, [id]);

  async function sendFile(uri: string, name: string, type: string) {
    setUploading(true);
    setError("");
    try {
      await client().uploadDocument(caseId, { uri, name, type }, name);
    } catch (err) {
      const key = err instanceof ApiError ? uploadErrorKey(err.code) : null;
      setError(key ? t(key) : t("common.error"));
    } finally {
      setUploading(false);
    }
  }

  async function attach() {
    if (!caseId || uploading) return;
    const picked = await DocumentPicker.getDocumentAsync({
      type: ["application/pdf", "image/png", "image/jpeg", "image/webp"],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (picked.canceled || !picked.assets?.[0]) return;
    const asset = picked.assets[0];
    await sendFile(asset.uri, asset.name, asset.mimeType || "application/pdf");
  }

  async function pickImage(source: "camera" | "library") {
    if (!caseId || uploading) return;
    const permission = source === "camera"
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError(t("upload.unsupported"));
      return;
    }
    const picked = source === "camera"
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (picked.canceled || !picked.assets?.[0]) return;
    const asset = picked.assets[0];
    await sendFile(asset.uri, asset.fileName || (source === "camera" ? "camera.jpg" : "photo.jpg"), asset.mimeType || "image/jpeg");
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {messages.map((message) => (
          <Text key={message.id} style={message.role === "user" ? styles.user : styles.counsel}>{message.content}</Text>
        ))}
      </ScrollView>
      {uploading ? <Text style={styles.status}>{t("workspace.uploading")}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.bar}>
        <Pressable accessibilityLabel={t("workspace.attach")} disabled={uploading || !caseId} onPress={() => void attach()}>
          <Text style={styles.clip}>📎</Text>
        </Pressable>
        <Pressable accessibilityLabel="الكاميرا" disabled={uploading || !caseId} onPress={() => void pickImage("camera")}>
          <Text style={styles.clip}>📷</Text>
        </Pressable>
        <Pressable accessibilityLabel="مكتبة الصور" disabled={uploading || !caseId} onPress={() => void pickImage("library")}>
          <Text style={styles.clip}>🖼</Text>
        </Pressable>
        <TextInput style={styles.input} value={text} onChangeText={setText} placeholder="اكتب رسالتك" />
        <Pressable onPress={async () => {
          const result = await client().sendMessage(String(id), text);
          setMessages((rows) => [...rows, result.user, result.counsel]);
          setText("");
        }}><Text style={styles.send}>إرسال</Text></Pressable>
      </View>
      <Pressable style={styles.draft} onPress={async () => {
        const result = await client().draft(String(id));
        router.push({ pathname: "/memo/[id]", params: { id: result.memo.id } });
      }}>
        <Text style={styles.primaryText}>صياغة المذكرة</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  user: { alignSelf: "flex-start", backgroundColor: colors.navy700, color: "white", padding: 12, borderRadius: 16, marginBottom: 8, maxWidth: "80%" },
  counsel: { alignSelf: "flex-end", backgroundColor: "white", color: colors.slate900, padding: 12, borderRadius: 16, marginBottom: 8, maxWidth: "80%" },
  bar: { flexDirection: "row", gap: 8, padding: 12, alignItems: "center" },
  input: { flex: 1, backgroundColor: "white", borderRadius: 14, padding: 12 },
  send: { color: colors.navy700, fontWeight: "700" },
  clip: { fontSize: 20 },
  status: { paddingHorizontal: 16, color: colors.slate900 },
  error: { paddingHorizontal: 16, color: "#b42318" },
  draft: { margin: 12, backgroundColor: colors.navy700, borderRadius: 14, padding: 14, alignItems: "center" },
  primaryText: { color: "white", fontWeight: "700" },
});
