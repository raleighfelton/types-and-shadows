// Checks every reference in src/data/typology.json against the Bible text
// and writes REVIEW.md: each entry with its passages printed in full, so a
// reviewer can confirm the link is in the text itself.
// Run with: npm run verify (after npm run data)
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const DATA = join(ROOT, "public", "data");
const TRANSLATION = process.argv[2] ?? "BSB";

const { books } = JSON.parse(readFileSync(join(DATA, "books.json"), "utf8"));
const { entries, themes, tiers } = JSON.parse(
  readFileSync(join(ROOT, "src", "data", "typology.json"), "utf8"),
);
const osis = Object.fromEntries(books.map((b, i) => [b.osis, i]));
const textCache = {};
const text = (bi) =>
  (textCache[bi] ??= JSON.parse(readFileSync(join(DATA, "text", TRANSLATION, `${bi}.json`), "utf8")));

const RE = /^(\w+) (\d+):(\d+)(?:-(\d+))?$/;
const errors = [];

function passage(ref, where) {
  const m = RE.exec(ref);
  if (!m) return errors.push(`${where}: cannot parse "${ref}"`), null;
  const [, book, c, v1, v2] = m;
  const bi = osis[book];
  if (bi === undefined) return errors.push(`${where}: unknown book "${book}"`), null;
  const chapter = text(bi)[Number(c) - 1];
  const from = Number(v1);
  const to = Number(v2 ?? v1);
  if (!chapter || from < 1 || to < from || to > chapter.length) {
    return errors.push(`${where}: "${ref}" is out of range`), null;
  }
  const label = `${books[bi].name} ${c}:${v1}${v2 ? `-${v2}` : ""}`;
  const verses = chapter.slice(from - 1, to).map((t, i) => `<sup>${from + i}</sup> ${t}`);
  return { label, body: verses.join(" ") };
}

const ids = new Set();
const out = [
  `# Types & Shadows · review sheet (${TRANSLATION})`,
  "",
  "Every entry must be supported by the New Testament text printed under it. Mark each one ✅ approved, ✏️ needs edit, or ❌ remove.",
  "",
];
for (const tier of Object.keys(tiers)) {
  const list = entries.filter((e) => e.tier === tier);
  out.push(`## ${tiers[tier].label} (${list.length})`, "", `_${tiers[tier].description}_`, "");
  for (const e of list) {
    if (ids.has(e.id)) errors.push(`duplicate id ${e.id}`);
    ids.add(e.id);
    if (!themes[e.theme]) errors.push(`${e.id}: unknown theme ${e.theme}`);
    const anchorInSubstance = e.substance.some((ref) => {
      const [a, s] = [RE.exec(e.anchor), RE.exec(ref)];
      return a && s && a[1] === s[1] && a[2] === s[2] && +a[3] >= +s[3] && +a[3] <= +(s[4] ?? s[3]);
    });
    if (!anchorInSubstance) errors.push(`${e.id}: anchor ${e.anchor} is not inside a substance passage`);
    if (books[osis[RE.exec(e.anchor)?.[1]]]?.nt !== true) errors.push(`${e.id}: anchor must be New Testament`);

    out.push(`### [ ] ${e.title}`, "", `\`${e.id}\` · ${themes[e.theme]?.label}${e.word ? ` · ${e.word}` : ""}`, "", `> ${e.note}`, "");
    for (const [side, refs] of [["Shadow", e.shadow], ["Substance", e.substance]]) {
      for (const ref of refs) {
        const p = passage(ref, `${e.id}.${side}`);
        if (p) out.push(`**${side} · ${p.label}**${ref === e.anchor ? " (anchor)" : ""}`, "", p.body, "");
      }
    }
    passage(e.anchor, `${e.id}.anchor`);
  }
}

writeFileSync(join(ROOT, "REVIEW.md"), out.join("\n"));
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(`✓ ${entries.length} entries, all references valid. Wrote REVIEW.md`);
