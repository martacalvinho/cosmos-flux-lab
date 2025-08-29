// Snapshot Stride redemption_rate daily into Excel and JSON
// Usage: node scripts/snapshotStride.js
// Writes:
// - src/pages/tabs/data/Daily APR.xlsx
// - public/data/stride-redemption-history.json

import * as fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
// Use ESM build of xlsx for Node and wire fs
import * as XLSX from 'xlsx/xlsx.mjs';
XLSX.set_fs(fs);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STRIDE_HOST_ZONE_URL = 'https://stride-api.polkachu.com/Stride-Labs/stride/stakeibc/host_zone/cosmoshub-4';

async function fetchHostZone() {
  const res = await fetch(STRIDE_HOST_ZONE_URL);
  if (!res.ok) throw new Error(`Stride API failed: ${res.status}`);
  return res.json();
}

function ensureDirSync(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function ymd(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function isoMinute(date = new Date()) {
  return date.toISOString().slice(0, 16); // e.g., 2025-08-29T14:15
}

async function main() {
  const dataDir = path.resolve(__dirname, '../src/pages/tabs/data');
  const publicDataDir = path.resolve(__dirname, '../public/data');
  ensureDirSync(dataDir);
  ensureDirSync(publicDataDir);

  const xlsxPath = path.join(dataDir, 'Daily APR.xlsx');
  const jsonPath = path.join(publicDataDir, 'stride-redemption-history.json');

  const host = await fetchHostZone();
  const redemptionRate = parseFloat(host?.host_zone?.redemption_rate);
  if (!Number.isFinite(redemptionRate)) {
    throw new Error('Invalid redemption_rate from Stride API');
  }
  const args = process.argv.slice(2);
  const appendIntraday = args.includes('--append') || args.includes('-a');
  const stamp = appendIntraday ? isoMinute() : ymd();
  console.log(`[snapshot] mode=${appendIntraday ? 'append' : 'daily'} stamp=${stamp}`);

  // Load JSON history
  /** @type {{ id:number, timestamp:string, redemption_rate:number }[]} */
  let history = [];
  if (fs.existsSync(jsonPath)) {
    try {
      history = JSON.parse(fs.readFileSync(jsonPath, 'utf-8')) || [];
    } catch (e) {
      console.warn('[snapshot] WARN: failed to parse existing JSON, starting fresh:', e?.message);
      history = [];
    }
  }

  // Upsert by day or append intraday
  if (appendIntraday) {
    const before = history.length;
    const nextId = history.length ? Math.max(...history.map((r) => r.id)) + 1 : 1;
    history.push({ id: nextId, timestamp: stamp, redemption_rate: redemptionRate });
    console.log(`[snapshot] appended intraday. before=${before} after=${history.length}`);
  } else {
    const before = history.length;
    const existingIdx = history.findIndex((r) => r.timestamp === stamp);
    if (existingIdx >= 0) {
      history[existingIdx].redemption_rate = redemptionRate;
      console.log(`[snapshot] upserted daily. idx=${existingIdx} count=${history.length}`);
    } else {
      const nextId = history.length ? Math.max(...history.map((r) => r.id)) + 1 : 1;
      history.push({ id: nextId, timestamp: stamp, redemption_rate: redemptionRate });
      console.log(`[snapshot] inserted daily. before=${before} after=${history.length}`);
    }
  }

  // Write JSON
  fs.writeFileSync(jsonPath, JSON.stringify(history, null, 2));
  console.log(`[snapshot] wrote JSON entries=${history.length} path=${jsonPath}`);

  // Write/append to Excel
  const wsName = 'Sheet1';
  const rows = history.map((r) => ({ id: r.id, timestamp: r.timestamp, redemption_rate: r.redemption_rate }));
  const ws = XLSX.utils.json_to_sheet(rows, { header: ['id', 'timestamp', 'redemption_rate'] });
  const wb = fs.existsSync(xlsxPath) ? XLSX.readFile(xlsxPath) : XLSX.utils.book_new();
  // Replace or add the primary sheet
  wb.Sheets[wsName] = ws;
  if (!wb.SheetNames.includes(wsName)) wb.SheetNames = [wsName, ...wb.SheetNames];
  XLSX.writeFile(wb, xlsxPath);
  console.log(`[snapshot] wrote Excel rows=${rows.length} path=${xlsxPath}`);

  console.log(`Snapshot saved. Entries: ${history.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
