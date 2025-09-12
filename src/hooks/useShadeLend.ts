import { useQuery } from "@tanstack/react-query";

export interface ShadeSnapshot {
  timestamp: string;
  protocol: "Shade";
  page: "lend" | "borrow";
  asset: string; // 'ATOM'
  url: string;
  // parsed numeric fields (preferred)
  supplyAprPct?: number;
  borrowAprPct?: number;
  utilizationPct?: number;
  totalSuppliedUsd?: number;
  totalBorrowedUsd?: number;
  // raw strings as fallback
  raw?: {
    supplyAprTxt?: string;
    borrowAprTxt?: string;
    utilizationTxt?: string;
    totalSuppliedTxt?: string;
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
  const m = t.match(/\$\s*([\d,.]+(?:\.\d+)?)/);
  return m ? Number(m[1].replace(/,/g, "")) : undefined;
}

async function fetchLatest(file: string): Promise<ShadeSnapshot | undefined> {
  const res = await fetch(file, { cache: "no-store" });
  if (!res.ok) return undefined;
  const arr = (await res.json()) as ShadeSnapshot[] | undefined;
  if (!arr || !Array.isArray(arr) || arr.length === 0) return undefined;
  const sorted = [...arr].sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
  const latest = { ...sorted[0] } as ShadeSnapshot;
  // Fill from raw if parsed missing
  if (latest.supplyAprPct == null && latest.raw?.supplyAprTxt) latest.supplyAprPct = parsePercent(latest.raw.supplyAprTxt);
  if (latest.borrowAprPct == null && latest.raw?.borrowAprTxt) latest.borrowAprPct = parsePercent(latest.raw.borrowAprTxt);
  if (latest.utilizationPct == null && latest.raw?.utilizationTxt) latest.utilizationPct = parsePercent(latest.raw.utilizationTxt);
  if (latest.totalSuppliedUsd == null && latest.raw?.totalSuppliedTxt) latest.totalSuppliedUsd = parseUsd(latest.raw.totalSuppliedTxt);
  if (latest.totalBorrowedUsd == null && latest.raw?.totalBorrowedTxt) latest.totalBorrowedUsd = parseUsd(latest.raw.totalBorrowedTxt);
  return latest;
}

export function useShadeLend() {
  const q = useQuery({
    queryKey: ["shade-lend-atom"],
    queryFn: async () => {
      // Load latest from lend and borrow feeds and merge the fields we need
      const [lend, borrow] = await Promise.all([
        fetchLatest("/data/shade-lend-history.json"),
        fetchLatest("/data/shade-borrow-history.json"),
      ]);
      const L = lend;
      const B = borrow;
      const merged = {
        timestamp: (L?.timestamp && B?.timestamp) ? (L.timestamp > B.timestamp ? L.timestamp : B.timestamp) : (L?.timestamp || B?.timestamp || new Date().toISOString()),
        supplyAprPct: L?.supplyAprPct,
        borrowAprPct: B?.borrowAprPct,
        borrowAprBasePct: (B as any)?.borrowAprBasePct,
        borrowRewardsAprPct: (B as any)?.borrowRewardsAprPct,
        utilizationPct: L?.utilizationPct ?? B?.utilizationPct,
        totalSuppliedUsd: L?.totalSuppliedUsd ?? B?.totalSuppliedUsd,
        totalBorrowedUsd: L?.totalBorrowedUsd ?? B?.totalBorrowedUsd,
      };
      return merged;
    },
    staleTime: 60_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: false,
  });
  return {
    isLoading: q.isLoading,
    isError: !!q.error,
    supplyAprPct: q.data?.supplyAprPct,
    borrowAprPct: q.data?.borrowAprPct,
    borrowAprBasePct: (q.data as any)?.borrowAprBasePct,
    borrowRewardsAprPct: (q.data as any)?.borrowRewardsAprPct,
    utilizationPct: q.data?.utilizationPct,
    totalSupplyUsd: q.data?.totalSuppliedUsd,
    totalBorrowUsd: q.data?.totalBorrowedUsd,
  };
}
