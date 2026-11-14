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

  // A multi-run scan must retain its original 24-hour cutoff.
  const resumeStateFile = path.join(dir, "resume-state.json");
  const baseNow = Date.parse("2026-11-15T00:00:00.000Z");
  const originalNow = Date.now;
  const resumeCalls = [];
  let discordPage = 0;
  const makeMessage = (id, timestamp, url = "") => ({
    id: String(id),
    timestamp: new Date(timestamp).toISOString(),
    content: url ? "抽選 " + url : "投稿",
    embeds: []
  });
  try {
    Date.now = () => baseNow;
    const firstRun = await runScan({
      stateFile: resumeStateFile,
      env: {
        GAS_CAPTURE_URL: "https://gas.example/exec",
        GAS_URL_QUEUE_SECRET: "queue-secret",
        DISCORD_BOT_TOKEN: "discord-token"
      },
      fetchImpl: async (url, options) => {
        resumeCalls.push({ url, options });
        if (String(url).startsWith("https://discord.com/")) {
          discordPage += 1;
          const start = 300 - (discordPage - 1) * 100;
          return {
            ok: true,
            status: 200,
            text: async () => JSON.stringify(Array.from({ length: 100 }, (_, i) =>
              makeMessage(1570000000000000000 + start - i, baseNow - 60 * 60 * 1000,
                discordPage === 1 && i === 0 ? "https://livepocket.jp/e/first" : "")
            ))
          };
        }
        return { ok: true, status: 200, text: async () => JSON.stringify({ ok: true, accepted: 1 }) };
      }
    });
    assert.equal(firstRun.status, "page_limit");
    const savedAfterFirstRun = JSON.parse(fs.readFileSync(resumeStateFile, "utf8"));
    assert.ok(savedAfterFirstRun.scan);
    assert.equal(savedAfterFirstRun.scan.cutoffAt, new Date(baseNow - 24 * 60 * 60 * 1000).toISOString());

    Date.now = () => baseNow + 25 * 60 * 60 * 1000;
    const secondRun = await runScan({
      stateFile: resumeStateFile,
      env: {
        GAS_CAPTURE_URL: "https://gas.example/exec",
        GAS_URL_QUEUE_SECRET: "queue-secret",
        DISCORD_BOT_TOKEN: "discord-token"
      },
      fetchImpl: async (url, options) => {
        resumeCalls.push({ url, options });
        if (String(url).startsWith("https://discord.com/")) {
          return {
            ok: true,
            status: 200,
            text: async () => JSON.stringify([
              makeMessage(1570000000000000000, baseNow - 23 * 60 * 60 * 1000, "https://livepocket.jp/e/continued")
            ])
          };
        }
        return { ok: true, status: 200, text: async () => JSON.stringify({ ok: true, accepted: 1 }) };
      }
    });
    assert.equal(secondRun.status, "caught_up");
    const continuedPost = resumeCalls
      .filter(call => !String(call.url).startsWith("https://discord.com/"))
      .map(call => JSON.parse(call.options.body))
      .flatMap(body => body.items || [])
      .find(item => item.url === "https://livepocket.jp/e/continued");
    assert.ok(continuedPost, "message within the original 24-hour window must survive a delayed resume");
    const savedAfterSecondRun = JSON.parse(fs.readFileSync(resumeStateFile, "utf8"));
    assert.equal(savedAfterSecondRun.scan, null);
    assert.equal(savedAfterSecondRun.cursor, "1570000000000000300");
  } finally {
    Date.now = originalNow;
  }

  fs.rmSync(dir, { recursive: true, force: true });
  console.log("DIRECT_DISCORD_SUBMISSION_SCAN_V1_TEST: PASS");
})().catch(error => { console.error(error); process.exitCode = 1; });
