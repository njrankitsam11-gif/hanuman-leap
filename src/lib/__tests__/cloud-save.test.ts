import { afterEach, describe, expect, it, vi } from "vitest";
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

describe("cloud sync through the real auth SDK", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("sends the session's JWT to /api/save after sign-in", async () => {
    const jwt = jwtFor({ sub: "u1", exp: Math.floor(Date.now() / 1000) + 900 });
    const saves: (string | null)[] = [];
    vi.stubEnv("VITE_NEON_AUTH_URL", "https://auth.example/neondb/auth");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input instanceof Request ? input.url : input);
        if (url.includes("/get-session")) {
          return Response.json(
            {
              session: { id: "s", token: "opaque", userId: "u1", expiresAt: "2099-01-01" },
              user: { id: "u1", email: "a@b.co" },
            },
            { headers: { "set-auth-jwt": jwt } },
          );
        }
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
});
