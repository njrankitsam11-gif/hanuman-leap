/**
 * Sign-in and cloud save. Players must sign in before playing on the web, but only when sign-in
 * can actually work: in the native shell, with no auth URL configured, or when the auth service
 * can't be reached, the game plays from localStorage alone. The auth SDK is loaded on demand so
 * it stays out of the game's first download.
 */
import { useSyncExternalStore } from "react";
import { SITE_URL } from "@/game/share";
import {
  loadSave,
  mergeSaves,
  onSaveWrite,
  parseSave,
  replaceSave,
  type Save,
} from "@/game/storage";
import { platform } from "@/platform";

export type Account =
  /** Sign-in isn't available right now (see `checkAccount`); hide the panel and let them play. */
  { status: "off" } | { status: "loading" } | { status: "out" } | { status: "in"; email: string };

const PUSH_DELAY_MS = 5000;
/** A blocked or hanging auth service must not leave players staring at "One moment…". */
const AUTH_TIMEOUT_MS = 8000;

function withTimeout<T>(work: PromiseLike<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => reject(new Error("auth timed out")), AUTH_TIMEOUT_MS);
    work.then(
      (value) => {
        clearTimeout(id);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(id);
        reject(error instanceof Error ? error : new Error(String(error)));
      },
    );
  });
}

let account: Account = { status: "loading" };
const listeners = new Set<() => void>();

function setAccount(next: Account) {
  account = next;
  listeners.forEach((fn) => fn());
}

const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

const LOADING: Account = { status: "loading" };

/** Everyone plays once signed in; "off" must stay playable or an outage would lock players out. */
export const canPlay = (a: Account) => a.status === "in" || a.status === "off";

export const currentAccount = () => account;

export const useAccount = () =>
  useSyncExternalStore(
    subscribe,
    () => account,
    () => LOADING,
  );

const loadClient = () => {
  const url = import.meta.env.VITE_NEON_AUTH_URL;
  if (!url) throw new Error("VITE_NEON_AUTH_URL is not set");
  return import("@neondatabase/auth").then(({ createAuthClient }) => createAuthClient(url));
};

let client: ReturnType<typeof loadClient> | null = null;
const authClient = () => (client ??= loadClient());

const apiUrl = () => `${platform().isNative ? SITE_URL : ""}/api/save`;

async function api(method: "PUT" | "DELETE", body?: unknown): Promise<Response> {
  const auth = await authClient();
  // Not `auth.token()`: the SDK answers "/token" from its session cache, with no top-level token.
  const { data } = await auth.getSession();
  const token = data?.session?.token;
  if (!token) throw new Error("no session");
  const res = await fetch(apiUrl(), {
    method,
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (!res.ok) throw new Error(`save API ${res.status}`);
  return res;
}

let onMerged: ((save: Save) => void) | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let pushing = false;
/** Progress was written while a push was out, so another one must follow it. */
let pushAgain = false;

/** Send local progress up; the server merges and returns the combined save. */
async function push() {
  if (timer) clearTimeout(timer);
  timer = null;
  if (account.status !== "in") return;
  if (pushing) {
    pushAgain = true;
    return;
  }
  pushing = true;
  pushAgain = false;
  try {
    const res = await api("PUT", { save: loadSave() });
    const remote = parseSave(((await res.json()) as { save?: unknown }).save);
    // Merge into what's stored now, not what was sent: a chapter cleared meanwhile must survive.
    const local = loadSave();
    const merged = remote && mergeSaves(local, remote);
    if (merged && JSON.stringify(merged) !== JSON.stringify(local)) {
      const again = pushAgain;
      replaceSave(merged);
      pushAgain = again; // our own write isn't new progress
      onMerged?.(merged);
    }
  } catch {
    // offline or a server hiccup: localStorage still has it; the next write or `online` retries
  } finally {
    pushing = false;
    if (pushAgain) schedulePush();
  }
}

function schedulePush() {
  if (account.status !== "in" || timer) return;
  if (pushing) {
    pushAgain = true;
    return;
  }
  timer = setTimeout(() => void push(), PUSH_DELAY_MS);
}

async function adoptSession() {
  const auth = await withTimeout(authClient());
  const { data, error } = await withTimeout(auth.getSession());
  if (error) throw new Error(error.message);
  const email = data?.user?.email;
  setAccount(email ? { status: "in", email } : { status: "out" });
  if (email) await push();
}

/** Called before the game opens, to decide whether it needs the sign-in screen. */
export async function checkAccount() {
  // Neon can't trust the iOS shell's capacitor:// origin yet, so sign-in is web-only for now.
  if (!import.meta.env.VITE_NEON_AUTH_URL || platform().isNative) {
    setAccount({ status: "off" });
    return;
  }
  await adoptSession().catch(() => setAccount({ status: "off" }));
}

/** Called once by the game shell. `merged` applies progress that arrived from another device. */
export function startCloudSync(merged: (save: Save) => void): () => void {
  onMerged = merged;
  void push();
  const stopWrites = onSaveWrite(schedulePush);
  const online = () => void push();
  window.addEventListener("online", online);
  return () => {
    stopWrites();
    window.removeEventListener("online", online);
    if (timer) clearTimeout(timer);
    timer = null;
    onMerged = null;
  };
}

export async function sendCode(email: string) {
  const auth = await withTimeout(authClient());
  const { error } = await withTimeout(
    auth.emailOtp.sendVerificationOtp({ email, type: "sign-in" }),
  );
  if (error) throw new Error(error.message);
}

export async function verifyCode(email: string, otp: string) {
  const auth = await withTimeout(authClient());
  const { error } = await withTimeout(auth.signIn.emailOtp({ email, otp }));
  if (error) throw new Error(error.message);
  await adoptSession();
  // The code was right, but a browser that blocks Neon's cross-site cookie shows no session.
  // Never hold someone at the gate for that: they play on this device without cloud save.
  if (account.status === "out") setAccount({ status: "off" });
}

/** Progress stays on this device, and in the account for next time. */
export async function signOut() {
  await push();
  const auth = await authClient();
  await auth.signOut();
  setAccount({ status: "out" });
}

/** "Reset progress" must reach the cloud too, or the next merge would bring it all back. */
export async function eraseCloudSave() {
  if (account.status !== "in") return;
  if (timer) clearTimeout(timer);
  timer = null;
  await api("DELETE").catch(() => {});
  await push();
}

export async function deleteAccount(keepEmail: boolean) {
  if (timer) clearTimeout(timer);
  timer = null;
  await api("DELETE", keepEmail ? { keepEmail: true } : undefined);
  const auth = await authClient();
  const { error } = await auth.deleteUser();
  if (error) throw new Error(error.message);
  setAccount({ status: "out" });
}
