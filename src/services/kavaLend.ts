// Kava Lend service: fetch ATOM Supply/Borrow APY from Kava Hard module REST
// Docs: https://docs.kava.io

export type KavaLendApy = {
  denom: string;
  supplyApyPct: number; // percent (e.g. 1.23 means 1.23%)
  supplyRewardApyPct?: number; // percent from incentives
  borrowApyPct: number; // percent
  totalSupplyUsd?: number; // USD value of total supplied
  totalBorrowUsd?: number; // USD value of total borrowed
};

const HOSTS = [
  'https://api.kava.io',
  'https://api.data.kava.io',
];

async function fetchJson(url: string): Promise<any | undefined> {
  try {
    const res = await fetch(url, {
      headers: {
        accept: 'application/json',
        'user-agent': 'cosmos-flux-lab/1.0',
      },
    });
    if (!res.ok) return undefined;
    return await res.json().catch(() => undefined);
  } catch {
    return undefined;
  }
}

async function getAtomDenom(): Promise<string | undefined> {
  for (const base of HOSTS) {
    const j = await fetchJson(`${base}/kava/hard/v1beta1/params`);
    const markets: any[] = j?.params?.money_markets ?? [];
    const mm = markets.find((m) => String(m?.spot_market_id || '').toUpperCase().includes('ATOM'));
    if (mm?.denom) return mm.denom as string; // e.g. 'ibc/<HASH>'
  }
  return undefined;
}

async function getInterestForDenom(denom: string): Promise<{ supply: number; borrow: number } | undefined> {
  for (const base of HOSTS) {
    const j = await fetchJson(`${base}/kava/hard/v1beta1/interest-rate/${encodeURIComponent(denom)}`);
    const ir = (j?.interest_rates && j.interest_rates[0]) || j?.interest_rate || undefined;
    if (ir?.supply_interest_rate != null && ir?.borrow_interest_rate != null) {
      const supply = Number(ir.supply_interest_rate);
      const borrow = Number(ir.borrow_interest_rate);
      if (Number.isFinite(supply) && Number.isFinite(borrow)) {
        return { supply, borrow };
      }
    }
  }
  return undefined;
}

// --- Fallback path: derive rates from params + state ---
type Totals = { deposits: number; borrows: number; reserves: number };

async function getHardParams(): Promise<any | undefined> {
  for (const base of HOSTS) {
    const j = await fetchJson(`${base}/kava/hard/v1beta1/params`);
    if (j?.params?.money_markets) return j;
  }
  return undefined;
}

function findMarket(paramsJson: any, denom: string): any | undefined {
  const markets: any[] = paramsJson?.params?.money_markets ?? [];
  return markets.find((m) => String(m?.denom || '') === denom);
}

function sumCoinsAmount(list: any[], denom: string): number {
  if (!Array.isArray(list)) return 0;
  let total = 0;
  for (const entry of list) {
    const coins = entry?.amount ?? entry?.amounts ?? [];
    if (Array.isArray(coins)) {
      for (const c of coins) {
        if (String(c?.denom) === denom) {
          const v = Number(c?.amount ?? 0);
          if (Number.isFinite(v)) total += v;
        }
      }
    }
  }
  return total;
}

function sumReserveAmount(list: any[], denom: string): number {
  if (!Array.isArray(list)) return 0;
  let total = 0;
  for (const r of list) {
    if (String(r?.denom) === denom) {
      const v = Number(r?.amount ?? 0);
      if (Number.isFinite(v)) total += v;
    } else if (Array.isArray(r?.amount)) {
      // some nodes may return reserves as coins array per item
      for (const c of r.amount) {
        if (String(c?.denom) === denom) {
          const v = Number(c?.amount ?? 0);
          if (Number.isFinite(v)) total += v;
        }
      }
    }
  }
  return total;
}

async function getTotals(denom: string): Promise<Totals | undefined> {
  for (const base of HOSTS) {
    const [depositsJson, borrowsJson, reservesJson] = await Promise.all([
      fetchJson(`${base}/kava/hard/v1beta1/deposits?pagination.limit=10000`),
      fetchJson(`${base}/kava/hard/v1beta1/borrows?pagination.limit=10000`),
      fetchJson(`${base}/kava/hard/v1beta1/reserves`),
    ]);
    const depositsList = depositsJson?.deposits ?? depositsJson?.result ?? [];
    const borrowsList = borrowsJson?.borrows ?? borrowsJson?.result ?? [];
    const reservesList = reservesJson?.reserves ?? reservesJson?.result ?? [];

    if (Array.isArray(depositsList) && Array.isArray(borrowsList) && Array.isArray(reservesList)) {
      const deposits = sumCoinsAmount(depositsList, denom);
      const borrows = sumCoinsAmount(borrowsList, denom);
      const reserves = sumReserveAmount(reservesList, denom);
      // if we have at least one of them, consider it a valid response
      if (deposits + borrows + reserves >= 0) {
        return { deposits, borrows, reserves };
      }
    }
  }
  return undefined;
}

function computeRatesFromModel(market: any, totals: Totals): { supply: number; borrow: number } | undefined {
  if (!market?.interest_rate_model) return undefined;
  const irm = market.interest_rate_model;
  const baseRate = Number(irm.base_rate_apy ?? irm.base_rate ?? 0);
  const baseMul = Number(irm.base_multiplier ?? irm.multiplier ?? 0);
  const kink = Number(irm.kink ?? 1);
  const jumpMul = Number(irm.jump_multiplier ?? 0);
  const reserveFactor = Number(market?.reserve_factor ?? market?.params?.reserve_factor ?? 0);

  // utilization = borrows / (deposits - reserves)
  const supplyLiquidity = Math.max(0, (totals.deposits || 0) - (totals.reserves || 0));
  const uRaw = supplyLiquidity > 0 ? (totals.borrows || 0) / supplyLiquidity : 0;
  const u = Math.max(0, Math.min(1, uRaw));

  const k = Math.max(0, Math.min(1, Number.isFinite(kink) ? kink : 1));
  const below = Math.min(u, k);
  const above = Math.max(0, u - k);
  const borrow = baseRate + baseMul * below + jumpMul * above;
  const supply = borrow * u * (1 - Math.max(0, Math.min(1, reserveFactor)));
  if (!Number.isFinite(borrow) || !Number.isFinite(supply)) return undefined;
  return { supply, borrow };
}

// ---- Incentives and prices (for reward APY and totals) ----
async function getIncentiveParams(): Promise<any | undefined> {
  for (const base of HOSTS) {
    const j = await fetchJson(`${base}/kava/incentive/v1beta1/params`);
    if (j?.params) return j;
  }
  return undefined;
}

async function getPriceMap(): Promise<Record<string, number> | undefined> {
  for (const base of HOSTS) {
    const j = await fetchJson(`${base}/kava/pricefeed/v1beta1/prices`);
    const arr: any[] = j?.prices || j?.current_prices || [];
    if (Array.isArray(arr) && arr.length) {
      const m: Record<string, number> = {};
      for (const p of arr) {
        const id = String(p?.market_id || p?.marketId || '').toUpperCase();
        const priceStr = p?.price ?? p?.current_price;
        const price = Number(priceStr);
        if (id && Number.isFinite(price)) m[id] = price;
      }
      return m;
    }
  }
  return undefined;
}

async function getDenomsMetadata(): Promise<Record<string, { display: string; displayExponent: number }>> {
  for (const base of HOSTS) {
    const j = await fetchJson(`${base}/cosmos/bank/v1beta1/denoms_metadata?pagination.limit=1000`);
    const list: any[] = j?.metadatas || j?.metadata || [];
    if (Array.isArray(list) && list.length) {
      const out: Record<string, { display: string; displayExponent: number }> = {};
      for (const md of list) {
        const baseDenom = String(md?.base || '');
        const display = String(md?.display || '');
        const dus: any[] = md?.denom_units || [];
        const dispUnit = dus.find((u: any) => String(u?.denom || '') === display);
        const exp = Number(dispUnit?.exponent ?? 6);
        if (baseDenom) out[baseDenom] = { display, displayExponent: Number.isFinite(exp) ? exp : 6 };
      }
      return out;
    }
  }
  return {};
}

function toTokens(amountBaseUnits: number, conversionFactor: string | number): number {
  const cf = typeof conversionFactor === 'string' ? Number(conversionFactor) : conversionFactor;
  const den = Number.isFinite(cf) && cf > 0 ? cf : 1_000_000;
  return amountBaseUnits / den;
}

function pow10(n: number): number {
  return Math.pow(10, n);
}

function resolveSymbolAndExponent(
  denomsMeta: Record<string, { display: string; displayExponent: number }>,
  denom: string,
): { symbol: string; exp: number } {
  const md = denomsMeta[denom];
  if (md) return { symbol: (md.display || '').toUpperCase(), exp: md.displayExponent ?? 6 };
  const d = (denom || '').toLowerCase();
  // common fallbacks on Kava
  if (d === 'ukava' || d.includes('kava')) return { symbol: 'KAVA', exp: 6 };
  if (d === 'uhard' || d.includes('hard')) return { symbol: 'HARD', exp: 6 };
  if (d.includes('usdc')) return { symbol: 'USDC', exp: 6 };
  if (d.includes('usdt')) return { symbol: 'USDT', exp: 6 };
  if (d.includes('usdx')) return { symbol: 'USDX', exp: 6 };
  return { symbol: '', exp: 6 };
}

function toMillis(ts: any): number | undefined {
  if (!ts) return undefined;
  if (typeof ts === 'string') {
    const d = Date.parse(ts);
    return Number.isFinite(d) ? d : undefined;
  }
  if (typeof ts === 'object') {
    if (ts.seconds != null) {
      const s = Number(ts.seconds);
      const n = Number(ts.nanos ?? 0);
      if (Number.isFinite(s)) return s * 1000 + Math.floor((Number.isFinite(n) ? n : 0) / 1e6);
    }
    if (typeof ts.time === 'string') {
      const d = Date.parse(ts.time);
      return Number.isFinite(d) ? d : undefined;
    }
  }
  return undefined;
}

function isNowWithin(start?: any, end?: any): boolean {
  try {
    const now = Date.now();
    const s = toMillis(start);
    const e = toMillis(end);
    if (s != null && now < s) return false;
    if (e != null && now > e) return false;
    return true;
  } catch {
    return true;
  }
}

export async function getKavaLendApy(): Promise<KavaLendApy> {
  const denom = await getAtomDenom();
  if (!denom) throw new Error('Kava Lend: ATOM money market not found');
  const ir = await getInterestForDenom(denom);

  // Fetch supporting data shared by both direct and fallback paths
  const [paramsJson, totals, prices, denomsMeta] = await Promise.all([
    getHardParams(),
    getTotals(denom),
    getPriceMap(),
    getDenomsMetadata(),
  ]);
  const market = paramsJson ? findMarket(paramsJson, denom) : undefined;

  // compute base rates
  let supplyApy = ir?.supply;
  let borrowApy = ir?.borrow;
  if (!Number.isFinite(supplyApy) || !Number.isFinite(borrowApy)) {
    if (!market || !totals) throw new Error('Kava Lend: rates unavailable (fallback failed)');
    const derived = computeRatesFromModel(market, totals);
    if (!derived) throw new Error('Kava Lend: could not derive interest rates');
    supplyApy = derived.supply;
    borrowApy = derived.borrow;
  }

  // totals in USD
  let totalSupplyUsd: number | undefined = undefined;
  let totalBorrowUsd: number | undefined = undefined;
  let rewardPct: number | undefined = undefined;

  if (market && totals && prices) {
    const spotMarketId = String(market?.spot_market_id || '').toUpperCase(); // e.g. ATOM:USD
    const assetUsd = Number(prices[spotMarketId]);
    const cf = market?.conversion_factor ?? '1000000';
    if (Number.isFinite(assetUsd) && assetUsd > 0) {
      const depositsTokens = toTokens(totals.deposits, cf);
      const borrowsTokens = toTokens(totals.borrows, cf);
      totalSupplyUsd = depositsTokens * assetUsd;
      totalBorrowUsd = borrowsTokens * assetUsd;
    }

    // reward APR from incentives
    const inc = await getIncentiveParams();
    const periods: any[] = inc?.params?.hard_supply_reward_periods || inc?.hard_supply_reward_periods || [];
    const baseSymbol = String((market?.spot_market_id || '').split(':')[0] || '').toUpperCase();
    const denomUp = String(denom).toUpperCase();
    const relevant = periods.filter((p) => {
      const ct = String(p?.collateral_type || '').toUpperCase();
      const match = (ct === denomUp) || (ct === baseSymbol) || ct.endsWith(`/${baseSymbol}`) || ct.includes(baseSymbol);
      return match && isNowWithin(p?.start, p?.end);
    });
    if (relevant.length && Number.isFinite(totalSupplyUsd) && (totalSupplyUsd as number) > 0) {
      let rewardUsdPerSec = 0;
      for (const p of relevant) {
        // rewards_per_second can be:
        // - array of coins
        // - a single coin object { denom, amount }
        // - an object { coins: Coin[] }
        let coins: any[] = [];
        const rps = p?.rewards_per_second;
        if (Array.isArray(rps)) coins = rps;
        else if (rps && typeof rps === 'object' && Array.isArray(rps.coins)) coins = rps.coins;
        else if (rps && typeof rps === 'object' && rps.denom) coins = [rps];
        for (const c of coins) {
          const rDenom = String(c?.denom || '');
          const amt = Number(c?.amount ?? 0);
          if (!rDenom || !Number.isFinite(amt)) continue;
          const { symbol, exp } = resolveSymbolAndExponent(denomsMeta, rDenom);
          const marketId = symbol ? `${symbol}:USD` : '';
          const price = symbol === 'USDX' ? 1 : Number(prices[marketId]);
          if (!Number.isFinite(price) || price <= 0) continue;
          const tokensPerSec = amt / pow10(exp);
          rewardUsdPerSec += tokensPerSec * price;
        }
      }
      if (rewardUsdPerSec > 0 && (totalSupplyUsd as number) > 0) {
        const secondsPerYear = 365 * 24 * 60 * 60;
        const rewardApr = (rewardUsdPerSec * secondsPerYear) / (totalSupplyUsd as number);
        if (Number.isFinite(rewardApr)) rewardPct = rewardApr * 100;
      }
    }
  }

  return {
    denom,
    supplyApyPct: (supplyApy as number) * 100,
    borrowApyPct: (borrowApy as number) * 100,
    supplyRewardApyPct: rewardPct,
    totalSupplyUsd,
    totalBorrowUsd,
  };
}
