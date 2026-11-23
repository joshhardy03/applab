import { useColorScheme } from "react-native";

export type Theme = {
  dark: boolean;
  bg: string;
  card: string;
  text: string;
  muted: string;
  line: string;
  accent: string;
  good: string;
  bad: string;
};

const light: Theme = {
  dark: false, bg: "#f5f6f8", card: "#ffffff", text: "#1a1d21", muted: "#5d6773",
  line: "#dfe3e8", accent: "#3b5bdb", good: "#2b8a3e", bad: "#c92a2a",
};

const dark: Theme = {
  dark: true, bg: "#101215", card: "#1a1d22", text: "#e8eaed", muted: "#98a2ae",
  line: "#2b3038", accent: "#748ffc", good: "#69db7c", bad: "#ff8787",
};

export function useTheme(): Theme {
  return useColorScheme() === "dark" ? dark : light;
}
