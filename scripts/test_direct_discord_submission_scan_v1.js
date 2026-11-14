"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { runScan, extractUrls, normalizeLivePocketUrl } = require("./direct_discord_submission_scan_v1.js");

(async () => {
  assert.equal(normalizeLivePocketUrl("https://t.livepocket.jp/e/abc?x=1"), "https://livepocket.jp/e/abc");
  assert.deepEqual(extractUrls({ content: "https://livepocket.jp/e/abc and https://example.com" }), ["https://livepocket.jp/e/abc"]);

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "discord-scan-"));
  const stateFile = path.join(dir, "state.json");
  const calls = [];
  const now = new Date().toISOString();
  const result = await runScan({
    stateFile,
    env: {
      GAS_CAPTURE_URL: "https://gas.example/exec",
      GAS_URL_QUEUE_SECRET: "queue-secret",
      DISCORD_BOT_TOKEN: "discord-token"
    },
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      if (String(url).startsWith("https://discord.com/")) {
        return { ok: true, status: 200, text: async () => JSON.stringify([
          { id: "1570000000000000001", timestamp: now, content: "抽選 https://livepocket.jp/e/abc", embeds: [] }
        ]) };
      }
      return { ok: true, status: 200, text: async () => JSON.stringify({ ok: true, status: "queued", accepted: 1 }) };
    }
  });
  assert.equal(result.status, "caught_up");
  assert.equal(result.queued, 1);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].options.headers.Authorization, "Bot discord-token");
  const posted = JSON.parse(calls[1].options.body);
  assert.equal(posted.kind, "url_queue");
  assert.equal(posted.secret, "queue-secret");
  assert.equal(posted.items[0].url, "https://livepocket.jp/e/abc");
  assert.equal(posted.discordBotToken, undefined);
  const state = JSON.parse(fs.readFileSync(stateFile, "utf8"));
  assert.equal(state.cursor, "1570000000000000001");
  assert.equal(state.scan, null);
  fs.rmSync(dir, { recursive: true, force: true });
  console.log("DIRECT_DISCORD_SUBMISSION_SCAN_V1_TEST: PASS");
})().catch(error => { console.error(error); process.exitCode = 1; });
