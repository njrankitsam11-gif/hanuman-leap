// Plain Vite SPA build for the Capacitor shell. Deliberately does not reuse
// vite.config.ts: no TanStack Start, nitro, or Lovable plugins belong in the app.
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  root: "native",
  envDir: "..",
  base: "./",
  publicDir: false,
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  define: { __BUILD_ID__: JSON.stringify("native") },
  build: { outDir: "../dist-native", emptyOutDir: true, target: "es2020" },
});
