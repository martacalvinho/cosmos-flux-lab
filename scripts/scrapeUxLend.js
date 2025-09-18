// Scrape UX Chain lending metrics using Playwright and write to public/data/ux-lend-history.json
// Usage:
//   node scripts/scrapeUxLend.js                              # scrape default ATOM page
//   node scripts/scrapeUxLend.js --url=<assetPageUrl>         # scrape custom URL
//   DEBUG_SCRAPE=1 node scripts/scrapeUxLend.js               # verbose logs

import * as fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_URL =
  'https://app.ux.xyz/assets/ibc%2FC4CFF46FD6DE35CA4CF4CE031E643C8FDC9BA4B99AE598E9B0ED98FE3A2319F9'; // ATOM
const JSON_PATH = path.resolve(__dirname, '../public/data/ux-lend-history.json');

function ensureDirSync(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function log(...args) {
  if (process.env.DEBUG_SCRAPE) console.error('[scrapeUx]', ...args);
}

function parsePercent(text) {
  if (!text) return undefined;
  const m = String(text).replace(/,/g, '').match(/(-?\d+(?:\.\d+)?)\s*%/);
  return m ? Number(m[1]) : undefined;
}

function parseUsd(text) {
  if (!text) return undefined;
  const t = String(text).replace(/[,\s]/g, '').replace(/\$/g, '');
  const m = t.match(/(-?\d+(?:\.\d+)?)/);
  return m ? Number(m[1]) : undefined;
}

async function extractText(page, xpathExpr) {
  const locator = page.locator(`xpath=${xpathExpr}`).first();
  const ok = await locator.count();
  if (!ok) return undefined;
  const txt = await locator.textContent();
  return txt?.trim() || undefined;
}

// Fallback: walk DOM near a label and grab the first matching value in the same module
async function findNearLabel(page, label, matcher) {
  return await page.evaluate(({ label, matcher }) => {
    const lc = label.toLowerCase();
    const nodes = Array.from(document.querySelectorAll('*')).filter(
      (el) => (el.textContent || '').toLowerCase().includes(lc)
    );
    const matchRe = new RegExp(matcher, 'i');
    const getText = (el) => (el?.textContent || '').trim();
    for (const n of nodes) {
      // search siblings, then up to 3 ancestors' descendants
      // 1) siblings
      let p = n.parentElement;
      if (p) {
        for (const sib of Array.from(p.children)) {
          const t = getText(sib);
          if (matchRe.test(t)) return t;
        }
      }
      // 2) within same container (up 3 levels)
      let container = n;
      for (let i = 0; i < 3 && container; i++) {
        const texts = Array.from(container.querySelectorAll('*')).map(getText);
        const hit = texts.find((t) => matchRe.test(t));
        if (hit) return hit;
        container = container.parentElement;
      }
    }
    return undefined;
  }, { label, matcher });
}

async function main() {
  ensureDirSync(path.dirname(JSON_PATH));
  const args = process.argv.slice(2);
  const urlArg = args.find((a) => a.startsWith('--url='));
  const targetUrl = urlArg ? urlArg.split('=')[1] : DEFAULT_URL;

  log('Navigating to', targetUrl);
  const HEADFUL = process.env.HEADFUL === '1' || process.env.HEADFUL === 'true';
  const browser = await chromium.launch({ headless: !HEADFUL });
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    javaScriptEnabled: true,
  });
  const page = await context.newPage();

  try {
    // Capture JSON/XHR responses to mine metrics if DOM is hard to read
    /** @type {{url:string, ct:string, body:string}[]} */
    const captured = [];
    page.on('response', async (resp) => {
      try {
        const reqType = resp.request().resourceType();
        if (reqType !== 'xhr' && reqType !== 'fetch') return;
        const ct = resp.headers()['content-type'] || '';
        if (!ct.includes('application/json') && !ct.includes('text/json')) return;
        const body = await resp.text();
        // Only store reasonably sized responses
        if (body && body.length < 2_000_000) {
          captured.push({ url: resp.url(), ct, body });
        }
      } catch {}
    });
    await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 90000 });
    await page.waitForTimeout(6000);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    // Ensure the main header with the asset shows up
    await page.waitForSelector('text=ATOM', { timeout: 60000 }).catch(() => {});
    await page.waitForFunction(() => /%|\$/.test(document.body?.innerText || ''), { timeout: 15000 }).catch(() => {});
    // Bring sections into view to ensure lazy-loaded text is rendered
    try { await page.locator('text=Supply Info').first().scrollIntoViewIfNeeded(); await page.waitForTimeout(500); } catch {}
    try { await page.locator('text=Borrow Info').first().scrollIntoViewIfNeeded(); await page.waitForTimeout(500); } catch {}

    const result = await page.evaluate(() => {
      const lc = (s) => (s || '').toLowerCase();
      const textOf = (el) => (el?.textContent || '').trim();
      const pctRe = /(-?\d+(?:\.\d+)?)\s*%/;
      const usdRe = /\$\s*([\d,.]+(?:\.\d+)?)/;

      // Return all nodes, traversing open shadow roots as well
      const allNodes = () => {
        const out = [];
        const pushTree = (root) => {
          out.push(root);
          const treeWalker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
          let node = treeWalker.currentNode;
          while (node) {
            out.push(node);
            const sr = node.shadowRoot;
            if (sr) pushTree(sr);
            node = treeWalker.nextNode();
          }
        };
        pushTree(document);
        return out;
      };

      const largestMatchingDescendant = (root, re) => {
        const nodes = Array.from(root.querySelectorAll('*')).filter((el) => re.test(textOf(el)) && el.getClientRects().length > 0);
        if (nodes.length === 0) return undefined;
        nodes.sort((a, b) => {
          const ra = a.getBoundingClientRect();
          const rb = b.getBoundingClientRect();
          return (rb.width * rb.height) - (ra.width * ra.height);
        });
        return nodes[0];
      };

      const findValueByExactLabel = (label, re) => {
        const labelLC = lc(label);
        // Prefer nodes whose text equals the label (ignoring case/whitespace)
        const nodes = allNodes().filter((n) => lc(textOf(n)) === labelLC);
        const relax = nodes.length ? nodes : allNodes().filter((n) => lc(textOf(n)).includes(labelLC));
        for (const n of [...nodes, ...relax]) {
          let cur = n;
          for (let i = 0; i < 6 && cur; i++) {
            const match = largestMatchingDescendant(cur, re);
            if (match) return textOf(match).match(re)?.[0];
            cur = cur.parentElement;
          }
        }
        return undefined;
      };

      const findUsdNear = (label) => {
        const labelLC = lc(label);
        const nodes = allNodes().filter((n) => lc(textOf(n)) === labelLC || lc(textOf(n)).includes(labelLC));
        for (const n of nodes) {
          let cur = n;
          for (let i = 0; i < 6 && cur; i++) {
            const match = largestMatchingDescendant(cur, usdRe);
            if (match) return { text: textOf(match).match(usdRe)?.[0] };
            cur = cur.parentElement;
          }
        }
        return { text: undefined };
      };

      // Try to locate the metrics bar container and map label->value within it
      const findMetricsBar = () => {
        const labels = ['utilization rate', 'supply apy', 'borrow apy', 'price'];
        const nodes = allNodes();
        const candidates = nodes.filter((n) => {
          const t = lc(textOf(n));
          return labels.every((l) => t.includes(l));
        });
        if (candidates.length === 0) return undefined;
        // Pick the smallest container by character length to reduce scope
        candidates.sort((a, b) => textOf(a).length - textOf(b).length);
        const bar = candidates[0];
        // Helper to get nearest % element within the same tile as a label
        const nearestPctToLabel = (labelText) => {
          const labels = Array.from(bar.querySelectorAll('*')).filter((el) => lc(textOf(el)) === lc(labelText));
          if (labels.length === 0) return undefined;
          const percentNodes = Array.from(bar.querySelectorAll('*')).filter((el) => pctRe.test(textOf(el)) && el.getClientRects().length > 0);
          let best = undefined; let bestDist = Number.POSITIVE_INFINITY;
          for (const lbl of labels) {
            const lb = lbl.getBoundingClientRect();
            for (const p of percentNodes) {
              const pb = p.getBoundingClientRect();
              const dx = (pb.left + pb.width/2) - (lb.left + lb.width/2);
              const dy = (pb.top + pb.height/2) - (lb.top + lb.height/2);
              const d = Math.hypot(dx, dy);
              if (d < bestDist) { bestDist = d; best = p; }
            }
          }
          return best ? textOf(best).match(pctRe)?.[0] : undefined;
        };
        return {
          util: nearestPctToLabel('Utilization Rate'),
          supply: nearestPctToLabel('Supply APY'),
          borrow: nearestPctToLabel('Borrow APY')
        };
      };

      const bar = findMetricsBar();
      let supplyApyTxt = bar?.supply || findValueByExactLabel('Supply APY', pctRe) || findValueByExactLabel('Supply APY', pctRe);
      let borrowApyTxt = bar?.borrow || findValueByExactLabel('Borrow APY', pctRe) || findValueByExactLabel('Borrow APY', pctRe);
      let utilRateTxt = bar?.util || findValueByExactLabel('Utilization Rate', pctRe) || findValueByExactLabel('Utilization Rate', pctRe);
      // Totals: anchor by section heading and the nearby 'Total X' label; pick nearest $ to that label
      const findSectionContainer = (heading) => {
        const nodes = allNodes().filter((n) => lc(textOf(n)) === lc(heading));
        for (const n of nodes) {
          let cur = n;
          for (let i = 0; i < 8 && cur; i++) {
            // a reasonable card container usually contains a chart and some $ figures
            const haveDollar = !!Array.from(cur.querySelectorAll('*')).find((el) => usdRe.test(textOf(el)));
            const hasSelfHeading = lc(textOf(cur)).includes(lc(heading));
            if (haveDollar && hasSelfHeading) return cur;
            cur = cur.parentElement;
          }
        }
        return undefined;
      };

      const nearestUsdToLabelInContainer = (container, label) => {
        if (!container) return undefined;
        const labels = Array.from(container.querySelectorAll('*')).filter((el) => lc(textOf(el)).includes(lc(label)));
        if (!labels.length) return undefined;
        const usdNodes = Array.from(container.querySelectorAll('*')).filter((el) => usdRe.test(textOf(el)) && el.getClientRects().length > 0);
        let best = undefined; let bestDist = Number.POSITIVE_INFINITY;
        for (const lbl of labels) {
          const lb = lbl.getBoundingClientRect();
          for (const us of usdNodes) {
            const ub = us.getBoundingClientRect();
            const dx = (ub.left + ub.width/2) - (lb.left + lb.width/2);
            const dy = (ub.top + ub.height/2) - (lb.top + lb.height/2);
            const d = Math.hypot(dx, dy);
            if (d < bestDist) { bestDist = d; best = us; }
          }
        }
        return best ? textOf(best).match(usdRe)?.[0] : undefined;
      };

      const supplySection = findSectionContainer('Supply Info');
      const borrowSection = findSectionContainer('Borrow Info');
      const totalSupplyTxt = nearestUsdToLabelInContainer(supplySection, 'Total Supply') || findUsdNear('Supply Info').text;
      const totalBorrowTxt = nearestUsdToLabelInContainer(borrowSection, 'Total Borrow') || findUsdNear('Borrow Info').text;

      return { supplyApyTxt, borrowApyTxt, utilRateTxt, totalSupplyTxt, totalBorrowTxt };
    });

    let { supplyApyTxt, borrowApyTxt, utilRateTxt, totalSupplyTxt, totalBorrowTxt } = result || {};

    // If DOM failed, try mining captured network JSON
    if (!supplyApyTxt || !borrowApyTxt || !utilRateTxt || !totalSupplyTxt || !totalBorrowTxt) {
      const pickFirst = (arr) => arr.find((v) => v !== undefined && v !== null);
      const floats = [];
      const percents = [];
      /** @type {{supplyApy?:number, borrowApy?:number, utilization?:number, totalSupplyUsd?:number, totalBorrowUsd?:number}} */
      const found = {};
      const walk = (obj, path = '') => {
        if (!obj) return;
        if (Array.isArray(obj)) {
          for (let i = 0; i < obj.length; i++) walk(obj[i], `${path}[${i}]`);
          return;
        }
        if (typeof obj === 'object') {
          for (const [k, v] of Object.entries(obj)) {
            const key = k.toLowerCase();
            const p = `${path}.${key}`;
            if (typeof v === 'number') {
              if (/(supply).*(apy)|(^apy$.*supply)|(deposit.*apy)/.test(key)) found.supplyApy = v * (v > 1.5 ? 1 : 100) || v;
              if (/(borrow).*(apy)|(^apy$.*borrow)|(^borrow_interest|borrow_rate)/.test(key)) found.borrowApy = v * (v > 1.5 ? 1 : 100) || v;
              if (/util(ization)?(_rate)?/.test(key)) found.utilization = v * (v > 1.5 ? 1 : 100) || v;
              if (/(total).*supply.*(usd)/.test(key)) found.totalSupplyUsd = v;
              if (/(total).*borrow.*(usd)/.test(key)) found.totalBorrowUsd = v;
            } else if (typeof v === 'string') {
              const mPct = v.match(/(-?\d+(?:\.\d+)?)\s*%/);
              if (/supply.*apy/.test(key) && mPct) found.supplyApy = Number(mPct[1]);
              if (/borrow.*apy/.test(key) && mPct) found.borrowApy = Number(mPct[1]);
              if (/util/.test(key) && mPct) found.utilization = Number(mPct[1]);
              const mUsd = v.match(/\$\s*([\d,.]+(?:\.\d+)?)/);
              if (/total.*supply/.test(key) && mUsd) found.totalSupplyUsd = Number(mUsd[1].replace(/,/g, ''));
              if (/total.*borrow/.test(key) && mUsd) found.totalBorrowUsd = Number(mUsd[1].replace(/,/g, ''));
            } else if (typeof v === 'object') {
              walk(v, p);
            }
          }
        }
      };
      for (const c of captured) {
        try {
          const json = JSON.parse(c.body);
          walk(json);
        } catch {}
      }
      if (found.supplyApy != null && !supplyApyTxt) supplyApyTxt = `${found.supplyApy}%`;
      if (found.borrowApy != null && !borrowApyTxt) borrowApyTxt = `${found.borrowApy}%`;
      if (found.utilization != null && !utilRateTxt) utilRateTxt = `${found.utilization}%`;
      if (found.totalSupplyUsd != null && !totalSupplyTxt) totalSupplyTxt = `$${found.totalSupplyUsd}`;
      if (found.totalBorrowUsd != null && !totalBorrowTxt) totalBorrowTxt = `$${found.totalBorrowUsd}`;
      log('captured responses', captured.map(c => c.url).slice(0, 10));
      log('network-derived', found);
    }

    const supplyApyPct = parsePercent(supplyApyTxt);
    const borrowApyPct = parsePercent(borrowApyTxt);
    const utilizationPct = parsePercent(utilRateTxt);
    const totalSupplyUsd = parseUsd(totalSupplyTxt);
    const totalBorrowUsd = parseUsd(totalBorrowTxt);

    const snapshot = {
      timestamp: new Date().toISOString(),
      chain: 'UX',
      asset: 'ATOM',
      url: targetUrl,
      supplyApyPct,
      borrowApyPct,
      utilizationPct,
      totalSupplyUsd,
      totalBorrowUsd,
      raw: {
        supplyApyTxt,
        borrowApyTxt,
        utilRateTxt,
        totalSupplyTxt,
        totalBorrowTxt,
      },
    };
    log('snapshot', snapshot);

    // Append to history array
    /** @type {any[]} */
    let history = [];
    if (fs.existsSync(JSON_PATH)) {
      try {
        history = JSON.parse(fs.readFileSync(JSON_PATH, 'utf-8')) || [];
      } catch {
        history = [];
      }
    }
    history.push(snapshot);
    fs.writeFileSync(JSON_PATH, JSON.stringify(history, null, 2));
    console.log(`[scrapeUx] Saved snapshot to ${JSON_PATH}`);
  } finally {
    await page.close();
    await context.close();
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
