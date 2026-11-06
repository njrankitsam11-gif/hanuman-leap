/**
 * The /api/save backend. Plain bearer-token HTTP rather than a server function because the
 * Capacitor app calls it cross-origin. Every query is scoped to the verified token's user.
 */
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { mergeSaves, parseSave, type SaveV3 } from "@/game/storage";

/** A real save is about 2 KB; this only stops someone filling the database. */
const MAX_BODY_BYTES = 64 * 1024;

/** The native shells' WebView origins (iOS, Android). The web app is same-origin. */
const NATIVE_ORIGINS = ["capacitor://localhost", "https://localhost"];

/** Who a verified token belongs to. */
export type Player = { id: string; email: string | null };

export type SaveStore = {
  read: (userId: string) => Promise<SaveV3 | null>;
  write: (player: Player, save: SaveV3) => Promise<void>;
  remove: (userId: string) => Promise<void>;
};

export type SaveDeps = {
  /** The player in a valid token, or null. */
  verify: (token: string) => Promise<Player | null>;
  store: SaveStore;
};

function cors(request: Request): Record<string, string> {
  const origin = request.headers.get("origin");
  if (!origin || !NATIVE_ORIGINS.includes(origin)) return {};
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-headers": "authorization, content-type",
    "access-control-allow-methods": "GET, PUT, DELETE, OPTIONS",
    vary: "Origin",
  };
}

const json = (request: Request, status: number, body: unknown) =>
  Response.json(body, {
    status,
    headers: { ...cors(request), "cache-control": "no-store" },
  });

export async function handleSaveRequest(request: Request, deps: SaveDeps): Promise<Response> {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors(request) });
  }

  const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
  const player = token ? await deps.verify(token) : null;
  if (!player) return json(request, 401, { error: "unauthorized" });
  const userId = player.id;

  if (request.method === "GET") {
    return json(request, 200, { save: await deps.store.read(userId) });
  }

  if (request.method === "DELETE") {
    await deps.store.remove(userId);
    return json(request, 200, { ok: true });
  }

  if (request.method === "PUT") {
    const text = await request.text();
    if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) {
      return json(request, 413, { error: "too large" });
    }
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      return json(request, 400, { error: "invalid save" });
    }
    const incoming = parseSave((body as { save?: unknown } | null)?.save);
    if (!incoming) return json(request, 400, { error: "invalid save" });

    const stored = await deps.store.read(userId);
    const merged = stored ? mergeSaves(incoming, stored) : incoming;
    await deps.store.write(player, merged);
    return json(request, 200, { save: merged });
  }

  return json(request, 405, { error: "method not allowed" });
}

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

async function verifyNeonToken(token: string): Promise<Player | null> {
  const base = env("NEON_AUTH_BASE_URL");
  jwks ??= createRemoteJWKSet(new URL(`${base}/.well-known/jwks.json`));
  try {
    const { payload } = await jwtVerify(token, jwks, {
      issuer: new URL(base).origin,
      algorithms: ["EdDSA"],
    });
    if (!payload.sub) return null;
    return {
      id: payload.sub,
      email: typeof payload["email"] === "string" ? payload["email"] : null,
    };
  } catch {
    return null;
  }
}

let emailColumn: Promise<void> | null = null;

/** Older databases have no email column; add it once and fill in players who already saved. */
function ensureEmailColumn(sql: NeonQueryFunction<false, false>) {
  emailColumn ??= (async () => {
    await sql`ALTER TABLE game_saves ADD COLUMN IF NOT EXISTS email text`;
    await sql`
      UPDATE game_saves g SET email = u.email
      FROM neon_auth."user" u
      WHERE g.email IS NULL AND u.id::text = g.user_id`.catch((error: unknown) =>
      console.error("email backfill failed", error),
    );
  })().catch((error: unknown) => {
    emailColumn = null;
    throw error;
  });
  return emailColumn;
}

function neonStore(): SaveStore {
  const sql = neon(env("DATABASE_URL"));
  return {
    read: async (userId) => {
      const rows = await sql`SELECT save FROM game_saves WHERE user_id = ${userId}`;
      return parseSave(rows[0]?.["save"]);
    },
    write: async ({ id, email }, save) => {
      await sql`
        INSERT INTO game_saves (user_id, save, updated_at)
        VALUES (${id}, ${JSON.stringify(save)}::jsonb, now())
        ON CONFLICT (user_id) DO UPDATE SET save = EXCLUDED.save, updated_at = now()`;
      // Progress is already safe: a problem with the email must never fail the save.
      await ensureEmailColumn(sql)
        .then(() => sql`UPDATE game_saves SET email = ${email} WHERE user_id = ${id}`)
        .catch((error: unknown) => console.error("saving player email failed", error));
    },
    remove: async (userId) => {
      await sql`DELETE FROM game_saves WHERE user_id = ${userId}`;
    },
  };
}

export const saveRoute = (request: Request) =>
  handleSaveRequest(request, { verify: verifyNeonToken, store: neonStore() });
