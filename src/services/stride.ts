// Stride service: fetch host zone data and ATOM price, compute TVL
export type StrideHostZone = {
  host_zone: {
    chain_id: string;
    total_delegations: string; // uatom as string
    redemption_rate: string; // decimal as string
    last_redemption_rate?: string; // decimal as string
  };
};

import { fetchCoinGeckoPrice } from './coingecko';

const STRIDE_HOST_ZONE_URL =
  'https://rest.cosmos.directory/stride/Stride-Labs/stride/stakeibc/host_zone/cosmoshub-4';

export async function fetchStrideHostZone(): Promise<StrideHostZone> {
  const res = await fetch(STRIDE_HOST_ZONE_URL);
  if (!res.ok) throw new Error('Failed to fetch Stride host zone');
  return res.json();
}

export function uatomToAtom(uatom: string | number | bigint): number {
  const n = typeof uatom === 'bigint' ? Number(uatom) : Number(uatom);
  return n / 1_000_000;
}

export async function getStrideRealtime() {
  const [host, priceData] = await Promise.all([
    fetchStrideHostZone(),
    fetchCoinGeckoPrice(['cosmos']),
  ]);
  const priceUsd = priceData.cosmos.usd;
  const totalUatom = BigInt(host.host_zone.total_delegations);
  const totalAtom = uatomToAtom(totalUatom);
  const tvlUsd = totalAtom * priceUsd;
  const redemptionRate = parseFloat(host.host_zone.redemption_rate);
  const lastRedemptionRate = host.host_zone.last_redemption_rate ? parseFloat(host.host_zone.last_redemption_rate) : undefined;
  return { tvlUsd, totalAtom, priceUsd, redemptionRate, lastRedemptionRate };
}
