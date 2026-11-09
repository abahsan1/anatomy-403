// Builds exam-3/cardio.html from the Cardio sources: inlines the question bank
// and wraps the page in the same document skeleton the claude.ai artifact viewer adds.
import {readFileSync, writeFileSync} from "node:fs";

const dir = new URL("./exam-3-cardio/", import.meta.url);
const page = readFileSync(new URL("cardio-app.html", dir), "utf8");
const data = readFileSync(new URL("cardio-data.js", dir), "utf8");
const body = page.replace("/*DATA*/", () => data);
const head = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light;box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style></head><body>';

writeFileSync(new URL("../exam-3/cardio.html", import.meta.url), head + body + "</body></html>");
console.log("wrote exam-3/cardio.html");
