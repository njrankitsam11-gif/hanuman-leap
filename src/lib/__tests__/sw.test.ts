import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { beforeEach, describe, expect, it } from "vitest";

/**
 * Runs public/sw.js inside a vm sandbox with a fake CacheStorage and fetch, then
 * drives its install / activate / fetch listeners the way a browser would.
 */
const SW_PATH = fileURLToPath(new URL("../../../public/sw.js", import.meta.url));

const HTML = `<!DOCTYPE html><html><head>
<link rel="stylesheet" href="/assets/styles-AAA.css"/>
<link rel="modulepreload" href="/assets/index-BBB.js"/>
<link rel="modulepreload" href="/assets/routes-CCC.js"/>
</head><body></body></html>`;
const CSS = `@font-face{src:url(/assets/noto-DDD.woff2) format("woff2"),url(/assets/noto-EEE.woff)}`;

type Handler = (event: FakeEvent) => void;

class FakeResponse {
  ok: boolean;
  constructor(
    public body: string,
    public status = 200,
  ) {
    this.ok = status >= 200 && status < 300;
  }
  clone() {
    return new FakeResponse(this.body, this.status);
  }
  async text() {
    return this.body;
  }
  static error() {
    return new FakeResponse("", 0);
  }
}

class FakeCache {
  store = new Map<string, FakeResponse>();
  constructor(
    private name: string,
    private net: (url: string) => Promise<FakeResponse>,
  ) {}
  private key(req: string | { url: string }) {
    const url = typeof req === "string" ? req : req.url;
    return new URL(url, "http://localhost").pathname;
  }
  async match(req: string | { url: string }) {
    return this.store.get(this.key(req));
  }
  async put(req: string | { url: string }, res: FakeResponse) {
    this.store.set(this.key(req), res);
  }
  async add(url: string) {
    const res = await this.net(url);
    if (!res.ok) throw new Error(`add failed: ${url}`);
    this.store.set(this.key(url), res);
  }
  async keys() {
    return [...this.store.keys()].map((p) => ({ url: `http://localhost${p}` }));
  }
}

class FakeEvent {
  promises: Promise<unknown>[] = [];
  response?: Promise<FakeResponse>;
  constructor(public request?: { url: string; method: string; mode: string }) {}
  waitUntil(p: Promise<unknown>) {
    this.promises.push(p);
  }
  respondWith(p: Promise<FakeResponse>) {
    this.response = p;
  }
}

function boot(version: string, network: Record<string, FakeResponse | (() => never)>) {
  const caches = new Map<string, FakeCache>();
  const netLog: string[] = [];
  const net = async (url: string): Promise<FakeResponse> => {
    const path = new URL(url, "http://localhost").pathname;
    netLog.push(path);
    const hit = network[path];
    if (typeof hit === "function") return hit();
    return hit ?? new FakeResponse("not found", 404);
  };
  const listeners: Record<string, Handler[]> = {};
  const self = {
    location: { href: `http://localhost/sw.js?v=${version}`, origin: "http://localhost" },
    addEventListener: (name: string, fn: Handler) => (listeners[name] ??= []).push(fn),
    skipWaiting: async () => {},
    clients: { claim: async () => {} },
  };
  const cacheStorage = {
    open: async (name: string) => {
      if (!caches.has(name)) caches.set(name, new FakeCache(name, net));
      return caches.get(name)!;
    },
    keys: async () => [...caches.keys()],
    delete: async (name: string) => caches.delete(name),
  };
  const ctx = vm.createContext({
    self,
    caches: cacheStorage,
    fetch: (req: string | { url: string }) => net(typeof req === "string" ? req : req.url),
    Response: FakeResponse,
    URL,
    setTimeout,
    clearTimeout,
    Error,
    Promise,
    Set,
    Map,
  });
  vm.runInContext(readFileSync(SW_PATH, "utf8"), ctx, { filename: "sw.js" });

  const fire = async (name: string, ev: FakeEvent) => {
    for (const fn of listeners[name] ?? []) fn(ev);
    await Promise.all(ev.promises);
    return ev;
  };
  const request = async (path: string, mode = "no-cors") => {
    const ev = new FakeEvent({ url: `http://localhost${path}`, method: "GET", mode });
    await fire("fetch", ev);
    return ev.response ? await ev.response : undefined;
  };
  return { caches, netLog, fire, request };
}

const baseNetwork = {
  "/": new FakeResponse(HTML),
  "/manifest.webmanifest": new FakeResponse("{}"),
  "/favicon.ico": new FakeResponse("ico"),
  "/icons/icon-192.png": new FakeResponse("png"),
  "/icons/icon-512.png": new FakeResponse("png"),
  "/icons/icon-maskable-512.png": new FakeResponse("png"),
  "/icons/apple-touch-icon.png": new FakeResponse("png"),
  "/assets/styles-AAA.css": new FakeResponse(CSS),
  "/assets/index-BBB.js": new FakeResponse("js"),
  "/assets/routes-CCC.js": new FakeResponse("js"),
  "/assets/noto-DDD.woff2": new FakeResponse("font"),
  "/assets/noto-EEE.woff": new FakeResponse("font"),
  "/assets/hero-FFF.webp": new FakeResponse("img"),
};

describe("service worker", () => {
  let sw: ReturnType<typeof boot>;
  beforeEach(() => {
    sw = boot("abc123", baseNetwork);
  });

  it("precaches the shell and every asset the HTML and its CSS reference", async () => {
    await sw.fire("install", new FakeEvent());
    const shell = [...sw.caches.get("shell-abc123")!.store.keys()].sort();
    expect(shell).toEqual(
      [
        "/",
        "/favicon.ico",
        "/icons/apple-touch-icon.png",
        "/icons/icon-192.png",
        "/icons/icon-512.png",
        "/icons/icon-maskable-512.png",
        "/manifest.webmanifest",
      ].sort(),
    );
    const assets = [...sw.caches.get("assets-abc123")!.store.keys()].sort();
    expect(assets).toEqual([
      "/assets/index-BBB.js",
      "/assets/noto-DDD.woff2",
      "/assets/noto-EEE.woff",
      "/assets/routes-CCC.js",
      "/assets/styles-AAA.css",
    ]);
  });

  it("serves hashed assets cache-first and fills the cache on a miss", async () => {
    await sw.fire("install", new FakeEvent());
    sw.netLog.length = 0;
    expect((await sw.request("/assets/index-BBB.js"))?.body).toBe("js");
    expect(sw.netLog).toEqual([]);
    expect((await sw.request("/assets/hero-FFF.webp"))?.body).toBe("img");
    expect(sw.netLog).toEqual(["/assets/hero-FFF.webp"]);
    expect(await sw.caches.get("assets-abc123")!.match("/assets/hero-FFF.webp")).toBeDefined();
  });

  it("navigations go to the network first and fall back to the cached shell offline", async () => {
    await sw.fire("install", new FakeEvent());
    const fresh = new FakeResponse("<html>new</html>");
    baseNetwork["/"] = fresh;
    expect((await sw.request("/", "navigate"))?.body).toBe("<html>new</html>");
    // now the network is gone
    const offline = boot("abc123", {
      ...baseNetwork,
      "/": () => {
        throw new Error("offline");
      },
    });
    offline.caches.set("shell-abc123", sw.caches.get("shell-abc123")!);
    expect((await offline.request("/?chapter=3", "navigate"))?.body).toBe("<html>new</html>");
  });

  it("keeps the game as the offline shell after visiting another page", async () => {
    await sw.fire("install", new FakeEvent());
    const online = boot("abc123", {
      ...baseNetwork,
      "/privacy": new FakeResponse("<html>privacy</html>"),
    });
    online.caches.set("shell-abc123", sw.caches.get("shell-abc123")!);
    await online.request("/privacy", "navigate");
    const offline = boot("abc123", {
      ...baseNetwork,
      "/": () => {
        throw new Error("offline");
      },
    });
    offline.caches.set("shell-abc123", sw.caches.get("shell-abc123")!);
    expect((await offline.request("/", "navigate"))?.body).not.toContain("privacy");
  });

  it("leaves cross-origin and non-GET requests alone", async () => {
    const ev = new FakeEvent({ url: "https://example.com/x.js", method: "GET", mode: "no-cors" });
    await sw.fire("fetch", ev);
    expect(ev.response).toBeUndefined();
    const post = new FakeEvent({ url: "http://localhost/api", method: "POST", mode: "cors" });
    await sw.fire("fetch", post);
    expect(post.response).toBeUndefined();
  });

  it("drops every cache from an older version on activate", async () => {
    await sw.fire("install", new FakeEvent());
    const next = boot("def456", baseNetwork);
    next.caches.set("shell-abc123", sw.caches.get("shell-abc123")!);
    next.caches.set("assets-abc123", sw.caches.get("assets-abc123")!);
    await next.fire("install", new FakeEvent());
    await next.fire("activate", new FakeEvent());
    expect([...next.caches.keys()].sort()).toEqual(["assets-def456", "shell-def456"]);
  });
});
