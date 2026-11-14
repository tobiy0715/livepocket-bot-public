"use strict";

async function runScan(options = {}) {
  const env = options.env || process.env;
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const endpoint = String(env.GAS_CAPTURE_URL || "").trim();
  const secret = String(env.GAS_URL_QUEUE_SECRET || "").trim();
  const discordBotToken = String(env.DISCORD_BOT_TOKEN || "").trim();
  if (!endpoint) throw new Error("GAS_CAPTURE_URL is required");
  if (!secret) throw new Error("GAS_URL_QUEUE_SECRET is required");
  if (!discordBotToken) throw new Error("DISCORD_BOT_TOKEN is required");
  if (typeof fetchImpl !== "function") throw new Error("fetch is unavailable");

  const response = await fetchImpl(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    redirect: "follow",
    body: JSON.stringify({
      kind: "discord_submission_scan_v1",
      schemaVersion: 1,
      secret,
      discordBotToken
    })
  });
  const raw = await response.text();
  let result;
  try { result = JSON.parse(raw); }
  catch (_) { throw new Error("GAS Discord scan returned non-JSON response (HTTP " + response.status + ")"); }
  if (!response.ok || result.ok !== true) {
    throw new Error("GAS Discord scan failed: " + String(result.error || result.status || response.status));
  }
  console.log(
    "GAS_DISCORD_SCAN_V1: status=" + String(result.status || "unknown") +
    " mode=" + String(result.mode || "unknown") +
    " scanned=" + Number(result.scanned || 0) +
    " queued=" + Number(result.queued || 0) +
    " pages=" + Number(result.pages || 0)
  );
  return result;
}

if (require.main === module) {
  runScan().catch(error => {
    console.error("GAS_DISCORD_SCAN_V1_ERROR: " + String(error.message || error));
    process.exitCode = 1;
  });
}

module.exports = { runScan };
