// Quicksilver service: fetch redemption rates and compute earnings
// Data source: https://lcd.quicksilver.zone/quicksilver/interchainstaking/v1/zones

import { fetchCoinGeckoPrice } from './coingecko';

export type QuicksilverZone = {
  chain_id: string;
  base_denom: string; // e.g. 'uatom'
  local_denom: string; // e.g. 'uqatom'
  redemption_rate: string; // decimal as string
  last_redemption_rate?: string; // decimal as string
  decimals?: string; // optional, may be present in response
};

export type QuicksilverZonesResponse = {
  zones: QuicksilverZone[];
};

const ZONES_URL = 'https://lcd.quicksilver.zone/quicksilver/interchainstaking/v1/zones';
const BANK_SUPPLY_URL = (denom: string) =>
  `https://lcd.quicksilver.zone/cosmos/bank/v1beta1/supply/by_denom?denom=${denom}`;

export async function fetchQuicksilverZones(): Promise<QuicksilverZone[]> {
  const res = await fetch(ZONES_URL, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch Quicksilver zones');
  const data: QuicksilverZonesResponse = await res.json();
  return data.zones ?? [];
}

export function calculateQuicksilverEarnings(params: {
  deposit: number; // D in base asset units (e.g., ATOM)
  r1: number; // redemption rate at deposit time
  r2: number; // redemption rate at redeem time (or current)
  rewardsFeePct?: number; // fee on staking rewards, default 3.5%
}) {
  const { deposit, r1, r2, rewardsFeePct = 3.5 } = params;
  if (!deposit || !r1 || !r2) {
    return { grossEarnings: 0, netEarnings: 0, finalAssets: deposit ?? 0 };
  }
  const grossMultiplier = r2 / r1;
  const grossEarnings = deposit * (grossMultiplier - 1);
  const feeRate = Math.max(0, rewardsFeePct) / 100;
  const fee = Math.max(0, grossEarnings) * feeRate; // fee applies only on rewards
  const netEarnings = grossEarnings - fee;
  const finalAssets = deposit + netEarnings;
  return { grossEarnings, netEarnings, finalAssets };
}

export async function getQuicksilverRealtime(chainId: string = 'cosmoshub-4') {
  const zones = await fetchQuicksilverZones();
  const zone = zones.find((z) => z.chain_id === chainId);
  if (!zone) throw new Error(`Quicksilver zone not found for chain_id: ${chainId}`);

  const redemptionRate = parseFloat(zone.redemption_rate);
  const lastRedemptionRate = zone.last_redemption_rate
    ? parseFloat(zone.last_redemption_rate)
    : undefined;

  // TVL (optional best-effort): qAsset supply * redemptionRate * ATOM price
  // NOTE: We assume 6 decimals for uq* denoms if `decimals` is not provided.
  let tvlUsd: number | undefined = undefined;
  try {
    const denom = zone.local_denom; // e.g., 'uqatom'
    if (denom) {
      const [supplyRes, prices] = await Promise.all([
        fetch(BANK_SUPPLY_URL(denom)),
        fetchCoinGeckoPrice(['cosmos']), // ATOM price
      ]);
      if (supplyRes.ok) {
        const supplyJson = await supplyRes.json();
        const microSupply = Number(supplyJson.amount?.amount ?? '0');
        const decimals = zone.decimals ? Number(zone.decimals) : 6;
        const qAssetSupply = microSupply / Math.pow(10, decimals);
        const underlyingAtom = qAssetSupply * redemptionRate;
        const priceUsd = prices.cosmos?.usd;
        if (priceUsd !== undefined) {
          tvlUsd = underlyingAtom * priceUsd;
        }
      }
    }
  } catch (e) {
    // ignore TVL errors; still return rates
    // console.warn('Quicksilver TVL calc failed', e);
  }

  return { redemptionRate, lastRedemptionRate, tvlUsd };
}
