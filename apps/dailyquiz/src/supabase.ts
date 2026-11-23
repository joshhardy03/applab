// The one Supabase client. Only created when accounts are configured.
import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Platform } from "react-native";
import { ACCOUNTS_ENABLED, SUPABASE_ANON_KEY, SUPABASE_URL } from "./config";

let client: SupabaseClient | null = null;

export function supabase(): SupabaseClient {
  if (!ACCOUNTS_ENABLED) throw new Error("Accounts aren't switched on in this build.");
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: Platform.OS === "web",
      },
    });
  }
  return client;
}

/** Turn Supabase / network errors into a sentence for the screen. */
export function friendlyError(e: unknown): string {
  const msg = e instanceof Error ? e.message : typeof e === "object" && e && "message" in e ? String((e as { message: unknown }).message) : String(e);
  if (/invite code not found/i.test(msg)) return "That invite code doesn't match a group.";
  if (/group is full/i.test(msg)) return "That group is full (50 people).";
  if (/group limit/i.test(msg)) return "You've made the most groups you can (20).";
  if (/anonymous sign-ins are disabled/i.test(msg)) return "Sign-up isn't switched on yet.";
  if (/network|fetch|Failed to fetch/i.test(msg)) return "Couldn't reach the server. Check your connection.";
  return msg || "Something went wrong.";
}
