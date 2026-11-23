// Results live on the device first (works offline and without an account). When signed
// in, every change is also sent to Supabase so groups and leaderboards can see it.
import { useCallback, useEffect, useRef, useState } from "react";
import { loadJSON, removeKey, saveJSON } from "@applab/core";
import { Result } from "./games";
import { upsert } from "./stats";
import * as remote from "./remote";

const KEY = "dailyquiz.results.v1";

export type SyncState = "off" | "syncing" | "synced" | "error";

export function useResults(signedIn: boolean) {
  const [results, setResults] = useState<Result[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [sync, setSync] = useState<SyncState>("off");
  const latest = useRef<Result[]>([]);

  useEffect(() => {
    loadJSON<Result[]>(KEY, []).then((rs) => {
      const list = Array.isArray(rs) ? rs : [];
      latest.current = list;
      setResults(list);
      setLoaded(true);
    });
  }, []);

  const send = useCallback(async (job: () => Promise<void>) => {
    if (!signedIn) return;
    setSync("syncing");
    try {
      await job();
      setSync("synced");
    } catch {
      setSync("error");
    }
  }, [signedIn]);

  // On sign-in (or app start while signed in), upload everything on this device once.
  useEffect(() => {
    if (!loaded) return;
    if (!signedIn) {
      setSync("off");
      return;
    }
    send(() => remote.pushResults(latest.current));
  }, [signedIn, loaded, send]);

  const persist = useCallback((next: Result[]) => {
    latest.current = next;
    setResults(next);
    saveJSON(KEY, next).catch(() => undefined);
  }, []);

  const add = useCallback((incoming: Result[]) => {
    persist(upsert(latest.current, incoming));
    send(() => remote.pushResults(incoming));
  }, [persist, send]);

  const remove = useCallback((id: string) => {
    const gone = latest.current.find((r) => r.id === id);
    persist(latest.current.filter((r) => r.id !== id));
    if (gone) send(() => remote.deleteRemoteResult(gone.game, gone.number));
  }, [persist, send]);

  const clearAll = useCallback(async () => {
    latest.current = [];
    setResults([]);
    await removeKey(KEY);
  }, []);

  const retry = useCallback(() => send(() => remote.pushResults(latest.current)), [send]);

  return { results, loaded, add, remove, clearAll, sync, retry };
}

export type Store = ReturnType<typeof useResults>;
