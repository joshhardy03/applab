// Account state for the whole app: disabled (no Supabase in this build), loading,
// signed out, or signed in with a profile.
import { useCallback, useEffect, useState } from "react";
import { ACCOUNTS_ENABLED } from "./config";
import * as remote from "./remote";
import { supabase } from "./supabase";

export type AccountState =
  | { status: "disabled" }
  | { status: "loading" }
  | { status: "signedOut" }
  | { status: "signedIn"; profile: remote.Profile };

export function useAccount() {
  const [state, setState] = useState<AccountState>(
    ACCOUNTS_ENABLED ? { status: "loading" } : { status: "disabled" },
  );

  const refresh = useCallback(async () => {
    if (!ACCOUNTS_ENABLED) return;
    try {
      const profile = await remote.loadProfile();
      setState(profile ? { status: "signedIn", profile } : { status: "signedOut" });
    } catch {
      setState({ status: "signedOut" });
    }
  }, []);

  useEffect(() => {
    if (!ACCOUNTS_ENABLED) return;
    refresh();
    const { data } = supabase().auth.onAuthStateChange(() => {
      refresh();
    });
    return () => data.subscription.unsubscribe();
  }, [refresh]);

  const signUp = useCallback(async (name: string, colour: string) => {
    const profile = await remote.signUp(name, colour);
    setState({ status: "signedIn", profile });
    return profile;
  }, []);

  const update = useCallback(async (p: { display_name?: string; colour?: string }) => {
    const profile = await remote.updateProfile(p);
    setState({ status: "signedIn", profile });
  }, []);

  const deleteAccount = useCallback(async () => {
    await remote.deleteAccount();
    setState({ status: "signedOut" });
  }, []);

  return { state, signUp, update, deleteAccount, refresh };
}

export type Account = ReturnType<typeof useAccount>;
