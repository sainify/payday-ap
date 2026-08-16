import { api } from "@/lib/api";
import type { ReminderItem } from "@/types";

/**
 * Lightweight reminder bridge for the PWA. It checks server-derived reminders
 * whenever an authenticated app session opens/resumes and shows each reminder
 * at most once per day if the user granted browser notification permission.
 * Background push can be added later without changing the reminder API.
 */
export async function surfaceDueReminder(): Promise<void> {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  try {
    const { reminders } = await api.get<{ reminders: ReminderItem[] }>("/notifications");
    const first = reminders[0];
    if (!first) return;
    const today = new Date().toISOString().slice(0, 10);
    const key = `payday-reminder:${today}:${first.id}`;
    if (localStorage.getItem(key)) return;
    new Notification(first.title, { body: first.message, icon: "/icon-192.png", badge: "/icon-192.png" });
    localStorage.setItem(key, "1");
  } catch {
    // Reminders should never block the app.
  }
}
