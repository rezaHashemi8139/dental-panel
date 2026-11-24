// Checks every language file in src/locales against the reference, fa.json:
// no missing or extra keys, the same {{placeholders}}, and non-empty values.
// Usage: pnpm check-locales  (exits with 1 if anything is wrong)

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const LOCALES = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "src", "locales");
const REFERENCE = "fa.json";

/** Flattens nested text into "a.b.c" → value, without `_meta`. */
function flatten(object, prefix = "", out = new Map()) {
  for (const [key, value] of Object.entries(object)) {
    if (!prefix && key === "_meta") continue;
    const name = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === "object") flatten(value, name, out);
    else out.set(name, value);
  }
  return out;
}

const placeholders = (text) => [...String(text).matchAll(/\{\{\s*([^}\s]+)\s*\}\}/g)].map((m) => m[1]).sort().join(",");

const read = (file) => JSON.parse(readFileSync(path.join(LOCALES, file), "utf8"));
const reference = flatten(read(REFERENCE));
const problems = [];

for (const file of readdirSync(LOCALES).filter((name) => name.endsWith(".json"))) {
  const json = read(file);
  const code = file.slice(0, -".json".length);
  if (json._meta?.code !== code) problems.push(`${file}: _meta.code should be "${code}"`);

  const texts = flatten(json);
  for (const [key, value] of reference) {
    if (!texts.has(key)) problems.push(`${file}: missing "${key}"`);
    else if (typeof texts.get(key) !== "string" || texts.get(key).trim() === "") problems.push(`${file}: empty "${key}"`);
    else if (placeholders(texts.get(key)) !== placeholders(value)) problems.push(`${file}: placeholders differ in "${key}"`);
  }
  for (const key of texts.keys()) {
    if (!reference.has(key)) problems.push(`${file}: "${key}" is not in ${REFERENCE}`);
  }
}

if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}
console.log("All language files match fa.json.");
