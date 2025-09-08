// Mars Protocol lending (Red Bank) service
// Integrates the public backend endpoints provided by the Mars devs.
// Example endpoints:
//  - Markets list: https://backend.prod.mars-dev.net/v2/redbank_markets_data?chain=neutron&days=1
//  - Single market: https://backend.prod.mars-dev.net/v2/redbank_markets_data?chain=neutron&days=1&market=atom
//  - APR history: https://backend.prod.mars-dev.net/v2/rb_asset_apr?chain=neutron&granularity=day&unit=5&denom=untrn

export type MarsChain = 'neutron' | 'osmosis' | 'stride' | 'terra' | string;
export type Granularity = 'day' | 'hour' | 'month';

export interface MarsRedbankMarketRaw {
  denom: string; // e.g. 'ibc/...' or 'untrn'
  symbol: string; // e.g. 'ATOM'
  price_usd: string; // '4.53'
  deposit_amount: string; // stringified decimal
  borrow_amount: string; // stringified decimal
  deposit_apy: string; // e.g. '6.14'
  borrow_apy: string; // e.g. '11.36'
  // Allow unknown fields without failing
  [k: string]: unknown;
}

export interface MarsRedbankMarket {
  denom: string;
  symbol: string;
  priceUsd: number;
  depositAmount: number;
  borrowAmount: number;
  depositApyPct: number;
  borrowApyPct: number;
}

export interface AprPoint { date: string; value: number }
export interface MarsAprSeries { supply_apr: AprPoint[]; borrow_apr: AprPoint[] }

const BASE = 'https://backend.prod.mars-dev.net/v2';

// Tiny in-memory cache
const mem = new Map<string, { ts: number; data: any }>();

async function getJson<T>(url: string): Promise<T> {
  // Minimal logging to inspect live calls when needed
  console.log('[MarsService] GET', url);
  const res = await fetch(url, { headers: { accept: 'application/json' } });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Mars API ${url} failed: ${res.status} ${body}`);
  }
  return res.json();
}

async function getJsonCached<T>(url: string, ttlMs = 60_000): Promise<T> {
  const now = Date.now();
  const cache = mem.get(url);
  if (cache && now - cache.ts < ttlMs) return cache.data as T;
  const data = await getJson<T>(url);
  mem.set(url, { ts: now, data });
  return data;
}

function toNum(n?: unknown): number {
  if (typeof n === 'number') return Number.isFinite(n) ? n : 0;
  if (typeof n === 'string') {
    const cleaned = n.replace(/[$,%]/g, '').replace(/,/g, '');
    const v = parseFloat(cleaned);
    return Number.isFinite(v) ? v : 0;
  }
  return 0;
}

function normalizeMarket(m: MarsRedbankMarketRaw): MarsRedbankMarket {
  const getAny = (o: any, keys: string[]): any => {
    for (const k of keys) {
      if (o && o[k] != null) return (o as any)[k];
    }
    return undefined;
  };

  const denom = (getAny(m, ['denom', 'base_denom', 'ibc_denom']) ?? '') as string;
  const symbol = (getAny(m, ['symbol', 'base_symbol', 'asset_symbol']) ?? '') as string;
  const priceUsd = toNum(getAny(m, ['price_usd', 'priceUsd', 'price', 'usd_price']));
  const depositAmount = toNum(getAny(m, ['deposit_amount', 'deposited_amount', 'total_deposits', 'total_supply']));
  const borrowAmount = toNum(getAny(m, ['borrow_amount', 'total_borrows', 'borrowed_amount']));
  const depositApyPct = toNum(getAny(m, ['deposit_apy', 'supply_apy', 'deposit_apr', 'supply_apr']));
  const borrowApyPct = toNum(getAny(m, ['borrow_apy', 'borrow_apr']));

  return {
    denom,
    symbol,
    priceUsd,
    depositAmount,
    borrowAmount,
    depositApyPct,
    borrowApyPct,
  };
}

export class MarsService {
  static async listMarkets(params: { chain?: MarsChain; days?: number } = {}): Promise<MarsRedbankMarket[]> {
    const { chain = 'neutron', days = 1 } = params;
    const url = `${BASE}/redbank_markets_data?chain=${encodeURIComponent(chain)}&days=${days}`;
    const json: any = await getJsonCached<any>(url, 60_000);
    let arr: any[] = [];
    if (Array.isArray(json)) arr = json;
    else if (Array.isArray(json?.data)) {
      const dataArr: any[] = json.data as any[];
      const flattened = dataArr
        .map((e: any) => (Array.isArray(e?.markets) ? e.markets : []))
        .flat();
      arr = flattened.length ? flattened : dataArr;
    }
    else if (json?.data && typeof json.data === 'object') {
      const dv = Object.values(json.data);
      if (Array.isArray(dv)) {
        if (dv.length && Array.isArray(dv[0])) arr = (dv as any[]).flat() as any[];
        else arr = dv as any[];
      }
    }
    else if (Array.isArray(json?.markets)) arr = json.markets;
    else if (json?.markets && typeof json.markets === 'object') {
      const mv = Object.values(json.markets);
      if (Array.isArray(mv)) arr = mv as any[];
    }
    else if (Array.isArray(json?.data?.markets)) arr = json.data.markets;
    else if (json && typeof json === 'object') {
      // try to find first array field
      const firstArr = Object.values(json).find((v: any) => Array.isArray(v)) as any[] | undefined;
      if (firstArr) arr = firstArr;
      // if still empty, try using object values as entries
      if ((!arr || arr.length === 0)) {
        const values = Object.values(json).filter((v: any) => v && typeof v === 'object');
        if (values.length) {
          // flatten one level of nested objects/arrays
          const flat: any[] = [];
          for (const v of values) {
            if (Array.isArray(v)) flat.push(...v);
            else if (typeof v === 'object') flat.push(...Object.values(v));
          }
          if (flat.length) arr = flat;
          else arr = values as any[];
        }
      }
    }
    const out = (arr || []).map(normalizeMarket);
    console.log('[MarsService] listMarkets parsed', { count: out.length, sample: out[0] });
    return out;
  }

  static async getMarket(params: { chain?: MarsChain; days?: number; market: string }): Promise<MarsRedbankMarket | null> {
    const { chain = 'neutron', days = 1, market } = params;
    const slug = String(market).trim();
    const makeUrl = (mkt: string) => `${BASE}/redbank_markets_data?chain=${encodeURIComponent(chain)}&days=${days}&market=${encodeURIComponent(mkt)}`;
    const url = makeUrl(slug);
    try {
      const json: any = await getJsonCached<any>(url, 60_000);
      let raw: any = null;
      const queryLc = slug.toLowerCase();
      const pick = (arr: any[]) => arr.find((x) => {
        const sym = String(x?.symbol || '').toLowerCase();
        const den = String(x?.denom || '').toLowerCase();
        return sym === queryLc || den === queryLc || den.includes(queryLc);
      }) || arr.find((x) => String(x?.symbol || '').toLowerCase().includes(queryLc));
      if (Array.isArray(json)) raw = pick(json);
      else if (Array.isArray(json?.data)) raw = pick(json.data);
      else if (Array.isArray(json?.data?.markets)) raw = pick(json.data.markets);
      else raw = json;
      const norm = raw ? normalizeMarket(raw) : null;
      // If the response is invalid (all zeros), fall back to search
      if (norm && (norm.depositApyPct || norm.borrowApyPct || norm.priceUsd || norm.depositAmount || norm.borrowAmount)) {
        return norm;
      }
    } catch {
      // ignore and fall back
    }
    // Try again with uppercase market (in case the API is case-sensitive)
    try {
      const json: any = await getJsonCached<any>(makeUrl(slug.toUpperCase()), 60_000);
      let raw: any = Array.isArray(json) ? json.find((x) => String(x?.symbol || '').toUpperCase() === slug.toUpperCase()) : json;
      if (!raw && Array.isArray(json?.data)) raw = json.data.find((x: any) => String(x?.symbol || '').toUpperCase() === slug.toUpperCase());
      if (!raw && Array.isArray(json?.data?.markets)) raw = json.data.markets.find((x: any) => String(x?.symbol || '').toUpperCase() === slug.toUpperCase());
      const norm = raw ? normalizeMarket(raw) : null;
      if (norm && (norm.depositApyPct || norm.borrowApyPct || norm.priceUsd || norm.depositAmount || norm.borrowAmount)) {
        return norm;
      }
    } catch {}
    // Fallback: fetch all and match by symbol/denom (case-insensitive)
    const all = await this.listMarkets({ chain, days });
    const query = slug.toLowerCase();
    const found = all.find((m) =>
      m.symbol?.toLowerCase() === query ||
      m.denom?.toLowerCase() === query ||
      // allow partial denom contains
      m.denom?.toLowerCase().includes(query)
    );
    return found ?? null;
  }

  static async aprHistory(params: { chain?: MarsChain; denom: string; granularity?: Granularity; unit?: number }): Promise<MarsAprSeries> {
    const { chain = 'neutron', denom, granularity = 'day', unit = 30 } = params;
    const url = `${BASE}/rb_asset_apr?chain=${encodeURIComponent(chain)}&granularity=${encodeURIComponent(granularity)}&unit=${unit}&denom=${encodeURIComponent(denom)}`;
    const json = await getJsonCached<{ data: { supply_apr: { date: string; value: string }[]; borrow_apr: { date: string; value: string }[] }[] }>(url, 60_000);
    const first = Array.isArray(json?.data) ? json.data[0] : undefined;
    const supply_apr: AprPoint[] = (first?.supply_apr ?? []).map((p) => ({ date: p.date, value: toNum(p.value) }));
    const borrow_apr: AprPoint[] = (first?.borrow_apr ?? []).map((p) => ({ date: p.date, value: toNum(p.value) }));
    return { supply_apr, borrow_apr };
  }
}
