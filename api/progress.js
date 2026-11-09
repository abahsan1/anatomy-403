// Saves and loads the signed-in person's study progress.
// The browser sends its Supabase sign-in token; this checks it with Supabase Auth and keys the
// progress by the account's id, so nobody can read or write someone else's progress.
// GET  /api/progress  -> { data: { storageKey: value }, at }
// PUT  /api/progress  body { data: { storageKey: value }, at }  merges the keys in.
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);
const SUPABASE_URL = "https://ksfbvtkbcnqiqvsazesd.supabase.co";
const SUPABASE_KEY = "sb_publishable_bWHSSPtt2UrFc4g5YQDwlA_CQF9Qw-d"; // publishable key, not a secret
const KEY = /^(flags:|neuro2-|cardio-|msk-)[\w :&.,'-]{1,80}$/;
const MAX_BYTES = 2_000_000;

let ready;
const init = () => (ready ??= sql`
  CREATE TABLE IF NOT EXISTS progress (
    code text PRIMARY KEY,
    data jsonb NOT NULL DEFAULT '{}'::jsonb,
    at bigint NOT NULL DEFAULT 0,
    updated_at timestamptz NOT NULL DEFAULT now()
  )`);

// who is asking: the account id from a valid Supabase token, or null
async function account(req) {
  const m = /^Bearer\s+(\S+)$/.exec(req.headers.authorization || "");
  if (!m) return null;
  const r = await fetch(SUPABASE_URL + "/auth/v1/user", { headers: { authorization: "Bearer " + m[1], apikey: SUPABASE_KEY } });
  if (!r.ok) return null;
  const u = await r.json();
  return u && typeof u.id === "string" ? u.id : null;
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  try {
    const id = await account(req);
    if (!id) return res.status(401).json({ error: "Sign in to save progress." });
    const code = "user:" + id;
    await init();
    if (req.method === "GET") {
      const rows = await sql`SELECT data, at FROM progress WHERE code = ${code}`;
      return res.status(200).json(rows[0] ? { data: rows[0].data, at: Number(rows[0].at) } : { data: {}, at: 0 });
    }
    if (req.method === "PUT") {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
      const data = body.data, at = Number(body.at);
      if (!data || typeof data !== "object" || Array.isArray(data) || !Number.isFinite(at)) {
        return res.status(400).json({ error: "Expected { data, at }." });
      }
      for (const [k, v] of Object.entries(data)) {
        if (!KEY.test(k) || typeof v !== "string") return res.status(400).json({ error: "Unexpected key: " + k.slice(0, 40) });
      }
      const json = JSON.stringify(data);
      if (json.length > MAX_BYTES) return res.status(413).json({ error: "Progress is too large to save." });
      const rows = await sql`
        INSERT INTO progress (code, data, at) VALUES (${code}, ${json}::jsonb, ${at})
        ON CONFLICT (code) DO UPDATE
          SET data = progress.data || EXCLUDED.data,
              at = GREATEST(progress.at, EXCLUDED.at),
              updated_at = now()
        RETURNING at`;
      return res.status(200).json({ ok: true, at: Number(rows[0].at) });
    }
    res.setHeader("Allow", "GET, PUT");
    return res.status(405).json({ error: "Use GET or PUT." });
  } catch (e) {
    console.error("progress api", e);
    return res.status(500).json({ error: "The progress store isn't reachable right now." });
  }
}
