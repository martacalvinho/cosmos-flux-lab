#!/usr/bin/env node

/**
 * Daily Mintscan data synchroniser
 *
 * This script queries the Mintscan LCD proxy once and appends a single daily
 * snapshot into the historical chart JSON files that power the dashboard.
 *
 * Usage:
 *   MINTSCAN_API_KEY=.... node scripts/updateMintscanCharts.js
 *
 * The bearer token is provided by Mintscan. Only ~5 lightweight LCD calls are
 * required per run, so the ~50k daily credit allowance is unaffected.
 */

import fs from "fs/promises";
import path from "path";
import process from "process";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(REPO_ROOT, "public", "data", "historical");

dotenv.config({
  path: path.join(REPO_ROOT, ".env"),
});

const NETWORK = process.env.MINTSCAN_NETWORK || "cosmos";
const API_BASE = process.env.MINTSCAN_API_BASE || "https://apis.mintscan.io/v1";
const PRIMARY_LCD_BASE = process.env.MINTSCAN_LCD_BASE || "https://apis.mintscan.io";
const FALLBACK_LCD_BASE =
  process.env.COSMOS_LCD_BASE || process.env.PUBLIC_LCD_BASE || "https://rest.cosmos.directory/cosmoshub";
const API_KEY = (process.env.MINTSCAN_API_KEY || "").trim();
const HAS_API_KEY = API_KEY.length > 0;
const UNBONDING_WORKERS = Math.max(
  1,
  Number.parseInt(process.env.UNBONDING_CONCURRENCY || "", 10) || 12
);
const UNBONDING_WINDOW_DAYS =
  Number.parseInt(process.env.UNBONDING_WINDOW_DAYS || "", 10) || 45;

function normaliseBase(value) {
  return typeof value === "string" ? value.trim().replace(/\/+$/, "") : "";
}

const lcdProviders = [];

const primaryBase = normaliseBase(PRIMARY_LCD_BASE);
if (HAS_API_KEY && primaryBase) {
  lcdProviders.push({
    name: "mintscan",
    base: primaryBase,
    requiresAuth: true,
    source: `${primaryBase}/${NETWORK}/lcd`,
    buildPath: (pathname) => `${NETWORK}/lcd/${pathname}`,
  });
}

const fallbackBase = normaliseBase(FALLBACK_LCD_BASE);
if (fallbackBase) {
  const duplicate = lcdProviders.some((provider) => provider.base === fallbackBase);
  if (!duplicate) {
    lcdProviders.push({
      name: "cosmos.directory",
      base: fallbackBase,
      requiresAuth: false,
      source: fallbackBase,
      buildPath: (pathname) => pathname,
    });
  }
}

if (!lcdProviders.length) {
  console.error("[mintscan-sync] No LCD providers configured. Please set COSMOS_LCD_BASE or MINTSCAN_LCD_BASE.");
  process.exit(1);
}

if (!HAS_API_KEY && lcdProviders.every((provider) => provider.requiresAuth)) {
  console.error("[mintscan-sync] Missing MINTSCAN_API_KEY and no public LCD fallback configured.");
  process.exit(1);
}

if (!HAS_API_KEY) {
  console.warn(
    "[mintscan-sync] MINTSCAN_API_KEY not set. Falling back to public Cosmos LCD endpoints where available."
  );
}

const fetchFn =
  globalThis.fetch ||
  (await import("node-fetch")
    .then((mod) => mod.default)
    .catch(() => {
      throw new Error(
        "Global fetch is not available. Please run the script on Node.js 18+ or install node-fetch."
      );
    }));

let activeLcdSource = lcdProviders[0]?.source || "";

function getActiveLcdSource() {
  return activeLcdSource || lcdProviders[0]?.source || "";
}

async function mintscanFetch(pathname, { searchParams, base = API_BASE, headers } = {}) {
  const normalisedBase = base.endsWith("/") ? base : `${base}/`;
  const url = new URL(pathname.replace(/^\//, ""), normalisedBase);
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    });
  }

  const defaultHeaders = {
    Accept: "application/json",
    "Content-Type": "application/json",
    "User-Agent": "cosmos-flux-lab-sync/1.0",
  };

  if (HAS_API_KEY) {
    defaultHeaders.Authorization = `Bearer ${API_KEY}`;
  }

  const finalHeaders = { ...defaultHeaders, ...headers };
  Object.keys(finalHeaders).forEach((key) => {
    if (finalHeaders[key] === undefined || finalHeaders[key] === null || finalHeaders[key] === "") {
      delete finalHeaders[key];
    }
  });

  const response = await fetchFn(url, {
    headers: finalHeaders,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Mintscan request failed (${response.status} ${response.statusText}) for ${url.pathname}: ${body}`
    );
  }

  return response.json();
}

async function fetchLcd(pathname, options = {}) {
  const cleanPath = pathname.replace(/^\//, "");
  const errors = [];
  const hasExplicitSearchParams =
    options && Object.prototype.hasOwnProperty.call(options, "searchParams");
  const searchParams = hasExplicitSearchParams
    ? options.searchParams
    : Object.keys(options).length > 0
    ? options
    : undefined;

  for (const provider of lcdProviders) {
    try {
      const data = await mintscanFetch(provider.buildPath(cleanPath), {
        searchParams,
        base: provider.base,
        headers: provider.requiresAuth ? undefined : { Authorization: "" },
      });
      activeLcdSource = provider.source;
      return data;
    } catch (error) {
      errors.push(`${provider.name}: ${error.message}`);
    }
  }

  throw new Error(
    `All LCD providers failed for ${pathname}: ${errors.join("; ")}`
  );
}

function extractPaginationKey(response) {
  const pagination = response?.pagination;
  if (!pagination || typeof pagination !== "object") return null;
  return pagination.next_key || pagination.nextKey || null;
}

async function fetchAllValidators() {
  const validators = [];
  let nextKey = null;
  do {
    const params = {
      "pagination.limit": "200",
    };
    if (nextKey) {
      params["pagination.key"] = nextKey;
    }
    const response = await fetchLcd("cosmos/staking/v1beta1/validators", {
      searchParams: params,
    });
    if (Array.isArray(response?.validators)) {
      validators.push(...response.validators);
    }
    nextKey = extractPaginationKey(response);
  } while (nextKey);
  return validators;
}

async function fetchUnbondingEntriesForValidator(validatorAddress) {
  const entries = [];
  let nextKey = null;
  do {
    const params = {
      "pagination.limit": "500",
    };
    if (nextKey) {
      params["pagination.key"] = nextKey;
    }
    const response = await fetchLcd(
      `cosmos/staking/v1beta1/validators/${validatorAddress}/unbonding_delegations`,
      {
        searchParams: params,
      }
    );
    if (Array.isArray(response?.unbonding_responses)) {
      for (const delegator of response.unbonding_responses) {
        for (const entry of delegator?.entries || []) {
          entries.push(entry);
        }
      }
    }
    nextKey = extractPaginationKey(response);
  } while (nextKey);
  return entries;
}

function toIsoDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function startOfDayTimestamp(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 0;
  const clone = new Date(date);
  clone.setUTCHours(0, 0, 0, 0);
  return clone.getTime();
}

async function buildUnbondingSchedule() {
  const validators = await fetchAllValidators();
  const schedule = new Map();
  const errors = [];
  let totalEntries = 0;
  let processedValidators = 0;
  let totalAmountAtom = 0;

  async function worker() {
    while (processedValidators < validators.length) {
      const index = processedValidators++;
      const validator = validators[index];
      const valoper = validator?.operator_address;
      if (!valoper) continue;

      try {
        const entries = await fetchUnbondingEntriesForValidator(valoper);
        totalEntries += entries.length;
        for (const entry of entries) {
          const dateKey = toIsoDate(entry?.completion_time);
          if (!dateKey) continue;
          const timestamp = startOfDayTimestamp(entry?.completion_time);
          const amountAtom = uatomToAtom(entry?.balance);
          if (!Number.isFinite(amountAtom) || amountAtom <= 0) continue;
          totalAmountAtom += amountAtom;
          const existing = schedule.get(dateKey);
          if (existing) {
            existing.value += amountAtom;
            if (timestamp && (!existing.timestamp || timestamp < existing.timestamp)) {
              existing.timestamp = timestamp;
            }
          } else {
            schedule.set(dateKey, {
              date: dateKey,
              value: amountAtom,
              timestamp: timestamp || Date.now(),
            });
          }
        }
      } catch (error) {
        errors.push(`${valoper}: ${error.message}`);
      }
    }
  }

  const workers = Array.from({ length: UNBONDING_WORKERS }, worker);
  await Promise.all(workers);

  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);
  const windowLimit = new Date(now);
  windowLimit.setUTCDate(windowLimit.getUTCDate() + UNBONDING_WINDOW_DAYS);

  const points = Array.from(schedule.values())
    .filter((point) => {
      const pointDate = new Date(point.date);
      if (Number.isNaN(pointDate.getTime())) return false;
      return pointDate >= now && pointDate <= windowLimit;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((point) => ({
      date: point.date,
      timestamp: point.timestamp || new Date(`${point.date}T00:00:00Z`).getTime(),
      value: Math.round(point.value),
      amount: Math.round(point.value),
    }));

  return {
    points,
    summary: {
      validatorCount: validators.length,
      totalUnbondingEntries: totalEntries,
      totalUnbondingAtom: Number(totalAmountAtom.toFixed(2)),
      errors,
      windowDays: UNBONDING_WINDOW_DAYS,
    },
  };
}

function toNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function uatomToAtom(value) {
  return toNumber(value) / 1_000_000;
}

function normalisePercent(value) {
  const numeric = toNumber(value);
  if (!Number.isFinite(numeric)) return 0;
  return numeric > 1 ? numeric : numeric * 100;
}

function isSameDay(timestampA, timestampB) {
  if (!timestampA || !timestampB) return false;
  const a = new Date(timestampA);
  const b = new Date(timestampB);
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

function upsertPoint(series, predicate, nextPoint) {
  const data = Array.isArray(series) ? [...series] : [];
  const idx = data.findIndex(predicate);
  if (idx >= 0) {
    data[idx] = { ...data[idx], ...nextPoint };
  } else {
    data.push(nextPoint);
  }
  data.sort((a, b) => toNumber(a.timestamp) - toNumber(b.timestamp));
  return data;
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function loadChartDocument(filename, chartId, title) {
  const filePath = path.join(DATA_DIR, filename);
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw);
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return {
        source: API_BASE,
        scrapedAt: "",
        chartId,
        title,
        data: [],
        rawData: {},
      };
    }
    throw error;
  }
}

async function saveChartDocument(filename, payload) {
  const filePath = path.join(DATA_DIR, filename);
  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf-8");
}

async function buildSnapshot() {
  const [pool, mintParams, inflationResp, annualResp, supplyResp] = await Promise.all([
    fetchLcd("cosmos/staking/v1beta1/pool"),
    fetchLcd("cosmos/mint/v1beta1/params"),
    fetchLcd("cosmos/mint/v1beta1/inflation"),
    fetchLcd("cosmos/mint/v1beta1/annual_provisions"),
    fetchLcd("cosmos/bank/v1beta1/supply/by_denom", { denom: "uatom" }),
  ]);

  const bonded = uatomToAtom(pool?.pool?.bonded_tokens);
  const notBonded = uatomToAtom(pool?.pool?.not_bonded_tokens);
  const totalSupply = uatomToAtom(supplyResp?.amount?.amount);
  const inflationRate = normalisePercent(inflationResp?.inflation);
  const annualProvisionsAtom = uatomToAtom(annualResp?.annual_provisions);
  const blocksPerYear = toNumber(mintParams?.params?.blocks_per_year);
  const emissionPerBlockAtom = blocksPerYear > 0 ? annualProvisionsAtom / blocksPerYear : 0;

  const bondedRatio = totalSupply > 0 ? bonded / totalSupply : 0;
  const aprEstimate = bondedRatio > 0 ? inflationRate / bondedRatio : 0;

  const mintConfig = {
    goalBonded: normalisePercent(mintParams?.params?.goal_bonded),
    maxInflation: normalisePercent(mintParams?.params?.inflation_max),
    minInflation: normalisePercent(mintParams?.params?.inflation_min),
    blocksPerYear,
  };

  return {
    bonded,
    notBonded,
    totalSupply,
    inflationRate,
    annualProvisionsAtom,
    emissionPerBlockAtom,
    aprEstimate,
    mintConfig,
    raw: {
      pool,
      mintParams,
      inflationResp,
      annualResp,
      supplyResp,
    },
  };
}

async function updateStakingChart(snapshot, now) {
  const doc = await loadChartDocument(
    "staking-dynamics.json",
    "pool_chart",
    "Cosmoshub staking dynamics"
  );

  const point = {
    date: now.isoDate,
    timestamp: now.timestamp,
    bonded: Math.round(snapshot.bonded),
    notBonded: Math.round(snapshot.notBonded),
    value: Math.round(snapshot.bonded),
  };

  doc.source = getActiveLcdSource();
  doc.scrapedAt = now.isoTimestamp;
  doc.rawData = snapshot.raw.pool;
  doc.data = upsertPoint(doc.data, (item) => isSameDay(item.timestamp, now.timestamp), point);

  await saveChartDocument("staking-dynamics.json", doc);
}

async function updateAprChart(snapshot, now) {
  const doc = await loadChartDocument("apr.json", "apr_chart", "Cosmoshub APR chart");
  const point = {
    date: now.isoDate,
    timestamp: now.timestamp,
    value: Number(snapshot.aprEstimate.toFixed(2)),
  };

  doc.source = getActiveLcdSource();
  doc.scrapedAt = now.isoTimestamp;
  doc.rawData = snapshot.raw;
  doc.data = upsertPoint(doc.data, (item) => isSameDay(item.timestamp, now.timestamp), point);

  await saveChartDocument("apr.json", doc);
}

async function updateInflationChart(snapshot, now) {
  const doc = await loadChartDocument(
    "inflation.json",
    "inflation_chart",
    "Cosmoshub inflation"
  );

  const point = {
    date: now.isoDate,
    timestamp: now.timestamp,
    value: Number(snapshot.inflationRate.toFixed(4)),
    floor: snapshot.mintConfig.minInflation,
    ceiling: snapshot.mintConfig.maxInflation,
  };

  doc.source = getActiveLcdSource();
  doc.scrapedAt = now.isoTimestamp;
  doc.rawData = snapshot.raw.mintParams;
  doc.data = upsertPoint(doc.data, (item) => isSameDay(item.timestamp, now.timestamp), point);

  await saveChartDocument("inflation.json", doc);
}

async function updateEmissionChart(snapshot, now) {
  const doc = await loadChartDocument(
    "emission.json",
    "emission_chart",
    "Cosmoshub annualised issuance"
  );

  // Derive per-block issuance from annual provisions to keep the series aligned with inflation outlook.
  const point = {
    date: now.isoDate,
    timestamp: now.timestamp,
    value: Number(snapshot.emissionPerBlockAtom.toFixed(4)),
  };

  doc.source = getActiveLcdSource();
  doc.scrapedAt = now.isoTimestamp;
  doc.rawData = {
    annualProvisions: snapshot.raw.annualResp,
    mintParams: snapshot.raw.mintParams,
  };
  doc.data = upsertPoint(doc.data, (item) => isSameDay(item.timestamp, now.timestamp), point);

  await saveChartDocument("emission.json", doc);
}

async function updateUnbondingChart(unbondingSnapshot, now) {
  const doc = await loadChartDocument(
    "unbonding.json",
    "unbonding_chart",
    "Cosmoshub unbondings map"
  );

  doc.source = getActiveLcdSource();
  doc.scrapedAt = now.isoTimestamp;
  doc.rawData = {
    summary: unbondingSnapshot.summary,
  };
  doc.data = unbondingSnapshot.points;

  await saveChartDocument("unbonding.json", doc);
}

async function safeUpdate(fn, label) {
  try {
    await fn();
    console.log(`[mintscan-sync] Updated ${label}`);
  } catch (error) {
    console.error(`[mintscan-sync] Failed to update ${label}:`, error.message);
  }
}

async function main() {
  await ensureDir(DATA_DIR);
  const now = {
    timestamp: Date.now(),
    isoTimestamp: new Date().toISOString(),
    isoDate: new Date().toISOString().slice(0, 10),
  };

  const [snapshot, unbondingSnapshot] = await Promise.all([
    buildSnapshot(),
    buildUnbondingSchedule(),
  ]);

  await safeUpdate(() => updateStakingChart(snapshot, now), "staking dynamics");
  await safeUpdate(() => updateAprChart(snapshot, now), "APR history");
  await safeUpdate(() => updateInflationChart(snapshot, now), "inflation history");
  await safeUpdate(() => updateEmissionChart(snapshot, now), "emission history");
  await safeUpdate(() => updateUnbondingChart(unbondingSnapshot, now), "unbonding schedule");
}

main().catch((error) => {
  console.error("[mintscan-sync] Fatal error:", error);
  process.exit(1);
});
