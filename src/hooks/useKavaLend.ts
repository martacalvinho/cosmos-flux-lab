import { useQuery } from '@tanstack/react-query';
import { getKavaLendApy } from '@/services/kavaLend';

export function useKavaLend() {
  const q = useQuery({
    queryKey: ['kava-lend-atom-apy'],
    queryFn: getKavaLendApy,
    staleTime: 2 * 60 * 1000, // fresh for 2 minutes
    refetchOnWindowFocus: false,
    refetchInterval: 60 * 1000, // poll every minute
  });

  return {
    isLoading: q.isLoading,
    isError: q.isError,
    denom: q.data?.denom,
    supplyApyPct: q.data?.supplyApyPct,
    supplyRewardApyPct: q.data?.supplyRewardApyPct,
    borrowApyPct: q.data?.borrowApyPct,
    totalSupplyUsd: q.data?.totalSupplyUsd,
    totalBorrowUsd: q.data?.totalBorrowUsd,
  };
}
