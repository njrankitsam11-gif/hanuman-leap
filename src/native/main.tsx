/**
 * Entry for the Capacitor build: no router, no SSR, no service worker — just the
 * game mounted full-screen. Built by vite.native.config.ts into dist-native/.
 */
import "@/styles.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { installCapacitor } from "@/platform/capacitor";
import { NativeApp } from "./NativeApp";

const mount = () => {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <NativeApp />
    </StrictMode>,
  );
};

// Even if a plugin misbehaves the game must still appear.
installCapacitor().then(mount, mount);
