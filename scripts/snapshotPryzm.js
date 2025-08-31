// Snapshot Pryzm cATOM exchange_rate into JSON (and optionally append intraday)
// Usage:
//   node scripts/snapshotPryzm.js            # upsert daily entry by YYYY-MM-DD
//   node scripts/snapshotPryzm.js --append   # append an intraday entry with minute precision
//   node scripts/snapshotPryzm.js --rate=1.0023  # force a rate if live endpoint unavailable

import * as fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LCD = process.env.PRYZM_LCD || 'https://pryzm-api.polkachu.com';
const JSON_PATH = path.resolve(__dirname, '../public/data/pryzm-exchange-history.json');

function ensureDirSync(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function ymd(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function isoMinute(date = new Date()) {
  return date.toISOString().slice(0, 16);
}

function parseCliRate(argv) {
  const rateArg = argv.find((a) => a.startsWith('--rate='));
  if (!rateArg) return undefined;
  const val = parseFloat(rateArg.split('=')[1]);
  return Number.isFinite(val) ? val : undefined;
}

async function tryFetchExchangeRate() {
  // Confirmed response shape: pryzm.refractor.v1.QueryGetCPExchangeRateResponse { exchange_rate: string }
  // Try multiple hosts and endpoint variants to be resilient to gateway configs.
  const hosts = [LCD, 'https://pryzm-api.polkachu.com', 'https://api.pryzm.zone'];
  const paths = [
    '/pryzm/refractor/v1/c_p_exchange_rate/uatom',
    '/pryzm/refractor/v1/c_p_exchange_rate/catom',
    '/pryzm/refractor/v1/cp_exchange_rate/uatom',
    '/pryzm/refractor/v1/cp_exchange_rate/catom',
  ];

  let lastErr = '';
  for (const host of hosts) {
    for (const p of paths) {
      const url = `${host}${p}`;
      try {
        if (process.env.DEBUG_SNAPSHOT) console.error(`[snapshotPryzm] Trying ${url}`);
        const res = await fetch(url, {
          headers: {
            accept: 'application/json',
            'user-agent': 'cosmos-flux-lab-snapshot/1.0 (+https://github.com)'
          },
        });
        if (!res.ok) {
          lastErr = `${res.status} ${res.statusText} @ ${url}`;
          if (process.env.DEBUG_SNAPSHOT) console.error(`[snapshotPryzm] HTTP ${res.status} ${res.statusText} @ ${url}`);
          continue;
        }
        const json = await res.json().catch(() => undefined);
        const rateStr = json?.exchange_rate ?? json?.data?.exchange_rate;
        const rate = typeof rateStr === 'string' ? parseFloat(rateStr) : (typeof rateStr === 'number' ? rateStr : undefined);
        if (Number.isFinite(rate) && rate > 0 && rate < 10) return rate;
        if (process.env.DEBUG_SNAPSHOT) console.error(`[snapshotPryzm] No valid rate in payload @ ${url}: ${JSON.stringify(json)}`);
      } catch (e) {
        lastErr = `${(e && e.message) || 'fetch error'} @ ${url}`;
        if (process.env.DEBUG_SNAPSHOT) console.error(`[snapshotPryzm] Error @ ${url}:`, e?.message || e);
      }
    }
  }
  if (process.env.DEBUG_SNAPSHOT) {
    console.error(`[snapshotPryzm] Failed all candidates. Last error: ${lastErr}`);
  }
  return undefined;
}

async function main() {
  ensureDirSync(path.dirname(JSON_PATH));
  const args = process.argv.slice(2);
  const appendIntraday = args.includes('--append') || args.includes('-a');

  let rate = parseCliRate(args);
  if (rate === undefined) {
    rate = await tryFetchExchangeRate();
  }

  if (rate === undefined) {
    console.error('[snapshotPryzm] Could not determine exchange_rate. Provide --rate=x.y or ensure LCD is reachable.');
    process.exit(1);
  }

  // Load existing JSON
  /** @type {{ id:number, timestamp:string, exchange_rate:number }[]} */
  let history = [];
  if (fs.existsSync(JSON_PATH)) {
    try {
      history = JSON.parse(fs.readFileSync(JSON_PATH, 'utf-8')) || [];
    } catch {
      history = [];
    }
  }

  const stamp = appendIntraday ? isoMinute() : ymd();

  if (appendIntraday) {
    const nextId = history.length ? Math.max(...history.map((r) => r.id)) + 1 : 1;
    history.push({ id: nextId, timestamp: stamp, exchange_rate: rate });
  } else {
    const idx = history.findIndex((r) => r.timestamp === stamp);
    if (idx >= 0) {
      history[idx].exchange_rate = rate;
    } else {
      const nextId = history.length ? Math.max(...history.map((r) => r.id)) + 1 : 1;
      history.push({ id: nextId, timestamp: stamp, exchange_rate: rate });
    }
  }

  fs.writeFileSync(JSON_PATH, JSON.stringify(history, null, 2));
  console.log(`[snapshotPryzm] Saved ${history.length} rows to ${JSON_PATH}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
