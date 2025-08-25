interface AstroportPool {
  chainId: string;
  poolAddress: string;
  poolType: string;
  assets: Array<{
    amount: string;
    denom: string;
    symbol: string;
    description: string;
    decimals: number;
    priceUSD: number;
  }>;
  totalLiquidityUSD: number;
  dayVolumeUSD: number;
  yield: {
    total: number;
  };
  isDeregistered: boolean;
}

export interface FormattedPool {
  id: string;
  type: 'liquidity';
  platform: string;
  apy: string;
  tvl: string;
  description: string;
  url: string;
  pair: string;
  chain: string;
}

export class AstroportService {
  private static readonly API_URL = 'https://app.astroport.fi/api/pools';
  
  private static formatPercentRaw(value?: number): string {
    if (value == null || isNaN(value)) return '—';
    let v = Number(value);
    // Some Astroport endpoints return yield as a fraction (e.g., 0.1537 for 15.37%).
    // If it looks like a fraction, scale to percent.
    if (v > 0 && v < 1) v = v * 100;
    const s = v.toFixed(2);
    return `${s}%`;
  }
  
  // Map chain IDs from API to display names
  private static mapChainIdToName(chainId: string): string {
    switch (chainId) {
      case 'neutron-1':
        return 'Neutron';
      case 'phoenix-1':
      case 'terra-2':
        return 'Terra';
      case 'osmosis-1':
        return 'Osmosis';
      case 'cosmoshub-4':
        return 'Cosmos Hub';
      default:
        return chainId;
    }
  }
  
  static async fetchPools(): Promise<FormattedPool[]> {
    try {
      let pools: AstroportPool[] | null = null;
      // Attempt direct fetch first
      try {
        const response = await fetch(this.API_URL);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        pools = await response.json();
      } catch (primaryErr) {
        console.warn('Primary Astroport API fetch failed, retrying via CORS proxy:', primaryErr);
        // Fallback to a generic CORS proxy for browser environments
        const proxyUrl = `https://cors.isomorphic-git.org/${encodeURI(this.API_URL)}`;
        const proxied = await fetch(proxyUrl);
        if (!proxied.ok) throw new Error(`Proxy HTTP ${proxied.status}`);
        pools = await proxied.json();
      }
      if (!Array.isArray(pools)) pools = [];
      
      console.log('Total pools from API:', pools.length);
      
      // Filter pools that contain ATOM (symbol/description/denom heuristics)
      const atomPools = pools.filter(pool => {
        if (pool.isDeregistered) return false;
        
        const hasAtomAsset = pool.assets.some(asset => {
          // Defensive guards: some assets may miss symbol/description
          const rawSymbol = (asset as any)?.symbol ?? '';
          const rawDescription = (asset as any)?.description ?? '';
          const rawDenom = (asset as any)?.denom ?? '';
          const symbol = String(rawSymbol).toLowerCase();
          const description = String(rawDescription).toLowerCase();
          const denom = String(rawDenom).toLowerCase();
          
          const isAtomRelated = (
            symbol.includes('atom') ||
            description.includes('atom') ||
            description.includes('cosmos hub') ||
            symbol === 'datom' ||
            symbol === 'statom' ||
            symbol === 'amatom' ||
            symbol === 'stkatom' ||
            denom === 'uatom' ||
            denom.includes('atom') // capture IBC atom denoms on other chains
          );
          
          if (isAtomRelated) {
            console.log(`Found ATOM asset: ${rawSymbol || asset.denom} (${rawDescription || 'no description'})`);
          }
          
          return isAtomRelated;
        });
        
        if (hasAtomAsset) {
          console.log(
            `Pool ${pool.poolAddress} has ATOM assets:`,
            pool.assets.map(a => `${a.symbol || a.denom} (${a.description || 'no description'})`)
          );
        }
        
        return hasAtomAsset;
      });
      
      console.log('Filtered ATOM pools:', atomPools.length);
      console.log('ATOM pools found:', atomPools.map(p => p.assets.map(a => a.symbol).join('/')));
      
      if (atomPools.length === 0) {
        console.warn('No ATOM pools found by heuristics. Falling back to top TVL Astroport pools for visibility.');
        // Fallback: return top 10 by TVL (still formatted), to ensure platform shows
        const fallbackFormatted = pools
          .filter(p => !p.isDeregistered)
          .map((pool) => {
            const assetNames = pool.assets.map(asset => asset.symbol || asset.denom).join('/');
            const tvl = pool.totalLiquidityUSD > 1000000 
              ? `$${(pool.totalLiquidityUSD / 1000000).toFixed(1)}M`
              : `$${Math.round(pool.totalLiquidityUSD / 1000)}K`;
            const apy = pool.yield?.total != null
              ? AstroportService.formatPercentRaw(pool.yield.total)
              : '—';
            return {
              id: `astroport-${pool.poolAddress}`,
              type: 'liquidity' as const,
              platform: 'Astroport',
              apy,
              tvl,
              description: `${assetNames} liquidity pool`,
              url: `https://app.astroport.fi/pools/${pool.poolAddress}`,
              pair: assetNames,
              chain: AstroportService.mapChainIdToName(pool.chainId)
            };
          })
          .sort((a, b) => {
            const aTvl = parseFloat(a.tvl.replace(/[$MK]/g, '')) * (a.tvl.includes('M') ? 1000000 : 1000);
            const bTvl = parseFloat(b.tvl.replace(/[$MK]/g, '')) * (b.tvl.includes('M') ? 1000000 : 1000);
            return bTvl - aTvl;
          })
          .slice(0, 10);
        return fallbackFormatted as any;
      }
      
      // Format the pools for our component
      const formattedPools = atomPools.map((pool) => {
        const assetNames = pool.assets.map(asset => asset.symbol || asset.denom).join('/');
        
        // Format TVL from the API data
        const tvl = pool.totalLiquidityUSD > 1000000 
          ? `$${(pool.totalLiquidityUSD / 1000000).toFixed(1)}M`
          : `$${Math.round(pool.totalLiquidityUSD / 1000)}K`;
        
        // Use actual yield data from API
        const apy = pool.yield?.total != null
          ? AstroportService.formatPercentRaw(pool.yield.total)
          : '—';
        
        return {
          id: `astroport-${pool.poolAddress}`,
          type: 'liquidity' as const,
          platform: 'Astroport',
          apy,
          tvl,
          description: `${assetNames} liquidity pool`,
          url: `https://app.astroport.fi/pools/${pool.poolAddress}`,
          pair: assetNames,
          chain: AstroportService.mapChainIdToName(pool.chainId)
        };
      });
      
      console.log('Formatted pools before sorting:', formattedPools.length);
      
      const sortedPools = formattedPools.sort((a, b) => {
        // Sort by TVL descending
        const aTvl = parseFloat(a.tvl.replace(/[$MK]/g, '')) * (a.tvl.includes('M') ? 1000000 : 1000);
        const bTvl = parseFloat(b.tvl.replace(/[$MK]/g, '')) * (b.tvl.includes('M') ? 1000000 : 1000);
        return bTvl - aTvl;
      })
      .slice(0, 20); // Show top 20 pools by TVL
      
      console.log('Final pools to return:', sortedPools.length);
      console.log('Pool details:', sortedPools.map(p => `${p.description} - ${p.tvl} - ${p.apy}`));
      
      return sortedPools;
      
    } catch (error) {
      console.error('Error fetching Astroport pools:', error);
      console.error('Full error details:', error);
      // Return empty array instead of fallback to see if API is failing
      return [];
    }
  }
}
