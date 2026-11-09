// Saves and loads one person's study progress, keyed by their private sync code.
// GET  /api/progress?code=XXXXX-XXXXX-XXXXX-XXXXX  -> { data: { storageKey: value }, at }
// PUT  /api/progress?code=...  body { data: { storageKey: value }, at }  merges the keys in.
// The values are the pages' own browser-storage entries (flags, missed items, positions).
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);
const CODE = /^[A-Z2-9]{5}(-[A-Z2-9]{5}){3}$/;
const KEY = /^(flags:|neuro2-|cardio-)[\w :&.,'-]{1,80}$/;
const MAX_BYTES = 2_000_000;

let ready;
const init = () => (ready ??= sql`
  CREATE TABLE IF NOT EXISTS progress (
    code text PRIMARY KEY,
    data jsonb NOT NULL DEFAULT '{}'::jsonb,
    at bigint NOT NULL DEFAULT 0,
    updated_at timestamptz NOT NULL DEFAULT now()
  )`);

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const code = String(req.query.code || "").toUpperCase();
  if (!CODE.test(code)) return res.status(400).json({ error: "That isn't a valid sync code." });

  try {
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
