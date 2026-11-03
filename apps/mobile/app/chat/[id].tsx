import { ApiError } from "@elawyer/api-client";
import { translate, uploadErrorKey } from "@elawyer/i18n";
import { colors } from "@elawyer/tokens";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { client } from "../../src/api";

const t = (key: string) => translate("ar", key);

export default function ChatScreen() {
  const { id, caseNumber } = useLocalSearchParams<{ id: string; caseNumber?: string }>();
  const router = useRouter();
  const [messages, setMessages] = useState<{ id: string; role: string; content: string }[]>([]);
  const [text, setText] = useState("");
  const [caseId, setCaseId] = useState("");
  const [uploading, setUploading] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [draftStage, setDraftStage] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!drafting) return;
    const timer = setTimeout(() => setDraftStage(1), 700);
    return () => clearTimeout(timer);
  }, [drafting]);

  useEffect(() => {
    if (caseNumber) setText(`${t("track.number")}: ${caseNumber}`);
    client().chat(String(id)).then((result) => {
      setMessages(result.messages);
      setCaseId(result.caseFile?.id || "");
    }).catch(() => undefined);
  }, [id, caseNumber]);

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
      {drafting ? <Text style={styles.status}>{draftStage === 0 ? t("workspace.drafting") : t("workspace.draftReview")}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.bar}>
        <Pressable accessibilityLabel={t("workspace.attach")} style={styles.icon} disabled={uploading || !caseId} onPress={() => void attach()}>
          <Ionicons name="attach" size={22} color={colors.navy700} />
        </Pressable>
        <Pressable accessibilityLabel={t("upload.camera")} style={styles.icon} disabled={uploading || !caseId} onPress={() => void pickImage("camera")}>
          <Ionicons name="camera-outline" size={22} color={colors.navy700} />
        </Pressable>
        <Pressable accessibilityLabel={t("upload.photos")} style={styles.icon} disabled={uploading || !caseId} onPress={() => void pickImage("library")}>
          <Ionicons name="image-outline" size={22} color={colors.navy700} />
        </Pressable>
        <TextInput style={styles.input} value={text} onChangeText={setText} placeholder={t("workspace.placeholder")} />
        <Pressable style={styles.icon} accessibilityLabel={t("auth.submitLogin")} onPress={async () => {
          const result = await client().sendMessage(String(id), text);
          setMessages((rows) => [...rows, result.user, result.counsel]);
          setText("");
        }}><Ionicons name="send" size={20} color={colors.navy700} style={{ transform: [{ scaleX: -1 }] }} /></Pressable>
      </View>
      <Pressable style={styles.draft} disabled={drafting} onPress={async () => {
        if (drafting) return;
        setDraftStage(0);
        setError("");
        setDrafting(true);
        try {
          const result = await client().draft(String(id));
          router.push({ pathname: "/memo/[id]", params: { id: result.memo.id } });
        } catch (err) {
          setError(err instanceof ApiError && err.code === "DRAFT_RETRY" ? t("workspace.draftRetry") : t("common.error"));
        } finally {
          setDrafting(false);
        }
      }}>
        <Text style={styles.primaryText}>{t("workspace.draft")}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  user: { alignSelf: "flex-start", backgroundColor: colors.navy700, color: "white", padding: 12, borderRadius: 16, marginBottom: 8, maxWidth: "80%" },
  counsel: { alignSelf: "flex-end", backgroundColor: "white", color: colors.slate900, padding: 12, borderRadius: 16, marginBottom: 8, maxWidth: "80%" },
  bar: { flexDirection: "row", gap: 8, padding: 12, alignItems: "center" },
  input: { flex: 1, backgroundColor: "white", borderRadius: 14, minHeight: 44, padding: 12, textAlign: "right" },
  icon: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  status: { paddingHorizontal: 16, color: colors.slate900 },
  error: { paddingHorizontal: 16, color: "#b42318" },
  draft: { margin: 12, backgroundColor: colors.navy700, borderRadius: 14, padding: 14, alignItems: "center" },
  primaryText: { color: "white", fontWeight: "700" },
});
