/**
 * Sign-in and cloud save. Entirely optional: signed out, offline, or with no auth URL
 * configured, the game behaves exactly as it does from localStorage alone. The auth SDK is
 * loaded on demand so it stays out of the game's first download.
 */
import { useSyncExternalStore } from "react";
import { SITE_URL } from "@/game/share";
import { loadSave, onSaveWrite, parseSave, replaceSave, type Save } from "@/game/storage";
import { platform } from "@/platform";

export type Account =
  /** Sign-in isn't configured in this build; hide the panel. */
  { status: "off" } | { status: "loading" } | { status: "out" } | { status: "in"; email: string };

const PUSH_DELAY_MS = 5000;

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
  const { data } = await auth.token();
  if (!data?.token) throw new Error("no session");
  const res = await fetch(apiUrl(), {
    method,
    headers: { authorization: `Bearer ${data.token}`, "content-type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (!res.ok) throw new Error(`save API ${res.status}`);
  return res;
}

let onMerged: ((save: Save) => void) | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let pushing = false;

/** Send local progress up; the server merges and returns the combined save. */
async function push() {
  if (timer) clearTimeout(timer);
  timer = null;
  if (account.status !== "in" || pushing) return;
  pushing = true;
  try {
    const res = await api("PUT", { save: loadSave() });
    const merged = parseSave(((await res.json()) as { save?: unknown }).save);
    if (merged && JSON.stringify(merged) !== JSON.stringify(loadSave())) {
      // `pushing` is still set, so this write doesn't queue another push
      replaceSave(merged);
      onMerged?.(merged);
    }
  } catch {
    // offline or a server hiccup: localStorage still has it; the next write or `online` retries
  } finally {
    pushing = false;
  }
}

function schedulePush() {
  if (account.status !== "in" || pushing || timer) return;
  timer = setTimeout(() => void push(), PUSH_DELAY_MS);
}

async function adoptSession() {
  const auth = await authClient();
  const { data } = await auth.getSession();
  const email = data?.user?.email;
  setAccount(email ? { status: "in", email } : { status: "out" });
  if (email) await push();
}

/** Called once by the game shell. `merged` applies progress that arrived from another device. */
export function startCloudSync(merged: (save: Save) => void): () => void {
  onMerged = merged;
  // Neon can't trust the iOS shell's capacitor:// origin yet, so sign-in is web-only for now.
  if (!import.meta.env.VITE_NEON_AUTH_URL || platform().isNative) {
    setAccount({ status: "off" });
    return () => {};
  }
  adoptSession().catch(() => setAccount({ status: "out" }));
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
  const auth = await authClient();
  const { error } = await auth.emailOtp.sendVerificationOtp({ email, type: "sign-in" });
  if (error) throw new Error(error.message);
}

export async function verifyCode(email: string, otp: string) {
  const auth = await authClient();
  const { error } = await auth.signIn.emailOtp({ email, otp });
  if (error) throw new Error(error.message);
  await adoptSession();
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

export async function deleteAccount() {
  if (timer) clearTimeout(timer);
  timer = null;
  await api("DELETE");
  const auth = await authClient();
  const { error } = await auth.deleteUser();
  if (error) throw new Error(error.message);
  setAccount({ status: "out" });
}
