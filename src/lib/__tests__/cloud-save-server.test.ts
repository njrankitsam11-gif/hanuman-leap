import { describe, expect, it } from "vitest";
import { DEFAULT_SAVE, type Save } from "@/game/storage";
import { handleSaveRequest, type SaveStore } from "../cloud-save-server";

function memoryStore(): SaveStore & {
  rows: Map<string, Save>;
  emails: Map<string, string | null>;
  list: string[];
} {
  const rows = new Map<string, Save>();
  const emails = new Map<string, string | null>();
  const list: string[] = [];
  return {
    rows,
    emails,
    list,
    read: async (id) => rows.get(id) ?? null,
    write: async ({ id, email }, save) => {
      rows.set(id, save);
      emails.set(id, email);
    },
    remove: async (id) => void rows.delete(id),
    subscribe: async (email) => void list.push(email),
  };
}

const deps = (store: SaveStore) => ({
  store,
  verify: async (token: string) =>
    token.startsWith("user-") ? { id: token, email: `${token}@example.com` } : null,
});

const req = (method: string, token?: string, body?: unknown, origin?: string) =>
  new Request("https://hanuman-leap.vercel.app/api/save", {
    method,
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(origin ? { origin } : {}),
    },
    ...(body === undefined ? {} : { body: typeof body === "string" ? body : JSON.stringify(body) }),
  });

describe("/api/save", () => {
  it("refuses requests with no token or a bad one", async () => {
    const store = memoryStore();
    expect((await handleSaveRequest(req("GET"), deps(store))).status).toBe(401);
    expect((await handleSaveRequest(req("GET", "forged"), deps(store))).status).toBe(401);
    expect(
      (await handleSaveRequest(req("PUT", "forged", { save: DEFAULT_SAVE }), deps(store))).status,
    ).toBe(401);
  });

  it("stores the verified player's email with their save", async () => {
    const store = memoryStore();
    await handleSaveRequest(req("PUT", "user-a", { save: DEFAULT_SAVE }), deps(store));
    expect(store.emails.get("user-a")).toBe("user-a@example.com");
  });

  describe("deleting with the keep-my-email box", () => {
    const stored = async () => {
      const store = memoryStore();
      await handleSaveRequest(req("PUT", "user-a", { save: DEFAULT_SAVE }), deps(store));
      return store;
    };

    it("keeps nothing unless the box was ticked", async () => {
      const store = await stored();
      const res = await handleSaveRequest(req("DELETE", "user-a"), deps(store));
      expect(res.status).toBe(200);
      expect(store.rows.size).toBe(0);
      expect(store.list).toEqual([]);
    });

    it("keeps only the token's email when it was", async () => {
      const store = await stored();
      const body = { keepEmail: true, email: "someone-else@example.com" };
      await handleSaveRequest(req("DELETE", "user-a", body), deps(store));
      expect(store.rows.size).toBe(0);
      expect(store.list).toEqual(["user-a@example.com"]);
    });

    it("treats anything but true as no", async () => {
      const store = await stored();
      await handleSaveRequest(req("DELETE", "user-a", { keepEmail: "yes" }), deps(store));
      await handleSaveRequest(req("DELETE", "user-a", "not json"), deps(store));
      expect(store.list).toEqual([]);
    });

    it("still deletes when the list is unavailable", async () => {
      const store = await stored();
      store.subscribe = async () => {
        throw new Error("database down");
      };
      const res = await handleSaveRequest(
        req("DELETE", "user-a", { keepEmail: true }),
        deps(store),
      );
      expect(res.status).toBe(200);
      expect(store.rows.size).toBe(0);
    });
  });

  it("stores a first save and returns null before that", async () => {
    const store = memoryStore();
    const empty = await handleSaveRequest(req("GET", "user-a"), deps(store));
    expect(await empty.json()).toEqual({ save: null });
    const put = await handleSaveRequest(
      req("PUT", "user-a", { save: { ...DEFAULT_SAVE, best: 50 } }),
      deps(store),
    );
    expect(put.status).toBe(200);
    expect(store.rows.get("user-a")?.best).toBe(50);
  });

  it("merges with what's stored, so a stale device can't lose progress", async () => {
    const store = memoryStore();
    store.rows.set("user-a", { ...DEFAULT_SAVE, best: 90, unlockedChapter: 5 });
    const res = await handleSaveRequest(
      req("PUT", "user-a", { save: { ...DEFAULT_SAVE, best: 10, endlessBest: 7 } }),
      deps(store),
    );
    const { save } = (await res.json()) as { save: Save };
    expect(save.best).toBe(90);
    expect(save.unlockedChapter).toBe(5);
    expect(save.endlessBest).toBe(7);
  });

  it("keeps each player's save separate", async () => {
    const store = memoryStore();
    store.rows.set("user-a", { ...DEFAULT_SAVE, best: 90 });
    const res = await handleSaveRequest(req("GET", "user-b"), deps(store));
    expect(await res.json()).toEqual({ save: null });
    await handleSaveRequest(req("DELETE", "user-b"), deps(store));
    expect(store.rows.has("user-a")).toBe(true);
  });

  it("rejects malformed and oversized saves", async () => {
    const store = memoryStore();
    const put = (body: unknown) => handleSaveRequest(req("PUT", "user-a", body), deps(store));
    expect((await put("not json")).status).toBe(400);
    expect((await put("null")).status).toBe(400);
    expect((await put({ save: { v: 3 } })).status).toBe(400);
    expect((await put("x".repeat(70 * 1024))).status).toBe(413);
    expect(store.rows.size).toBe(0);
  });

  it("deletes a player's save", async () => {
    const store = memoryStore();
    store.rows.set("user-a", DEFAULT_SAVE);
    await handleSaveRequest(req("DELETE", "user-a"), deps(store));
    expect(store.rows.size).toBe(0);
  });

  it("allows the native app's origin and no other", async () => {
    const store = memoryStore();
    const native = await handleSaveRequest(
      req("OPTIONS", undefined, undefined, "capacitor://localhost"),
      deps(store),
    );
    expect(native.status).toBe(204);
    expect(native.headers.get("access-control-allow-origin")).toBe("capacitor://localhost");
    const other = await handleSaveRequest(
      req("OPTIONS", undefined, undefined, "https://evil.example"),
      deps(store),
    );
    expect(other.headers.get("access-control-allow-origin")).toBeNull();
  });
});
