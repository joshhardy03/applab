import React, { useMemo, useState } from "react";
import {
  Alert, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { AdSlot, logEvent, PrivacyPolicy, Theme, useTheme } from "@applab/core";
import {
  GAMES, GameId, MAX_DAILY_POINTS, Result, describe, parseShareText, todayNumber,
} from "./games";
import { byDay, gameStats } from "./stats";
import { useResults } from "./store";

type Tab = "today" | "stats" | "history" | "friends" | "settings";
const TABS: { id: Tab; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "stats", label: "Stats" },
  { id: "history", label: "History" },
  { id: "friends", label: "Friends" },
  { id: "settings", label: "Settings" },
];

// Each game gets a plain accent colour (no game logos or artwork).
const GAME_COLOUR: Record<GameId, string> = {
  wordle: "#2f9e44",
  connections: "#7048e8",
  chainle: "#e8590c",
  travle: "#1c7ed6",
};

function confirm(message: string, onYes: () => void) {
  if (Platform.OS === "web") {
    if (window.confirm(message)) onYes();
    return;
  }
  Alert.alert("Are you sure?", message, [
    { text: "Cancel", style: "cancel" },
    { text: "Delete", style: "destructive", onPress: onYes },
  ]);
}

export default function App() {
  return (
    <SafeAreaProvider>
      <Main />
    </SafeAreaProvider>
  );
}

function Main() {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const [tab, setTab] = useState<Tab>("today");
  const store = useResults();

  return (
    <SafeAreaView style={s.root} edges={["top", "left", "right", "bottom"]}>
      <StatusBar style={t.dark ? "light" : "dark"} />
      <View style={s.header}>
        <Text style={s.title}>Daily Quiz Tracker</Text>
      </View>
      <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
        {!store.loaded ? null : tab === "today" ? (
          <TodayScreen s={s} t={t} results={store.results} onAdd={store.add} />
        ) : tab === "stats" ? (
          <StatsScreen s={s} t={t} results={store.results} />
        ) : tab === "history" ? (
          <HistoryScreen s={s} t={t} results={store.results} onRemove={store.remove} />
        ) : tab === "friends" ? (
          <FriendsScreen s={s} />
        ) : (
          <SettingsScreen s={s} onClear={store.clearAll} count={store.results.length} />
        )}
      </ScrollView>
      <View style={s.tabBar}>
        {TABS.map((x) => (
          <Pressable
            key={x.id}
            onPress={() => setTab(x.id)}
            style={s.tab}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === x.id }}
          >
            <Text style={[s.tabText, tab === x.id && s.tabTextOn]}>{x.label}</Text>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}

type Styles = ReturnType<typeof makeStyles>;

// ── Today ──────────────────────────────────────────────────────────────────
function TodayScreen({ s, t, results, onAdd }: {
  s: Styles; t: Theme; results: Result[]; onAdd: (rs: Result[]) => void;
}) {
  const [text, setText] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const todays = GAMES.map((g) => {
    const n = todayNumber(g.id);
    return { g, n, r: results.find((r) => r.game === g.id && r.number === n) };
  });
  const total = Math.round(todays.reduce((sum, x) => sum + (x.r?.points ?? 0), 0) * 10) / 10;
  const done = todays.filter((x) => x.r).length;

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
      text: "Saved: " + out.results
        .map((r) => `${GAMES.find((g) => g.id === r.game)!.name} #${r.number} (${describe(r)})`)
        .join(", "),
    });
  };

  const pasteFromClipboard = async () => {
    try {
      const clip = await Clipboard.getStringAsync();
      if (!clip) {
        setMsg({ ok: false, text: "The clipboard is empty. Tap Share in the game first." });
        return;
      }
      submit(clip);
    } catch {
      setMsg({ ok: false, text: "Couldn't read the clipboard. Paste into the box instead." });
    }
  };

  return (
    <View>
      <View style={s.card}>
        <Text style={s.muted}>Today's score</Text>
        <Text style={s.big}>
          {total} <Text style={s.muted}>/ {MAX_DAILY_POINTS}</Text>
        </Text>
        <Text style={s.muted}>{done} of {GAMES.length} played</Text>
      </View>

      {todays.map(({ g, n, r }) => (
        <View key={g.id} style={[s.card, s.row, { borderLeftColor: GAME_COLOUR[g.id], borderLeftWidth: 5 }]}>
          <View style={{ flex: 1 }}>
            <Text style={s.h2}>{g.name} <Text style={s.muted}>#{n.toLocaleString("en-GB")}</Text></Text>
            <Text style={s.muted}>{r ? describe(r) : g.blurb}</Text>
          </View>
          {r ? (
            <Text style={[s.badge, { color: r.won ? t.good : t.bad }]}>{r.won ? "✓ Done" : "✗ Done"}</Text>
          ) : (
            <Pressable
              style={s.button}
              onPress={() => {
                logEvent("game_opened", { game: g.id });
                Linking.openURL(g.url);
              }}
              accessibilityRole="link"
            >
              <Text style={s.buttonText}>Play</Text>
            </Pressable>
          )}
        </View>
      ))}

      <View style={s.card}>
        <Text style={s.h2}>Add a result</Text>
        <Text style={[s.muted, { marginBottom: 8 }]}>
          Finish a puzzle, tap Share in the game, then paste it here. You can paste several at once.
        </Text>
        <Pressable style={[s.button, { alignSelf: "flex-start", marginBottom: 10 }]} onPress={pasteFromClipboard}>
          <Text style={s.buttonText}>Paste from clipboard</Text>
        </Pressable>
        <TextInput
          style={s.input}
          multiline
          value={text}
          onChangeText={setText}
          placeholder={"Wordle 1,983 4/6\n\n⬛🟨⬛⬛⬛\n…"}
          placeholderTextColor={t.muted}
        />
        <Pressable style={[s.button, { alignSelf: "flex-start", marginTop: 10 }]} onPress={() => submit(text)}>
          <Text style={s.buttonText}>Save result</Text>
        </Pressable>
        {msg ? <Text style={[s.msg, { color: msg.ok ? t.good : t.bad }]}>{msg.text}</Text> : null}
      </View>
    </View>
  );
}

// ── Stats ──────────────────────────────────────────────────────────────────
function StatsScreen({ s, t, results }: { s: Styles; t: Theme; results: Result[] }) {
  return (
    <View>
      {GAMES.map((g) => {
        const st = gameStats(results, g.id);
        const maxCount = Math.max(1, ...st.distribution.map((d) => d.count));
        const avgText =
          st.average == null ? "–"
          : g.id === "chainle" ? Math.round(st.average).toLocaleString("en-GB")
          : st.average.toFixed(1);
        return (
          <View key={g.id} style={[s.card, { borderLeftColor: GAME_COLOUR[g.id], borderLeftWidth: 5 }]}>
            <Text style={s.h2}>{g.name}</Text>
            <View style={s.statRow}>
              <Stat s={s} label="Played" value={String(st.played)} />
              {g.id === "chainle" ? (
                <Stat s={s} label="Best" value={st.best == null ? "–" : st.best.toLocaleString("en-GB")} />
              ) : (
                <Stat s={s} label="Win %" value={String(st.winPct)} />
              )}
              <Stat s={s} label="Streak" value={String(st.currentStreak)} />
              <Stat s={s} label="Best streak" value={String(st.bestStreak)} />
            </View>
            <Text style={[s.muted, { marginBottom: 6 }]}>
              {g.id === "wordle" ? "Average guesses (wins)" : g.id === "connections" ? "Average mistakes (wins)" : g.id === "travle" ? "Average extra guesses (wins)" : "Average points"}: {avgText}
            </Text>
            {st.distribution.map((d) => (
              <View key={d.label} style={s.barRow}>
                <Text style={s.barLabel}>{d.label}</Text>
                <View style={s.barTrack}>
                  <View
                    style={[s.bar, {
                      width: `${Math.max(4, (d.count / maxCount) * 100)}%`,
                      backgroundColor: d.count ? GAME_COLOUR[g.id] : t.line,
                    }]}
                  />
                </View>
                <Text style={s.barCount}>{d.count}</Text>
              </View>
            ))}
          </View>
        );
      })}
      <AdSlot placement="stats" />
    </View>
  );
}

function Stat({ s, label, value }: { s: Styles; label: string; value: string }) {
  return (
    <View style={s.stat}>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

// ── History ────────────────────────────────────────────────────────────────
function HistoryScreen({ s, t, results, onRemove }: {
  s: Styles; t: Theme; results: Result[]; onRemove: (id: string) => void;
}) {
  const days = byDay(results);
  if (days.length === 0) {
    return <View style={s.card}><Text style={s.muted}>No results yet. Add one from Today.</Text></View>;
  }
  return (
    <View>
      {days.map((d) => (
        <View key={d.day} style={s.card}>
          <View style={s.row}>
            <Text style={[s.h2, { flex: 1 }]}>{formatDay(d.day)}</Text>
            <Text style={s.muted}>{d.points} pts</Text>
          </View>
          {d.results.map((r) => (
            <View key={r.id} style={[s.row, { marginTop: 8 }]}>
              <View style={[s.dot, { backgroundColor: GAME_COLOUR[r.game] }]} />
              <Text style={[s.text, { flex: 1 }]}>
                {GAMES.find((g) => g.id === r.game)!.name} #{r.number.toLocaleString("en-GB")}
              </Text>
              <Text style={[s.text, { color: r.won ? t.text : t.bad, marginRight: 12 }]}>{describe(r)}</Text>
              <Pressable
                onPress={() => confirm(`Delete this ${GAMES.find((g) => g.id === r.game)!.name} result?`, () => onRemove(r.id))}
                accessibilityLabel="Delete result"
                hitSlop={8}
              >
                <Text style={s.muted}>✕</Text>
              </Pressable>
            </View>
          ))}
        </View>
      ))}
      <AdSlot placement="history" />
    </View>
  );
}

function formatDay(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

// ── Friends (v2) ───────────────────────────────────────────────────────────
function FriendsScreen({ s }: { s: Styles }) {
  return (
    <View style={s.card}>
      <Text style={s.h2}>Friends and leaderboards</Text>
      <Text style={[s.text, { marginTop: 8 }]}>Coming next:</Text>
      {[
        "Create a group and invite friends with a link",
        "Daily and weekly group leaderboards",
        "A global leaderboard",
      ].map((x) => <Text key={x} style={s.text}>• {x}</Text>)}
      <Text style={[s.muted, { marginTop: 10 }]}>
        For now your results stay on this device.
      </Text>
    </View>
  );
}

// ── Settings ───────────────────────────────────────────────────────────────
function SettingsScreen({ s, onClear, count }: { s: Styles; onClear: () => void; count: number }) {
  return (
    <View>
      <View style={s.card}>
        <PrivacyPolicy
          appName="Daily Quiz Tracker"
          updated="23 November 2026"
          dataPoints={[
            "Your puzzle results are stored only on this device. Nothing is sent to us.",
            "The app reads your clipboard only when you tap \"Paste from clipboard\".",
            "Game links open the puzzle makers' own websites or apps, which have their own privacy policies.",
          ]}
        />
      </View>
      <View style={s.card}>
        <Text style={s.h2}>Your data</Text>
        <Text style={[s.muted, { marginVertical: 8 }]}>{count} saved result{count === 1 ? "" : "s"}</Text>
        <Pressable
          style={[s.button, s.danger, { alignSelf: "flex-start" }]}
          onPress={() => confirm("Delete all your saved results? This can't be undone.", onClear)}
        >
          <Text style={s.buttonText}>Delete all data</Text>
        </Pressable>
      </View>
      <View style={s.card}>
        <Text style={s.muted}>
          Daily Quiz Tracker v0.1.0. Not affiliated with, or endorsed by, the makers of any puzzle listed.
          Game names belong to their owners.
        </Text>
      </View>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────
function makeStyles(t: Theme) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: t.bg },
    header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 },
    title: { color: t.text, fontSize: 22, fontWeight: "800" },
    body: { padding: 16, paddingTop: 4, maxWidth: 640, width: "100%", alignSelf: "center" },
    card: {
      backgroundColor: t.card, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.line, padding: 14, marginBottom: 12,
    },
    row: { flexDirection: "row", alignItems: "center" },
    h2: { color: t.text, fontSize: 17, fontWeight: "700" },
    text: { color: t.text, fontSize: 15, lineHeight: 22 },
    muted: { color: t.muted, fontSize: 14 },
    big: { color: t.text, fontSize: 34, fontWeight: "800", marginVertical: 2 },
    badge: { fontWeight: "700", fontSize: 15 },
    button: { backgroundColor: t.accent, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
    danger: { backgroundColor: t.bad },
    buttonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
    input: {
      minHeight: 110, borderWidth: 1, borderColor: t.line, borderRadius: 10, padding: 10,
      color: t.text, backgroundColor: t.bg, fontSize: 15, textAlignVertical: "top",
    },
    msg: { marginTop: 10, fontSize: 14 },
    statRow: { flexDirection: "row", marginVertical: 10 },
    stat: { flex: 1, alignItems: "center" },
    statValue: { color: t.text, fontSize: 22, fontWeight: "800" },
    statLabel: { color: t.muted, fontSize: 12, textAlign: "center" },
    barRow: { flexDirection: "row", alignItems: "center", marginVertical: 2 },
    barLabel: { color: t.muted, width: 78, fontSize: 12 },
    barTrack: { flex: 1, height: 16 },
    bar: { height: 16, borderRadius: 4 },
    barCount: { color: t.text, width: 30, textAlign: "right", fontSize: 13 },
    dot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
    tabBar: {
      flexDirection: "row", borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.line,
      backgroundColor: t.card,
    },
    tab: { flex: 1, paddingVertical: 12, alignItems: "center" },
    tabText: { color: t.muted, fontSize: 13, fontWeight: "600" },
    tabTextOn: { color: t.accent },
  });
}
