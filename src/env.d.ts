/// <reference types="vite/client" />

/** Injected by vite.config.ts; changes on every build. */
declare const __BUILD_ID__: string;

interface ImportMetaEnv {
  /** Neon sign-in URL. Sign-in hides itself when this is missing. */
  readonly VITE_NEON_AUTH_URL?: string;
}
