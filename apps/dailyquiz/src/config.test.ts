import { test } from "node:test";
import assert from "node:assert/strict";
import { normaliseSupabaseUrl } from "./config";

test("Supabase URL: API URL kept, dashboard link converted, junk dropped", () => {
  assert.equal(normaliseSupabaseUrl("https://abcdefghijklmnop.supabase.co"), "https://abcdefghijklmnop.supabase.co");
  assert.equal(normaliseSupabaseUrl(" https://abcdefghijklmnop.supabase.co/ "), "https://abcdefghijklmnop.supabase.co");
  assert.equal(normaliseSupabaseUrl("https://supabase.com/dashboard/project/abcdefghijklmnop"), "https://abcdefghijklmnop.supabase.co");
  assert.equal(normaliseSupabaseUrl("https://supabase.com/dashboard/project/abcdefghijklmnop/settings/api"), "https://abcdefghijklmnop.supabase.co");
  assert.equal(normaliseSupabaseUrl("https://example.com"), "");
  assert.equal(normaliseSupabaseUrl(undefined), "");
});
