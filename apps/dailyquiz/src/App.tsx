import React, { useEffect, useState } from "react";
import { Platform, Pressable, ScrollView, Text, View } from "react-native";
import * as Linking from "expo-linking";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAccount } from "./account";
import { parseJoinCode } from "./board";
import { useResults } from "./store";
import { Avatar, IconName, useUi } from "./ui";
import { GroupsScreen } from "./screens/Groups";
import { LeaderboardScreen } from "./screens/Leaderboard";
import { MeScreen } from "./screens/Me";
import { StatsScreen } from "./screens/Stats";
import { TodayScreen } from "./screens/Today";

type Tab = "today" | "groups" | "leaderboard" | "stats" | "me";
const TABS: { id: Tab; label: string; icon: IconName; iconOn: IconName }[] = [
  { id: "today", label: "Today", icon: "sunny-outline", iconOn: "sunny" },
  { id: "groups", label: "Groups", icon: "people-outline", iconOn: "people" },
  { id: "leaderboard", label: "Ranks", icon: "trophy-outline", iconOn: "trophy" },
  { id: "stats", label: "Stats", icon: "stats-chart-outline", iconOn: "stats-chart" },
  { id: "me", label: "Me", icon: "person-circle-outline", iconOn: "person-circle" },
];

export default function App() {
  return (
    <SafeAreaProvider>
      <Main />
    </SafeAreaProvider>
  );
}

/** An invite code from the link that opened the app, if any. */
function useInviteCode(): [string | null, () => void] {
  const [code, setCode] = useState<string | null>(null);
  useEffect(() => {
    Linking.getInitialURL().then((url) => {
      const c = parseJoinCode(url);
      if (c) setCode(c);
    }).catch(() => undefined);
    const sub = Linking.addEventListener("url", ({ url }) => {
      const c = parseJoinCode(url);
      if (c) setCode(c);
    });
    return () => sub.remove();
  }, []);
  const clear = () => {
    setCode(null);
    if (Platform.OS === "web" && typeof window !== "undefined" && window.history?.replaceState) {
      window.history.replaceState(null, "", window.location.pathname);
    }
  };
  return [code, clear];
}

function Main() {
  const { t, s } = useUi();
  const account = useAccount();
  const store = useResults(account.state.status === "signedIn");
  const [tab, setTab] = useState<Tab>("today");
  const [invite, clearInvite] = useInviteCode();

  useEffect(() => {
    if (invite) setTab("groups");
  }, [invite]);

  const profile = account.state.status === "signedIn" ? account.state.profile : null;

  return (
    <SafeAreaView style={s.root} edges={["top", "left", "right", "bottom"]}>
      <StatusBar style={t.dark ? "light" : "dark"} />
      <View style={[s.rowBetween, { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 6, maxWidth: 640, width: "100%", alignSelf: "center" }]}>
        <View style={[s.row, { gap: 8 }]}>
          <View style={{ width: 30, height: 30, borderRadius: 9, backgroundColor: t.accent, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="checkmark-done" size={18} color="#fff" />
          </View>
          <Text style={[s.h3, { fontSize: 17 }]}>Daily Quiz Tracker</Text>
        </View>
        <Pressable onPress={() => setTab("me")} accessibilityLabel="Your profile" hitSlop={8}>
          {profile ? (
            <Avatar name={profile.display_name} colour={profile.colour} size={32} />
          ) : (
            <Ionicons name="person-circle-outline" size={32} color={t.muted} />
          )}
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
        {!store.loaded ? null : tab === "today" ? (
          <TodayScreen store={store} account={account} onOpenGroups={() => setTab("groups")} />
        ) : tab === "groups" ? (
          <GroupsScreen account={account} store={store} pendingJoin={invite} onJoinHandled={clearInvite} />
        ) : tab === "leaderboard" ? (
          <LeaderboardScreen account={account} />
        ) : tab === "stats" ? (
          <StatsScreen store={store} />
        ) : (
          <MeScreen account={account} store={store} />
        )}
      </ScrollView>

      <View style={{
        flexDirection: "row", borderTopWidth: 1, borderTopColor: t.line, backgroundColor: t.card,
        paddingTop: 6, paddingBottom: 4,
      }}>
        {TABS.map((x) => {
          const on = tab === x.id;
          return (
            <Pressable key={x.id} onPress={() => setTab(x.id)} accessibilityRole="tab"
              accessibilityState={{ selected: on }} accessibilityLabel={x.label}
              style={{ flex: 1, alignItems: "center", gap: 2, paddingVertical: 4 }}>
              <Ionicons name={on ? x.iconOn : x.icon} size={24} color={on ? t.accent : t.muted} />
              <Text style={{ fontSize: 11, fontWeight: "700", color: on ? t.accent : t.muted }}>{x.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}
