import React, { useState } from "react";
import { Linking, Pressable, Text, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";
import { localDayKey, logEvent } from "@applab/core";
import { Account } from "../account";
import { buildBoard } from "../board";
import { GAMES, MAX_DAILY_POINTS, Result, describe, parseShareText, todayNumber } from "../games";
import { useAsync } from "../hooks";
import * as remote from "../remote";
import { Store } from "../store";
import { greeting, pts } from "../time";
import {
  Avatar, Button, Card, GAME_COLOUR, GameBadge, Pill, SectionTitle, Sheet, Field, gameName, tint, useUi,
} from "../ui";

function dayStreak(results: Result[], today: string): number {
  const days = new Set(results.map((r) => r.day));
  let n = 0;
  const d = new Date(`${today}T12:00:00Z`);
  if (!days.has(today)) d.setUTCDate(d.getUTCDate() - 1);
  while (days.has(d.toISOString().slice(0, 10))) {
    n += 1;
    d.setUTCDate(d.getUTCDate() - 1);
  }
  return n;
}

export function TodayScreen({ store, account, onOpenGroups }: {
  store: Store; account: Account; onOpenGroups: () => void;
}) {
  const { t, s } = useUi();
  const [adding, setAdding] = useState(false);
  const today = localDayKey();
  const now = new Date();

  const todays = GAMES.map((g) => {
    const n = todayNumber(g.id, now);
    return { g, n, r: store.results.find((r) => r.game === g.id && r.number === n) };
  });
  const total = todays.reduce((sum, x) => sum + (x.r?.points ?? 0), 0);
  const done = todays.filter((x) => x.r).length;
  const streak = dayStreak(store.results, today);
  const name = account.state.status === "signedIn" ? account.state.profile.display_name : null;

  return (
    <View style={{ gap: 12 }}>
      <View style={{ paddingHorizontal: 4, gap: 2 }}>
        <Text style={s.muted}>{greeting(now.getHours())}{name ? `, ${name}` : ""}</Text>
        <Text style={s.h1}>Today's puzzles</Text>
      </View>

      <Card style={{ backgroundColor: t.accent, gap: 12 }}>
        <View style={s.rowBetween}>
          <View>
            <Text style={{ color: "rgba(255,255,255,0.8)", fontWeight: "600" }}>Today's score</Text>
            <Text style={{ color: "#fff", fontSize: 44, fontWeight: "800", letterSpacing: -1 }}>
              {pts(total)}<Text style={{ fontSize: 20, color: "rgba(255,255,255,0.7)" }}> / {MAX_DAILY_POINTS}</Text>
            </Text>
          </View>
          <View style={{ alignItems: "flex-end", gap: 6 }}>
            <View style={[s.row, { gap: 4 }]}>
              <Ionicons name="flame" size={18} color="#ffd43b" />
              <Text style={{ color: "#fff", fontWeight: "800", fontSize: 18 }}>{streak}</Text>
            </View>
            <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 12 }}>day streak</Text>
          </View>
        </View>
        <View style={{ height: 8, borderRadius: 8, backgroundColor: "rgba(255,255,255,0.25)", overflow: "hidden" }}>
          <View style={{ width: `${(done / GAMES.length) * 100}%`, height: 8, borderRadius: 8, backgroundColor: "#fff" }} />
        </View>
        <View style={s.rowBetween}>
          <Text style={{ color: "#fff", fontWeight: "600" }}>
            {done === GAMES.length ? "All done. Nice work!" : `${done} of ${GAMES.length} played`}
          </Text>
          <Pressable onPress={() => setAdding(true)} accessibilityRole="button"
            style={({ pressed }) => [{ backgroundColor: "#fff", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9, flexDirection: "row", gap: 6, alignItems: "center" }, pressed && { opacity: 0.85 }]}>
            <Ionicons name="add" size={18} color={t.accent} />
            <Text style={{ color: t.accent, fontWeight: "800" }}>Add results</Text>
          </Pressable>
        </View>
      </Card>

      <GroupTeaser account={account} today={today} onOpen={onOpenGroups} />

      <SectionTitle right={<Text style={s.small}>Tap to play</Text>}>Games</SectionTitle>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        {todays.map(({ g, n, r }) => (
          <Pressable
            key={g.id}
            onPress={() => {
              logEvent("game_opened", { game: g.id });
              Linking.openURL(g.url);
            }}
            accessibilityRole="link"
            accessibilityLabel={`${g.name}${r ? `, done: ${describe(r)}` : ", not played yet"}`}
            style={({ pressed }) => [s.card, { flexGrow: 1, flexBasis: "45%", padding: 14, gap: 10 }, pressed && s.pressed]}
          >
            <View style={s.rowBetween}>
              <GameBadge game={g.id} size={38} faded={!r} />
              {r ? (
                <Ionicons name={r.won ? "checkmark-circle" : "close-circle"} size={22} color={r.won ? t.good : t.bad} />
              ) : (
                <Ionicons name="open-outline" size={18} color={t.muted} />
              )}
            </View>
            <View>
              <Text style={s.h3} numberOfLines={1}>{g.name}</Text>
              <Text style={s.small}>#{n.toLocaleString("en-GB")}</Text>
            </View>
            {r ? (
              <Pill label={describe(r)} colour={GAME_COLOUR[g.id]} />
            ) : (
              <Text style={[s.small, { minHeight: 26 }]} numberOfLines={2}>{g.blurb}</Text>
            )}
          </Pressable>
        ))}
      </View>

      <AddSheet visible={adding} onClose={() => setAdding(false)} onAdd={store.add} />
    </View>
  );
}

function GroupTeaser({ account, today, onOpen }: { account: Account; today: string; onOpen: () => void }) {
  const { t, s } = useUi();
  const signedIn = account.state.status === "signedIn";
  const me = signedIn && account.state.status === "signedIn" ? account.state.profile.id : null;
  const groups = useAsync(signedIn ? () => remote.myGroups() : null, [signedIn]);
  const first = groups.data?.[0];
  const board = useAsync(first ? () => remote.groupBoardData(first.id, today, today) : null, [first?.id, today]);

  if (account.state.status === "disabled") return null;
  if (!signedIn || (groups.data && groups.data.length === 0)) {
    return (
      <Card onPress={onOpen} style={[s.row, { gap: 12 }]}>
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: tint(t.accent, 0.12), alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="people" size={22} color={t.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.h3}>Play with friends</Text>
          <Text style={s.muted}>Start a group and see everyone's scores each day.</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={t.muted} />
      </Card>
    );
  }
  if (!first || !board.data) return null;
  const rows = buildBoard(board.data.members, board.data.results, today, today).slice(0, 3);
  return (
    <Card onPress={onOpen} style={{ gap: 10 }}>
      <View style={s.rowBetween}>
        <Text style={s.h3}>{first.name} today</Text>
        <Ionicons name="chevron-forward" size={20} color={t.muted} />
      </View>
      {rows.map((row) => (
        <View key={row.member.id} style={s.row}>
          <Text style={[s.muted, { width: 18, textAlign: "center", fontWeight: "700" }]}>{row.rank}</Text>
          <Avatar name={row.member.name} colour={row.member.colour} size={28} />
          <Text style={[s.text, { flex: 1, fontWeight: row.member.id === me ? "800" : "500" }]} numberOfLines={1}>
            {row.member.id === me ? "You" : row.member.name}
          </Text>
          <Text style={s.small}>{row.played}/{GAMES.length}</Text>
          <Text style={[s.h3, { width: 48, textAlign: "right" }]}>{pts(row.total)}</Text>
        </View>
      ))}
    </Card>
  );
}

function AddSheet({ visible, onClose, onAdd }: {
  visible: boolean; onClose: () => void; onAdd: (rs: Result[]) => void;
}) {
  const { t, s } = useUi();
  const [text, setText] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const submit = (raw: string) => {
    const out = parseShareText(raw);
    if (!out.ok) {
      setMsg({ ok: false, text: out.error });
      return;
    }
    onAdd(out.results);
    out.results.forEach((r) => logEvent("result_added", { game: r.game, won: r.won }));
    setText("");
    setMsg({
      ok: true,
      text: "Saved " + out.results.map((r) => `${gameName(r.game)} (${describe(r)})`).join(", "),
    });
  };

  const paste = async () => {
    try {
      const clip = await Clipboard.getStringAsync();
      if (!clip) setMsg({ ok: false, text: "The clipboard is empty. Tap Share in the game first." });
      else submit(clip);
    } catch {
      setMsg({ ok: false, text: "Couldn't read the clipboard. Paste into the box instead." });
    }
  };

  const close = () => {
    setMsg(null);
    onClose();
  };

  return (
    <Sheet visible={visible} onClose={close} title="Add results">
      <View style={{ gap: 12 }}>
        <Text style={s.muted}>
          Finish a puzzle, tap its Share button, then come back here. You can paste several results at once.
        </Text>
        <Button label="Paste from clipboard" icon="clipboard-outline" onPress={paste} />
        <Field
          multiline value={text} onChangeText={setText}
          placeholder={"…or paste here\nWordle 1,983 4/6"}
          style={{ minHeight: 110, textAlignVertical: "top" }}
        />
        <Button label="Save" variant="secondary" icon="checkmark" onPress={() => submit(text)} disabled={!text.trim()} />
        {msg ? (
          <View style={[s.row, { alignItems: "flex-start" }]}>
            <Ionicons name={msg.ok ? "checkmark-circle" : "alert-circle"} size={18} color={msg.ok ? t.good : t.bad} />
            <Text style={{ color: msg.ok ? t.good : t.bad, flex: 1 }}>{msg.text}</Text>
          </View>
        ) : null}
      </View>
    </Sheet>
  );
}
