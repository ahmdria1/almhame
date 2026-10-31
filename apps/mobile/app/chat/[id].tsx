import { ApiError } from "@elawyer/api-client";
import { translate, uploadErrorKey } from "@elawyer/i18n";
import { composerBox } from "@elawyer/types";
import { colors } from "@elawyer/tokens";
import { Audio } from "expo-av";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { client } from "../../src/api";

const t = (key: string) => translate("ar", key);
const MIN_BOX = composerBox(0, 2, 6, 22, 16);

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<{ id: string; role: string; content: string }[]>([]);
  const [text, setText] = useState("");
  const [caseId, setCaseId] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [phase, setPhase] = useState<"idle" | "recording" | "sending">("idle");
  const [boxHeight, setBoxHeight] = useState(MIN_BOX.height);
  const [keyboard, setKeyboard] = useState(false);
  const recordingRef = useRef<Audio.Recording | null>(null);

  useEffect(() => {
    client().chat(String(id)).then((result) => {
      setMessages(result.messages);
      setCaseId(result.caseFile?.id || "");
    }).catch(() => undefined);
  }, [id]);

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () => setKeyboard(true));
    const hide = Keyboard.addListener("keyboardDidHide", () => setKeyboard(false));
    return () => {
      show.remove();
      hide.remove();
      const recording = recordingRef.current;
      recordingRef.current = null;
      if (recording) void recording.stopAndUnloadAsync().catch(() => undefined);
    };
  }, []);

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
    if (!caseId || uploading || phase !== "idle") return;
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
    if (!caseId || uploading || phase !== "idle") return;
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

  async function startVoice() {
    if (phase !== "idle") return;
    const permission = await Audio.requestPermissionsAsync();
    if (!permission.granted) {
      setError(t("workspace.voiceDenied"));
      return;
    }
    setError("");
    await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
    const recording = new Audio.Recording();
    await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
    await recording.startAsync();
    recordingRef.current = recording;
    setPhase("recording");
  }

  async function cancelVoice() {
    const recording = recordingRef.current;
    recordingRef.current = null;
    setPhase("idle");
    if (recording) await recording.stopAndUnloadAsync().catch(() => undefined);
  }

  async function sendVoice() {
    const recording = recordingRef.current;
    if (!recording) return;
    setPhase("sending");
    setError("");
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      recordingRef.current = null;
      if (!uri) {
        setError(t("workspace.voiceFailed"));
        return;
      }
      const name = uri.endsWith(".wav") ? "note.wav" : "note.m4a";
      const type = name.endsWith(".wav") ? "audio/wav" : "audio/mp4";
      const result = await client().sendVoice(String(id), { uri, name, type }, name);
      setMessages((rows) => [...rows, result.user, result.counsel]);
    } catch (err) {
      const key = err instanceof ApiError ? uploadErrorKey(err.code) : null;
      setError(key ? t(key) : t("workspace.voiceFailed"));
    } finally {
      setPhase("idle");
    }
  }

  async function sendText() {
    if (!text.trim() || phase === "sending") return;
    const value = text;
    setText("");
    setBoxHeight(MIN_BOX.height);
    const result = await client().sendMessage(String(id), value);
    setMessages((rows) => [...rows, result.user, result.counsel]);
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}>
      <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
        {messages.map((message) => (
          <Text key={message.id} style={message.role === "user" ? styles.user : styles.counsel}>{message.content}</Text>
        ))}
      </ScrollView>
      {uploading ? <Text style={styles.status}>{t("workspace.uploading")}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={[styles.composer, { paddingBottom: keyboard ? 8 : Math.max(insets.bottom, 8) }]}>
        {phase === "idle" ? (
          <TextInput
            multiline
            value={text}
            onChangeText={setText}
            placeholder={t("workspace.placeholder")}
            placeholderTextColor={colors.slate500}
            textAlignVertical="top"
            blurOnSubmit={false}
            onContentSizeChange={(event) => {
              const box = composerBox(event.nativeEvent.contentSize.height, 2, 6, 22, 16);
              setBoxHeight(box.height);
            }}
            style={[styles.input, { height: boxHeight }]}
          />
        ) : (
          <View style={[styles.input, styles.recording]}>
            <Text style={styles.recordingText}>{phase === "sending" ? t("workspace.voiceSending") : t("workspace.voiceRecording")}</Text>
          </View>
        )}
        <View style={styles.tools}>
          <Pressable accessibilityLabel={t("workspace.attach")} disabled={uploading || !caseId || phase !== "idle"} onPress={() => void attach()}>
            <Text style={styles.tool}>📎</Text>
          </Pressable>
          <Pressable accessibilityLabel={t("workspace.camera")} disabled={uploading || !caseId || phase !== "idle"} onPress={() => void pickImage("camera")}>
            <Text style={styles.tool}>📷</Text>
          </Pressable>
          <Pressable accessibilityLabel={t("workspace.library")} disabled={uploading || !caseId || phase !== "idle"} onPress={() => void pickImage("library")}>
            <Text style={styles.tool}>🖼</Text>
          </Pressable>
          {phase === "recording" ? (
            <Pressable accessibilityLabel={t("workspace.voiceCancel")} onPress={() => void cancelVoice()}>
              <Text style={styles.tool}>{t("workspace.voiceCancel")}</Text>
            </Pressable>
          ) : (
            <Pressable accessibilityLabel={t("workspace.voice")} disabled={phase === "sending"} onPress={() => void startVoice()}>
              <Text style={styles.tool}>🎤</Text>
            </Pressable>
          )}
          <View style={styles.spacer} />
          {phase === "recording" ? (
            <Pressable accessibilityLabel={t("workspace.voiceSend")} onPress={() => void sendVoice()}>
              <Text style={styles.send}>{t("workspace.voiceSend")}</Text>
            </Pressable>
          ) : (
            <Pressable accessibilityLabel={t("workspace.send")} disabled={!text.trim() || phase === "sending"} onPress={() => void sendText()}>
              <Text style={styles.send}>{t("workspace.send")}</Text>
            </Pressable>
          )}
        </View>
      </View>
      <Pressable style={styles.draft} onPress={async () => {
        const result = await client().draft(String(id));
        router.push({ pathname: "/memo/[id]", params: { id: result.memo.id } });
      }}>
        <Text style={styles.primaryText}>{t("workspace.draft")}</Text>
      </Pressable>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  user: { alignSelf: "flex-start", backgroundColor: colors.navy700, color: "white", padding: 12, borderRadius: 16, marginBottom: 8, maxWidth: "80%" },
  counsel: { alignSelf: "flex-end", backgroundColor: "white", color: colors.slate900, padding: 12, borderRadius: 16, marginBottom: 8, maxWidth: "80%" },
  composer: { paddingHorizontal: 12, paddingTop: 8 },
  input: { width: "100%", minHeight: MIN_BOX.height, maxHeight: 6 * 22 + 16, backgroundColor: "white", borderRadius: 16, paddingHorizontal: 14, paddingVertical: 8, fontSize: 16, lineHeight: 22, color: colors.slate900 },
  recording: { justifyContent: "center" },
  recordingText: { color: colors.slate500, fontSize: 16 },
  tools: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  tool: { fontSize: 16, color: colors.navy700, fontWeight: "600" },
  spacer: { flex: 1 },
  send: { color: colors.navy700, fontWeight: "700", fontSize: 16 },
  status: { paddingHorizontal: 16, color: colors.slate900, fontSize: 14 },
  error: { paddingHorizontal: 16, color: "#b42318", fontSize: 14 },
  draft: { marginHorizontal: 12, marginBottom: 8, backgroundColor: colors.navy700, borderRadius: 14, padding: 14, alignItems: "center" },
  primaryText: { color: "white", fontWeight: "700" },
});
