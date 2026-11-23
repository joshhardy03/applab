import React, { useState } from "react";
import { Text, View } from "react-native";
import { localDayKey } from "@applab/core";
import { Account } from "../account";
import { Period, periodRange } from "../board";
import { GAMES } from "../games";
import { useAsync } from "../hooks";
import * as remote from "../remote";
import { pts } from "../time";
import { Avatar, Card, Empty, IconButton, Segmented, tint, useUi } from "../ui";
import { AccountsOff, SignUpCard } from "./SignUp";

export function LeaderboardScreen({ account }: { account: Account }) {
  const { t, s } = useUi();
  const [period, setPeriod] = useState<Period>("today");
  const signedIn = account.state.status === "signedIn";
  const range = periodRange(period, localDayKey());
  const board = useAsync(signedIn ? () => remote.globalLeaderboard(range.from, range.to, 100) : null,
    [signedIn, range.from, range.to]);

  if (account.state.status === "disabled") return <AccountsOff />;
  if (account.state.status === "loading") return null;

  return (
    <View style={{ gap: 12 }}>
      <View style={[s.rowBetween, { paddingHorizontal: 4 }]}>
        <Text style={s.h1}>Leaderboard</Text>
        {signedIn ? <IconButton icon="refresh" onPress={board.reload} label="Refresh" /> : null}
      </View>
      {!signedIn ? (
        <SignUpCard account={account} title="See how you rank" body="Pick a name to join the leaderboard. No email needed." />
      ) : (
        <>
          <Segmented options={[{ id: "today", label: "Today" }, { id: "week", label: "This week" }]} value={period} onChange={setPeriod} />
          {board.error ? <Card><Text style={{ color: t.bad }}>{board.error}</Text></Card> : null}
          {board.data && board.data.length === 0 ? (
            <Empty icon="trophy-outline" title="No scores yet" body="Add today's results to get on the board." />
          ) : null}
          {board.data && board.data.length > 0 ? (
            <Card style={{ paddingVertical: 6 }}>
              {board.data.map((row, i) => (
                <View key={row.user_id}>
                  {i > 0 ? <View style={s.divider} /> : null}
                  <View style={[s.row, { paddingVertical: 4, borderRadius: 12 },
                    row.is_me && { backgroundColor: tint(t.accent, 0.1), marginHorizontal: -8, paddingHorizontal: 8 }]}>
                    <Text style={[s.h3, { width: 30, textAlign: "center", color: i < 3 ? t.accent : t.muted }]}>
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                    </Text>
                    <Avatar name={row.display_name} colour={row.colour} size={34} />
                    <View style={{ flex: 1 }}>
                      <Text style={[s.h3, row.is_me && { color: t.accent }]} numberOfLines={1}>
                        {row.display_name}{row.is_me ? " (you)" : ""}
                      </Text>
                      <Text style={s.small}>
                        {period === "today" ? `${row.games} of ${GAMES.length} played` : `${row.games} games`}
                      </Text>
                    </View>
                    <Text style={s.h2}>{pts(row.total)}</Text>
                  </View>
                </View>
              ))}
            </Card>
          ) : null}
          <Text style={[s.small, { textAlign: "center" }]}>
            Scores are what players paste in from each game's Share button.
          </Text>
        </>
      )}
    </View>
  );
}
