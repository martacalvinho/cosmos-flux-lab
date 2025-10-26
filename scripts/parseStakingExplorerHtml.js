// Simple HTML parser for staking-explorer.com data
// Processes the downloaded HTML file and extracts chart data
// Usage: node scripts/parseStakingExplorerHtml.js

import fs from 'fs';
import path from 'path';

const HTML_FILE = '/tmp/staking-explorer.html';
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
  if (!timestamp) return null;
  const ts = timestamp > 1e12 ? timestamp : timestamp * 1000;
  const date = new Date(ts);
  if (isNaN(date.getTime())) return null;
  return date.toISOString().split('T')[0];
}

function parseChartData(dataString) {
  if (!dataString) return [];

  try {
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

function extractChartData(htmlContent) {
  const charts = {};

  // Find all elements with data-block attributes (this is where the chart data is)
  const dataBlockRegex = /data-block="([^"]+)"/g;
  const dataDatasetRegex = /data-dataset="([^"]+)"/g;
  const dataDataset2Regex = /data-dataset2="([^"]+)"/g;
  const dataDataset3Regex = /data-dataset3="([^"]+)"/g;

  // Also find chart IDs
  const chartIdRegex = /id="([a-zA-Z0-9_-]+_chart)"/g;

  let match;
  while ((match = chartIdRegex.exec(htmlContent)) !== null) {
    const chartId = match[1];
    const startPos = match.index;

    // Look for data attributes near this chart ID
    const beforeContent = htmlContent.substring(Math.max(0, startPos - 2000), startPos);
    const afterContent = htmlContent.substring(startPos, startPos + 5000);

    const dataBlockMatch = afterContent.match(/data-block="([^"]+)"/);
    const dataDatasetMatch = afterContent.match(/data-dataset="([^"]+)"/);
    const dataDataset2Match = afterContent.match(/data-dataset2="([^"]+)"/);
    const dataDataset3Match = afterContent.match(/data-dataset3="([^"]+)"/);

    if (dataBlockMatch || dataDatasetMatch || dataDataset2Match || dataDataset3Match) {
      charts[chartId] = {
        dataBlock: dataBlockMatch ? dataBlockMatch[1] : null,
        dataDataset: dataDatasetMatch ? dataDatasetMatch[1] : null,
        dataDataset2: dataDataset2Match ? dataDataset2Match[1] : null,
        dataDataset3: dataDataset3Match ? dataDataset3Match[1] : null,
      };
    }
  }

  // Also search for any elements with data-block attributes
  while ((match = dataBlockRegex.exec(htmlContent)) !== null) {
    const dataBlock = match[1];
    const startPos = match.index;

    // Look for nearby chart ID or title
    const beforeContent = htmlContent.substring(Math.max(0, startPos - 500), startPos);
    const afterContent = htmlContent.substring(startPos, startPos + 1000);

    const chartIdMatch = beforeContent.match(/id="([a-zA-Z0-9_-]+_chart)"/);
    const titleMatch = afterContent.match(/<h4[^>]*>([^<]+)</) || beforeContent.match(/<h4[^>]*>([^<]+)</);

    if (chartIdMatch) {
      const chartId = chartIdMatch[1];
      if (!charts[chartId]) {
        charts[chartId] = { dataBlock };
      }
    } else {
      // Create a generic ID based on position
      const genericId = `chart_${Object.keys(charts).length}`;
      charts[genericId] = { dataBlock };
    }
  }

  return charts;
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

function main() {
  if (!fs.existsSync(HTML_FILE)) {
    console.error(`HTML file not found: ${HTML_FILE}`);
    console.log('Please download the HTML first:');
    console.log('curl -s "https://staking-explorer.com/explorer/cosmoshub" > /tmp/staking-explorer.html');
    process.exit(1);
  }

  ensureDirSync(DATA_DIR);
  console.log(`[parseStakingExplorerHtml] Processing ${HTML_FILE}`);

  const htmlContent = fs.readFileSync(HTML_FILE, 'utf-8');
  const charts = extractChartData(htmlContent);

  console.log(`[parseStakingExplorerHtml] Found ${Object.keys(charts).length} charts:`);
  for (const [chartId, chart] of Object.entries(charts)) {
    console.log(`  - ${chartId}`);
  }

  // Process each chart
  for (const [chartId, chart] of Object.entries(charts)) {
    let processedData = [];
    const title = chartId.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase());
    const isStakingChart =
      chartId.includes('pool_chart') ||
      chartId.includes('staking') ||
      (title || '').toLowerCase().includes('staking dynamics');

    if (isStakingChart && (chart.dataDataset2 || chart.dataDataset3)) {
      const bondedSeries = parseChartData(chart.dataDataset2 || chart.dataDataset || chart.dataBlock);
      const notBondedSeries = parseChartData(chart.dataDataset3);
      processedData = mergeSeries(bondedSeries, 'bonded', notBondedSeries, 'notBonded');
      console.log(
        `[parseStakingExplorerHtml] ${chartId}: merged ${bondedSeries.length} bonded + ${notBondedSeries.length} not bonded points`
      );
    } else {
      if (chart.dataBlock) {
        processedData = parseChartData(chart.dataBlock);
        console.log(`[parseStakingExplorerHtml] ${chartId}: ${processedData.length} data points`);
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

    if (processedData.length > 0) {
      const output = {
        source: 'https://staking-explorer.com/explorer/cosmoshub',
        scrapedAt: new Date().toISOString(),
        chartId: chartId,
        title,
        data: processedData,
        rawData: {
          dataBlock: chart.dataBlock,
          dataDataset: chart.dataDataset,
          dataDataset2: chart.dataDataset2,
          dataDataset3: chart.dataDataset3,
        },
      };

      // Determine which file to save to
      let outputFile = OUT_FILES.emission;
      if (chartId.includes('staking')) {
        outputFile = OUT_FILES.stakingDynamics;
      } else if (chartId.includes('inflation')) {
        outputFile = OUT_FILES.inflation;
      } else if (chartId.includes('apr')) {
        outputFile = OUT_FILES.apr;
      } else if (chartId.includes('unbonding')) {
        outputFile = OUT_FILES.unbonding;
      } else if (chartId.includes('pool')) {
        outputFile = OUT_FILES.poolChart;
      }

      fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));
      console.log(`[parseStakingExplorerHtml] Saved to ${outputFile}`);
    }
  }

  // Save summary
  const summary = {
    source: 'https://staking-explorer.com/explorer/cosmoshub',
    scrapedAt: new Date().toISOString(),
    charts: Object.keys(charts),
    files: OUT_FILES,
    totalDataPoints: Object.values(charts).reduce((total, chart) => {
      const data = parseChartData(
        chart.dataBlock || chart.dataDataset || chart.dataDataset2 || chart.dataDataset3 || '[]'
      );
      return total + data.length;
    }, 0)
  };

  fs.writeFileSync(path.join(DATA_DIR, 'summary.json'), JSON.stringify(summary, null, 2));
  console.log(`[parseStakingExplorerHtml] Summary saved to ${path.join(DATA_DIR, 'summary.json')}`);
}

main().catch((e) => {
  console.error('[parseStakingExplorerHtml] Error', e);
  process.exit(1);
});
