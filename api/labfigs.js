// Exam 3 lab identification figures, for the site owner only.
// The images are BlueLink lab slides used with the authors' permission for the owner's own study, so they are
// not in the repo or the public page: they live in Neon (table lab_figs) and only the owner's GitHub sign-in
// (abahsan1) can read them. The browser sends its Supabase sign-in token; this checks it with Supabase Auth.
// GET /api/labfigs           -> { figs: [{ id, lec, title, answers: [{ n, a, alt }], v }] }
// GET /api/labfigs?img=<id>  -> the numbered JPEG for that figure
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);
const SUPABASE_URL = "https://ksfbvtkbcnqiqvsazesd.supabase.co";
const SUPABASE_KEY = "sb_publishable_bWHSSPtt2UrFc4g5YQDwlA_CQF9Qw-d"; // publishable key, not a secret
const OWNER = "a1be1e0f-896a-49c9-b997-a06979110fae"; // the GitHub account abahsan1
const ID = /^[a-z]{2,6}_p\d{1,3}$/;

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
    if (req.method !== "GET") return res.status(405).json({ error: "GET only." });
    if (!(await isOwner(req))) return res.status(403).json({ error: "Only the site owner can see lab figures." });
    const img = req.query.img;
    if (img) {
      if (!ID.test(String(img))) return res.status(400).json({ error: "Unexpected figure id." });
      const rows = await sql`SELECT img FROM lab_figs WHERE id = ${String(img)}`;
      if (!rows.length) return res.status(404).json({ error: "No such figure." });
      res.setHeader("Content-Type", "image/jpeg");
      res.setHeader("Cache-Control", "private, max-age=604800"); // the client adds ?v=<hash>, so a new image gets a new URL
      return res.status(200).send(Buffer.from(rows[0].img, "base64"));
    }
    const figs = await sql`SELECT id, lec, title, answers, v FROM lab_figs ORDER BY lec, ord`;
    return res.status(200).json({ figs });
  } catch (e) {
    return res.status(500).json({ error: "Lab figures are unavailable right now." });
  }
}
