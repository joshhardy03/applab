// Everything that talks to Supabase: profile, results sync, groups, leaderboards.
import { GameId, Result } from "./games";
import { Member, RemoteResult } from "./board";
import { supabase } from "./supabase";

export type Profile = { id: string; display_name: string; colour: string };
export type Group = { id: string; name: string; invite_code: string; created_by: string | null };

function check<T>(res: { data: T; error: unknown }): T {
  if (res.error) throw res.error;
  return res.data;
}

// ── account ────────────────────────────────────────────────────────────────
export async function currentUserId(): Promise<string | null> {
  const { data } = await supabase().auth.getSession();
  return data.session?.user.id ?? null;
}

/** "Sign up" = an anonymous account plus a display name. No email or password. */
export async function signUp(name: string, colour: string): Promise<Profile> {
  let uid = await currentUserId();
  if (!uid) {
    const { data, error } = await supabase().auth.signInAnonymously();
    if (error) throw error;
    uid = data.user?.id ?? null;
  }
  if (!uid) throw new Error("Couldn't create your account.");
  return check(
    await supabase().from("profiles").upsert({ id: uid, display_name: name, colour }).select().single(),
  ) as Profile;
}

export async function loadProfile(): Promise<Profile | null> {
  const uid = await currentUserId();
  if (!uid) return null;
  const rows = check(await supabase().from("profiles").select("id, display_name, colour").eq("id", uid)) as Profile[];
  return rows[0] ?? null;
}

export async function updateProfile(p: { display_name?: string; colour?: string }): Promise<Profile> {
  const uid = await currentUserId();
  if (!uid) throw new Error("Not signed in.");
  return check(await supabase().from("profiles").update(p).eq("id", uid).select().single()) as Profile;
}

export async function deleteAccount(): Promise<void> {
  check(await supabase().rpc("delete_my_account"));
  await supabase().auth.signOut();
}

// ── results ────────────────────────────────────────────────────────────────
function toRow(r: Result) {
  return {
    game: r.game, number: r.number, day: r.day, won: r.won, score: r.score,
    max: r.max ?? null, points: r.points, hard: r.hard ?? null, hints: r.hints ?? null,
  };
}

export async function pushResults(results: Result[]): Promise<void> {
  if (results.length === 0) return;
  const uid = await currentUserId();
  if (!uid) return;
  check(
    await supabase().from("results")
      .upsert(results.map((r) => ({ ...toRow(r), user_id: uid })), { onConflict: "user_id,game,number" }),
  );
}

export async function deleteRemoteResult(game: GameId, number: number): Promise<void> {
  const uid = await currentUserId();
  if (!uid) return;
  check(await supabase().from("results").delete().match({ user_id: uid, game, number }));
}

// ── groups ─────────────────────────────────────────────────────────────────
export async function myGroups(): Promise<Group[]> {
  return check(
    await supabase().from("groups").select("id, name, invite_code, created_by").order("created_at"),
  ) as Group[];
}

export async function createGroup(name: string): Promise<Group> {
  return check(await supabase().rpc("create_group", { p_name: name })) as Group;
}

export async function previewGroup(code: string): Promise<{ name: string; member_count: number } | null> {
  const rows = check(await supabase().rpc("group_preview", { p_code: code })) as { name: string; member_count: number }[];
  return rows[0] ?? null;
}

export async function joinGroup(code: string): Promise<Group> {
  return check(await supabase().rpc("join_group", { p_code: code })) as Group;
}

export async function leaveGroup(groupId: string): Promise<void> {
  const uid = await currentUserId();
  if (!uid) return;
  check(await supabase().from("group_members").delete().match({ group_id: groupId, user_id: uid }));
}

/** Members of a group and their results between two days. */
export async function groupBoardData(groupId: string, from: string, to: string): Promise<{
  members: Member[];
  results: RemoteResult[];
}> {
  const memberRows = check(
    await supabase().from("group_members").select("user_id").eq("group_id", groupId),
  ) as { user_id: string }[];
  const ids = memberRows.map((m) => m.user_id);
  if (ids.length === 0) return { members: [], results: [] };
  const [profiles, results] = await Promise.all([
    supabase().from("profiles").select("id, display_name, colour").in("id", ids),
    supabase().from("results")
      .select("user_id, game, number, day, won, score, max, points, hard, hints")
      .in("user_id", ids).gte("day", from).lte("day", to),
  ]);
  const members = (check(profiles) as Profile[]).map((p) => ({ id: p.id, name: p.display_name, colour: p.colour }));
  return { members, results: check(results) as RemoteResult[] };
}

export type GlobalRow = {
  user_id: string; display_name: string; colour: string; total: number; games: number; is_me: boolean;
};

export async function globalLeaderboard(from: string, to: string, limit = 50): Promise<GlobalRow[]> {
  return check(await supabase().rpc("global_leaderboard", { p_from: from, p_to: to, p_limit: limit })) as GlobalRow[];
}
