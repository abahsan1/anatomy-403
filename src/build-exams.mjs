// Builds the Exam 1 (MSK) and Exam 3 (Cardio) pages on the Exam 2 (Neuro) page's design and engine.
// exam-2/neuro.html is the template: its stylesheet, sidebar and quiz engine are reused as they are;
// only the question data, the titles, the lecture list and the storage prefix change.
// Sources: src/exam-1-msk/msk1-5.html (the lecture quizzes' question lists) and src/exam-3-cardio/cardio-data.js.
import {readFileSync, writeFileSync} from "node:fs";

const root = new URL("../", import.meta.url);
const read = p => readFileSync(new URL(p, root), "utf8");
const swap = (s, from, to) => {
  if (!s.includes(from)) throw new Error("Exam 2 page changed, missing: " + from.slice(0, 70));
  return s.split(from).join(to);
};
const js = v => JSON.stringify(v).replace(/<\/(script)/gi, "<\\/$1");

// ---------- split the Exam 2 page into its shell and its engine ----------
const neuro = read("exam-2/neuro.html");
const dataStart = neuro.indexOf("<script>\n// Each question");
const engineStart = neuro.indexOf("\n(function(){\nconst LECT=");
if (dataStart < 0 || engineStart < 0) throw new Error("Exam 2 page changed: can't find its data or engine");
const SHELL = neuro.slice(0, dataStart);
const ENGINE = neuro.slice(engineStart, neuro.lastIndexOf("</script>"));

function engineFor(ex) {
  let e = ENGINE;
  e = e.replace(/const LECT=\{[^}]*\};/, () => "const LECT=" + js(Object.fromEntries(ex.lectures.map(l => [l.n, l.short]))) + ";");
  e = swap(e, "#lecture-([1-6])$", `#lecture-([1-${ex.lectures.length}])$`);
  e = swap(e, "'neuro2-", "'" + ex.prefix);
  // the Neuro-only key migration
  e = e.replace(/\(function migrateBlanks\(\)\{[\s\S]*?localStorage\.setItem\('[a-z0-9-]+sessions',r\)\}\}catch\(e\)\{\}\}\)\(\);\n/, "");
  if (e.includes("migrateBlanks")) throw new Error("Exam 2 page changed: migrateBlanks");
  // slide notes and fill-in explanations
  e = swap(e, "const saidNote=x=>x.said?'<p class=\"said\"><b>In lecture:</b> '+esc(x.said)+'</p>':'';",
    "const saidNote=x=>(x.said?'<p class=\"said\"><b>In lecture:</b> '+esc(x.said)+'</p>':'')+(x.note?'<p class=\"said\"><b>Your slide note:</b> '+esc(x.note)+'</p>':'');");
  e = swap(e, '<div id="fbsaid" hidden>${saidNote(b)}</div>',
    '<div id="fbsaid" hidden>${b.e?\'<div class="explain">\'+esc(b.e)+\'</div>\':\'\'}${saidNote(b)}</div>');
  // question-style chips only when the bank has more than one style
  e = swap(e, "const n=s=>base.filter(q=>styleOk(q,s)).length;\n",
    "const n=s=>base.filter(q=>styleOk(q,s)).length;\n  if(!QUESTIONS.some(q=>q.deep||q.said))return '';\n");
  // no identification figures on these exams
  e = swap(e, "function sync(){\n", "function sync(){\n  if(!FIGS.length&&st.mode==='id')st.mode='mcq';\n");
  e = swap(e, "Clean sweep. Try another lecture or the identification set.", "Clean sweep. Try another lecture or fill in the blank.");
  e = swap(e, "Every multiple-choice question you miss, and every figure label you miss on its first check, lands here automatically.",
    "Every question you miss, and every fill-in sentence you miss on its first check, lands here automatically.");
  e = swap(e, "Tap Flag on a question or figure and it shows up here.", "Tap Flag on a question or sentence and it shows up here.");
  // muscle flashcards (MSK): their own deck, and part of "Everything"
  e = swap(e, "  FIGS.forEach(f=>{if(!inLec(f.lec))return;",
    "  MUSCLES.forEach(m=>{if(!inLec(m.l))return;if(src==='all'||src==='muscles')cards.push({type:'m',m,key:m.key})});\n  FIGS.forEach(f=>{if(!inLec(f.lec))return;");
  e = swap(e, "function cardFromKey(k){\n", "function cardFromKey(k){\n  if(k.startsWith('m:')){const m=MUSCLES.find(x=>x.key===k);return m?{type:'m',m,key:k}:null}\n");
  e = swap(e, "  if(c.type==='b'){const ws=", "  if(c.type==='m')return 'Give each: '+c.m.f.map(x=>x[0]).join(' · ');\n  if(c.type==='b'){const ws=");
  e = swap(e, '<button class="chip" data-src="all"',
    '${MUSCLES.length?`<button class="chip" data-src="muscles" aria-pressed="${fc.src===\'muscles\'}">Muscles (${n(\'muscles\')})</button>`:\'\'}\n   <button class="chip" data-src="all"');
  e = swap(e, "  if(c.type==='b'){tag=",
    "  if(c.type==='m'){tag=LECT[c.m.l]+' · '+esc(c.m.g)+' · muscle';front=`<div class=\"front\">${esc(c.m.n)}</div>`;\n" +
    "    back=c.m.f.map(([k,v])=>`<div class=\"why\"><b>${esc(k)}:</b> ${esc(v)}</div>`).join('');}\n  else if(c.type==='b'){tag=");
  return e;
}

function shellFor(ex) {
  let s = SHELL;
  s = swap(s, "<title>Neuro Exam 2 Practice</title>", `<title>${ex.title}</title>`);
  s = swap(s, "<h1>Neuro Exam 2 Practice</h1>", `<h1>${ex.title}</h1>`);
  s = s.replace(/<p>Anatomy 403 · Thursday[^<]*<\/p>/, () => `<p>${ex.sub}</p>`);
  s = s.replace(/(<div class="chips"[^>]*>\n)[\s\S]*?(\s*<button class="chip fchip")/, (_, a, b) => a +
    '      <button class="chip" data-l="0" aria-pressed="true">All lectures</button>\n' +
    ex.lectures.map(l => l.ready
      ? `      <button class="chip" data-l="${l.n}" aria-pressed="false">${l.chip}</button>`
      : `      <button class="chip" data-l="${l.n}" aria-pressed="false" disabled title="Coming soon">${l.chip}</button>`).join("\n") + b);
  s = swap(s, '<button id="m-id" aria-pressed="false">', '<button id="m-id" aria-pressed="false" hidden>');
  s = swap(s, '<link rel="stylesheet" href="/assets/neuro.css">',
    '<link rel="stylesheet" href="/assets/neuro.css">\n<style>@media (min-width:561px) and (max-width:899px){.seg{grid-template-columns:repeat(3,1fr)}}.chip:disabled{opacity:.5;cursor:default}</style>');
  return s;
}

function page(ex) {
  const data = "<script>\n" + ex.comment + "\n" +
    "const QUESTIONS=" + js(ex.questions) + ";\n" +
    "const BLANKS=" + js(ex.blanks) + ";\n" +
    "const MUSCLES=" + js(ex.muscles) + ";\n" +
    "const FIGS=[], IMG={}, KEYMIG={};\n" +
    (ex.migrate || "") +
    engineFor(ex) + "</script>\n";
  return shellFor(ex) + data;
}

// ---------- Exam 1: MSK ----------
const MSK_LECS = ["Skeletal system basics", "Joints and skeletal muscle", "Head, neck and back", "Thorax, abdomen and upper limb", "Pelvis and lower limb"];
const msk = {questions: [], blanks: [], muscles: [], oldKeys: []};
const oldKey = q => {const t = (q.t || "") + "|" + (q.p || q.n || ""); let h = 5381; for (let i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) | 0; return (h >>> 0).toString(36)};
MSK_LECS.forEach((_, i) => {
  const l = i + 1;
  const Q = (0, eval)(read(`src/exam-1-msk/msk${l}.html`).match(/const Q = (\[[\s\S]*?\n\]);/)[1]);
  for (const q of Q) {
    if (q.t === "mc") {
      const item = {l, t: q.s, q: q.p, c: q.o[q.c], w: q.o.filter((_, k) => k !== q.c), e: q.e};
      msk.questions.push(item); msk.oldKeys.push([oldKey(q), "q:" + item.q]);
    } else if (q.t === "fill") {
      let k = 0;
      const blank = () => "[[" + q.a[k++].join("|") + "]]";
      let s = q.p.replace(/_{3,}/g, () => k < q.a.length ? blank() : "___");
      while (k < q.a.length) s += " " + blank();
      const item = {l, t: q.s, s, e: q.e};
      msk.blanks.push(item); msk.oldKeys.push([oldKey(q), "b:" + s]);
    } else if (q.t === "card") {
      msk.muscles.push({l, g: q.g, n: q.n, f: q.f, key: "m:" + l + "|" + q.n});
    } else throw new Error("unknown MSK item type " + q.t);
  }
});
// carry over flags from the old Exam 1 page (stored under its title, keyed by a hash of each item)
const mskMigrate = `(function(){try{if(localStorage.getItem('msk-flags'))return;const M=new Map(${js(msk.oldKeys)});
  const old=new Set();for(const t of ['MSK Exam 1 Practice','MSK1 Quiz: Skeletal System Basics']){try{JSON.parse(localStorage.getItem('flags:'+t)||'[]').forEach(k=>old.add(k))}catch(e){}}
  for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.startsWith('flags:MSK')){try{JSON.parse(localStorage.getItem(k)||'[]').forEach(x=>old.add(x))}catch(e){}}}
  const out=[...old].map(k=>M.get(k)).filter(Boolean);if(out.length)localStorage.setItem('msk-flags',JSON.stringify(out))}catch(e){}})();\n`;

writeFileSync(new URL("exam-1/msk.html", root), page({
  title: "MSK Exam 1 Practice",
  sub: "Anatomy 403 · musculoskeletal lectures 1 to 5: multiple choice, fill in the blank, and muscle flashcards",
  prefix: "msk-",
  comment: "// Built by src/build-exams.mjs from the MSK lecture quizzes, on the Exam 2 page's engine. Edit the sources, not this file.",
  lectures: MSK_LECS.map((name, i) => ({n: i + 1, ready: true, short: "MSK " + (i + 1), chip: `MSK ${i + 1} · ${name}`})),
  questions: msk.questions, blanks: msk.blanks, muscles: msk.muscles, migrate: mskMigrate,
}));
console.log(`wrote exam-1/msk.html: ${msk.questions.length} questions, ${msk.blanks.length} sentences, ${msk.muscles.length} muscle cards`);

// ---------- Exam 3: Cardio ----------
const C = new Function(read("src/exam-3-cardio/cardio-data.js") + ";return {LECTURES,TOPICS,MCQ,BLANKS}")();
const topic = x => C.TOPICS[x.l][x.t];
const cq = C.MCQ.map(q => {
  const o = {l: q.l, t: topic(q).name, q: q.q, c: q.c, w: q.w, e: q.e, lo: topic(q).los[q.lo]};
  if (q.k === "deep") o.deep = true;
  if (q.said) o.said = q.said;
  if (q.note) o.note = q.note;
  return o;
});
const cb = C.BLANKS.map(b => {
  const o = {l: b.l, t: topic(b).name, s: b.s};
  if (b.said) o.said = b.said;
  if (b.note) o.note = b.note;
  return o;
});
const qk = q => q.deep ? "d:" + q.q + "|" + (Array.isArray(q.c) ? q.c[0] : q.c) : "q:" + q.q;
const cardioIds = [...C.MCQ.map((q, i) => [q.id, qk(cq[i])]), ...C.BLANKS.map(b => [b.id, "b:" + b.s])];
// carry over flags and misses from the old Exam 3 page (cardio-prog: {flags:{id:time}, missed:{id:time}})
const cardioMigrate = `(function(){try{if(localStorage.getItem('cardio-v2-flags')||localStorage.getItem('cardio-v2-missed'))return;
  const p=JSON.parse(localStorage.getItem('cardio-prog')||'null');if(!p)return;const M=new Map(${js(cardioIds)});
  const conv=o=>Object.keys(o||{}).map(k=>M.get(k)).filter(Boolean);
  const f=conv(p.flags),m=conv(p.missed);if(f.length)localStorage.setItem('cardio-v2-flags',JSON.stringify(f));if(m.length)localStorage.setItem('cardio-v2-missed',JSON.stringify(m))}catch(e){}})();\n`;

writeFileSync(new URL("exam-3/cardio.html", root), page({
  title: "Cardio Exam 3 Practice",
  sub: "Anatomy 403 · cardiovascular and respiratory · built from Dr. Fox's slides, learning objectives and lecture recordings",
  prefix: "cardio-v2-",
  comment: "// Built by src/build-exams.mjs from src/exam-3-cardio/cardio-data.js, on the Exam 2 page's engine. Edit the sources, not this file.",
  lectures: C.LECTURES.map(L => ({n: L.n, ready: L.ready, short: "Cardio " + L.n,
    chip: L.ready ? `Cardio ${L.n} · ${L.name}` : `Cardio ${L.n} · coming soon`})),
  questions: cq, blanks: cb, muscles: [], migrate: cardioMigrate,
}));
console.log(`wrote exam-3/cardio.html: ${cq.length} questions, ${cb.length} sentences`);

// ---------- the home page's manifest: every exam, its lectures and how much each holds ----------
// Exam dates: set "date" (YYYY-MM-DD) to show a countdown on the home page. "current" is the exam you're studying for now.
const NEURO_LECS = ["Brain", "Spinal cord and nerves", "Brain stem and cranial nerves", "Motor systems and autonomics", "Special senses", "Diencephalon, cortex and limbic system"];
const neuroData = (() => {
  const s = neuro.slice(dataStart + "<script>".length, engineStart);
  return new Function(s + ";return {QUESTIONS,BLANKS,FIGS}")();
})();
const count = (arr, l, key = "l") => arr.filter(x => x[key] === l).length;
const manifest = [
  {n: 1, path: "/exam-1/msk", prefix: "msk-", name: "Musculoskeletal", short: "MSK", status: "past", date: null,
    lectures: MSK_LECS.map((name, i) => ({n: i + 1, name, ready: true, q: count(msk.questions, i + 1), b: count(msk.blanks, i + 1), m: count(msk.muscles, i + 1)}))},
  {n: 2, path: "/exam-2/neuro", prefix: "neuro2-", name: "Neuroanatomy", short: "Neuro", status: "past", date: null,
    lectures: NEURO_LECS.map((name, i) => ({n: i + 1, name, ready: true, q: count(neuroData.QUESTIONS, i + 1), b: count(neuroData.BLANKS, i + 1), f: count(neuroData.FIGS, i + 1, "lec")}))},
  {n: 3, path: "/exam-3/cardio", prefix: "cardio-v2-", name: "Cardiovascular and respiratory", short: "Cardio", status: "current", date: "2026-11-16",
    lectures: C.LECTURES.map(L => ({n: L.n, name: L.ready ? L.name : "", ready: L.ready, q: count(cq, L.n), b: count(cb, L.n)}))},
];
writeFileSync(new URL("assets/exams.js", root),
  "// Generated by src/build-exams.mjs: the exams, their lectures and item counts, for the home page.\nwindow.A403_EXAMS=" + JSON.stringify(manifest) + ";\n");
console.log("wrote assets/exams.js:", manifest.map(e => e.short + " " + e.lectures.map(l => l.q + l.b).join("/")).join(", "));
