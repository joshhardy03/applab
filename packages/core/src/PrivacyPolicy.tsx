import React from "react";
import { Text, View } from "react-native";
import { useTheme } from "./theme";

type Props = {
  appName: string;
  /** Plain-language list of what the app stores or sends, for this app specifically. */
  dataPoints: string[];
  updated: string;
};

export function PrivacyPolicy({ appName, dataPoints, updated }: Props) {
  const t = useTheme();
  const p = { color: t.text, fontSize: 15, lineHeight: 22, marginBottom: 10 } as const;
  return (
    <View>
      <Text style={[p, { fontWeight: "700", fontSize: 18 }]}>Privacy policy</Text>
      <Text style={[p, { color: t.muted }]}>Last updated {updated}</Text>
      <Text style={p}>{appName} is built to collect as little as possible.</Text>
      {dataPoints.map((d) => (
        <Text key={d} style={p}>• {d}</Text>
      ))}
      <Text style={p}>We don't sell your data. Delete it any time from Settings.</Text>
    </View>
  );
}
