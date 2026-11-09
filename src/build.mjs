// Builds everything generated:
// - exam-1/msk.html and exam-3/cardio.html, on the Exam 2 page's design (src/build-exams.mjs)
// - src/exam-3-cardio/artifact.html, the separate claude.ai Cardio artifact (its own design, page content only)
import {readFileSync, writeFileSync} from "node:fs";

const dir = new URL("./exam-3-cardio/", import.meta.url);
const read = name => readFileSync(new URL(name, dir), "utf8");
const page = read("cardio-app.html")
  .replace("/*STYLE*/", () => read("cardio-style.css"))
  .replace("/*DATA*/", () => read("cardio-data.js"));


writeFileSync(new URL("artifact.html", dir), page.replace("<!--BACK-->\n", ""));
console.log("wrote src/exam-3-cardio/artifact.html");
await import("./build-exams.mjs");
