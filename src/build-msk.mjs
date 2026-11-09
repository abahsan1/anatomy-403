// Builds exam-1/msk.html: one Exam 1 page holding MSK lectures 1 to 5 as tabs.
// The five lecture quizzes in src/exam-1-msk/ are the sources; MSK3's copy of the quiz engine
// (the one with muscle flashcards) is the template. Open a lecture directly with #lecture-N.
import {readFileSync, writeFileSync} from "node:fs";

const LECS = ["Skeletal system basics", "Joints and skeletal muscle", "Head, neck and back", "Thorax, abdomen and upper limb", "Pelvis and lower limb"];
const src = n => readFileSync(new URL(`./exam-1-msk/msk${n}.html`, import.meta.url), "utf8");
const Q_RE = /const Q = (\[[\s\S]*?\n\]);/;

const all = [];
LECS.forEach((_, i) => {
  const Q = (0, eval)(src(i + 1).match(Q_RE)[1]);
  Q.forEach(q => all.push({l: i + 1, ...q}));
});

const swap = (s, from, to) => {
  if (!s.includes(from)) throw new Error("template changed, missing: " + from.slice(0, 60));
  return s.split(from).join(to);
};

let page = src(3).replace(Q_RE, () => "const Q = " + JSON.stringify(all) + ";");
page = swap(page, "<title>MSK3 Quiz: Head, Neck & Back</title>", "<title>MSK Exam 1 Practice</title>");
page = swap(page, "<h1>MSK3: Head, Neck &amp; Back</h1>", "<h1>Exam 1. Musculoskeletal</h1>");
page = page.replace(/<p>Multiple choice mixed with fill-in-the-blank\.[^<]*<\/p>/,
  "<p>MSK lectures 1 to 5: multiple choice, fill in the blank, and muscle flashcards for lectures 3 to 5. Pick a lecture or practice them all.</p>");
page = swap(page, '  <div class="controls">',
  '  <div class="lecs" role="group" aria-label="Lecture">\n' +
  '    <button data-lec="0" aria-pressed="true">All lectures</button>\n' +
  LECS.map((name, i) => `    <button data-lec="${i + 1}" aria-pressed="false"><b>MSK${i + 1}</b> ${name}</button>\n`).join("") +
  '  </div>\n\n  <div class="controls">');

// lecture state, a per-lecture topic menu, and #lecture-N links
page = swap(page, 'let filter="all", topic="all", deck=[], idx=0;', 'let filter="all", topic="all", deck=[], idx=0, lec=0;\nconst QL=()=>Q.filter(q=>!lec||q.l===lec);');
page = page.replace(/\[\.\.\.new Set\(Q\.map\(q=>q\.s\)\)\]\.forEach\([^\n]*\n/, () =>
  'function fillTopics(){topicSel.length=1;topicSel.value="all";const P=QL();[...new Set(P.map(q=>q.s))].forEach(t=>{const o=document.createElement("option");o.value=t;o.textContent=`${t} (${P.filter(q=>q.s===t).length})`;topicSel.appendChild(o)});}\n' +
  '{const m=location.hash.match(/^#lecture-([1-5])$/);if(m)lec=+m[1];}\n' +
  'fillTopics();\n');
page = swap(page, "const pool = onlyFlagged ? Q.filter(", "const pool = onlyFlagged ? QL().filter(");
page = swap(page, " : Q.filter(q=> topic===", " : QL().filter(q=> topic===");
page = swap(page, "Q.filter(isF)", "QL().filter(isF)");
page = swap(page, "Q.some(isF)", "QL().some(isF)");
page = swap(page, '<p class="kind">Question ${idx+1} of ${deck.length}, ', '<p class="kind">${lec?"":"MSK"+q.l+". "}Question ${idx+1} of ${deck.length}, ');
page = swap(page, '<p class="kind">Card ${idx+1} of ${deck.length}, ', '<p class="kind">${lec?"":"MSK"+q.l+". "}Card ${idx+1} of ${deck.length}, ');
page = swap(page, "\nupdateFlagCount();\nbuild();",
  "\nfunction setLec(n){lec=n;topic=\"all\";fillTopics();document.querySelectorAll(\"[data-lec]\").forEach(b=>b.setAttribute(\"aria-pressed\",+b.dataset.lec===lec));updateFlagCount();build()}\n" +
  "document.querySelectorAll(\"[data-lec]\").forEach(b=>b.onclick=()=>{setLec(+b.dataset.lec);history.replaceState(null,\"\",lec?\"#lecture-\"+lec:location.pathname)});\n" +
  "window.addEventListener(\"hashchange\",()=>{const m=location.hash.match(/^#lecture-([1-5])$/);const n=m?+m[1]:0;if(n!==lec)setLec(n)});\n" +
  "document.querySelectorAll(\"[data-lec]\").forEach(b=>b.setAttribute(\"aria-pressed\",+b.dataset.lec===lec));\n" +
  "updateFlagCount();\nbuild();");

writeFileSync(new URL("../exam-1/msk.html", import.meta.url), page);
console.log("wrote exam-1/msk.html with", all.length, "items across", LECS.length, "lectures");
