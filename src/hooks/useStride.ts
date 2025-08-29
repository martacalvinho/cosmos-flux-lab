import { useQuery } from '@tanstack/react-query';
import { getStrideRealtime } from '@/services/stride';

export type RedemptionRow = { id: number; timestamp: string; redemption_rate: number };

function daysBetween(a: Date, b: Date) {
  return Math.abs(+a - +b) / (1000 * 60 * 60 * 24);
}

function calcApyApr(history: RedemptionRow[]) {
  if (!history || history.length < 2) return { apy: undefined, apr: undefined, periodDays: undefined };
  const sorted = [...history].sort((x, y) => x.timestamp.localeCompare(y.timestamp));
  const latest = sorted[sorted.length - 1];
  const targetDate = new Date(latest.timestamp);
  targetDate.setDate(targetDate.getDate() - 30);
  // pick entry 30 days ago, or oldest if insufficient data
  let past = sorted[0];
  for (let i = sorted.length - 2; i >= 0; i--) {
    const dt = new Date(sorted[i].timestamp);
    if (dt <= targetDate) {
      past = sorted[i];
      break;
    }
  }
  const periodDays = Math.max(1, daysBetween(new Date(past.timestamp), new Date(latest.timestamp)));
  const periodicReturn = latest.redemption_rate / past.redemption_rate - 1;
  const factor = 365 / periodDays;
  // Only show APY if we have enough historical data
  const apy = periodDays >= 28 ? Math.pow(1 + periodicReturn, factor) - 1 : undefined;
  const apr = periodicReturn * factor; // simple
  return { apy, apr, periodDays };
}

// Compute APR using only the latest snapshot vs the prior snapshot
function calcSnapshotApr(history: RedemptionRow[]) {
  if (!history || history.length < 2) return { apr: undefined as number | undefined, periodDays: undefined as number | undefined };
  const sorted = [...history].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const prev = sorted[sorted.length - 2];
  const latest = sorted[sorted.length - 1];
  const periodicReturn = latest.redemption_rate / prev.redemption_rate - 1;
  const periodsPerDay = 4; // assume ~every 6 hours
  const periodsPerYear = 365 * periodsPerDay;
  const apr = periodicReturn * periodsPerYear;
  return { apr, periodDays: 1 / periodsPerDay };
}

export function useStride() {
  // history JSON served from public/
  const historyQuery = useQuery<RedemptionRow[]>({
    queryKey: ['stride-history'],
    queryFn: async () => {
      const res = await fetch('/data/stride-redemption-history.json', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to fetch Stride history');
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const realtimeQuery = useQuery({
    queryKey: ['stride-realtime'],
    queryFn: getStrideRealtime,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    // gentle polling so Current Rate updates soon after page load
    refetchInterval: 60 * 1000,
  });

  // 1. Calculate the robust, 30-day historical stats first. This is our gold standard for APY.
  const historicalStats = historyQuery.data ? calcApyApr(historyQuery.data) : { apy: undefined, apr: undefined, periodDays: undefined };

  let apy = historicalStats.apy;
  let apr = historicalStats.apr; // This will be the Current Rate
  let periodDays = historicalStats.periodDays;

  // 2. THE FIX: If our historical calculation is zero or undefined, use the live instantaneous rate.
  if (apr === undefined || apr === 0) {
    const liveNow = realtimeQuery.data?.redemptionRate;
    const liveThen = realtimeQuery.data?.lastRedemptionRate; // Get the new value

    // Check if we have valid data and if the rate has actually increased
    if (liveNow && liveThen && liveNow > liveThen) {
      const periodicReturn = liveNow / liveThen - 1;

      // Assume rewards compound ~3 times per day (every 8 hours)
      const periodsPerDay = 3;
      const periodsPerYear = 365 * periodsPerDay;

      // Calculate APY and APR based on this short-term, on-chain change
      apy = Math.pow(1 + periodicReturn, periodsPerYear) - 1;
      apr = periodicReturn * periodsPerYear;
      periodDays = 1 / periodsPerDay; // The period is a fraction of a day
    } else {
      // Final fallback to snapshot-to-snapshot if live fails
      const snapshotStats = historyQuery.data ? calcSnapshotApr(historyQuery.data) : { apr: undefined, periodDays: undefined };
      apr = snapshotStats.apr;
      periodDays = snapshotStats.periodDays;
      apy = undefined; // Can't compute APY from this
    }
  }

  return {
    isLoading: historyQuery.isLoading || realtimeQuery.isLoading,
    isError: historyQuery.isError || realtimeQuery.isError,
    tvlUsd: realtimeQuery.data?.tvlUsd,
    currentRedemptionRate: realtimeQuery.data?.redemptionRate,
    priceUsd: realtimeQuery.data?.priceUsd,
    totalAtom: realtimeQuery.data?.totalAtom,
    history: historyQuery.data,
    apy,
    apr,
    periodDays,
  };
}
