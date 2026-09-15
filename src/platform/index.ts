/**
 * The seam between the game and whatever is hosting it. The web build uses the
 * defaults below; the native (Capacitor) entry calls `installPlatform` with real
 * implementations before rendering. Game code imports only from this module, so
 * the web bundle never contains Capacitor.
 */

/** What the host's hardware back button (Android) should do; the game decides. */
export type BackAction = "handled" | "exit";

export type Platform = {
  isNative: boolean;
  /** Subscribe to the hardware back button. Returns an unsubscribe. */
  onBackButton: (cb: () => BackAction) => () => void;
  exitApp: () => void;
  /** Called once the first frame is on screen (hides a native splash screen). */
  ready: () => void;
  /** Native share sheet; undefined means "use the Web Share API / clipboard". */
  share?: (data: { title: string; text: string; url: string }) => Promise<boolean>;
};

const web: Platform = {
  isNative: false,
  onBackButton: () => () => {},
  exitApp: () => {},
  ready: () => {},
};

let current: Platform = web;

export const platform = (): Platform => current;

export function installPlatform(p: Partial<Platform>) {
  current = { ...web, ...p, isNative: p.isNative ?? true };
}
