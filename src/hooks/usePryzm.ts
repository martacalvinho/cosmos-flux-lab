import { useQuery } from '@tanstack/react-query';
import { getPryzmRealtime } from '@/services/pryzm';
import { daysBetween } from '@/lib/utils';

export type ExchangeRow = { id: number; timestamp: string; exchange_rate: number };

function calcApyApr(history: ExchangeRow[]) {
  if (!history || history.length < 2) return { apy: undefined as number | undefined, periodDays: undefined as number | undefined };
  const sorted = [...history].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const latest = sorted[sorted.length - 1];
  const targetDate = new Date(latest.timestamp);
  targetDate.setDate(targetDate.getDate() - 30);
  let past = sorted[0];
  for (let i = sorted.length - 2; i >= 0; i--) {
    const dt = new Date(sorted[i].timestamp);
    if (dt <= targetDate) {
      past = sorted[i];
      break;
    }
  }
  const periodDays = Math.max(1, daysBetween(new Date(past.timestamp), new Date(latest.timestamp)));
  const periodicReturn = latest.exchange_rate / past.exchange_rate - 1;
  const factor = 365 / periodDays;
  const apy = periodDays >= 28 ? Math.pow(1 + periodicReturn, factor) - 1 : undefined;
  return { apy, periodDays };
}

function calcSnapshotApr(history: ExchangeRow[]) {
  if (!history || history.length < 2) return { apr: undefined as number | undefined, periodDays: undefined as number | undefined };
  const sorted = [...history].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const prev = sorted[sorted.length - 2];
  const latest = sorted[sorted.length - 1];
  const periodDays = daysBetween(new Date(prev.timestamp), new Date(latest.timestamp));
  
  // Require at least 1 hour for meaningful APR calculation
  if (periodDays < 1/24) return { apr: undefined, periodDays };
  
  const periodicReturn = latest.exchange_rate / prev.exchange_rate - 1;
  const apr = periodicReturn * (365 / periodDays);
  return { apr, periodDays };
}

export function usePryzm() {
  const historyQuery = useQuery<ExchangeRow[]>({
    queryKey: ['pryzm-history'],
    queryFn: async () => {
      const res = await fetch('/data/pryzm-exchange-history.json', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to fetch Pryzm history');
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const realtimeQuery = useQuery({
    queryKey: ['pryzm-realtime'],
    queryFn: getPryzmRealtime,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchInterval: 60 * 1000,
  });

  const apyApr = historyQuery.data ? calcApyApr(historyQuery.data) : { apy: undefined, periodDays: undefined };
  const snap = historyQuery.data ? calcSnapshotApr(historyQuery.data) : { apr: undefined };

  return {
    isLoading: historyQuery.isLoading || realtimeQuery.isLoading,
    isError: historyQuery.isError || realtimeQuery.isError,
    tvlUsd: realtimeQuery.data?.tvlUsd,
    currentExchangeRate: realtimeQuery.data?.exchangeRate,
    apy: apyApr.apy,
    apr: snap.apr,
    history: historyQuery.data,
  };
}
