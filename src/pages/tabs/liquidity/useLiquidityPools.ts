import { useEffect, useMemo, useState } from "react";
import { AstroportService } from "@/services/astroportService";
import { OsmosisService } from "@/services/osmosisService";
import { AstrovaultService } from "@/services/astrovaultService";

export interface LiquidityPool {
  id: string;
  type: 'liquidity';
  platform: string;
  apy: string;
  tvl: string;
  volume24h: string;
  description: string;
  url: string;
  pair: string;
  chain: string;
}

const parseTvlToNumber = (tvl: string): number => {
  if (!tvl || tvl === '—') return 0;
  const cleanTvl = tvl.replace(/[$,]/g, '');
  if (cleanTvl.includes('<')) return 500; // treat <$1K as midpoint for ordering
  const multiplier = cleanTvl.includes('M') ? 1_000_000 : cleanTvl.includes('K') ? 1_000 : 1;
  const number = parseFloat(cleanTvl.replace(/[MK]/g, ''));
  return isNaN(number) ? 0 : number * multiplier;
};

const convertPoolsToProtocols = (pools: LiquidityPool[]) => {
  return pools.map((pool) => {
    const isOsmosis = pool.platform === 'Osmosis';
    const isAstroport = pool.platform === 'Astroport';
    const isAstrovault = pool.platform === 'Astrovault';
    
    const poolId = isOsmosis ? pool.id.replace('osmosis-', '') : undefined;
    const links = {
      app: isOsmosis 
        ? 'https://app.osmosis.zone' 
        : isAstroport 
        ? 'https://app.astroport.fi'
        : isAstrovault
        ? 'https://astrovault.io'
        : pool.url,
      docs: isOsmosis 
        ? 'https://docs.osmosis.zone' 
        : isAstroport 
        ? 'https://docs.astroport.fi'
        : isAstrovault
        ? 'https://docs.astrovault.io'
        : undefined,
      pool: isOsmosis && poolId ? `https://app.osmosis.zone/pool/${poolId}` : pool.url,
    } as const;
    
    const dataSource = isOsmosis 
      ? 'Osmosis SQS + LCD API'
      : isAstroport 
      ? 'Astroport API'
      : isAstrovault
      ? 'Astrovault API'
      : 'Live API Data';

    // Parse assets from pair string
    const assets = pool.pair ? pool.pair.split('/').filter(Boolean) : ['ATOM'];

    return {
      category: "liquidity" as const,
      protocol: pool.platform,
      chain: pool.chain || "unknown",
      title: pool.description,
      assets,
      status: "active" as const,
      metrics: {
        APY: pool.apy,
        TVL: pool.tvl,
        "Volume (24h)": pool.volume24h,
        Pair: pool.pair || 'ATOM',
        Chain: pool.chain || 'Unknown',
      },
      risks: ["Impermanent Loss Risk", "Smart Contract Risk"],
      howItWorks: [
        `Provide liquidity to the ${pool.pair || 'ATOM'} pool on ${pool.platform}`,
        `Earn trading fees from swaps and liquidity provision`,
        `${pool.platform} pools offer ${pool.apy || 'variable'} APY`,
        `Withdraw liquidity at any time (subject to pool conditions)`,
      ],
      links,
      dataSource,
      lastUpdated: "Just now",
    };
  });
};

export const useLiquidityPools = (activeTab: string) => {
  const [liquidityPools, setLiquidityPools] = useState<LiquidityPool[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sortBy, setSortBy] = useState<'apy' | 'pair' | 'tvl' | 'volume'>('apy');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    if (activeTab !== 'liquidity') return;
    setIsLoading(true);
    const fetchLiquidityData = async () => {
      try {
        const [astroPools, osmoPools, avPools] = await Promise.all([
          AstroportService.fetchPools(),
          OsmosisService.fetchAtomPools(),
          AstrovaultService.fetchAtomPools(),
        ]);

        const avFormatted: LiquidityPool[] = await Promise.all(
          avPools.map(async (pool) => {
            const poolData = pool as any;
            const symbols = await AstrovaultService.symbolsForPool(pool as any);
            const pair = symbols.length >= 2 ? symbols.join('/') : symbols[0] ? `${symbols[0]}/ATOM` : 'ATOM';

            const aprRaw = (pool as any).percentageAPRs?.[0];
            let apy = '—';
            if (aprRaw != null && !isNaN(aprRaw)) {
              let v = Number(aprRaw);
              if (v > 0 && v < 1) v = v * 100;
              const s = v.toFixed(2);
              apy = `${s}%`;
            }

            const tvlRaw = poolData.totalValueLockedUSD || poolData.tvl || poolData.totalLiquidity;
            let tvlFormatted = '—';
            if (tvlRaw && typeof tvlRaw === 'number' && tvlRaw > 0) {
              if (tvlRaw >= 1_000_000) {
                tvlFormatted = `$${(tvlRaw / 1_000_000).toFixed(1)}M`;
              } else if (tvlRaw >= 1_000) {
                tvlFormatted = `$${Math.round(tvlRaw / 1_000)}K`;
              } else {
                tvlFormatted = '$<1K';
              }
            }

            return {
              id: `astrovault-${poolData.id || poolData.poolId || Math.random()}`,
              type: 'liquidity' as const,
              platform: 'Astrovault',
              apy,
              tvl: tvlFormatted,
              volume24h: '—',
              description: `${pair} AMM Pool on Astrovault`,
              url: poolData.detailsUrl || 'https://astrovault.io',
              pair,
              chain: AstrovaultService.chainNameFromId(poolData.contextChainId),
            };
          })
        );

        const normalized: LiquidityPool[] = [
          ...astroPools.map((pool) => ({
            id: pool.id,
            type: 'liquidity' as const,
            platform: pool.platform,
            apy: pool.apy,
            tvl: pool.tvl,
            volume24h: (pool as any).volume24h || '—',
            description: pool.description,
            url: pool.url,
            pair: pool.pair,
            chain: pool.chain,
          })),
          ...osmoPools.map((pool) => ({
            id: pool.id,
            type: 'liquidity' as const,
            platform: pool.platform,
            apy: pool.apy,
            tvl: pool.tvl,
            volume24h: (pool as any).volume24h || '—',
            description: pool.description,
            url: pool.url,
            pair: pool.pair,
            chain: pool.chain,
          })),
          ...avFormatted,
        ];

        setLiquidityPools(normalized);
      } catch (e) {
        console.error('Failed to fetch liquidity pools:', e);
        setLiquidityPools([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLiquidityData();
  }, [activeTab]);

  const sortedPools = useMemo(() => {
    const arr = [...liquidityPools];
    arr.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'apy':
          const apyA = parseFloat(a.apy.replace('%', '').replace('—', '0'));
          const apyB = parseFloat(b.apy.replace('%', '').replace('—', '0'));
          comparison = apyA - apyB;
          break;
        case 'pair':
          comparison = (a.pair || '').localeCompare(b.pair || '');
          break;
        case 'tvl':
          comparison = parseTvlToNumber(a.tvl) - parseTvlToNumber(b.tvl);
          break;
        case 'volume':
          comparison = parseTvlToNumber(a.volume24h || '—') - parseTvlToNumber(b.volume24h || '—');
          break;
      }
      return sortDir === 'desc' ? -comparison : comparison;
    });
    return arr;
  }, [liquidityPools, sortBy, sortDir]);

  const protocols = useMemo(() => convertPoolsToProtocols(sortedPools), [sortedPools]);

  const handleSort = (key: 'apy' | 'pair' | 'tvl' | 'volume') => {
    if (sortBy === key) {
      setSortDir(sortDir === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(key);
      setSortDir('desc');
    }
  };

  return {
    protocols,
    isLoading,
    sortBy,
    sortDir,
    handleSort,
  } as const;
};
