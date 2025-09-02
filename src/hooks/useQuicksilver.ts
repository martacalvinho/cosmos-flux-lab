import { useQuery } from '@tanstack/react-query';
import { getQuicksilverRealtime } from '@/services/quicksilver';

function calcEpochApyApr(r2?: number, r1?: number) {
  if (!r2 || !r1 || r2 <= r1) return { apy: undefined as number | undefined, apr: undefined as number | undefined, periodDays: undefined as number | undefined };
  const periodDays = 3; // Quicksilver epoch ~3 days
  const periodicReturn = r2 / r1 - 1;
  const factor = 365 / periodDays;
  const apy = Math.pow(1 + periodicReturn, factor) - 1;
  const apr = periodicReturn * factor;
  return { apy, apr, periodDays };
}

export function useQuicksilver() {
  const realtimeQuery = useQuery({
    queryKey: ['quicksilver-realtime'],
    queryFn: () => getQuicksilverRealtime('cosmoshub-4'),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchInterval: 60 * 1000,
  });

  const r2 = realtimeQuery.data?.redemptionRate;
  const r1 = realtimeQuery.data?.lastRedemptionRate;
  const { apy, apr, periodDays } = calcEpochApyApr(r2, r1);

  return {
    isLoading: realtimeQuery.isLoading,
    isError: realtimeQuery.isError,
    tvlUsd: realtimeQuery.data?.tvlUsd,
    currentRedemptionRate: r2,
    lastRedemptionRate: r1,
    apy,
    apr,
    periodDays,
  };
}
