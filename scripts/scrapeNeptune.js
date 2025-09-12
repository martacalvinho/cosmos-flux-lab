// Neptune Finance scraper for ATOM row on Market Assets
// Usage: node scripts/scrapeNeptune.js --asset=ATOM
// Env: HEADFUL=1 to see browser, DEBUG_SCRAPE=1 for verbose logs

import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

const DEBUG = process.env.DEBUG_SCRAPE === '1' || process.env.DEBUG_SCRAPE === 'true';
const HEADFUL = process.env.HEADFUL === '1' || process.env.HEADFUL === 'true';

const BASE_URL = 'https://app.nept.finance/';
const DATA_DIR = path.resolve('public', 'data');
const OUT_JSON = path.join(DATA_DIR, 'neptune-lend-history.json');

function ensureDirSync(dir) { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); }
function parsePercent(txt) { if (!txt) return undefined; const m = String(txt).replace(/,/g,'').match(/(-?\d+(?:\.\d+)?)\s*%/); return m ? Number(m[1]) : undefined; }
function parseUsd(txt) {
  if (!txt) return undefined;
  const m = String(txt).match(/\$\s*([\d,.]+(?:\.\d+)?)(?:\s*([KMB]))?/i);
  if (!m) return undefined;
  const num = Number(m[1].replace(/,/g, ''));
  const suf = (m[2] || '').toUpperCase();
  const mult = suf === 'K' ? 1e3 : suf === 'M' ? 1e6 : suf === 'B' ? 1e9 : 1;
  return Number.isFinite(num) ? num * mult : undefined;
}

async function main() {
  ensureDirSync(DATA_DIR);
  const args = process.argv.slice(2);
  const asset = (args.find(a => a.startsWith('--asset=')) || '').split('=')[1] || 'ATOM';

  const browser = await chromium.launch({ headless: !HEADFUL });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
    viewport: { width: 1440, height: 1000 },
  });
  const page = await context.newPage();

  try {
    if (DEBUG) console.log('[scrapeNeptune] Navigating to', BASE_URL);
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 120_000 });

    // Wait for the table header to render
    await page.waitForSelector('text=Lend APY', { timeout: 60_000 });

    // Scroll to the Market Assets section to ensure it renders
    const marketAssets = page.locator('text=Market Assets');
    if (await marketAssets.count()) await marketAssets.first().scrollIntoViewIfNeeded();

    // Wait for the asset row to be present
    await page.waitForSelector(`text=${asset}`, { timeout: 30_000 });

    const result = await page.evaluate(({ asset }) => {
      const lc = (s) => (s || '').toLowerCase();
      const txt = (el) => (el?.textContent || '').trim();
      const pctRe = /(-?\d+(?:\.\d+)?)\s*%/;
      const usdRe = /\$\s*([\d,.]+(?:\.\d+)?)/;

      const labels = ['Lend APY', 'Total Lent', 'Borrow APY', 'Total Borrowed', 'Market Utilization'];

      const headerCenters = new Map();
      for (const label of labels) {
        const exact = Array.from(document.querySelectorAll('*')).find(e => lc(txt(e)) === lc(label));
        const el = exact || Array.from(document.querySelectorAll('*')).find(e => lc(txt(e)).includes(lc(label)));
        if (el) {
          const b = el.getBoundingClientRect();
          headerCenters.set(label, b.left + b.width / 2);
        }
      }

      // Find asset row container
      const assetNode = Array.from(document.querySelectorAll('*')).find(e => /\bATOM\b/i.test(txt(e)));
      if (!assetNode) return {};
      let row = assetNode;
      for (let i = 0; i < 8 && row; i++) {
        const nums = Array.from(row.querySelectorAll('*')).filter(el => (pctRe.test(txt(el)) || usdRe.test(txt(el))) && el.getClientRects().length > 0);
        if (nums.length >= 3) break;
        row = row.parentElement;
      }
      if (!row) row = assetNode.parentElement || assetNode;

      const numericNodes = Array.from(row.querySelectorAll('*')).filter(el => (pctRe.test(txt(el)) || usdRe.test(txt(el))) && el.getClientRects().length > 0);

      function pickNearest(label, re) {
        const cx = headerCenters.get(label);
        if (cx == null) return undefined;
        let best, bestD = Infinity;
        for (const el of numericNodes) {
          const t = txt(el);
          if (!re.test(t)) continue;
          const b = el.getBoundingClientRect();
          const ex = b.left + b.width / 2;
          const d = Math.abs(ex - cx);
          if (d < bestD) { bestD = d; best = t; }
        }
        return best;
      }

      const lendApyTxt = pickNearest('Lend APY', pctRe);
      const totalLentTxt = pickNearest('Total Lent', /\$\s*[\d,.]+(?:\s*[KMB])?/i) || pickNearest('Total Lent', /([\d,.]+\s*[KMB]?)/i);
      const borrowApyTxt = pickNearest('Borrow APY', pctRe);
      const totalBorrowedTxt = pickNearest('Total Borrowed', /\$\s*[\d,.]+(?:\s*[KMB])?/i) || pickNearest('Total Borrowed', /([\d,.]+\s*[KMB]?)/i);
      const utilizationTxt = pickNearest('Market Utilization', pctRe);

      return { lendApyTxt, totalLentTxt, borrowApyTxt, totalBorrowedTxt, utilizationTxt };
    }, { asset });

    const totalSupplyUsd = parseUsd(result?.totalLentTxt);
    const totalBorrowUsd = parseUsd(result?.totalBorrowedTxt);
    let utilizationPct = parsePercent(result?.utilizationTxt);
    if ((utilizationPct == null || !Number.isFinite(utilizationPct)) && Number.isFinite(totalSupplyUsd) && Number.isFinite(totalBorrowUsd) && totalSupplyUsd > 0) {
      utilizationPct = Math.max(0, Math.min(100, (totalBorrowUsd / totalSupplyUsd) * 100));
    }

    const snapshot = {
      timestamp: new Date().toISOString(),
      protocol: 'Neptune',
      asset,
      url: BASE_URL,
      supplyApyPct: parsePercent(result?.lendApyTxt),
      borrowApyPct: parsePercent(result?.borrowApyTxt),
      totalSupplyUsd,
      totalBorrowUsd,
      utilizationPct,
      raw: result,
    };

    if (DEBUG) console.log('[scrapeNeptune] snapshot', snapshot);

    let arr = [];
    if (fs.existsSync(OUT_JSON)) {
      try { arr = JSON.parse(fs.readFileSync(OUT_JSON, 'utf-8')) || []; } catch {}
    }
    arr.push(snapshot);
    fs.writeFileSync(OUT_JSON, JSON.stringify(arr, null, 2));
    console.log(`[scrapeNeptune] Saved snapshot to ${OUT_JSON}`);
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch((e) => { console.error('[scrapeNeptune] Error', e); process.exit(1); });
