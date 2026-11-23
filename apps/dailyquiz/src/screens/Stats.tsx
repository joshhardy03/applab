import React, { useState } from "react";
import { Alert, Platform, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AdSlot, localDayKey } from "@applab/core";
import { GameDef, GAMES, describe } from "../games";
import { byDay, gameStats } from "../stats";
import { Store } from "../store";
import { friendlyDay, pts } from "../time";
import { Card, Empty, GAME_COLOUR, GameBadge, ProgressBar, Segmented, gameName, useUi } from "../ui";

const AVERAGE_LABEL: Record<GameDef["kind"], string> = {
  guesses: "Average guesses (wins)",
  mistakes: "Average mistakes (wins)",
  extra: "Average extra guesses (wins)",
  points: "Average score",
  factor: "Average (lower is better)",
};

function formatScore(g: GameDef, n: number): string {
  if (g.kind === "factor") return `${n < 10 ? n.toFixed(2) : n.toFixed(1)}×`;
  if (g.kind === "points") return Math.round(n).toLocaleString("en-GB");
  return n.toFixed(1);
}

function confirmDelete(message: string, onYes: () => void) {
  if (Platform.OS === "web") {
    if (window.confirm(message)) onYes();
    return;
  }
  Alert.alert("Delete result?", message, [{ text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive", onPress: onYes }]);
}

export function StatsScreen({ store }: { store: Store }) {
  const { s } = useUi();
  const [tab, setTab] = useState<"stats" | "history">("stats");
  return (
    <View style={{ gap: 12 }}>
      <View style={{ paddingHorizontal: 4 }}>
        <Text style={s.h1}>Your stats</Text>
      </View>
      <Segmented options={[{ id: "stats", label: "By game" }, { id: "history", label: "History" }]} value={tab} onChange={setTab} />
      {tab === "stats" ? <ByGame store={store} /> : <History store={store} />}
      <AdSlot placement="stats" />
    </View>
  );
}

function ByGame({ store }: { store: Store }) {
  const { t, s } = useUi();
  const [open, setOpen] = useState<string | null>(null);
  const days = byDay(store.results);
  const totalPoints = days.reduce((sum, d) => sum + d.points, 0);
  return (
    <View style={{ gap: 12 }}>
      <Card style={[s.rowBetween]}>
        <Summary label="Days played" value={String(days.length)} />
        <Summary label="Results" value={String(store.results.length)} />
        <Summary label="Avg per day" value={days.length ? pts(totalPoints / days.length) : "–"} />
      </Card>
      {GAMES.map((g) => {
        const st = gameStats(store.results, g.id);
        const scored = g.kind === "points" || g.kind === "factor";
        const isOpen = open === g.id;
        const maxCount = Math.max(1, ...st.distribution.map((d) => d.count));
        return (
          <Card key={g.id} onPress={() => setOpen(isOpen ? null : g.id)} style={{ gap: 12 }}>
            <View style={s.row}>
              <GameBadge game={g.id} size={38} faded={st.played === 0} />
              <View style={{ flex: 1 }}>
                <Text style={s.h3}>{g.name}</Text>
                <Text style={s.small}>
                  {st.played === 0 ? "Not played yet" : `${st.played} played · ${scored
                    ? `best ${st.best == null ? "–" : formatScore(g, st.best)}`
                    : `${st.winPct}% won`}`}
                </Text>
              </View>
              {st.currentStreak > 0 ? (
                <View style={[s.row, { gap: 3 }]}>
                  <Ionicons name="flame" size={16} color="#f76707" />
                  <Text style={s.h3}>{st.currentStreak}</Text>
                </View>
              ) : null}
              <Ionicons name={isOpen ? "chevron-up" : "chevron-down"} size={18} color={t.muted} />
            </View>
            {isOpen ? (
              <View style={{ gap: 8 }}>
                <View style={s.rowBetween}>
                  <Summary label="Played" value={String(st.played)} />
                  <Summary label={scored ? "Best" : "Win %"} value={scored ? (st.best == null ? "–" : formatScore(g, st.best)) : String(st.winPct)} />
                  <Summary label="Streak" value={String(st.currentStreak)} />
                  <Summary label="Best streak" value={String(st.bestStreak)} />
                </View>
                <Text style={s.small}>{AVERAGE_LABEL[g.kind]}: {st.average == null ? "–" : formatScore(g, st.average)}</Text>
                {st.distribution.map((d) => (
                  <View key={d.label} style={s.row}>
                    <Text style={[s.small, { width: 92 }]}>{d.label}</Text>
                    <View style={{ flex: 1 }}>
                      <ProgressBar value={d.count} max={maxCount} colour={GAME_COLOUR[g.id]} height={12} />
                    </View>
                    <Text style={[s.small, { width: 24, textAlign: "right" }]}>{d.count}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </Card>
        );
      })}
    </View>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  const { s } = useUi();
  return (
    <View style={{ alignItems: "center", flex: 1 }}>
      <Text style={[s.h2, { fontSize: 22 }]}>{value}</Text>
      <Text style={[s.small, { textAlign: "center" }]}>{label}</Text>
    </View>
  );
}

function History({ store }: { store: Store }) {
  const { t, s } = useUi();
  const days = byDay(store.results);
  const today = localDayKey();
  if (days.length === 0) {
    return <Empty icon="calendar-outline" title="No results yet" body="Add your first results from the Today tab." />;
  }
  return (
    <View style={{ gap: 12 }}>
      {days.map((d) => (
        <Card key={d.day} style={{ gap: 8 }}>
          <View style={s.rowBetween}>
            <Text style={s.h3}>{friendlyDay(d.day, today)}</Text>
            <Text style={[s.h3, { color: t.accent }]}>{pts(d.points)} pts</Text>
          </View>
          {d.results.map((r) => (
            <View key={r.id} style={s.row}>
              <GameBadge game={r.game} size={26} />
              <Text style={[s.text, { flex: 1 }]}>{gameName(r.game)}</Text>
              <Text style={[s.text, { color: r.won ? t.text : t.bad }]}>{describe(r)}</Text>
              <Pressable hitSlop={8} accessibilityLabel={`Delete ${gameName(r.game)} result`}
                onPress={() => confirmDelete(`Delete your ${gameName(r.game)} result?`, () => store.remove(r.id))}>
                <Ionicons name="trash-outline" size={18} color={t.muted} />
              </Pressable>
            </View>
          ))}
        </Card>
      ))}
    </View>
  );
}
