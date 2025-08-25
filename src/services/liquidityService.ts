// Liquidity Pool Data Service
// Fetches and normalizes pool data from Osmosis, Astroport and Astrovault

import { AstrovaultService } from '@/services/astrovaultService';
import { OsmosisService } from '@/services/osmosisService';
import { AstroportService } from '@/services/astroportService';

export interface AssetMeta {
  symbol: string;
  display: string;
  decimals: number;
  description?: string;
  name?: string;
}

export interface PoolAsset {
  denom: string;
  symbol: string;
  amount?: string;
  weight?: string;
}

export interface LiquidityPool {
  id: string;
  platform: string;
  pool_type: string;
  lp_token?: string;
  pool_address?: string;
  assets: PoolAsset[];
  symbol: string;
  description: string;
  tvl_usd: number | null;
  volume_24h_usd: number | null;
  day_lp_fees_usd: number | null;
  fee_apr: number | null;
  swap_fee: number | null;
  chain?: string;
}

// ATOM denom mappings for different chains
const ATOM_DENOMS = {
  COSMOS_HUB: 'uatom',
  OSMOSIS: 'ibc/27394FB092D2ECCD56123C74F36E4C1F926001CEADA9CA97EA622B25F41E5EB2',
  NEUTRON: 'ibc/C4CFF46FD6DE35CA4CF4CE031E643C8FDC9BA4B99AE598E9B0ED98FE3A2319F9'
};

class LiquidityService {
  private assetMap = new Map<string, AssetMeta>();
  private initialized = false;
  private ibcTraceCache = new Map<string, string>();

  async initialize() {
    if (this.initialized) return;
    await this.loadAssetMappings();
    this.initialized = true;
  }

  private async loadAssetMappings() {
    try {
      // Load Osmosis asset registry
      const response = await fetch('https://raw.githubusercontent.com/osmosis-labs/assetlists/main/osmosis-1/osmosis-1.assetlist.json');
      const assetlist = await response.json();
      
      // Map all possible ATOM denoms
      assetlist.assets?.forEach((asset: any) => {
        const meta: AssetMeta = {
          symbol: asset.symbol || 'UNKNOWN',
          display: asset.display || asset.symbol || 'UNKNOWN',
          decimals: asset.denom_units?.find((u: any) => u.denom === asset.display)?.exponent || 6,
          description: asset.description || asset.name,
          name: asset.name
        };
        
        // Map base denom
        if (asset.base) {
          this.assetMap.set(asset.base, meta);
        }
        
        // Map IBC traces
        asset.traces?.forEach((trace: any) => {
          if (trace.type === 'ibc' && trace.counterparty?.base_denom) {
            this.assetMap.set(trace.counterparty.base_denom, meta);
          }
        });
      });

      // Manually add known ATOM mappings
      const atomMeta: AssetMeta = {
        symbol: 'ATOM',
        display: 'ATOM',
        decimals: 6,
        description: 'Cosmos Hub - The Internet of Blockchains',
        name: 'Cosmos Hub Atom'
      };

      this.assetMap.set(ATOM_DENOMS.COSMOS_HUB, atomMeta);
      this.assetMap.set(ATOM_DENOMS.OSMOSIS, atomMeta);
      this.assetMap.set(ATOM_DENOMS.NEUTRON, atomMeta);

    } catch (error) {
      console.warn('Failed to load asset mappings:', error);
      // Fallback mappings
      this.assetMap.set(ATOM_DENOMS.COSMOS_HUB, {
        symbol: 'ATOM',
        display: 'ATOM', 
        decimals: 6,
        description: 'Cosmos Hub Atom'
      });
    }
  }

  private getAssetMeta(denom: string): AssetMeta | null {
    return this.assetMap.get(denom) || null;
  }

  // Resolve IBC denom to its base denom using LCD denom traces, with caching
  private async resolveIbcBaseDenom(ibcDenom: string): Promise<string | null> {
    try {
      if (!ibcDenom.startsWith('ibc/')) return null;
      const hash = ibcDenom.split('/')[1];
      if (!hash) return null;
      if (this.ibcTraceCache.has(ibcDenom)) {
        return this.ibcTraceCache.get(ibcDenom) || null;
      }

      const res = await fetch(`https://lcd.osmosis.zone/ibc/apps/transfer/v1/denom_traces/${hash}`);
      if (!res.ok) return null;
      const data = await res.json();
      const base = data?.denom_trace?.base_denom as string | undefined;
      if (base) {
        this.ibcTraceCache.set(ibcDenom, base);
        return base;
      }
      return null;
    } catch {
      return null;
    }
  }

  // Resolve asset metadata for a denom, including IBC fallback via denom traces
  private async resolveAssetMeta(denom: string): Promise<AssetMeta | null> {
    const direct = this.getAssetMeta(denom);
    if (direct) return direct;

    // Try to resolve IBC denom -> base denom
    if (denom.startsWith('ibc/')) {
      const base = await this.resolveIbcBaseDenom(denom);
      if (base) {
        const baseMeta = this.getAssetMeta(base);
        if (baseMeta) {
          // Cache mapping for the IBC hash to speed future lookups
          this.assetMap.set(denom, baseMeta);
          return baseMeta;
        }
        // Fallback simple meta from base denom
        const fallback: AssetMeta = {
          symbol: base.toUpperCase().startsWith('U') ? base.substring(1).toUpperCase() : base.toUpperCase(),
          display: base.toUpperCase().startsWith('U') ? base.substring(1).toUpperCase() : base.toUpperCase(),
          decimals: 6
        };
        this.assetMap.set(denom, fallback);
        return fallback;
      }
    }
    return null;
  }

  async fetchOsmosisAtomPools(): Promise<LiquidityPool[]> {
    try {
      const osmosisPools = await OsmosisService.fetchAtomPools();
      
      // Convert to our LiquidityPool format
      const normalized: LiquidityPool[] = osmosisPools.map((pool) => {
        // Extract pool ID from the osmosis-X format
        const poolId = pool.id.replace('osmosis-', '');
        
        // Parse assets from pair string (e.g., "ATOM/OSMO")
        const assetSymbols = pool.pair.split('/').filter(Boolean);
        const assets: PoolAsset[] = assetSymbols.map((symbol) => ({
          denom: symbol === 'ATOM' ? ATOM_DENOMS.OSMOSIS : `unknown-${symbol.toLowerCase()}`,
          symbol: symbol,
          amount: undefined,
          weight: undefined
        }));

        // Parse APY to get fee APR (convert from percentage string to decimal)
        let feeApr: number | null = null;
        if (pool.apy && pool.apy !== '—') {
          const apyMatch = pool.apy.match(/([\d.]+)/);
          if (apyMatch) {
            feeApr = parseFloat(apyMatch[1]) / 100; // Convert percentage to decimal
          }
        }

        return {
          id: pool.id,
          platform: pool.platform,
          pool_type: 'Weighted', // Default for Osmosis pools
          lp_token: `gamm/pool/${poolId}`,
          pool_address: undefined,
          assets,
          symbol: pool.pair,
          description: pool.description,
          tvl_usd: null, // Osmosis service returns TVL as "—"
          volume_24h_usd: null,
          day_lp_fees_usd: null,
          fee_apr: feeApr,
          swap_fee: null,
          chain: 'osmosis-1'
        } as LiquidityPool;
      });

      return normalized;
    } catch (error) {
      console.error('Failed to fetch Osmosis ATOM pools:', error);
      return [];
    }
  }

  private async getOsmosisPoolDetail(poolId: string): Promise<LiquidityPool | null> {
    try {
      // Get pool details
      const poolResponse = await fetch(`https://lcd.osmosis.zone/osmosis/poolmanager/v1beta1/pools/${poolId}`);
      const poolData = await poolResponse.json();
      
      if (!poolData.pool) return null;

      const pool = poolData.pool;
      
      // Get pool analytics from Imperator (with fallback)
      let stats: any = null;
      try {
        const statsResponse = await fetch(`https://api-osmosis.imperator.co/pools/v2/${poolId}`);
        if (statsResponse.ok) {
          stats = await statsResponse.json();
        }
      } catch (error) {
        console.warn(`Failed to fetch stats for pool ${poolId}:`, error);
      }

      // Determine pool type and fee
      let poolType = 'Unknown';
      let swapFee = 0;
      
      if (pool['@type']?.includes('balancer')) {
        poolType = 'Weighted';
        swapFee = parseFloat(pool.pool_params?.swap_fee || '0');
      } else if (pool['@type']?.includes('stableswap')) {
        poolType = 'Stable';  
        swapFee = parseFloat(pool.pool_params?.swap_fee || '0');
      } else if (pool['@type']?.includes('concentrated')) {
        poolType = 'Concentrated Liquidity';
        swapFee = parseFloat(pool.spread_factor || '0');
      }

      // Parse assets (with denom trace fallback resolution)
      const poolAssets = pool.pool_assets || pool.pool_liquidity || [];
      const assets: PoolAsset[] = await Promise.all(
        poolAssets.map(async (asset: any) => {
          const denom = asset.token?.denom || asset.denom;
          const assetMeta = await this.resolveAssetMeta(denom);
          return {
            denom,
            symbol: assetMeta?.symbol || (typeof denom === 'string' ? denom.slice(0, 8) + '...' : 'UNKNOWN'),
            amount: asset.token?.amount || asset.amount,
            weight: asset.weight
          } as PoolAsset;
        })
      );

      // Calculate metrics
      const tvl = stats?.liquidity_usd ? parseFloat(stats.liquidity_usd) : null;
      const volume24h = stats?.volume_24h ? parseFloat(stats.volume_24h) : null;
      const dayLpFees = (volume24h && swapFee) ? volume24h * swapFee : null;
      const feeApr = (dayLpFees && tvl && tvl > 0) ? (dayLpFees / tvl) * 365 : null;

      // Generate symbol and description
      const mainAssets = assets.slice(0, 2);
      const symbol = mainAssets.map(a => a.symbol).join('/');
      const description = `${symbol} ${poolType} Pool on Osmosis`;

      return {
        id: `osmosis-${poolId}`,
        platform: 'Osmosis',
        pool_type: poolType,
        lp_token: poolType === 'Concentrated Liquidity' ? `Position NFT (Pool ${poolId})` : `gamm/pool/${poolId}`,
        assets,
        symbol,
        description,
        tvl_usd: tvl,
        volume_24h_usd: volume24h,
        day_lp_fees_usd: dayLpFees,
        fee_apr: feeApr,
        swap_fee: swapFee,
        chain: 'osmosis-1'
      };

    } catch (error) {
      console.error(`Failed to get Osmosis pool detail for ${poolId}:`, error);
      return null;
    }
  }

  async fetchAstroportAtomPools(): Promise<LiquidityPool[]> {
    try {
      const astroportPools = await AstroportService.fetchPools();
      
      // Convert to our LiquidityPool format
      const normalized: LiquidityPool[] = astroportPools.map((pool) => {
        // Parse assets from pair string (e.g., "ATOM/USDC")
        const assetSymbols = pool.pair.split('/').filter(Boolean);
        const assets: PoolAsset[] = assetSymbols.map((symbol) => ({
          denom: symbol === 'ATOM' ? ATOM_DENOMS.COSMOS_HUB : `unknown-${symbol.toLowerCase()}`,
          symbol: symbol,
          amount: undefined
        }));

        // Parse TVL from string format (e.g., "$1.5M" to number)
        let tvlUsd: number | null = null;
        if (pool.tvl && pool.tvl !== '—') {
          const tvlMatch = pool.tvl.match(/\$([\d.]+)([MK]?)/);
          if (tvlMatch) {
            const value = parseFloat(tvlMatch[1]);
            const unit = tvlMatch[2];
            tvlUsd = unit === 'M' ? value * 1_000_000 : unit === 'K' ? value * 1_000 : value;
          }
        }

        // Parse APY to get fee APR (convert from percentage string to decimal) 
        let feeApr: number | null = null;
        if (pool.apy && pool.apy !== '—') {
          const apyMatch = pool.apy.match(/([\d.]+)/);
          if (apyMatch) {
            feeApr = parseFloat(apyMatch[1]) / 100; // Convert percentage to decimal
          }
        }

        // Map chain display name to chain ID
        const chainId = pool.chain === 'Neutron' ? 'neutron-1' : 
                       pool.chain === 'Terra' ? 'phoenix-1' :
                       pool.chain === 'Cosmos Hub' ? 'cosmoshub-4' :
                       pool.chain === 'Osmosis' ? 'osmosis-1' :
                       pool.chain.toLowerCase();

        return {
          id: pool.id,
          platform: pool.platform,
          pool_type: 'XYK', // Default for Astroport pools
          lp_token: undefined,
          pool_address: pool.id.replace('astroport-', ''),
          assets,
          symbol: pool.pair,
          description: pool.description,
          tvl_usd: tvlUsd,
          volume_24h_usd: null, // Not provided by Astroport service
          day_lp_fees_usd: null,
          fee_apr: feeApr,
          swap_fee: null,
          chain: chainId
        } as LiquidityPool;
      });

      return normalized;
    } catch (error) {
      console.error('Failed to fetch Astroport ATOM pools:', error);
      return [];
    }
  }

  async fetchAstrovaultAtomPools(): Promise<LiquidityPool[]> {
    try {
      const astrovaultPools = await AstrovaultService.fetchAtomPools();
      
      const normalized: LiquidityPool[] = await Promise.all(
        astrovaultPools.map(async (pool) => {
          // Convert Astrovault pool assets to our PoolAsset format
          const assets: PoolAsset[] = await Promise.all(
            (pool.poolAssets || []).map(async (asset) => {
              let symbol = '';
              let denom = '';
              
              if (asset.info) {
                const info = asset.info as any;
                if (info.native_token?.denom) {
                  denom = info.native_token.denom;
                  // Use our asset resolution for consistency
                  const meta = await this.resolveAssetMeta(denom);
                  symbol = meta?.symbol || (denom === 'uatom' ? 'ATOM' : denom.toUpperCase());
                } else if (info.token?.contract_addr) {
                  denom = info.token.contract_addr;
                  symbol = denom.slice(0, 8) + '...';
                }
              }
              
              return {
                denom,
                symbol,
                amount: asset.amount
              } as PoolAsset;
            })
          );

          // Extract APR from percentageAPRs array
          const aprRaw = pool.percentageAPRs?.[0];
          const feeApr = (aprRaw && !isNaN(aprRaw)) ? aprRaw / 100 : null; // Convert percentage to decimal
          
          const mainSymbols = assets.slice(0, 2).map(a => a.symbol).filter(Boolean);
          const symbol = mainSymbols.join('/') || 'ATOM';
          
          // Map chain ID to friendly name
          const chainName = pool.contextChainId === 'archway-1' ? 'Archway' : 
                           pool.contextChainId || 'Unknown';
          
          return {
            id: `astrovault-${pool.id || pool.poolId || Math.random().toString(36).slice(2)}`,
            platform: 'Astrovault',
            pool_type: 'AMM', // Astrovault is typically AMM
            lp_token: undefined,
            pool_address: undefined,
            assets,
            symbol,
            description: `${symbol} AMM Pool on Astrovault`,
            tvl_usd: null, // Astrovault API doesn't provide TVL
            volume_24h_usd: null, // Astrovault API doesn't provide volume
            day_lp_fees_usd: null,
            fee_apr: feeApr,
            swap_fee: null,
            chain: pool.contextChainId
          } as LiquidityPool;
        })
      );

      return normalized;
    } catch (error) {
      console.error('Failed to fetch Astrovault ATOM pools:', error);
      return [];
    }
  }

  async getAllAtomPools(): Promise<LiquidityPool[]> {
    await this.initialize();
    
    const [osmosisPools, astroportPools, astrovaultPools] = await Promise.all([
      this.fetchOsmosisAtomPools(),
      this.fetchAstroportAtomPools(),
      this.fetchAstrovaultAtomPools()
    ]);

    const allPools = [...osmosisPools, ...astroportPools, ...astrovaultPools];
    
    // Sort by TVL descending (pools without TVL go to end)
    return allPools.sort((a, b) => {
      const aTvl = a.tvl_usd || 0;
      const bTvl = b.tvl_usd || 0;
      if (aTvl === 0 && bTvl === 0) {
        // If both have no TVL, sort by platform name for consistency
        return a.platform.localeCompare(b.platform);
      }
      return bTvl - aTvl;
    });
  }
}

export const liquidityService = new LiquidityService();
