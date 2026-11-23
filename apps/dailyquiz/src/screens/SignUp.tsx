import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Account } from "../account";
import { cleanName, PROFILE_COLOURS } from "../board";
import { friendlyError } from "../supabase";
import { Avatar, Button, Card, Field, useUi } from "../ui";

export function ColourPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  const { t } = useUi();
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
      {PROFILE_COLOURS.map((c) => (
        <Pressable key={c} onPress={() => onChange(c)} accessibilityLabel={`Colour ${c}`}
          style={{
            width: 34, height: 34, borderRadius: 17, backgroundColor: c, alignItems: "center",
            justifyContent: "center", borderWidth: value === c ? 3 : 0, borderColor: t.text,
          }}>
          {value === c ? <Ionicons name="checkmark" size={18} color="#fff" /> : null}
        </Pressable>
      ))}
    </View>
  );
}

/** The whole sign-up: a name and a colour. No email, no password. */
export function SignUpCard({ account, title, body }: { account: Account; title?: string; body?: string }) {
  const { s } = useUi();
  const [name, setName] = useState("");
  const [colour, setColour] = useState(PROFILE_COLOURS[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clean = cleanName(name);

  const submit = async () => {
    if (!clean) return;
    setBusy(true);
    setError(null);
    try {
      await account.signUp(clean, colour);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card style={{ gap: 14 }}>
      <View style={s.row}>
        <Avatar name={clean ?? "?"} colour={colour} size={48} />
        <View style={{ flex: 1 }}>
          <Text style={s.h2}>{title ?? "Join in"}</Text>
          <Text style={s.muted}>{body ?? "Pick a name and you're in. No email, no password."}</Text>
        </View>
      </View>
      <Field label="Your name" value={name} onChangeText={setName} placeholder="e.g. Josh"
        maxLength={24} autoCapitalize="words" returnKeyType="done" onSubmitEditing={submit} />
      <View style={{ gap: 6 }}>
        <Text style={s.label}>Your colour</Text>
        <ColourPicker value={colour} onChange={setColour} />
      </View>
      {error ? <Text style={{ color: "#c92a2a" }}>{error}</Text> : null}
      <Button label="Let's go" icon="arrow-forward" onPress={submit} disabled={!clean} busy={busy} />
      <Text style={s.small}>Your name is shown to your groups and on the leaderboard.</Text>
    </Card>
  );
}

export function AccountsOff() {
  const { s } = useUi();
  return (
    <Card style={{ gap: 6 }}>
      <Text style={s.h3}>Accounts aren't switched on yet</Text>
      <Text style={s.muted}>
        Groups and leaderboards need the online service, which this preview isn't connected to yet.
        Your results are still saved on this device.
      </Text>
    </Card>
  );
}
