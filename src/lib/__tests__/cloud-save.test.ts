import { afterEach, describe, expect, it, vi } from "vitest";
import { STORAGE_KEY, DEFAULT_SAVE, loadSave, saveGame } from "@/game/storage";
import { canPlay, checkAccount } from "../cloud-save";

const jwtFor = (claims: object) =>
  ["{}", JSON.stringify(claims), "sig"].map((part) => btoa(part).replace(/=+$/, "")).join(".");

describe("canPlay", () => {
  it("requires sign-in on the web", () => {
    expect(canPlay({ status: "out" })).toBe(false);
    expect(canPlay({ status: "loading" })).toBe(false);
  });

  it("lets signed-in players through", () => {
    expect(canPlay({ status: "in", email: "a@b.co" })).toBe(true);
  });

  it("never locks players out when sign-in is unavailable", () => {
    expect(canPlay({ status: "off" })).toBe(true);
  });
});

const session = (jwt: string) =>
  Response.json(
    {
      session: { id: "s", token: "opaque", userId: "u1", expiresAt: "2099-01-01" },
      user: { id: "u1", email: "a@b.co" },
    },
    { headers: { "set-auth-jwt": jwt } },
  );

const validJwt = () => jwtFor({ sub: "u1", exp: Math.floor(Date.now() / 1000) + 900 });

const urlOf = (input: RequestInfo | URL) => String(input instanceof Request ? input.url : input);

/** A fresh copy of the module, for its own account state. */
const freshClient = async () => {
  vi.resetModules();
  return import("../cloud-save");
};

describe("cloud sync through the real auth SDK", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  // First: the SDK's session cache outlives `freshClient`, and later tests fill it.
  it("lets a player in when the code was right but the browser hides the session", async () => {
    vi.stubEnv("VITE_NEON_AUTH_URL", "https://auth.example/neondb/auth");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) =>
        urlOf(input).includes("/get-session") ? Response.json(null) : Response.json({}),
      ),
    );
    const { currentAccount, verifyCode } = await freshClient();

    await verifyCode("a@b.co", "123456");

    expect(currentAccount()).toEqual({ status: "off" });
  });

  it("sends the session's JWT to /api/save after sign-in", async () => {
    const jwt = validJwt();
    const saves: (string | null)[] = [];
    vi.stubEnv("VITE_NEON_AUTH_URL", "https://auth.example/neondb/auth");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = urlOf(input);
        if (url.includes("/get-session")) return session(jwt);
        if (url.endsWith("/api/save")) {
          saves.push(new Headers(init?.headers).get("authorization"));
          return Response.json({ save: null });
        }
        return Response.json({});
      }),
    );

    await checkAccount();

    expect(saves).toEqual([`Bearer ${jwt}`]);
  });

  it("never lowers progress written while a push was in flight", async () => {
    const store = new Map<string, string>();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => store.set(k, v),
      },
    });
    store.set(STORAGE_KEY, JSON.stringify({ ...DEFAULT_SAVE, unlockedChapter: 1 }));
    const jwt = validJwt();
    vi.stubEnv("VITE_NEON_AUTH_URL", "https://auth.example/neondb/auth");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = urlOf(input);
        if (url.includes("/get-session")) return session(jwt);
        if (url.endsWith("/api/save")) {
          saveGame({ unlockedChapter: 2 }); // the player clears a chapter mid-request
          return Response.json({ save: { ...DEFAULT_SAVE, unlockedChapter: 1, best: 90 } });
        }
        return Response.json({});
      }),
    );
    const { checkAccount: check } = await freshClient();

    await check();

    expect(loadSave()).toMatchObject({ unlockedChapter: 2, best: 90 });
  });
});
