// Pryzm service: fetch cATOM supply and compute TVL using exchange rate and ATOM price
// NOTE: Exchange rate endpoint is not confirmed yet. We fall back to the latest snapshot value when needed.

import { fetchCoinGeckoPrice } from './coingecko';

export type PryzmRealtime = {
  tvlUsd?: number;
  totalCAtom?: number; // cATOM supply in whole ATOM units (assuming 6 decimals)
  priceUsd?: number;
  exchangeRate?: number; // cATOM -> ATOM rate (i.e., how much ATOM backs 1 cATOM)
};

export const PRYZM_LCD = 'https://rest.cosmos.directory/pryzm';
export const CATOM_DENOM = 'c:uatom';

// Fetch total supply for a denom from Pryzm LCD
export async function fetchSupplyByDenom(denom: string, lcd: string = PRYZM_LCD): Promise<number | undefined> {
  try {
    const url = `${lcd}/cosmos/bank/v1beta1/supply/by_denom?denom=${encodeURIComponent(denom)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Bank supply failed: ${res.status}`);
    const json = await res.json();
    // Cosmos SDK shape: { amount: { denom: string, amount: string } }
    const amountStr: string | undefined = json?.amount?.amount;
    if (!amountStr) return undefined;
    const u = Number(amountStr);
    if (!Number.isFinite(u)) return undefined;
    return u / 1e6; // convert micro to whole
  } catch (e) {
    console.warn('[pryzm] fetchSupplyByDenom error:', (e as Error).message);
    return undefined;
  }
}

// Attempt to fetch a live exchange rate for c:uatom -> uatom.
// Placeholder: returns undefined until the official endpoint is confirmed.
export async function fetchExchangeRateLive(): Promise<number | undefined> {
  try {
    // Confirmed working endpoint: /pryzm/refractor/v1/c_p_exchange_rate/uatom
    // Returns: { exchange_rate: "1.224668313802821605" }
    const url = `${PRYZM_LCD}/pryzm/refractor/v1/c_p_exchange_rate/uatom`;
    const res = await fetch(url);
    if (!res.ok) return undefined;
    const json = await res.json();
    const rateStr = json?.exchange_rate;
    const rate = typeof rateStr === 'string' ? parseFloat(rateStr) : undefined;
    if (!Number.isFinite(rate)) return undefined;
    return rate as number;
  } catch (e) {
    console.warn('[pryzm] fetchExchangeRateLive error:', (e as Error).message);
    return undefined;
  }
}

// Helper to load the most recent snapshot exchange_rate from public JSON
async function fetchLatestSnapshotRate(): Promise<number | undefined> {
  try {
    const res = await fetch('/data/pryzm-exchange-history.json', { cache: 'no-store' });
    if (!res.ok) return undefined;
    const rows: { id: number; timestamp: string; exchange_rate: number }[] = await res.json();
    if (!rows?.length) return undefined;
    const latest = [...rows].sort((a, b) => a.timestamp.localeCompare(b.timestamp))[rows.length - 1];
    return latest?.exchange_rate;
  } catch {
    return undefined;
  }
}

export async function getPryzmRealtime(): Promise<PryzmRealtime> {
  const [supply, priceMap, liveRate, snapRate] = await Promise.all([
    fetchSupplyByDenom(CATOM_DENOM).catch(() => undefined),
    fetchCoinGeckoPrice(['cosmos']).catch(() => ({} as any)),
    fetchExchangeRateLive().catch(() => undefined),
    fetchLatestSnapshotRate().catch(() => undefined),
  ]);

  const priceUsd = (priceMap as any)?.cosmos?.usd as number | undefined;
  const exchangeRate = liveRate ?? snapRate; // prefer live if available

  let tvlUsd: number | undefined;
  if (supply !== undefined && priceUsd !== undefined && exchangeRate !== undefined) {
    // TVL(ATOM) = supply(cATOM) * exchangeRate(ATOM per cATOM)
    // TVL(USD) = TVL(ATOM) * priceUsd
    tvlUsd = supply * exchangeRate * priceUsd;
  }

  return {
    tvlUsd,
    totalCAtom: supply,
    priceUsd,
    exchangeRate,
  };
}
