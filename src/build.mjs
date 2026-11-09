// Builds the Cardio page from src/exam-3-cardio/: inlines the stylesheet and the question bank.
// Writes two copies: exam-3/cardio.html for the site (full document, with a link back to all exams)
// and src/exam-3-cardio/artifact.html for the claude.ai artifact (page content only, no back link).
import {readFileSync, writeFileSync} from "node:fs";

const dir = new URL("./exam-3-cardio/", import.meta.url);
const read = name => readFileSync(new URL(name, dir), "utf8");
const page = read("cardio-app.html")
  .replace("/*STYLE*/", () => read("cardio-style.css"))
  .replace("/*DATA*/", () => read("cardio-data.js"));

const back = '<a class="xback" href="/"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>All exams</a>';
const head = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light;box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style></head><body>';

writeFileSync(new URL("../exam-3/cardio.html", import.meta.url), head + page.replace("<!--BACK-->", () => back + '\n<script src="/assets/sync.js"></script>') + "</body></html>");
writeFileSync(new URL("artifact.html", dir), page.replace("<!--BACK-->\n", ""));
console.log("wrote exam-3/cardio.html and src/exam-3-cardio/artifact.html");
