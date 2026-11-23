import { DependencyList, useCallback, useEffect, useRef, useState } from "react";
import { friendlyError } from "./supabase";

/** Run an async loader; re-runs when deps change. `reload` refetches on demand. */
export function useAsync<T>(fn: (() => Promise<T>) | null, deps: DependencyList) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(fn));
  const run = useRef(0);

  const load = useCallback(async () => {
    if (!fn) {
      setLoading(false);
      return;
    }
    const id = ++run.current;
    setLoading(true);
    setError(null);
    try {
      const value = await fn();
      if (id === run.current) setData(value);
    } catch (e) {
      if (id === run.current) setError(friendlyError(e));
    } finally {
      if (id === run.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    load();
  }, [load]);

  return { data, error, loading, reload: load };
}
