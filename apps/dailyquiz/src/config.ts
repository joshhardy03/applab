// Build-time settings. EXPO_PUBLIC_* values are inlined into the app by Expo; the
// Supabase anon key is public by design (row-level security does the protecting).
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const ACCOUNTS_ENABLED = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

/** Where invite links point. The installed app will claim this link later (phase 3). */
export const INVITE_BASE = "https://apps.trade-bot.uk/preview/dailyquiz/";
