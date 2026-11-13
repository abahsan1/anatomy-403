// The owner's chat with the question-notes agent ("Cor"), shown only to the owner's GitHub sign-in (abahsan1).
// It tutors on the Exam 3 question in view and can leave notes for the question-notes agent, which edits the
// question bank on its next run on the owner's Mac (~/.claude/agents/question-notes.md).
// POST /api/agent  body { messages: [{ role: "user"|"assistant", content }], question?: { id, q, options, answer, e } }
//   -> { reply, saved: [qid…] }
// Model: Vercel AI Gateway (the project's OIDC token, or AI_GATEWAY_API_KEY); ANTHROPIC_API_KEY is used if set instead.
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);
const SUPABASE_URL = "https://ksfbvtkbcnqiqvsazesd.supabase.co";
const SUPABASE_KEY = "sb_publishable_bWHSSPtt2UrFc4g5YQDwlA_CQF9Qw-d"; // publishable key, not a secret
const OWNER = "a1be1e0f-896a-49c9-b997-a06979110fae"; // the GitHub account abahsan1
const QID = /^(new:[a-z0-9]{4,20}|[a-z0-9-]{1,40})$/;
const GATEWAY_MODEL = "anthropic/claude-sonnet-5.5";
const ANTHROPIC_MODEL = "claude-sonnet-5-5";

async function isOwner(req) {
  const m = /^Bearer\s+(\S+)$/.exec(req.headers.authorization || "");
  if (!m) return false;
  const r = await fetch(SUPABASE_URL + "/auth/v1/user", { headers: { authorization: "Bearer " + m[1], apikey: SUPABASE_KEY } });
  if (!r.ok) return false;
  const u = await r.json();
  return !!u && u.id === OWNER;
}

const SYSTEM = `You are Cor, the owner's study agent for ANATOMY 403 (human anatomy, University of Michigan). The owner is the student. Exam 3 covers three lectures: the heart, vasculature, and blood.

How to help:
- Teach. When the owner is confused, explain the idea plainly in a few sentences, tie it to the question in view, and give a way to remember it (a contrast, a mnemonic, a picture to imagine). Then check understanding with one short question of your own when that helps.
- Stay inside what the course teaches. If something goes beyond the lecture or you are not sure the lecture says it, say so.
- Be brief: this is a terminal. Plain text, short paragraphs, "-" lists at most. No markdown headings or tables.
- You can leave a note for the question-notes agent, which runs on the owner's Mac, reads the slides and transcripts, and edits the question bank. Use save_note when the owner reports a wrong or confusing question, asks for more practice on a topic, or says something worth keeping as a memory aid. Write the note in the owner's voice, specific enough to act on. Say that you saved it; never claim the question is already fixed.
- If the owner's statement is wrong, correct it kindly before anything else.`;

const TOOLS = [
  { type: "function", function: { name: "save_note", description: "Save or replace the owner's note on a question for the question-notes agent's next run. Use qid 'new' to request new questions on a topic.",
    parameters: { type: "object", properties: {
      qid: { type: "string", description: "The question id in view, or 'new' for a request for new questions." },
      note: { type: "string", description: "The note, in the owner's voice, under 1500 characters." } }, required: ["qid", "note"] } } },
  { type: "function", function: { name: "list_notes", description: "List the owner's saved notes and whether the agent has handled them.", parameters: { type: "object", properties: {} } } },
];

async function runTool(name, args, ctx) {
  if (name === "list_notes") {
    const rows = await sql`SELECT qid, note, status, reply FROM question_notes ORDER BY updated_at DESC LIMIT 40`;
    return JSON.stringify(rows);
  }
  if (name === "save_note") {
    let qid = String(args.qid || "").trim();
    if (qid === "new" || !qid) qid = "new:" + Math.random().toString(36).slice(2, 10);
    const note = String(args.note || "").trim().slice(0, 1500);
    if (!QID.test(qid) || !note) return "Not saved: the question id or note was invalid.";
    const snap = ctx.question && ctx.question.id === qid ? String(ctx.question.q || "").slice(0, 600) : qid.startsWith("new:") ? "Request from chat" : "";
    const prev = (await sql`SELECT note FROM question_notes WHERE qid = ${qid}`)[0];
    const merged = prev && prev.note && !prev.note.includes(note) ? (prev.note + "\n\n" + note).slice(0, 4000) : note;
    await sql`INSERT INTO question_notes (qid, note, snap) VALUES (${qid}, ${merged}, ${snap})
      ON CONFLICT (qid) DO UPDATE SET note = EXCLUDED.note, snap = CASE WHEN EXCLUDED.snap = '' THEN question_notes.snap ELSE EXCLUDED.snap END, status = 'open', updated_at = now()`;
    ctx.saved.push(qid);
    return "Saved note on " + qid + ". The question-notes agent will handle it on its next run.";
  }
  return "Unknown tool.";
}

// One chat turn through Vercel AI Gateway (OpenAI-compatible), with tool calls.
async function viaGateway(req, messages, ctx) {
  const token = process.env.AI_GATEWAY_API_KEY || req.headers["x-vercel-oidc-token"] || process.env.VERCEL_OIDC_TOKEN;
  if (!token) throw Object.assign(new Error("No AI Gateway credentials on this deployment."), { status: 503 });
  const msgs = [{ role: "system", content: ctx.system }, ...messages];
  for (let i = 0; i < 4; i++) {
    const r = await fetch("https://ai-gateway.vercel.sh/v1/chat/completions", {
      method: "POST", headers: { "content-type": "application/json", authorization: "Bearer " + token },
      body: JSON.stringify({ model: GATEWAY_MODEL, max_tokens: 900, messages: msgs, tools: TOOLS }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      const m = (j.error && (j.error.message || j.error)) || j.message || "The AI service refused the request.";
      throw Object.assign(new Error(typeof m === "string" ? m : JSON.stringify(m)), { status: r.status });
    }
    const msg = j.choices && j.choices[0] && j.choices[0].message;
    if (!msg) throw new Error("The AI service sent an empty answer.");
    if (!msg.tool_calls || !msg.tool_calls.length) return msg.content || "";
    msgs.push({ role: "assistant", content: msg.content || "", tool_calls: msg.tool_calls });
    for (const c of msg.tool_calls) {
      let args = {}; try { args = JSON.parse(c.function.arguments || "{}"); } catch {}
      msgs.push({ role: "tool", tool_call_id: c.id, content: await runTool(c.function.name, args, ctx) });
    }
  }
  return "I got stuck in a loop of tool calls. Try asking again.";
}

// The same turn through the Anthropic API directly, when ANTHROPIC_API_KEY is set.
async function viaAnthropic(messages, ctx) {
  const tools = TOOLS.map(t => ({ name: t.function.name, description: t.function.description, input_schema: t.function.parameters }));
  const msgs = messages.map(m => ({ role: m.role, content: m.content }));
  for (let i = 0; i < 4; i++) {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST", headers: { "content-type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: ANTHROPIC_MODEL, max_tokens: 900, system: ctx.system, messages: msgs, tools }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error((j.error && j.error.message) || "The AI service refused the request."), { status: r.status });
    const uses = j.content.filter(b => b.type === "tool_use");
    if (!uses.length) return j.content.filter(b => b.type === "text").map(b => b.text).join("\n");
    msgs.push({ role: "assistant", content: j.content });
    msgs.push({ role: "user", content: await Promise.all(uses.map(async u => ({ type: "tool_result", tool_use_id: u.id, content: await runTool(u.name, u.input || {}, ctx) }))) });
  }
  return "I got stuck in a loop of tool calls. Try asking again.";
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).json({ error: "Use POST." }); }
  try {
    if (!(await isOwner(req))) return res.status(403).json({ error: "Only the site owner can use the agent." });
    const b = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const messages = (Array.isArray(b.messages) ? b.messages : []).slice(-20)
      .filter(m => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
      .map(m => ({ role: m.role, content: m.content.slice(0, 4000) }));
    if (!messages.length || messages[messages.length - 1].role !== "user") return res.status(400).json({ error: "Send a message." });
    const q = b.question && typeof b.question === "object" ? b.question : null;
    const question = q && QID.test(String(q.id || "")) ? {
      id: String(q.id), q: String(q.q || "").slice(0, 800),
      options: (Array.isArray(q.options) ? q.options : []).slice(0, 8).map(o => String(o).slice(0, 300)),
      answer: [].concat(q.answer || []).slice(0, 8).map(o => String(o).slice(0, 300)), e: String(q.e || "").slice(0, 1200) } : null;
    const ctx = { saved: [], question, system: SYSTEM + (question
      ? `\n\nThe question in view (id ${question.id}):\n${question.q}\nOptions: ${question.options.join(" | ")}\nCorrect: ${question.answer.join(" | ")}\nExplanation in the bank: ${question.e || "(none)"}`
      : "\n\nNo question is in view right now.") };
    const reply = process.env.ANTHROPIC_API_KEY ? await viaAnthropic(messages, ctx) : await viaGateway(req, messages, ctx);
    return res.status(200).json({ reply, saved: ctx.saved });
  } catch (e) {
    console.error("agent api", e);
    const status = e.status === 403 || e.status === 401 || e.status === 402 ? 503 : 500;
    return res.status(status).json({ error: String(e.message || "The agent isn't reachable right now.").slice(0, 400) });
  }
}
