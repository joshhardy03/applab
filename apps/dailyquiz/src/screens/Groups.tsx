import React, { useEffect, useState } from "react";
import { Alert, Platform, Pressable, Share, Text, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";
import { localDayKey } from "@applab/core";
import { Account } from "../account";
import { asResult, buildBoard, BoardRow, gameCoverage, inviteLink, parseJoinCode, Period, periodRange } from "../board";
import { INVITE_BASE } from "../config";
import { GAMES, describe, todayNumber } from "../games";
import { useAsync } from "../hooks";
import * as remote from "../remote";
import { Store } from "../store";
import { friendlyError } from "../supabase";
import { pts } from "../time";
import {
  Avatar, Button, Card, Empty, Field, GAME_COLOUR, GameBadge, IconButton, Pill, Segmented, SectionTitle, Sheet,
  tint, useUi,
} from "../ui";
import { AccountsOff, SignUpCard } from "./SignUp";

function confirm(title: string, message: string, yes: string, onYes: () => void) {
  if (Platform.OS === "web") {
    if (window.confirm(`${title}\n\n${message}`)) onYes();
    return;
  }
  Alert.alert(title, message, [{ text: "Cancel", style: "cancel" }, { text: yes, style: "destructive", onPress: onYes }]);
}

async function shareText(message: string, fallbackCopy: string): Promise<string | null> {
  try {
    if (Platform.OS === "web" && !(typeof navigator !== "undefined" && "share" in navigator)) {
      await Clipboard.setStringAsync(fallbackCopy);
      return "Copied to clipboard.";
    }
    await Share.share({ message });
    return null;
  } catch {
    await Clipboard.setStringAsync(fallbackCopy);
    return "Copied to clipboard.";
  }
}

export function GroupsScreen({ account, store, pendingJoin, onJoinHandled }: {
  account: Account; store: Store; pendingJoin: string | null; onJoinHandled: () => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const signedIn = account.state.status === "signedIn";
  const groups = useAsync(signedIn ? () => remote.myGroups() : null, [signedIn]);

  if (account.state.status === "disabled") return <AccountsOff />;
  if (account.state.status === "loading") return null;

  const open = groups.data?.find((g) => g.id === openId);
  if (open && account.state.status === "signedIn") {
    return (
      <GroupDetail
        group={open} me={account.state.profile.id} store={store}
        onBack={() => setOpenId(null)}
        onLeft={() => {
          setOpenId(null);
          groups.reload();
        }}
      />
    );
  }

  return (
    <View style={{ gap: 12 }}>
      {pendingJoin ? (
        <JoinInvite code={pendingJoin} account={account} onDone={(id) => {
          onJoinHandled();
          groups.reload().then(() => id && setOpenId(id));
        }} />
      ) : null}
      {!signedIn ? (
        pendingJoin ? null : <SignUpCard account={account} title="Play with friends"
          body="Make a group, send the link, and see everyone's daily scores side by side." />
      ) : (
        <GroupList
          groups={groups.data ?? []} loading={groups.loading} error={groups.error}
          onOpen={setOpenId} onChanged={(id) => groups.reload().then(() => id && setOpenId(id))}
        />
      )}
    </View>
  );
}

function JoinInvite({ code, account, onDone }: {
  code: string; account: Account; onDone: (groupId: string | null) => void;
}) {
  const { s } = useUi();
  const signedIn = account.state.status === "signedIn";
  const preview = useAsync(signedIn ? () => remote.previewGroup(code) : null, [code, signedIn]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!signedIn) {
    return <SignUpCard account={account} title="You've been invited"
      body="Pick a name to join your friends' group. No email or password." />;
  }
  if (preview.loading) return null;
  if (!preview.data) {
    return (
      <Empty icon="help-circle-outline" title="Invite not found"
        body="That link doesn't match a group. Ask your friend to send it again.">
        <Button label="OK" variant="secondary" onPress={() => onDone(null)} />
      </Empty>
    );
  }
  return (
    <Card style={{ gap: 12 }}>
      <View style={s.row}>
        <Ionicons name="mail-open-outline" size={26} color={GAME_COLOUR.connections} />
        <View style={{ flex: 1 }}>
          <Text style={s.h2}>Join {preview.data.name}?</Text>
          <Text style={s.muted}>{preview.data.member_count} member{preview.data.member_count === 1 ? "" : "s"}</Text>
        </View>
      </View>
      {error ? <Text style={{ color: "#c92a2a" }}>{error}</Text> : null}
      <Button label="Join group" icon="enter-outline" busy={busy} onPress={async () => {
        setBusy(true);
        try {
          const g = await remote.joinGroup(code);
          onDone(g.id);
        } catch (e) {
          setError(friendlyError(e));
        } finally {
          setBusy(false);
        }
      }} />
      <Button label="Not now" variant="ghost" onPress={() => onDone(null)} />
    </Card>
  );
}

function GroupList({ groups, loading, error, onOpen, onChanged }: {
  groups: remote.Group[]; loading: boolean; error: string | null;
  onOpen: (id: string) => void; onChanged: (openId?: string) => void;
}) {
  const { t, s } = useUi();
  const [sheet, setSheet] = useState<"create" | "join" | null>(null);

  return (
    <View style={{ gap: 12 }}>
      <View style={{ paddingHorizontal: 4 }}>
        <Text style={s.h1}>Groups</Text>
      </View>
      {error ? <Card><Text style={{ color: t.bad }}>{error}</Text></Card> : null}
      {!loading && groups.length === 0 ? (
        <Empty icon="people-outline" title="No groups yet"
          body="Make one for your family, friends or office, then share the link." />
      ) : null}
      {groups.map((g) => (
        <Card key={g.id} onPress={() => onOpen(g.id)} style={[s.row, { gap: 12 }]}>
          <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: tint(t.accent, 0.12), alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="people" size={22} color={t.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.h3}>{g.name}</Text>
            <Text style={s.small}>Tap to see today's scores</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={t.muted} />
        </Card>
      ))}
      <View style={{ flexDirection: "row", gap: 10 }}>
        <Button label="New group" icon="add" onPress={() => setSheet("create")} style={{ flex: 1 }} />
        <Button label="Join with code" icon="key-outline" variant="secondary" onPress={() => setSheet("join")} style={{ flex: 1 }} />
      </View>
      <CreateSheet visible={sheet === "create"} onClose={() => setSheet(null)} onCreated={(id) => {
        setSheet(null);
        onChanged(id);
      }} />
      <JoinSheet visible={sheet === "join"} onClose={() => setSheet(null)} onJoined={(id) => {
        setSheet(null);
        onChanged(id);
      }} />
    </View>
  );
}

function CreateSheet({ visible, onClose, onCreated }: {
  visible: boolean; onClose: () => void; onCreated: (id: string) => void;
}) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clean = name.replace(/\s+/g, " ").trim();
  return (
    <Sheet visible={visible} onClose={onClose} title="New group">
      <View style={{ gap: 12 }}>
        <Field label="Group name" value={name} onChangeText={setName} placeholder="e.g. The Hardy family" maxLength={40} autoFocus />
        {error ? <Text style={{ color: "#c92a2a" }}>{error}</Text> : null}
        <Button label="Create group" icon="checkmark" disabled={!clean} busy={busy} onPress={async () => {
          setBusy(true);
          setError(null);
          try {
            const g = await remote.createGroup(clean);
            setName("");
            onCreated(g.id);
          } catch (e) {
            setError(friendlyError(e));
          } finally {
            setBusy(false);
          }
        }} />
      </View>
    </Sheet>
  );
}

function JoinSheet({ visible, onClose, onJoined }: {
  visible: boolean; onClose: () => void; onJoined: (id: string) => void;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const code = parseJoinCode(text);
  return (
    <Sheet visible={visible} onClose={onClose} title="Join a group">
      <View style={{ gap: 12 }}>
        <Field label="Invite code or link" value={text} onChangeText={setText} placeholder="e.g. K7QX4MPA"
          autoCapitalize="characters" autoCorrect={false} />
        {error ? <Text style={{ color: "#c92a2a" }}>{error}</Text> : null}
        <Button label="Join" icon="enter-outline" disabled={!code} busy={busy} onPress={async () => {
          if (!code) return;
          setBusy(true);
          setError(null);
          try {
            const g = await remote.joinGroup(code);
            setText("");
            onJoined(g.id);
          } catch (e) {
            setError(friendlyError(e));
          } finally {
            setBusy(false);
          }
        }} />
      </View>
    </Sheet>
  );
}

function GroupDetail({ group, me, store, onBack, onLeft }: {
  group: remote.Group; me: string; store: Store; onBack: () => void; onLeft: () => void;
}) {
  const { t, s } = useUi();
  const [period, setPeriod] = useState<Period>("today");
  const [note, setNote] = useState<string | null>(null);
  const today = localDayKey();
  const range = periodRange(period, today);
  const data = useAsync(() => remote.groupBoardData(group.id, range.from, range.to), [group.id, range.from, range.to]);

  // Refresh when my own results change, so I see myself move up the board.
  useEffect(() => {
    if (store.sync === "synced") data.reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.sync]);

  const rows = data.data ? buildBoard(data.data.members, data.data.results, range.from, range.to) : [];
  const link = inviteLink(INVITE_BASE, group.invite_code);
  const myRow = rows.find((r) => r.member.id === me);

  const invite = async () => {
    setNote(await shareText(
      `Join my Daily Quiz Tracker group "${group.name}" and let's compare our daily puzzle scores: ${link}`,
      link,
    ));
  };
  const nudge = async () => {
    const played = myRow?.played ?? 0;
    setNote(await shareText(
      `I've played ${played} of ${GAMES.length} puzzles today (${pts(myRow?.total ?? 0)} pts). Your move! ${link}`,
      link,
    ));
  };

  return (
    <View style={{ gap: 12 }}>
      <View style={[s.row, { paddingHorizontal: 0 }]}>
        <IconButton icon="chevron-back" onPress={onBack} label="Back to groups" colour={t.text} />
        <View style={{ flex: 1 }}>
          <Text style={s.h1} numberOfLines={1}>{group.name}</Text>
          <Text style={s.small}>{rows.length} member{rows.length === 1 ? "" : "s"}</Text>
        </View>
        <IconButton icon="refresh" onPress={data.reload} label="Refresh" />
      </View>

      <Segmented options={[{ id: "today", label: "Today" }, { id: "week", label: "This week" }]} value={period} onChange={setPeriod} />

      {data.error ? <Card><Text style={{ color: t.bad }}>{data.error}</Text></Card> : null}

      {period === "today" && rows.length > 0 ? <Coverage rows={rows} /> : null}

      <Card style={{ gap: 4, paddingVertical: 8 }}>
        {rows.map((row, i) => (
          <View key={row.member.id}>
            {i > 0 ? <View style={s.divider} /> : null}
            <MemberRow row={row} me={me} showGames={period === "today"} />
          </View>
        ))}
        {data.loading && rows.length === 0 ? <Text style={[s.muted, { padding: 8 }]}>Loading…</Text> : null}
      </Card>

      <Card style={{ gap: 10 }}>
        <View style={s.rowBetween}>
          <View>
            <Text style={s.h3}>Invite friends</Text>
            <Text style={s.small}>Code {group.invite_code}</Text>
          </View>
          <Pressable onPress={async () => {
            await Clipboard.setStringAsync(link);
            setNote("Invite link copied.");
          }} accessibilityLabel="Copy invite link" hitSlop={8}>
            <Ionicons name="copy-outline" size={20} color={t.accent} />
          </Pressable>
        </View>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Button label="Share invite" icon="share-social-outline" onPress={invite} style={{ flex: 1 }} />
          <Button label="Nudge group" icon="notifications-outline" variant="secondary" onPress={nudge} style={{ flex: 1 }} />
        </View>
        {note ? <Text style={[s.small, { color: t.good }]}>{note}</Text> : null}
      </Card>

      <Button label="Leave group" variant="ghost" icon="exit-outline" onPress={() =>
        confirm("Leave group?", `You'll stop seeing ${group.name}'s scores. You can rejoin with the link.`, "Leave", async () => {
          try {
            await remote.leaveGroup(group.id);
            onLeft();
          } catch (e) {
            setNote(friendlyError(e));
          }
        })} />
    </View>
  );
}

/** Which games the group has played today: one tile per game with "2/5". */
function Coverage({ rows }: { rows: BoardRow[] }) {
  const { s } = useUi();
  const cov = gameCoverage(rows);
  return (
    <View style={{ gap: 8 }}>
      <SectionTitle>Played today</SectionTitle>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {cov.map((c) => (
          <View key={c.game} style={[s.card, { padding: 8, alignItems: "center", gap: 4, width: 70 }]}>
            <GameBadge game={c.game} size={30} faded={c.done === 0} />
            <Text style={s.small}>{c.done}/{c.of}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function MemberRow({ row, me, showGames }: { row: BoardRow; me: string; showGames: boolean }) {
  const { t, s } = useUi();
  const isMe = row.member.id === me;
  const now = new Date();
  const left = GAMES.length - row.played;
  return (
    <View style={{ gap: 8, paddingVertical: 6 }}>
      <View style={s.row}>
        <Text style={[s.muted, { width: 20, textAlign: "center", fontWeight: "800" }]}>
          {row.rank === 1 && row.total > 0 ? "🏆" : row.rank}
        </Text>
        <Avatar name={row.member.name} colour={row.member.colour} size={34} />
        <View style={{ flex: 1 }}>
          <Text style={[s.h3, isMe && { color: t.accent }]} numberOfLines={1}>{isMe ? `${row.member.name} (you)` : row.member.name}</Text>
          <Text style={s.small}>
            {showGames ? (row.played === 0 ? "Not started" : left === 0 ? "All done" : `${row.played} played · ${left} to go`) : `${row.played} games`}
          </Text>
        </View>
        <Text style={[s.h2, { minWidth: 48, textAlign: "right" }]}>{pts(row.total)}</Text>
      </View>
      {showGames && row.played > 0 ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, paddingLeft: 30 }}>
          {GAMES.map((g) => {
            const r = row.byGame[g.id];
            if (!r || r.number !== todayNumber(g.id, now)) return null;
            return <Pill key={g.id} colour={GAME_COLOUR[g.id]} label={`${g.name} ${describe(asResult(r))}`} />;
          })}
        </View>
      ) : null}
    </View>
  );
}
