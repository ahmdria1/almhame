import { noticeChannelId, noticeCue, type NoticePriority, type SoundTier } from "@elawyer/types";
import * as Notifications from "expo-notifications";

const TIERS: SoundTier[] = ["free", "paid"];
const PRIORITIES: NoticePriority[] = ["normal", "urgent"];

export async function registerNoticeChannels() {
  for (const tier of TIERS) {
    for (const priority of PRIORITIES) {
      const cue = noticeCue(tier, priority);
      await Notifications.setNotificationChannelAsync(noticeChannelId(tier, priority), {
        name: `${tier} ${priority}`,
        importance: priority === "urgent" ? Notifications.AndroidImportance.HIGH : Notifications.AndroidImportance.DEFAULT,
        sound: `${cue}.wav`,
      });
    }
  }
}

export async function presentNotice(title: string, tier: SoundTier, priority: NoticePriority) {
  const cue = noticeCue(tier, priority);
  await Notifications.scheduleNotificationAsync({
    content: { title, sound: `${cue}.wav` },
    trigger: { seconds: 1, channelId: noticeChannelId(tier, priority) },
  });
}