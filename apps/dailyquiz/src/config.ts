// Build-time settings. EXPO_PUBLIC_* values are inlined into the app by Expo; the
// Supabase anon key is public by design (row-level security does the protecting).

/**
 * Accepts the project's API URL, or a Supabase dashboard link by mistake
 * (https://supabase.com/dashboard/project/<ref>), and returns the API URL.
 */
export function normaliseSupabaseUrl(raw: string | undefined): string {
  const url = (raw ?? "").trim().replace(/\/+$/, "");
  const dash = /supabase\.com\/dashboard\/project\/([a-z0-9]{10,40})/.exec(url);
  if (dash) return `https://${dash[1]}.supabase.co`;
  return /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url) ? url : "";
}

export const SUPABASE_URL = normaliseSupabaseUrl(process.env.EXPO_PUBLIC_SUPABASE_URL);
export const SUPABASE_ANON_KEY = (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();
export const ACCOUNTS_ENABLED = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

/** Where invite links point. The installed app will claim this link later (phase 3). */
export const INVITE_BASE = "https://apps.trade-bot.uk/preview/dailyquiz/";
