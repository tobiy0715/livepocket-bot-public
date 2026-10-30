const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, 'data');
const STATE_FILE = path.join(DATA_DIR, 'external_sources.json');

const DISCORD_API = 'https://discord.com/api/v10';
const TOKEN = process.env.DISCORD_BOT_TOKEN;
const MAX_RETRIES = 5;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function discordFetch(url) {
  if (!TOKEN) throw new Error('DISCORD_BOT_TOKEN is not set');

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bot ${TOKEN}`,
        Accept: 'application/json'
      }
    });

    if (res.ok) return res.json();

    const body = await res.text();

    if (res.status === 429) {
      let retryAfter = Number(res.headers.get('retry-after'));
      try {
        const parsed = JSON.parse(body);
        if (Number.isFinite(Number(parsed.retry_after))) {
          retryAfter = Number(parsed.retry_after);
        }
      } catch {}

      if (!Number.isFinite(retryAfter) || retryAfter < 0) retryAfter = 5;
      const waitMs = Math.max(1000, Math.ceil(retryAfter * 1000) + 250);

      console.warn(
        `[ExternalSource] Discord HTTP 429; waiting ${waitMs}ms before retry ${attempt}/${MAX_RETRIES}`
      );

      if (attempt < MAX_RETRIES) {
        await sleep(waitMs);
        continue;
      }

      throw new Error(`Discord HTTP 429 after ${MAX_RETRIES} attempts: ${body}`);
    }

    throw new Error(`Discord HTTP ${res.status}: ${body}`);
  }

  throw new Error('Discord request failed unexpectedly');
}

async function main() {
  fs.mkdirSync(DATA_DIR, { recursive: true });

  const guildId = process.env.DISCORD_GUILD_ID;
  if (!guildId) throw new Error('DISCORD_GUILD_ID is not set');

  const channels = await discordFetch(`${DISCORD_API}/guilds/${guildId}/channels`);
  if (!Array.isArray(channels)) throw new Error('Discord channels response is not an array');

  // Preserve the existing external-source state and only update channel discovery.
  let state = {};
  if (fs.existsSync(STATE_FILE)) {
    try {
      state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) || {};
    } catch {
      state = {};
    }
  }

  state.channels = channels;
  state.updatedAt = new Date().toISOString();

  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2) + '\n');
  console.log(`[ExternalSource] Discord channels collected: ${channels.length}`);
}

main().catch(err => {
  console.error(`[ExternalSource] FATAL ${err.message}`);
  process.exit(1);
});
