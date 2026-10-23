// Builds everything in public/data from open sources:
//   - Bible texts (public domain) from github.com/scrollmapper/bible_databases
//   - Cross-references (CC-BY) from openbible.info
// Run with: npm run data (dev and build run it automatically)
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const CACHE = join(ROOT, ".cache");
const FINAL = join(ROOT, "public", "data");
// Everything is written here first and renamed into place at the very end,
// so an interrupted run never leaves a partial dataset behind.
const OUT = `${FINAL}.partial`;

const TRANSLATIONS = ["BSB", "KJV", "ASV", "YLT", "Darby"];
const TEXT_URL = (t) =>
  `https://raw.githubusercontent.com/scrollmapper/bible_databases/master/formats/json/${t}.json`;
const XREF_URL = "https://a.openbible.info/data/cross-references.zip";

// Order matches both sources. [osis, display name]; short label is derived.
const BOOKS = [
  ["Gen", "Genesis"], ["Exod", "Exodus"], ["Lev", "Leviticus"], ["Num", "Numbers"],
  ["Deut", "Deuteronomy"], ["Josh", "Joshua"], ["Judg", "Judges"], ["Ruth", "Ruth"],
  ["1Sam", "1 Samuel"], ["2Sam", "2 Samuel"], ["1Kgs", "1 Kings"], ["2Kgs", "2 Kings"],
  ["1Chr", "1 Chronicles"], ["2Chr", "2 Chronicles"], ["Ezra", "Ezra"], ["Neh", "Nehemiah"],
  ["Esth", "Esther"], ["Job", "Job"], ["Ps", "Psalms"], ["Prov", "Proverbs"],
  ["Eccl", "Ecclesiastes"], ["Song", "Song of Songs"], ["Isa", "Isaiah"], ["Jer", "Jeremiah"],
  ["Lam", "Lamentations"], ["Ezek", "Ezekiel"], ["Dan", "Daniel"], ["Hos", "Hosea"],
  ["Joel", "Joel"], ["Amos", "Amos"], ["Obad", "Obadiah"], ["Jonah", "Jonah"], ["Mic", "Micah"],
  ["Nah", "Nahum"], ["Hab", "Habakkuk"], ["Zeph", "Zephaniah"], ["Hag", "Haggai"],
  ["Zech", "Zechariah"], ["Mal", "Malachi"], ["Matt", "Matthew"], ["Mark", "Mark"],
  ["Luke", "Luke"], ["John", "John"], ["Acts", "Acts"], ["Rom", "Romans"],
  ["1Cor", "1 Corinthians"], ["2Cor", "2 Corinthians"], ["Gal", "Galatians"], ["Eph", "Ephesians"],
  ["Phil", "Philippians"], ["Col", "Colossians"], ["1Thess", "1 Thessalonians"],
  ["2Thess", "2 Thessalonians"], ["1Tim", "1 Timothy"], ["2Tim", "2 Timothy"], ["Titus", "Titus"],
  ["Phlm", "Philemon"], ["Heb", "Hebrews"], ["Jas", "James"], ["1Pet", "1 Peter"],
  ["2Pet", "2 Peter"], ["1John", "1 John"], ["2John", "2 John"], ["3John", "3 John"],
  ["Jude", "Jude"], ["Rev", "Revelation"],
];

async function download(url, file) {
  if (existsSync(file)) return;
  console.log(`↓ ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  writeFileSync(file, Buffer.from(await res.arrayBuffer()));
}

if (process.argv.includes("--if-missing") && existsSync(join(FINAL, "books.json"))) process.exit(0);

mkdirSync(CACHE, { recursive: true });
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

// ---- Texts -------------------------------------------------------------
const texts = {};
for (const t of TRANSLATIONS) {
  const file = join(CACHE, `${t}.json`);
  await download(TEXT_URL(t), file);
  texts[t] = JSON.parse(readFileSync(file, "utf8")).books;
  if (texts[t].length !== 66) throw new Error(`${t}: expected 66 books`);
}

// Verse skeleton from KJV versification (all five share it).
const skeleton = texts.KJV;
const books = [];
let start = 0;
skeleton.forEach((b, i) => {
  const chapters = b.chapters.map((c) => c.verses.length);
  books.push({
    osis: BOOKS[i][0],
    name: BOOKS[i][1],
    short: BOOKS[i][0].replace(/^(\d)/, "$1 "),
    nt: i >= 39,
    start,
    chapters,
  });
  start += chapters.reduce((a, n) => a + n, 0);
});
const TOTAL = start;
writeFileSync(join(OUT, "books.json"), JSON.stringify({ total: TOTAL, books }));

const osisIndex = Object.fromEntries(books.map((b, i) => [b.osis, i]));
function verseIndex(ref) {
  const [osis, c, v] = ref.split(".");
  const bi = osisIndex[osis];
  if (bi === undefined) return -1;
  const b = books[bi];
  const ci = Number(c) - 1;
  if (ci < 0 || ci >= b.chapters.length || v < 1 || v > b.chapters[ci]) return -1;
  let idx = b.start;
  for (let k = 0; k < ci; k++) idx += b.chapters[k];
  return idx + Number(v) - 1;
}

for (const t of TRANSLATIONS) {
  const dir = join(OUT, "text", t);
  mkdirSync(dir, { recursive: true });
  texts[t].forEach((b, i) => {
    const chapters = b.chapters.map((c, ci) => {
      if (c.verses.length !== books[i].chapters[ci]) {
        throw new Error(`${t} ${b.name} ${ci + 1}: verse count mismatch`);
      }
      return c.verses.map((v) => v.text.trim());
    });
    writeFileSync(join(dir, `${i}.json`), JSON.stringify(chapters));
  });
}

// ---- Cross-references ---------------------------------------------------
const zip = join(CACHE, "cross-references.zip");
await download(XREF_URL, zip);
execFileSync("unzip", ["-o", "-q", zip, "-d", CACHE]);
const lines = readFileSync(join(CACHE, "cross_references.txt"), "utf8").trim().split("\n").slice(1);

const pairs = new Map(); // undirected, for arcs
const byBook = books.map(() => ({})); // directed, for the reader
let skipped = 0;
for (const line of lines) {
  const [from, to, votesRaw] = line.split("\t");
  const votes = Number(votesRaw);
  const [toA, toB] = to.split("-");
  const a = verseIndex(from);
  const b = verseIndex(toA);
  const bEnd = toB ? verseIndex(toB) : b;
  if (a < 0 || b < 0 || bEnd < 0) {
    skipped++;
    continue;
  }
  const key = a < b ? a * TOTAL + b : b * TOTAL + a;
  if (a !== b) pairs.set(key, Math.max(pairs.get(key) ?? -Infinity, votes));

  const [osis, c, v] = from.split(".");
  const bucket = byBook[osisIndex[osis]];
  (bucket[`${c}.${v}`] ??= []).push([b, bEnd, votes]);
}

// arcs.bin: Int16 triples [a, b, votes], sorted short → long so the
// visualization can bloom outward as it loads.
const arcs = [...pairs].map(([key, votes]) => [Math.floor(key / TOTAL), key % TOTAL, votes]);
arcs.sort((x, y) => x[1] - x[0] - (y[1] - y[0]));
const buf = new Int16Array(arcs.length * 3);
arcs.forEach(([a, b, v], i) => {
  buf[i * 3] = a;
  buf[i * 3 + 1] = b;
  buf[i * 3 + 2] = Math.max(-32768, Math.min(32767, v));
});
writeFileSync(join(OUT, "arcs.bin"), Buffer.from(buf.buffer));

// og-arcs.json: the most-voted arcs, a light backdrop for share images.
const ogArcs = [...arcs].sort((x, y) => y[2] - x[2]).slice(0, 900);
writeFileSync(join(OUT, "og-arcs.json"), JSON.stringify({ total: TOTAL, arcs: ogArcs }));

const xrefDir = join(OUT, "xref");
mkdirSync(xrefDir, { recursive: true });
byBook.forEach((bucket, i) => {
  for (const k in bucket) bucket[k].sort((x, y) => y[2] - x[2]);
  writeFileSync(join(xrefDir, `${i}.json`), JSON.stringify(bucket));
});

rmSync(FINAL, { recursive: true, force: true });
renameSync(OUT, FINAL);

console.log(`✓ ${TOTAL} verses · ${TRANSLATIONS.length} translations · ${arcs.length} arcs · ${lines.length - skipped} cross-references (${skipped} skipped)`);
