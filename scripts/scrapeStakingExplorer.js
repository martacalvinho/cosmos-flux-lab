// Staking Explorer scraper for historical Cosmos Hub data
// Usage: node scripts/scrapeStakingExplorer.js
// Extracts historical data from charts and saves to JSON files

import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

const DEBUG = process.env.DEBUG_SCRAPE === '1' || process.env.DEBUG_SCRAPE === 'true';
const HEADFUL = process.env.HEADFUL === '1' || process.env.HEADFUL === 'true';

const BASE_URL = 'https://staking-explorer.com/explorer/cosmoshub';
const DATA_DIR = path.resolve('public', 'data', 'historical');
const OUT_FILES = {
  stakingDynamics: path.join(DATA_DIR, 'staking-dynamics.json'),
  inflation: path.join(DATA_DIR, 'inflation.json'),
  emission: path.join(DATA_DIR, 'emission.json'),
  apr: path.join(DATA_DIR, 'apr.json'),
  unbonding: path.join(DATA_DIR, 'unbonding.json'),
  poolChart: path.join(DATA_DIR, 'pool-chart.json'),
};

function ensureDirSync(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function timestampToISO(timestamp) {
  // Convert Unix timestamp (seconds or milliseconds) to ISO date string
  if (!timestamp) return null;

  // Handle milliseconds (13 digits) or seconds (10 digits)
  const ts = timestamp > 1e12 ? timestamp : timestamp * 1000;
  const date = new Date(ts);

  if (isNaN(date.getTime())) return null;
  return date.toISOString().split('T')[0]; // Return YYYY-MM-DD format
}

function parseChartData(dataString) {
  if (!dataString) return [];

  try {
    // Parse JSON array from the data attribute
    const data = JSON.parse(dataString);
    return data.map(([timestamp, value]) => ({
      date: timestampToISO(timestamp),
      value: Number(value) || 0,
      timestamp: timestamp
    })).filter(point => point.date !== null);
  } catch (e) {
    console.error('Failed to parse chart data:', e);
    return [];
  }
}

function parseMultiValueChartData(dataString, valueKey = 'value') {
  if (!dataString) return [];

  try {
    const data = JSON.parse(dataString);
    return data.map(([timestamp, ...values]) => ({
      date: timestampToISO(timestamp),
      [valueKey]: Number(values[0]) || 0,
      timestamp: timestamp
    })).filter(point => point.date !== null);
  } catch (e) {
    console.error('Failed to parse multi-value chart data:', e);
    return [];
  }
}

function mergeSeries(primary = [], primaryKey, secondary = [], secondaryKey) {
  const points = new Map();

  const ingest = (series, key) => {
    series.forEach((point) => {
      if (!point || !point.date) return;
      const existing = points.get(point.timestamp) || {
        date: point.date,
        timestamp: point.timestamp,
      };
      existing[key] = point.value ?? 0;
      points.set(point.timestamp, existing);
    });
  };

  ingest(primary, primaryKey);
  ingest(secondary, secondaryKey);

  return Array.from(points.values())
    .map((point) => ({
      ...point,
      [primaryKey]: Number(point[primaryKey] ?? 0),
      [secondaryKey]: Number(point[secondaryKey] ?? 0),
      value: Number(point[primaryKey] ?? point[secondaryKey] ?? 0),
    }))
    .sort((a, b) => a.timestamp - b.timestamp);
}

async function main() {
  ensureDirSync(DATA_DIR);
  console.log(`[scrapeStakingExplorer] Starting scrape of ${BASE_URL}`);

  const browser = await chromium.launch({ headless: !HEADFUL });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
    viewport: { width: 1440, height: 1000 },
  });
  const page = await context.newPage();

  try {
    if (DEBUG) console.log('[scrapeStakingExplorer] Navigating to', BASE_URL);
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 120_000 });

    // Wait for charts to load
    await page.waitForSelector('.apex-charts', { timeout: 60_000 });

    const chartData = await page.evaluate(() => {
      const charts = {};

      // Find all chart elements with data attributes
      const chartElements = document.querySelectorAll('[class*="apex-charts"]');

      chartElements.forEach((chart, index) => {
        const id = chart.id || `chart_${index}`;
        const dataBlock = chart.getAttribute('data-block');
        const dataDataset = chart.getAttribute('data-dataset');
        const dataDataset2 = chart.getAttribute('data-dataset2');
        const dataDataset3 = chart.getAttribute('data-dataset3');

        if (dataBlock) {
          charts[id] = {
            dataBlock: dataBlock,
            dataDataset: dataDataset,
            dataDataset2: dataDataset2,
            dataDataset3: dataDataset3,
            title: chart.closest('.card')?.querySelector('.header-title, h4')?.textContent?.trim() || id
          };
        }
      });

      // Also look for any elements with chart data in attributes
      const allElements = document.querySelectorAll('[data-block], [data-dataset], [data-dataset2], [data-dataset3]');
      allElements.forEach((el, index) => {
        const id = el.id || `element_${index}`;
        if (!charts[id]) {
          const dataBlock = el.getAttribute('data-block');
          const dataDataset = el.getAttribute('data-dataset');
          const dataDataset2 = el.getAttribute('data-dataset2');
          const dataDataset3 = el.getAttribute('data-dataset3');

          if (dataBlock || dataDataset || dataDataset2 || dataDataset3) {
            charts[id] = {
              dataBlock: dataBlock,
              dataDataset: dataDataset,
              dataDataset2: dataDataset2,
              dataDataset3: dataDataset3,
              title: el.closest('.card')?.querySelector('.header-title, h4')?.textContent?.trim() || id
            };
          }
        }
      });

      return charts;
    });

    if (DEBUG) console.log('[scrapeStakingExplorer] Found charts:', Object.keys(chartData));

    // Process and save each chart's data
    for (const [chartId, chart] of Object.entries(chartData)) {
      console.log(`[scrapeStakingExplorer] Processing ${chartId}: ${chart.title}`);

      let processedData = [];
      const lowerTitle = chart.title?.toLowerCase() || '';
      const isStakingChart =
        chartId.includes('pool_chart') ||
        chartId.includes('staking') ||
        lowerTitle.includes('staking dynamics');

      if (isStakingChart && (chart.dataDataset2 || chart.dataDataset3)) {
        const bondedSeries = parseChartData(chart.dataDataset2 || chart.dataDataset || chart.dataBlock);
        const notBondedSeries = parseChartData(chart.dataDataset3);
        processedData = mergeSeries(bondedSeries, 'bonded', notBondedSeries, 'notBonded');
        console.log(
          `[scrapeStakingExplorer] ${chartId}: merged ${bondedSeries.length} bonded + ${notBondedSeries.length} not bonded points`
        );
      } else {
        if (chart.dataBlock) {
          processedData = parseChartData(chart.dataBlock);
        }

        if (processedData.length === 0 && chart.dataDataset) {
          processedData = parseChartData(chart.dataDataset);
        }

        if (processedData.length === 0 && chart.dataDataset2) {
          processedData = parseChartData(chart.dataDataset2);
        }

        if (processedData.length === 0 && chart.dataDataset3) {
          processedData = parseChartData(chart.dataDataset3);
        }
      }

      // Save the processed data
      const output = {
        source: BASE_URL,
        scrapedAt: new Date().toISOString(),
        chartId: chartId,
        title: chart.title,
        data: processedData,
        rawData: {
          dataBlock: chart.dataBlock,
          dataDataset: chart.dataDataset,
          dataDataset2: chart.dataDataset2,
          dataDataset3: chart.dataDataset3
        }
      };

      // Determine which file to save to based on chart type
      let outputFile = OUT_FILES.emission; // default
      if (chartId.includes('staking') || chart.title.toLowerCase().includes('staking')) {
        outputFile = OUT_FILES.stakingDynamics;
      } else if (chartId.includes('inflation') || chart.title.toLowerCase().includes('inflation')) {
        outputFile = OUT_FILES.inflation;
      } else if (chartId.includes('apr') || chart.title.toLowerCase().includes('apr')) {
        outputFile = OUT_FILES.apr;
      } else if (chartId.includes('unbonding') || chart.title.toLowerCase().includes('unbonding')) {
        outputFile = OUT_FILES.unbonding;
      } else if (chartId.includes('pool') || chart.title.toLowerCase().includes('pool')) {
        outputFile = OUT_FILES.poolChart;
      }

      // Save to file
      fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));
      console.log(`[scrapeStakingExplorer] Saved ${processedData.length} data points to ${outputFile}`);
    }

    // Also save a summary file
    const summary = {
      source: BASE_URL,
      scrapedAt: new Date().toISOString(),
      charts: Object.keys(chartData),
      files: OUT_FILES,
      totalDataPoints: Object.values(chartData).reduce((total, chart) => {
        const data = parseChartData(
          chart.dataBlock || chart.dataDataset || chart.dataDataset2 || chart.dataDataset3 || ''
        );
        return total + data.length;
      }, 0)
    };

    fs.writeFileSync(path.join(DATA_DIR, 'summary.json'), JSON.stringify(summary, null, 2));
    console.log(`[scrapeStakingExplorer] Summary saved to ${path.join(DATA_DIR, 'summary.json')}`);

  } catch (error) {
    console.error('[scrapeStakingExplorer] Error during scraping:', error);
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch((e) => {
  console.error('[scrapeStakingExplorer] Fatal error', e);
  process.exit(1);
});
