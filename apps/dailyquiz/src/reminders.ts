// Daily reminder: a local notification at a time the player picks. Phones only; the
// web preview can't send notifications when the page is closed, so it's switched off there.
import { useCallback, useEffect, useState } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { loadJSON, saveJSON } from "@applab/core";
export { formatTime } from "./time";

export const REMINDERS_SUPPORTED = Platform.OS !== "web";

export type ReminderSettings = { enabled: boolean; hour: number; minute: number };
const KEY = "dailyquiz.reminder.v1";
const DEFAULT: ReminderSettings = { enabled: false, hour: 8, minute: 0 };

export const REMINDER_TIMES: { hour: number; minute: number }[] = [
  { hour: 7, minute: 0 }, { hour: 8, minute: 0 }, { hour: 12, minute: 30 },
  { hour: 17, minute: 30 }, { hour: 19, minute: 0 }, { hour: 21, minute: 0 },
];

if (REMINDERS_SUPPORTED) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false,
    }),
  });
}

async function apply(s: ReminderSettings): Promise<boolean> {
  if (!REMINDERS_SUPPORTED) return false;
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!s.enabled) return true;
  const perm = await Notifications.requestPermissionsAsync();
  if (!perm.granted) return false;
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("reminders", {
      name: "Daily reminder", importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Today's puzzles are waiting",
      body: "Keep your streak going and see how your group is doing.",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: s.hour, minute: s.minute, channelId: "reminders",
    },
  });
  return true;
}

export function useReminder() {
  const [settings, setSettings] = useState<ReminderSettings>(DEFAULT);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    loadJSON<ReminderSettings>(KEY, DEFAULT).then((s) => setSettings({ ...DEFAULT, ...s }));
  }, []);

  const change = useCallback(async (next: ReminderSettings) => {
    setMessage(null);
    try {
      const ok = await apply(next);
      if (next.enabled && !ok) {
        setMessage("Notifications are blocked. Allow them for this app in your phone's settings.");
        next = { ...next, enabled: false };
      }
    } catch {
      setMessage("Couldn't set the reminder.");
      next = { ...next, enabled: false };
    }
    setSettings(next);
    saveJSON(KEY, next).catch(() => undefined);
  }, []);

  return { settings, change, message };
}
