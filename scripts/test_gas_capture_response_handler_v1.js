"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const vm = require("node:vm");

const workflow = fs.readFileSync(".github/workflows/router.yml", "utf8");
const match = workflow.match(/const rawResponse = fs\\.readFileSync\\(responsePath, 'utf8'\\)[\\s\\S]*?console\\.log\\('GAS_PULL_PREFECTURE_PRESENT:'[\\s\\S]*?\\);/);
assert.ok(match, "router workflow must contain the GAS capture response handler");

function execute(raw, existingCapture = true) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gas-capture-handler-"));
  const responsePath = path.join(dir, "response.json");
  const targetPath = path.join(dir, "data", "livepocket_gas_capture.json");
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(responsePath, raw);
  if (existingCapture) fs.writeFileSync(targetPath, JSON.stringify({ url: "old" }));
  let exitCode = null;
  const logs = [];
  const sandbox = {
    require,
    process: { cwd: () => dir, exit: code => { exitCode = code; } },
    console: { log: value => logs.push(String(value)) }
  };
  const handler = match[0]
    .replaceAll("'/tmp/livepocket_gas_response.json'", JSON.stringify(responsePath))
    .replaceAll("path.join(process.cwd(), 'data', 'livepocket_gas_capture.json')", JSON.stringify(targetPath));
  vm.runInNewContext(handler, sandbox);
  const exists = fs.existsSync(targetPath);
  const saved = exists ? JSON.parse(fs.readFileSync(targetPath, "utf8")) : null;
  fs.rmSync(dir, { recursive: true, force: true });
  return { exitCode, logs, exists, saved };
}

const html = execute("<!doctype html><html>login</html>");
assert.equal(html.exitCode, 0);
assert.equal(html.exists, false);
assert.ok(html.logs.some(x => x.includes("non-JSON response")));

const valid = execute(JSON.stringify({
  ok: true,
  capture: {
    url: "https://t.livepocket.jp/e/example",
    sourceType: "livepocket",
    capturedAt: "2026-11-14T00:00:00.000Z"
  }
}));
assert.equal(valid.exitCode, null);
assert.equal(valid.saved.url, "https://t.livepocket.jp/e/example");

const empty = execute(JSON.stringify({ ok: true, capture: null }));
assert.equal(empty.exitCode, 0);
assert.equal(empty.exists, false);

console.log("GAS capture response handler tests passed (HTML, valid JSON, empty capture).");
