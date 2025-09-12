import { useQuery } from '@tanstack/react-query';

export interface UxLendSnapshot {
  timestamp: string;
  chain: string; // 'UX'
  asset: string; // 'ATOM'
  url: string;
  supplyApyPct?: number;
  borrowApyPct?: number;
  utilizationPct?: number;
  totalSupplyUsd?: number;
  totalBorrowUsd?: number;
  raw?: {
    supplyApyTxt?: string;
    borrowApyTxt?: string;
    utilRateTxt?: string;
    totalSupplyTxt?: string;
    totalBorrowTxt?: string;
  };
}

async function fetchLatestUxSnapshot(): Promise<UxLendSnapshot | undefined> {
  const res = await fetch('/data/ux-lend-history.json', { cache: 'no-store' });
  if (!res.ok) return undefined;
  const arr = (await res.json()) as UxLendSnapshot[] | undefined;
  if (!arr || !Array.isArray(arr) || arr.length === 0) return undefined;
  // Return the most recent by timestamp
  const sorted = [...arr].sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
  const latest = { ...sorted[0] };
  // Fallback parsing if numeric fields missing but raw strings available
  const parsePercent = (t?: string) => {
    if (!t) return undefined;
    const m = t.replace(/,/g, '').match(/(-?\d+(?:\.\d+)?)\s*%/);
    return m ? Number(m[1]) : undefined;
  };
  const parseUsd = (t?: string) => {
    if (!t) return undefined;
    const m = t.replace(/[,\s\$]/g, '').match(/(-?\d+(?:\.\d+)?)/);
    return m ? Number(m[1]) : undefined;
  };
  if ((latest.supplyApyPct == null) && latest.raw?.supplyApyTxt) latest.supplyApyPct = parsePercent(latest.raw.supplyApyTxt);
  if ((latest.borrowApyPct == null) && latest.raw?.borrowApyTxt) latest.borrowApyPct = parsePercent(latest.raw.borrowApyTxt);
  if ((latest.utilizationPct == null) && latest.raw?.utilRateTxt) latest.utilizationPct = parsePercent(latest.raw.utilRateTxt);
  if ((latest.totalSupplyUsd == null) && latest.raw?.totalSupplyTxt) latest.totalSupplyUsd = parseUsd(latest.raw.totalSupplyTxt);
  if ((latest.totalBorrowUsd == null) && latest.raw?.totalBorrowTxt) latest.totalBorrowUsd = parseUsd(latest.raw.totalBorrowTxt);
  return latest;
}

export function useUxLend() {
  const q = useQuery({
    queryKey: ['ux-lend-atom'],
    queryFn: fetchLatestUxSnapshot,
    staleTime: 60_000, // 1 min
    refetchInterval: 60_000, // poll every minute
    refetchOnWindowFocus: false,
  });

  return {
    isLoading: q.isLoading,
    isError: q.isError,
    supplyApyPct: q.data?.supplyApyPct,
    borrowApyPct: q.data?.borrowApyPct,
    utilizationPct: q.data?.utilizationPct,
    totalSupplyUsd: q.data?.totalSupplyUsd,
    totalBorrowUsd: q.data?.totalBorrowUsd,
    sourceUrl: q.data?.url,
    timestamp: q.data?.timestamp,
  };
}
