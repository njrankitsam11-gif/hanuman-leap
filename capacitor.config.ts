import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Native shell around the game. `webDir` is produced by `bun run build:native`.
 * Bundle id is a placeholder until the store accounts exist — rename before the
 * first upload (also in ios/App and android/app once generated).
 */
const config: CapacitorConfig = {
  appId: "app.hanumanleap",
  appName: "Hanuman's Leap",
  webDir: "dist-native",
  backgroundColor: "#0d4a57",
  ios: {
    // the page pads with env(safe-area-inset-*) itself
    contentInset: "never",
    preferredContentMode: "mobile",
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      // hidden by the game once its first frame is drawn (platform().ready())
      launchAutoHide: false,
      backgroundColor: "#0d4a57",
      showSpinner: false,
    },
    StatusBar: {
      overlaysWebView: true,
      style: "LIGHT",
    },
  },
};

export default config;
