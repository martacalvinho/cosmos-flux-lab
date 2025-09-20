import { useEffect, useMemo, useState } from "react";
import { CosmosExpressService } from "@/services/cosmosExpress";

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
    
    // Robust Osmosis pool id extraction
    let osmoId: string | undefined;
    if (isOsmosis) {
      const byUrl = pool.url?.match(/\/pool\/(\d+)/);
      const byId = pool.id?.match(/(\d+)/);
      if (byUrl && byUrl[1]) osmoId = byUrl[1];
      else if (byId && byId[1]) osmoId = byId[1];
      else osmoId = pool.id.replace('osmosis-', '');
    }
    const osmoPoolUrl = osmoId ? `https://app.osmosis.zone/pool/${osmoId}` : (pool.url || 'https://app.osmosis.zone');
    const astroAppUrl = pool.url?.startsWith('http') ? pool.url : 'https://app.astroport.fi';
    const avAppUrl = pool.url?.startsWith('http') ? pool.url : 'https://astrovault.io';
    const links = {
      app: isOsmosis 
        ? osmoPoolUrl
        : isAstroport 
        ? astroAppUrl
        : isAstrovault
        ? avAppUrl
        : pool.url,
      docs: isOsmosis 
        ? 'https://docs.osmosis.zone' 
        : isAstroport 
        ? 'https://docs.astroport.fi'
        : isAstrovault
        ? 'https://docs.astrovault.io'
        : undefined,
      pool: isOsmosis ? osmoPoolUrl : (pool.url || undefined),
    } as const;
    
    const dataSource = `CosmosExpress API${
      isOsmosis ? ' (Osmosis)' : isAstroport ? ' (Astroport)' : isAstrovault ? ' (Astrovault)' : ''
    }`;

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

  const CACHE_KEY = 'liquidity:pools:v1';
  const CACHE_TTL_MS = 5 * 60_000; // 5 minutes

  useEffect(() => {
    if (activeTab !== 'liquidity') return;
    setIsLoading(true);

    // 1) Try to serve cached data instantly for fast paint
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { ts: number; data: LiquidityPool[] };
        if (parsed && parsed.data && Date.now() - parsed.ts < CACHE_TTL_MS) {
          setLiquidityPools(parsed.data);
        }
      }
    } catch {}

    const fetchLiquidityData = async () => {
      try {
        const [osmo, astro, av] = await Promise.all([
          CosmosExpressService.fetchOsmosisPools(),
          CosmosExpressService.fetchAstroportPools(),
          CosmosExpressService.fetchAstrovaultPools(),
        ]);

        const all = [...osmo, ...astro, ...av];
        const normalized: LiquidityPool[] = all.map((pool) => ({
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
        }));

        setLiquidityPools(normalized);

        // 2) Save to cache
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: normalized }));
        } catch {}
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
