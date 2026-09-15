/**
 * Capacitor implementation of the platform seam. Imported only by the native
 * entry (src/native/main.tsx); the web bundle never sees this file.
 */
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import { Preferences } from "@capacitor/preferences";
import { SplashScreen } from "@capacitor/splash-screen";
import { StatusBar, Style } from "@capacitor/status-bar";
import { setHapticBackend, type HapticName } from "@/game/haptics";
import { restoreSave, setStorageMirror, STORAGE_KEY } from "@/game/storage";
import { installPlatform, type BackAction } from "./index";

const HAPTICS: Record<HapticName, () => Promise<void>> = {
  hit: () => Haptics.notification({ type: NotificationType.Error }),
  collect: () => Haptics.impact({ style: ImpactStyle.Light }),
  chapter: () => Haptics.notification({ type: NotificationType.Success }),
  win: async () => {
    await Haptics.notification({ type: NotificationType.Success });
    setTimeout(() => void Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {}), 160);
  },
};

const quiet = (p: Promise<unknown>) => p.catch(() => {});

/**
 * Wire the native shell. Resolves once the save has been restored from
 * Preferences, so call it before the first render.
 */
export async function installCapacitor(): Promise<void> {
  const native = Capacitor.isNativePlatform();
  const backHandlers: (() => BackAction)[] = [];

  if (native) {
    const { value } = await Preferences.get({ key: STORAGE_KEY });
    restoreSave(value);
    setStorageMirror((json) => quiet(Preferences.set({ key: STORAGE_KEY, value: json })));
    setHapticBackend((name) => quiet(HAPTICS[name]()));
    // Android: draw under the status bar like iOS does; the page pads with safe-area insets.
    quiet(StatusBar.setOverlaysWebView({ overlay: true }));
    quiet(StatusBar.setStyle({ style: Style.Light }));
    quiet(
      App.addListener("backButton", () => {
        const top = backHandlers[backHandlers.length - 1];
        if ((top ? top() : "exit") === "exit") quiet(App.exitApp());
      }),
    );
  }

  installPlatform({
    isNative: native,
    onBackButton: (cb) => {
      backHandlers.push(cb);
      return () => {
        const i = backHandlers.indexOf(cb);
        if (i >= 0) backHandlers.splice(i, 1);
      };
    },
    exitApp: () => quiet(App.exitApp()),
    ready: () => quiet(SplashScreen.hide()),
  });
}
