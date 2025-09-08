import { useQuery } from '@tanstack/react-query';
import { MarsService } from '@/services/marsService';

export type MarsLendSummary = {
  denom: string;
  symbol: string;
  priceUsd: number;
  supplyApyPct: number;
  borrowApyPct: number;
  totalSupplyUsd: number;
  totalBorrowUsd: number;
};

export function useMarsLend(chain: string = 'neutron', market: string = 'atom') {
  const q = useQuery<MarsLendSummary>({
    queryKey: ['mars-lend', chain, market],
    queryFn: async (): Promise<MarsLendSummary> => {
      try {
        // List-first strategy (more stable than single-market param)
        const list = await MarsService.listMarkets({ chain, days: 1 });
        console.debug('Mars listMarkets length', list.length);
        const qlc = market.toLowerCase();
        const qUC = market.toUpperCase();
        const isFactory = (d?: string) => String(d || '').startsWith('factory/');
        // Prefer non-factory entries
        const nonFactory = list.filter((x) => !isFactory(x.denom));
        // Atom-specific preference: pick IBC denom (ibc/C4CFF46...) first
        let m: any | undefined = undefined;
        if (qlc === 'atom') {
          m = list.find((x) => String(x.symbol || '').toUpperCase() === 'ATOM' && String(x.denom || '').startsWith('ibc/'))
            || nonFactory.find((x) => String(x.symbol || '').toUpperCase() === 'ATOM');
        }
        // 1) Exact symbol match (if still not found)
        if (!m) m = nonFactory.find((x) => String(x.symbol || '').toUpperCase() === qUC);
        // 2) Exact symbol match even if factory (fallback)
        if (!m) m = list.find((x) => String(x.symbol || '').toUpperCase() === qUC);
        // 3) Non-factory symbol contains (exclude st*/stk* like stATOM/stkATOM)
        if (!m) m = nonFactory.find((x) => {
          const s = String(x.symbol || '').toUpperCase();
          return s.includes(qUC) && !s.startsWith('ST') && s !== 'STATOM' && s !== 'STKATOM';
        });
        // 4) Non-factory denom contains the query (avoid matching 'udatom')
        if (!m) m = nonFactory.find((x) => String(x.denom || '').toLowerCase() === qlc);
        if (!m) m = nonFactory.find((x) => String(x.denom || '').toLowerCase().includes(`/${qlc}`));
        // 5) Any remaining fallback by symbol contains
        if (!m) m = list.find((x) => String(x.symbol || '').toLowerCase().includes(qlc));
        // Fallback: try direct single-market endpoint
        if (!m) {
          m = await MarsService.getMarket({ chain, days: 1, market });
        }
        // Last-resort fallback: use the first available market so UI doesn't break
        if (!m && list.length > 0) {
          console.warn('Mars: specific market not found; defaulting to first available entry');
          m = list[0];
        }
        if (!m) throw new Error('Mars: market not found');

        // Prefer APR history per denom for current rates (avoids 0.00 from market=atom route)
        let supplyApyPct = m.depositApyPct;
        let borrowApyPct = m.borrowApyPct;
        if (m.denom) {
          try {
            const hist = await MarsService.aprHistory({ chain, denom: m.denom, granularity: 'day', unit: 5 });
            const lastSupply = hist.supply_apr?.[0]?.value ?? hist.supply_apr?.[hist.supply_apr.length - 1]?.value;
            const lastBorrow = hist.borrow_apr?.[0]?.value ?? hist.borrow_apr?.[hist.borrow_apr.length - 1]?.value;
            if (Number.isFinite(lastSupply)) supplyApyPct = Number(lastSupply);
            if (Number.isFinite(lastBorrow)) borrowApyPct = Number(lastBorrow);
          } catch (e) {
            console.debug('Mars: aprHistory fetch failed; using snapshot APY', e);
          }
        }

        const totalSupplyUsd = (m.depositAmount || 0) * (m.priceUsd || 0);
        const totalBorrowUsd = (m.borrowAmount || 0) * (m.priceUsd || 0);

        // Debug log to help diagnose zeros
        console.debug('Mars lend data', { m, supplyApyPct, borrowApyPct, totalSupplyUsd, totalBorrowUsd });

        return {
          denom: m.denom,
          symbol: m.symbol,
          priceUsd: m.priceUsd,
          supplyApyPct,
          borrowApyPct,
          totalSupplyUsd,
          totalBorrowUsd,
        };
      } catch (e) {
        console.error('useMarsLend queryFn error', e);
        throw e;
      }
    },
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    refetchInterval: 60 * 1000,
    // keep options minimal for compatibility across react-query versions
  });

  return {
    isLoading: q.isLoading,
    isError: q.isError,
    denom: q.data?.denom,
    symbol: q.data?.symbol,
    priceUsd: q.data?.priceUsd,
    supplyApyPct: q.data?.supplyApyPct,
    borrowApyPct: q.data?.borrowApyPct,
    totalSupplyUsd: q.data?.totalSupplyUsd,
    totalBorrowUsd: q.data?.totalBorrowUsd,
  };
}
