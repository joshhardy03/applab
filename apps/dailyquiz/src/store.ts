// Results kept on the device. v2 syncs to Supabase for friends and leaderboards.
import { useCallback, useEffect, useState } from "react";
import { loadJSON, removeKey, saveJSON } from "@applab/core";
import { Result } from "./games";
import { upsert } from "./stats";

const KEY = "dailyquiz.results.v1";

export function useResults() {
  const [results, setResults] = useState<Result[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadJSON<Result[]>(KEY, []).then((rs) => {
      setResults(Array.isArray(rs) ? rs : []);
      setLoaded(true);
    });
  }, []);

  const persist = useCallback((next: Result[]) => {
    setResults(next);
    saveJSON(KEY, next).catch(() => undefined);
  }, []);

  const add = useCallback((incoming: Result[]) => persist(upsert(results, incoming)), [results, persist]);
  const remove = useCallback((id: string) => persist(results.filter((r) => r.id !== id)), [results, persist]);
  const clearAll = useCallback(async () => {
    setResults([]);
    await removeKey(KEY);
  }, []);

  return { results, loaded, add, remove, clearAll };
}
