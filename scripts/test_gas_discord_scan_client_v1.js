"use strict";
const assert = require("node:assert/strict");
const { runScan } = require("./gas_discord_scan_client_v1.js");

(async () => {
  let request;
  const expected = { ok: true, status: "backfill_complete", mode: "backfill", scanned: 2, queued: 1, pages: 2 };
  const result = await runScan({
    env: {
      GAS_CAPTURE_URL: "https://example.test/exec",
      GAS_URL_QUEUE_SECRET: "queue-secret",
      DISCORD_BOT_TOKEN: "discord-token"
    },
    fetchImpl: async (url, options) => {
      request = { url, options };
      return { ok: true, status: 200, text: async () => JSON.stringify(expected) };
    }
  });
  assert.deepEqual(result, expected);
  assert.equal(request.url, "https://example.test/exec");
  assert.equal(request.options.method, "POST");
  const body = JSON.parse(request.options.body);
  assert.equal(body.kind, "discord_submission_scan_v1");
  assert.equal(body.schemaVersion, 1);
  assert.equal(body.secret, "queue-secret");
  assert.equal(body.discordBotToken, "discord-token");

  await assert.rejects(() => runScan({ env: {}, fetchImpl: async () => {} }), /GAS_CAPTURE_URL/);
  await assert.rejects(() => runScan({
    env: { GAS_CAPTURE_URL: "https://example.test/exec", GAS_URL_QUEUE_SECRET: "s", DISCORD_BOT_TOKEN: "t" },
    fetchImpl: async () => ({ ok: true, status: 200, text: async () => "not-json" })
  }), /non-JSON/);
  await assert.rejects(() => runScan({
    env: { GAS_CAPTURE_URL: "https://example.test/exec", GAS_URL_QUEUE_SECRET: "s", DISCORD_BOT_TOKEN: "t" },
    fetchImpl: async () => ({ ok: true, status: 200, text: async () => JSON.stringify({ ok: false, error: "DISCORD_SCAN_AUTH_FAILED" }) })
  }), /DISCORD_SCAN_AUTH_FAILED/);
  console.log("GAS_DISCORD_SCAN_CLIENT_V1_TEST: PASS");
})().catch(error => { console.error(error); process.exitCode = 1; });
