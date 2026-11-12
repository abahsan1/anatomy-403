// The site owner's notes on Exam 3 questions, for Claude to act on.
// Only one account may use it: the owner's GitHub sign-in (abahsan1). The browser sends its Supabase
// sign-in token; this checks it with Supabase Auth and refuses every other account.
// A note is keyed by the question's id in src/exam-3-cardio/cardio-data.js ("cv1", "b-cv1"), or "new:<id>"
// for a request for a new question. Claude reads the open notes, edits the questions, then marks each
// note done with a reply saying what changed.
// GET    /api/notes                 -> { notes: [{ qid, note, snap, status, reply, updated_at }] }
// PUT    /api/notes  body { qid, note, snap }  saves the note and reopens it
// DELETE /api/notes?qid=...         removes it
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);
const SUPABASE_URL = "https://ksfbvtkbcnqiqvsazesd.supabase.co";
const SUPABASE_KEY = "sb_publishable_bWHSSPtt2UrFc4g5YQDwlA_CQF9Qw-d"; // publishable key, not a secret
const OWNER = "a1be1e0f-896a-49c9-b997-a06979110fae"; // the GitHub account abahsan1
const QID = /^(new:[a-z0-9]{4,20}|[a-z0-9-]{1,40})$/;

let ready;
const init = () => (ready ??= sql`
  CREATE TABLE IF NOT EXISTS question_notes (
    qid text PRIMARY KEY,
    note text NOT NULL,
    snap text NOT NULL DEFAULT '',
    status text NOT NULL DEFAULT 'open',
    reply text NOT NULL DEFAULT '',
    updated_at timestamptz NOT NULL DEFAULT now()
  )`);

async function isOwner(req) {
  const m = /^Bearer\s+(\S+)$/.exec(req.headers.authorization || "");
  if (!m) return false;
  const r = await fetch(SUPABASE_URL + "/auth/v1/user", { headers: { authorization: "Bearer " + m[1], apikey: SUPABASE_KEY } });
  if (!r.ok) return false;
  const u = await r.json();
  return !!u && u.id === OWNER;
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  try {
    if (!(await isOwner(req))) return res.status(403).json({ error: "Only the site owner can use question notes." });
    await init();
    if (req.method === "GET") {
      const notes = await sql`SELECT qid, note, snap, status, reply, updated_at FROM question_notes ORDER BY updated_at DESC`;
      return res.status(200).json({ notes });
    }
    if (req.method === "PUT") {
      const b = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
      const qid = String(b.qid || ""), note = String(b.note || "").trim(), snap = String(b.snap || "").slice(0, 600);
      if (!QID.test(qid)) return res.status(400).json({ error: "Unexpected question id." });
      if (!note) return res.status(400).json({ error: "The note is empty." });
      if (note.length > 4000) return res.status(413).json({ error: "Keep a note under 4,000 characters." });
      const rows = await sql`
        INSERT INTO question_notes (qid, note, snap) VALUES (${qid}, ${note}, ${snap})
        ON CONFLICT (qid) DO UPDATE SET note = EXCLUDED.note, snap = EXCLUDED.snap, status = 'open', updated_at = now()
        RETURNING qid, note, snap, status, reply, updated_at`;
      return res.status(200).json({ note: rows[0] });
    }
    if (req.method === "DELETE") {
      const qid = String(req.query.qid || "");
      if (!QID.test(qid)) return res.status(400).json({ error: "Unexpected question id." });
      await sql`DELETE FROM question_notes WHERE qid = ${qid}`;
      return res.status(200).json({ ok: true });
    }
    res.setHeader("Allow", "GET, PUT, DELETE");
    return res.status(405).json({ error: "Use GET, PUT or DELETE." });
  } catch (e) {
    console.error("notes api", e);
    return res.status(500).json({ error: "The notes store isn't reachable right now." });
  }
}
