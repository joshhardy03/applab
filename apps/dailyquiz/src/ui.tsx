// Shared look and feel: cards, buttons, avatars, game badges, sheets.
import React, { ReactNode, useMemo } from "react";
import {
  ActivityIndicator, Modal, Pressable, StyleProp, StyleSheet, Text, TextInput, TextInputProps,
  View, ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Theme, useTheme } from "@applab/core";
import { GameId, GAME_BY_ID } from "./games";
import { initials } from "./board";

export type IconName = React.ComponentProps<typeof Ionicons>["name"];

// Each game gets a plain colour and a short tag (no game logos or artwork).
export const GAME_COLOUR: Record<GameId, string> = {
  wordle: "#2f9e44",
  connections: "#7048e8",
  chainle: "#e8590c",
  travle: "#1c7ed6",
  wonderhop: "#d6336c",
  crowdict: "#0ca678",
  fermi: "#5c7cfa",
  eraly: "#f08c00",
  wheronaut: "#1098ad",
  farflung: "#a9772f",
  krillion: "#e64980",
  maptap: "#37b24d",
};

const GAME_TAG: Record<GameId, string> = {
  wordle: "Wo", connections: "Co", chainle: "Ch", travle: "Tr", wonderhop: "Wh",
  crowdict: "Cr", fermi: "Fe", eraly: "Er", wheronaut: "Wn", farflung: "Ff",
  krillion: "Kr", maptap: "Mt",
};

export function tint(hex: string, alpha: number): string {
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255).toString(16).padStart(2, "0");
  return `${hex}${a}`;
}

export function useUi() {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  return { t, s };
}

export function Card({ children, style, onPress }: {
  children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void;
}) {
  const { s } = useUi();
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [s.card, pressed && s.pressed, style]}>
        {children}
      </Pressable>
    );
  }
  return <View style={[s.card, style]}>{children}</View>;
}

export function Button({ label, onPress, icon, variant = "primary", disabled, busy, small, style }: {
  label: string;
  onPress: () => void;
  icon?: IconName;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  disabled?: boolean;
  busy?: boolean;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { t, s } = useUi();
  const bg = variant === "primary" ? t.accent : variant === "danger" ? t.bad
    : variant === "secondary" ? tint(t.accent, 0.12) : "transparent";
  const fg = variant === "primary" || variant === "danger" ? "#fff"
    : variant === "ghost" ? t.muted : t.accent;
  return (
    <Pressable
      onPress={disabled || busy ? undefined : onPress}
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled || busy) }}
      style={({ pressed }) => [
        s.button, small && s.buttonSmall, { backgroundColor: bg },
        (disabled || busy) && { opacity: 0.5 }, pressed && s.pressed, style,
      ]}
    >
      {busy ? <ActivityIndicator size="small" color={fg} /> : icon ? <Ionicons name={icon} size={small ? 16 : 18} color={fg} /> : null}
      <Text style={[s.buttonText, small && { fontSize: 14 }, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

export function IconButton({ icon, onPress, label, colour }: {
  icon: IconName; onPress: () => void; label: string; colour?: string;
}) {
  const { t } = useUi();
  return (
    <Pressable onPress={onPress} accessibilityLabel={label} hitSlop={10}
      style={({ pressed }) => [{ padding: 6, borderRadius: 999 }, pressed && { opacity: 0.6 }]}>
      <Ionicons name={icon} size={22} color={colour ?? t.muted} />
    </Pressable>
  );
}

export function Avatar({ name, colour, size = 36 }: { name: string; colour: string; size?: number }) {
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2, backgroundColor: colour,
      alignItems: "center", justifyContent: "center",
    }}>
      <Text style={{ color: "#fff", fontWeight: "800", fontSize: size * 0.38 }}>{initials(name)}</Text>
    </View>
  );
}

export function GameBadge({ game, size = 40, faded }: { game: GameId; size?: number; faded?: boolean }) {
  const c = GAME_COLOUR[game];
  return (
    <View style={{
      width: size, height: size, borderRadius: size * 0.28,
      backgroundColor: faded ? tint(c, 0.15) : c, alignItems: "center", justifyContent: "center",
    }}>
      <Text style={{ color: faded ? c : "#fff", fontWeight: "800", fontSize: size * 0.36 }}>{GAME_TAG[game]}</Text>
    </View>
  );
}

export function Pill({ label, colour, icon }: { label: string; colour: string; icon?: IconName }) {
  return (
    <View style={{
      flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start",
      backgroundColor: tint(colour, 0.14), paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999,
    }}>
      {icon ? <Ionicons name={icon} size={13} color={colour} /> : null}
      <Text style={{ color: colour, fontWeight: "700", fontSize: 13 }}>{label}</Text>
    </View>
  );
}

export function Segmented<T extends string>({ options, value, onChange }: {
  options: { id: T; label: string }[]; value: T; onChange: (v: T) => void;
}) {
  const { t, s } = useUi();
  return (
    <View style={s.segmented}>
      {options.map((o) => {
        const on = o.id === value;
        return (
          <Pressable key={o.id} onPress={() => onChange(o.id)} accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            style={[s.segment, on && { backgroundColor: t.card, boxShadow: "0 1px 3px rgba(0,0,0,0.12)" }]}>
            <Text style={[s.segmentText, on && { color: t.text }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function ProgressBar({ value, max, colour, height = 10 }: {
  value: number; max: number; colour: string; height?: number;
}) {
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  return (
    <View style={{ height, borderRadius: height, backgroundColor: tint(colour, 0.18), overflow: "hidden" }}>
      <View style={{ width: `${pct * 100}%`, height, borderRadius: height, backgroundColor: colour }} />
    </View>
  );
}

export function Field(props: TextInputProps & { label?: string }) {
  const { t, s } = useUi();
  const { label, style, ...rest } = props;
  return (
    <View style={{ gap: 6 }}>
      {label ? <Text style={s.label}>{label}</Text> : null}
      <TextInput placeholderTextColor={t.muted} {...rest} style={[s.input, style]} />
    </View>
  );
}

export function Sheet({ visible, onClose, title, children }: {
  visible: boolean; onClose: () => void; title: string; children: ReactNode;
}) {
  const { s } = useUi();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose} accessibilityLabel="Close" />
      <View style={s.sheet}>
        <View style={s.sheetHandle} />
        <View style={[s.rowBetween, { marginBottom: 12 }]}>
          <Text style={s.h2}>{title}</Text>
          <IconButton icon="close" onPress={onClose} label="Close" />
        </View>
        {children}
      </View>
    </Modal>
  );
}

export function Empty({ icon, title, body, children }: {
  icon: IconName; title: string; body?: string; children?: ReactNode;
}) {
  const { t, s } = useUi();
  return (
    <Card style={{ alignItems: "center", paddingVertical: 28, gap: 8 }}>
      <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: tint(t.accent, 0.12), alignItems: "center", justifyContent: "center" }}>
        <Ionicons name={icon} size={28} color={t.accent} />
      </View>
      <Text style={[s.h2, { textAlign: "center" }]}>{title}</Text>
      {body ? <Text style={[s.muted, { textAlign: "center", maxWidth: 320 }]}>{body}</Text> : null}
      {children ? <View style={{ marginTop: 8, alignSelf: "stretch", gap: 8 }}>{children}</View> : null}
    </Card>
  );
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  const { s } = useUi();
  return (
    <View style={[s.rowBetween, { marginTop: 8, marginBottom: 8 }]}>
      <Text style={s.section}>{children}</Text>
      {right}
    </View>
  );
}

export function gameName(game: GameId): string {
  return GAME_BY_ID[game].name;
}

export function makeStyles(t: Theme) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: t.bg },
    body: { padding: 16, paddingBottom: 32, maxWidth: 640, width: "100%", alignSelf: "center", gap: 12 },
    card: {
      backgroundColor: t.card, borderRadius: 18, padding: 16,
      borderWidth: t.dark ? StyleSheet.hairlineWidth : 0, borderColor: t.line,
      boxShadow: t.dark ? "none" : "0 1px 2px rgba(16,24,40,0.06), 0 1px 3px rgba(16,24,40,0.08)",
    },
    pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
    row: { flexDirection: "row", alignItems: "center", gap: 10 },
    rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
    h1: { color: t.text, fontSize: 26, fontWeight: "800", letterSpacing: -0.5 },
    h2: { color: t.text, fontSize: 18, fontWeight: "700", letterSpacing: -0.2 },
    h3: { color: t.text, fontSize: 16, fontWeight: "700" },
    text: { color: t.text, fontSize: 15, lineHeight: 22 },
    muted: { color: t.muted, fontSize: 14, lineHeight: 20 },
    small: { color: t.muted, fontSize: 12 },
    label: { color: t.muted, fontSize: 13, fontWeight: "600" },
    section: { color: t.muted, fontSize: 13, fontWeight: "700", letterSpacing: 0.6, textTransform: "uppercase" },
    big: { color: t.text, fontSize: 40, fontWeight: "800", letterSpacing: -1 },
    button: {
      flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
      paddingHorizontal: 18, paddingVertical: 13, borderRadius: 14,
    },
    buttonSmall: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
    buttonText: { fontWeight: "700", fontSize: 15 },
    input: {
      borderWidth: 1, borderColor: t.line, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11,
      color: t.text, backgroundColor: t.bg, fontSize: 16,
    },
    segmented: { flexDirection: "row", backgroundColor: tint(t.muted, 0.14), borderRadius: 12, padding: 3 },
    segment: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: "center" },
    segmentText: { color: t.muted, fontWeight: "700", fontSize: 14 },
    backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
    sheet: {
      backgroundColor: t.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20,
      paddingBottom: 32, maxWidth: 640, width: "100%", alignSelf: "center",
    },
    sheetHandle: { width: 40, height: 5, borderRadius: 3, backgroundColor: t.line, alignSelf: "center", marginBottom: 12 },
    divider: { height: StyleSheet.hairlineWidth, backgroundColor: t.line, marginVertical: 10 },
  });
}

export type Styles = ReturnType<typeof makeStyles>;
