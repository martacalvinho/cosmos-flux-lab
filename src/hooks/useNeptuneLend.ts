import { useQuery } from "@tanstack/react-query";

export interface NeptuneSnapshot {
  timestamp: string;
  protocol: "Neptune";
  asset: string; // 'ATOM'
  url: string;
  supplyApyPct?: number;
  borrowApyPct?: number;
  utilizationPct?: number;
  totalSupplyUsd?: number;
  totalBorrowUsd?: number;
  raw?: {
    lendApyTxt?: string;
    borrowApyTxt?: string;
    utilizationTxt?: string;
    totalLentTxt?: string;
    totalBorrowedTxt?: string;
  };
}

function parsePercent(t?: string) {
  if (!t) return undefined;
  const m = t.replace(/,/g, "").match(/(-?\d+(?:\.\d+)?)\s*%/);
  return m ? Number(m[1]) : undefined;
}
function parseUsd(t?: string) {
  if (!t) return undefined;
  const m = t.match(/\$\s*([\d,.]+(?:\.\d+)?)(?:\s*([KMB]))?/i);
  if (!m) return undefined;
  const num = Number(m[1].replace(/,/g, ""));
  const suf = (m[2] || "").toUpperCase();
  const mult = suf === "K" ? 1e3 : suf === "M" ? 1e6 : suf === "B" ? 1e9 : 1;
  return Number.isFinite(num) ? num * mult : undefined;
}

async function fetchLatestNeptune(): Promise<NeptuneSnapshot | undefined> {
  const res = await fetch("/data/neptune-lend-history.json", { cache: "no-store" });
  if (!res.ok) return undefined;
  const arr = (await res.json()) as NeptuneSnapshot[] | undefined;
  if (!arr || !Array.isArray(arr) || arr.length === 0) return undefined;
  const sorted = [...arr].sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
  const latest = { ...sorted[0] } as NeptuneSnapshot;
  if (latest.supplyApyPct == null && latest.raw?.lendApyTxt) latest.supplyApyPct = parsePercent(latest.raw.lendApyTxt);
  if (latest.borrowApyPct == null && latest.raw?.borrowApyTxt) latest.borrowApyPct = parsePercent(latest.raw.borrowApyTxt);
  if (latest.utilizationPct == null && latest.raw?.utilizationTxt) latest.utilizationPct = parsePercent(latest.raw.utilizationTxt);
  if (latest.totalSupplyUsd == null && latest.raw?.totalLentTxt) latest.totalSupplyUsd = parseUsd(latest.raw.totalLentTxt);
  if (latest.totalBorrowUsd == null && latest.raw?.totalBorrowedTxt) latest.totalBorrowUsd = parseUsd(latest.raw.totalBorrowedTxt);
  return latest;
}

export function useNeptuneLend() {
  const q = useQuery({
    queryKey: ["neptune-lend-atom"],
    queryFn: fetchLatestNeptune,
    staleTime: 60_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: false,
  });
  return {
    isLoading: q.isLoading,
    isError: !!q.error,
    supplyApyPct: q.data?.supplyApyPct,
    borrowApyPct: q.data?.borrowApyPct,
    utilizationPct: q.data?.utilizationPct,
    totalSupplyUsd: q.data?.totalSupplyUsd,
    totalBorrowUsd: q.data?.totalBorrowUsd,
  };
}
