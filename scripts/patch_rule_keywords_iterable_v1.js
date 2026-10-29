const fs = require("fs");
const file = "bot/index.js";

if (!fs.existsSync(file)) throw new Error(`RULE_KEYWORDS_ITERABLE_V1: missing ${file}`);

let src = fs.readFileSync(file, "utf8");
const marker = "RULE_KEYWORDS_ITERABLE_V1_APPLIED";
if (src.includes(marker)) {
  console.log(`${marker}: already applied`);
  process.exit(0);
}

const before = src;

// Some runtime rule objects can carry a missing/non-array `keywords` value.
// Normalize every direct rule.keywords access so iteration and array helpers
// cannot throw `rule.keywords is not iterable` during URL analysis.
src = src.replace(/\brule\.keywords\b/g, "(Array.isArray(rule?.keywords) ? rule.keywords : [])");

if (src === before) {
  console.log(`${marker}: no direct rule.keywords access found; no-op`);
  process.exit(0);
}

src = `// ${marker}\n${src}`;
fs.writeFileSync(file, src);
console.log(`${marker}: applied`);
