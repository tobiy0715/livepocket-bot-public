"use strict";

const fs = require("node:fs");
const path = require("node:path");

const CHANNEL_ID = "1557256727894691891";
const PAGE_SIZE = 100;
const MAX_PAGES_PER_RUN = 3;
const LOOKBACK_MS = 24 * 60 * 60 * 1000;
const QUEUE_BATCH_SIZE = 20;

function normalizeLivePocketUrl(value) {
  try {
    const u = new URL(String(value || "").trim());
    if (u.protocol !== "https:" || !["livepocket.jp", "t.livepocket.jp"].includes(u.hostname.toLowerCase())) return "";
    const m = u.pathname.match(/^\/e\/([A-Za-z0-9_-]+)\/?$/i);
    return m ? "https://livepocket.jp/e/" + m[1] : "";
  } catch { return ""; }
}

function extractUrls(message) {
  const parts = [String(message?.content || "")];
  for (const embed of Array.isArray(message?.embeds) ? message.embeds : []) {
    parts.push(embed?.url, embed?.title, embed?.description);
    for (const field of Array.isArray(embed?.fields) ? embed.fields : []) parts.push(field?.name, field?.value);
  }
  const found = new Set();
  const re = /https?:\/\/(?:t\.)?(?:www\.)?livepocket\.jp\/e\/[A-Za-z0-9_-]+(?:[?#][^\s<>"']*)?/gi;
  for (const part of parts.filter(Boolean)) {
    let match;
    while ((match = re.exec(String(part))) !== null) {
      const url = normalizeLivePocketUrl(match[0].replace(/[),.、。]+$/, ""));
      if (url) found.add(url);
    }
  }
  return [...found];
}

function readState(file) {
  if (!fs.existsSync(file)) return { schemaVersion: 1, cursor: "", scan: null, pending: [] };
  const value = JSON.parse(fs.readFileSync(file, "utf8"));
  if (Number(value?.schemaVersion) !== 1 || !Array.isArray(value.pending)) throw new Error("DISCORD_SCAN_STATE_INVALID");
  return { schemaVersion: 1, cursor: String(value.cursor || ""), scan: value.scan || null, pending: value.pending };
}

function writeState(file, state) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(state, null, 2) + "\n", "utf8");
}

async function requestJson(fetchImpl, url, options) {
  const response = await fetchImpl(url, { ...options, signal: options?.signal || AbortSignal.timeout(30000) });
  const raw = await response.text();
  let body;
  try { body = JSON.parse(raw); } catch { throw new Error("API_NON_JSON_HTTP_" + response.status); }
  if (!response.ok) {
    const code = body?.code ? " code=" + body.code : "";
    throw new Error("API_HTTP_" + response.status + code + ": " + String(body?.message || "").slice(0, 200));
  }
  return body;
}

async function postPending(fetchImpl, endpoint, secret, state) {
  if (!state.pending.length) return 0;
  const batch = state.pending.slice(0, QUEUE_BATCH_SIZE);
  const result = await requestJson(fetchImpl, endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ kind: "url_queue", schemaVersion: 1, secret, items: batch })
  });
  if (result.ok !== true) throw new Error("GAS_QUEUE_REJECTED: " + String(result.error || "unknown"));
  state.pending.splice(0, batch.length);
  return batch.length;
}

async function runScan(options = {}) {
  const env = options.env || process.env;
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const endpoint = String(env.GAS_CAPTURE_URL || "").trim();
  const secret = String(env.GAS_URL_QUEUE_SECRET || "").trim();
  const token = String(env.DISCORD_BOT_TOKEN || "").trim();
  const stateFile = options.stateFile || path.join(process.cwd(), "data", "gas_discord_scan_state_v1.json");
  if (!endpoint) throw new Error("GAS_CAPTURE_URL is required");
  if (!secret) throw new Error("GAS_URL_QUEUE_SECRET is required");
  if (!token) throw new Error("DISCORD_BOT_TOKEN is required");
  if (typeof fetchImpl !== "function") throw new Error("fetch is unavailable");

  const state = readState(stateFile);
  let queued = 0, scanned = 0, pages = 0;
  queued += await postPending(fetchImpl, endpoint, secret, state);
  if (state.pending.length) {
    writeState(stateFile, state);
    console.log("DISCORD_SUBMISSION_SCAN_V1: pending_backlog=" + state.pending.length + " queued=" + queued);
    return { status: "pending_backlog", queued, scanned, pages };
  }

  const savedCutoff = state.scan?.cutoffAt ? Date.parse(state.scan.cutoffAt) : NaN;
  const cutoff = Number.isFinite(savedCutoff) ? savedCutoff : Date.now() - LOOKBACK_MS;
  while (pages < MAX_PAGES_PER_RUN) {
    let url = "https://discord.com/api/v10/channels/" + CHANNEL_ID + "/messages?limit=" + PAGE_SIZE;
    if (state.scan?.before) url += "&before=" + encodeURIComponent(state.scan.before);
    else if (!state.scan && state.cursor) url += "&after=" + encodeURIComponent(state.cursor);

    const batch = await requestJson(fetchImpl, url, {
      method: "GET",
      headers: { Authorization: "Bot " + token }
    });
    if (!Array.isArray(batch)) throw new Error("DISCORD_API_RESPONSE_INVALID");
    pages += 1;
    scanned += batch.length;

    if (!state.scan) {
      if (!batch.length) break;
      const target = batch.reduce((max, m) => String(m?.id || "") > max ? String(m.id) : max, "");
      if (!/^\d{17,20}$/.test(target)) throw new Error("DISCORD_MESSAGE_ID_INVALID");
      state.scan = { target, origin: state.cursor, before: "", cutoffAt: new Date(cutoff).toISOString() };
    }

    const eligible = [];
    let crossedCutoff = false;
    for (const message of batch) {
      const id = String(message?.id || "");
      const created = Date.parse(message?.timestamp || "");
      if (!/^\d{17,20}$/.test(id) || !Number.isFinite(created)) throw new Error("DISCORD_MESSAGE_INVALID");
      if (created < cutoff) { crossedCutoff = true; continue; }
      if ((!state.scan.origin || id > state.scan.origin) && id <= state.scan.target) eligible.push(message);
    }

    const seen = new Set(state.pending.map(x => x.url));
    for (const message of eligible) {
      for (const url of extractUrls(message)) {
        if (seen.has(url)) continue;
        seen.add(url);
        state.pending.push({ messageId: String(message.id), url, prefectureCandidate: "" });
      }
    }

    queued += await postPending(fetchImpl, endpoint, secret, state);
    const oldest = batch.length ? String(batch[batch.length - 1].id) : "";
    const oldestDate = batch.length ? Date.parse(batch[batch.length - 1].timestamp || "") : NaN;
    const needsOlderPage = batch.length === PAGE_SIZE && !crossedCutoff &&
      Number.isFinite(oldestDate) && oldestDate >= cutoff && oldest > state.scan.origin;
    if (needsOlderPage) {
      state.scan.before = oldest;
    } else {
      state.cursor = state.scan.target;
      state.scan = null;
    }
    writeState(stateFile, state);
    if (state.pending.length || !needsOlderPage) break;
  }

  const status = state.pending.length ? "pending_backlog" : state.scan ? "page_limit" : "caught_up";
  console.log("DISCORD_SUBMISSION_SCAN_V1: status=" + status + " scanned=" + scanned + " queued=" + queued + " pages=" + pages);
  return { status, scanned, queued, pages, cursor: state.cursor, pending: state.pending.length };
}

if (require.main === module) {
  runScan().catch(error => {
    console.error("DISCORD_SUBMISSION_SCAN_V1_ERROR: " + String(error.message || error));
    process.exitCode = 1;
  });
}

module.exports = { runScan, extractUrls, normalizeLivePocketUrl };
