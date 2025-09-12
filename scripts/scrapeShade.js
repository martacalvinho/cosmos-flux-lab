// Shade Protocol scraper for ATOM on Lend and Borrow pages
// Usage:
//   node scripts/scrapeShade.js --page=lend --asset=ATOM
//   node scripts/scrapeShade.js --page=borrow --asset=ATOM
// Env:
//   DEBUG_SCRAPE=1 to log snapshot
//   HEADFUL=1 to run headed

import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

const DEBUG = process.env.DEBUG_SCRAPE === '1' || process.env.DEBUG_SCRAPE === 'true';
const HEADFUL = process.env.HEADFUL === '1' || process.env.HEADFUL === 'true';

const BASE_LEND_URL = 'https://app.shadeprotocol.io/lend';
const BASE_BORROW_URL = 'https://app.shadeprotocol.io/borrow';

const DATA_DIR = path.resolve('public', 'data');
const LEND_JSON = path.join(DATA_DIR, 'shade-lend-history.json');
const BORROW_JSON = path.join(DATA_DIR, 'shade-borrow-history.json');

function ensureDirSync(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function parsePercent(txt) {
  if (!txt) return undefined;
  const m = String(txt).replace(/,/g, '').match(/(-?\d+(?:\.\d+)?)\s*%/);
  return m ? Number(m[1]) : undefined;
}
function parseUsd(txt) {
  if (!txt) return undefined;
  const m = String(txt).match(/\$\s*([\d,.]+(?:\.\d+)?)/);
  return m ? Number(m[1].replace(/,/g, '')) : undefined;
}

async function main() {
  ensureDirSync(DATA_DIR);
  const args = process.argv.slice(2);
  const pageArg = (args.find(a => a.startsWith('--page=')) || '').split('=')[1] || 'lend';
  const asset = (args.find(a => a.startsWith('--asset=')) || '').split('=')[1] || 'ATOM';

  const isLend = pageArg.toLowerCase() !== 'borrow';
  const targetUrl = isLend ? BASE_LEND_URL : BASE_BORROW_URL;

  const browser = await chromium.launch({ headless: !HEADFUL });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  try {
    if (DEBUG) console.log('[scrapeShade] Navigating to', targetUrl);
    await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 90000 });

    // Wait for header labels to appear
    const headerNeeded = isLend ? 'Supply APR' : 'Borrow APR';
    await page.waitForSelector(`text=${headerNeeded}`, { timeout: 60000 });

    // Filter to the specific asset via search input
    const search = page.locator('input[placeholder*="Search" i], input[placeholder*="symbol" i]');
    if (await search.count()) {
      await search.first().fill(asset);
      await page.waitForTimeout(500);
    }

    // Ensure the desired row is visible
    await page.waitForSelector(`text=${asset}`, { timeout: 20000 });

    // Extract values by aligning row numeric nodes with header x-positions
    const result = await page.evaluate(({ asset, isLend }) => {
      const lc = s => (s || '').toLowerCase();
      const txt = el => (el?.textContent || '').trim();
      const pctRe = /(-?\d+(?:\.\d+)?)\s*%/;
      const usdRe = /\$\s*([\d,.]+(?:\.\d+)?)/;

      const labels = isLend
        ? ['Supply APR', 'Total Supplied', 'Total Borrowed', 'Utilization']
        : ['Borrow APR', 'Total Supplied', 'Total Borrowed', 'Utilization'];

      // Collect candidate header label nodes and their center X positions
      const headerCenters = new Map();
      for (const label of labels) {
        const els = Array.from(document.querySelectorAll('*')).filter(e => lc(txt(e)) === lc(label));
        const theEl = els[0] || Array.from(document.querySelectorAll('*')).find(e => lc(txt(e)).includes(lc(label)));
        if (theEl) {
          const b = theEl.getBoundingClientRect();
          const cx = b.left + b.width / 2;
          headerCenters.set(label, cx);
        }
      }

      // Find row containing the asset
      const assetNodes = Array.from(document.querySelectorAll('*')).filter(e => /\bATOM\b/i.test(txt(e)));
      if (assetNodes.length === 0) return {};
      // Ascend to a row-like container that has several numeric cells
      function findRowContainer(n) {
        let cur = n;
        for (let i = 0; i < 8 && cur; i++) {
          const nums = Array.from(cur.querySelectorAll('*')).filter(el => (pctRe.test(txt(el)) || usdRe.test(txt(el))) && el.getClientRects().length > 0);
          if (nums.length >= 3) return cur;
          cur = cur.parentElement;
        }
        return n.parentElement || n;
      }
      const row = findRowContainer(assetNodes[0]);
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

      const supplyAprTxt = isLend ? pickNearest('Supply APR', pctRe) : undefined;
      const borrowAprTxt = !isLend ? pickNearest('Borrow APR', pctRe) : undefined;
      const totalSuppliedTxt = pickNearest('Total Supplied', usdRe);
      const totalBorrowedTxt = pickNearest('Total Borrowed', usdRe);
      const utilizationTxt = pickNearest('Utilization', pctRe);

      return { supplyAprTxt, borrowAprTxt, totalSuppliedTxt, totalBorrowedTxt, utilizationTxt };
    }, { asset, isLend });

    // Compute borrow base+rewards if present in raw text
    const borrowMatches = (result?.borrowAprTxt || '').match(/(-?\d+(?:\.\d+)?)\s*%/g) || [];
    const borrowBase = borrowMatches[0] ? Number(borrowMatches[0].replace('%','')) : undefined;
    const borrowReward = borrowMatches[1] ? Number(borrowMatches[1].replace('%','')) : undefined;
    const borrowNet = (borrowBase != null && borrowReward != null) ? (borrowBase + borrowReward) : undefined;

    const snapshot = {
      timestamp: new Date().toISOString(),
      protocol: 'Shade',
      page: isLend ? 'lend' : 'borrow',
      asset,
      url: targetUrl,
      supplyAprPct: parsePercent(result?.supplyAprTxt),
      // Prefer net (base + rewards) if found, else first percent
      borrowAprPct: borrowNet != null ? borrowNet : parsePercent(result?.borrowAprTxt),
      borrowRewardsAprPct: borrowReward,
      borrowAprBasePct: borrowBase,
      totalSuppliedUsd: parseUsd(result?.totalSuppliedTxt),
      totalBorrowedUsd: parseUsd(result?.totalBorrowedTxt),
      utilizationPct: parsePercent(result?.utilizationTxt),
      raw: result,
    };

    if (DEBUG) console.log('[scrapeShade] snapshot', snapshot);

    // Persist
    const file = isLend ? LEND_JSON : BORROW_JSON;
    let arr = [];
    if (fs.existsSync(file)) {
      try { arr = JSON.parse(fs.readFileSync(file, 'utf-8')) || []; } catch {}
    }
    arr.push(snapshot);
    fs.writeFileSync(file, JSON.stringify(arr, null, 2));
    console.log(`[scrapeShade] Saved snapshot to ${file}`);
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch(err => {
  console.error('[scrapeShade] Error', err);
  process.exit(1);
});
