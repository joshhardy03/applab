import React, { useState } from "react";
import { Alert, Platform, Pressable, Switch, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PrivacyPolicy } from "@applab/core";
import { Account } from "../account";
import { cleanName } from "../board";
import { REMINDER_TIMES, REMINDERS_SUPPORTED, formatTime, useReminder } from "../reminders";
import { Profile as Profile_ } from "../remote";
import { Store } from "../store";
import { friendlyError } from "../supabase";
import { Avatar, Button, Card, Field, SectionTitle, tint, useUi } from "../ui";
import { ColourPicker, SignUpCard } from "./SignUp";

function confirm(title: string, message: string, yes: string, onYes: () => void) {
  if (Platform.OS === "web") {
    if (window.confirm(`${title}\n\n${message}`)) onYes();
    return;
  }
  Alert.alert(title, message, [{ text: "Cancel", style: "cancel" }, { text: yes, style: "destructive", onPress: onYes }]);
}

export function MeScreen({ account, store }: { account: Account; store: Store }) {
  const { s } = useUi();
  return (
    <View style={{ gap: 12 }}>
      <View style={{ paddingHorizontal: 4 }}>
        <Text style={s.h1}>Me</Text>
      </View>
      {account.state.status === "signedIn" ? <Profile profile={account.state.profile} account={account} store={store} /> : null}
      {account.state.status === "signedOut" ? <SignUpCard account={account} /> : null}
      <Reminders />
      <SectionTitle>Privacy</SectionTitle>
      <Card>
        <PrivacyPolicy
          appName="Daily Quiz Tracker"
          updated="23 November 2026"
          dataPoints={[
            "Your results are stored on this device. If you join in with a name, they're also stored on our server so your groups and the leaderboard can see them.",
            "Your account is just the name and colour you choose. We don't ask for your email, phone number or password.",
            "Your name and daily totals appear on the public leaderboard. Your groups see your name and each game's result.",
            "The app reads your clipboard only when you tap \"Paste from clipboard\".",
            "Game links open the puzzle makers' own websites or apps, which have their own privacy policies.",
          ]}
        />
      </Card>
      <DataControls account={account} store={store} />
      <Text style={[s.small, { textAlign: "center", marginTop: 4 }]}>
        Daily Quiz Tracker v0.2.0. Not affiliated with, or endorsed by, the makers of any puzzle listed.
        Game names belong to their owners.
      </Text>
    </View>
  );
}

function Profile({ profile: p, account, store }: { profile: Profile_; account: Account; store: Store }) {
  const { t, s } = useUi();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(p.display_name);
  const [colour, setColour] = useState(p.colour);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clean = cleanName(name);

  const syncLabel = store.sync === "syncing" ? "Syncing…" : store.sync === "error" ? "Not synced" : "Synced";
  const syncColour = store.sync === "error" ? t.bad : t.good;

  return (
    <Card style={{ gap: 14 }}>
      <View style={s.row}>
        <Avatar name={editing ? clean ?? "?" : p.display_name} colour={editing ? colour : p.colour} size={56} />
        <View style={{ flex: 1 }}>
          <Text style={s.h2}>{p.display_name}</Text>
          <Pressable onPress={store.sync === "error" ? store.retry : undefined} style={[s.row, { gap: 4 }]}>
            <Ionicons name={store.sync === "error" ? "cloud-offline-outline" : "cloud-done-outline"} size={14} color={syncColour} />
            <Text style={[s.small, { color: syncColour }]}>{syncLabel}{store.sync === "error" ? " · tap to retry" : ""}</Text>
          </Pressable>
        </View>
        {!editing ? <Button label="Edit" small variant="secondary" icon="create-outline" onPress={() => setEditing(true)} /> : null}
      </View>
      {editing ? (
        <View style={{ gap: 12 }}>
          <Field label="Name" value={name} onChangeText={setName} maxLength={24} />
          <ColourPicker value={colour} onChange={setColour} />
          {error ? <Text style={{ color: t.bad }}>{error}</Text> : null}
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Button label="Save" icon="checkmark" disabled={!clean} busy={busy} style={{ flex: 1 }} onPress={async () => {
              if (!clean) return;
              setBusy(true);
              setError(null);
              try {
                await account.update({ display_name: clean, colour });
                setEditing(false);
              } catch (e) {
                setError(friendlyError(e));
              } finally {
                setBusy(false);
              }
            }} />
            <Button label="Cancel" variant="ghost" style={{ flex: 1 }} onPress={() => {
              setName(p.display_name);
              setColour(p.colour);
              setEditing(false);
            }} />
          </View>
        </View>
      ) : null}
      <Text style={s.small}>
        Your account lives on this device. If you clear the app's data or change phone, you'll start a new one.
      </Text>
    </Card>
  );
}

function Reminders() {
  const { t, s } = useUi();
  const { settings, change, message } = useReminder();
  return (
    <>
      <SectionTitle>Reminders</SectionTitle>
      <Card style={{ gap: 12 }}>
        <View style={s.row}>
          <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: tint(t.accent, 0.12), alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="alarm-outline" size={22} color={t.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.h3}>Daily reminder</Text>
            <Text style={s.small}>
              {REMINDERS_SUPPORTED
                ? settings.enabled ? `Every day at ${formatTime(settings.hour, settings.minute)}` : "Off"
                : "Available in the phone app. Browsers can't send reminders when the page is closed."}
            </Text>
          </View>
          <Switch
            value={settings.enabled}
            disabled={!REMINDERS_SUPPORTED}
            onValueChange={(on) => change({ ...settings, enabled: on })}
            trackColor={{ true: t.accent, false: t.line }}
          />
        </View>
        {REMINDERS_SUPPORTED && settings.enabled ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {REMINDER_TIMES.map((tm) => {
              const on = tm.hour === settings.hour && tm.minute === settings.minute;
              return (
                <Pressable key={`${tm.hour}:${tm.minute}`} onPress={() => change({ ...settings, ...tm })}
                  style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: on ? t.accent : tint(t.accent, 0.1) }}>
                  <Text style={{ color: on ? "#fff" : t.accent, fontWeight: "700" }}>{formatTime(tm.hour, tm.minute)}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}
        {message ? <Text style={[s.small, { color: t.bad }]}>{message}</Text> : null}
      </Card>
    </>
  );
}

function DataControls({ account, store }: { account: Account; store: Store }) {
  const { t, s } = useUi();
  const [note, setNote] = useState<string | null>(null);
  const signedIn = account.state.status === "signedIn";
  return (
    <>
      <SectionTitle>Your data</SectionTitle>
      <Card style={{ gap: 10 }}>
        <Text style={s.muted}>{store.results.length} result{store.results.length === 1 ? "" : "s"} saved on this device.</Text>
        <Button label="Delete results on this device" variant="secondary" icon="trash-outline" onPress={() =>
          confirm("Delete results?", "This removes every result saved on this device. It can't be undone.", "Delete", async () => {
            await store.clearAll();
            setNote("Results on this device deleted.");
          })} />
        {signedIn ? (
          <Button label="Delete my account" variant="danger" icon="person-remove-outline" onPress={() =>
            confirm("Delete your account?", "This removes your name, your results on the server and your group memberships. It can't be undone.", "Delete account", async () => {
              try {
                await account.deleteAccount();
                setNote("Your account has been deleted.");
              } catch (e) {
                setNote(friendlyError(e));
              }
            })} />
        ) : null}
        {note ? <Text style={[s.small, { color: t.good }]}>{note}</Text> : null}
      </Card>
    </>
  );
}
