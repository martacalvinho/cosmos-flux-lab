// Osmosis pools service: fetch pools that include ATOM (by IBC denom) and map to Opportunity rows

export interface OsmosisPoolAssetToken {
  denom: string;
  amount: string;
}

export interface OsmosisPoolAsset {
  token: OsmosisPoolAssetToken;
  weight?: string;
}

export interface OsmosisPool {
  "@type": string;
  address: string;
  id: string; // numeric string
  pool_params: Record<string, unknown>;
  pool_assets: OsmosisPoolAsset[];
  total_shares: { denom: string; amount: string };
  total_weight?: string;
}

export interface OsmosisListByDenomResponse {
  pools: OsmosisPool[];
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

interface AssetData {
  symbol?: string;
  name?: string;
  base?: string;
  denom_units?: Array<{ denom?: string }>;
}

interface SqsPoolItem {
  chain_model?: { id?: string | number };
  id?: string | number;
  apr_data?: {
    total_apr?: {
      lower?: number;
      upper?: number;
    };
  };
}

interface SimplifiedPoolData {
  pool_id?: string | number;
  symbol?: string;
  liquidity_usd?: number;
  token_liquidity?: Array<{
    symbol?: string;
    denom?: string;
  }>;
}

export class OsmosisService {
  // IBC denom for ATOM on Osmosis
  // Source provided by user
  private static readonly ATOM_IBC_DENOM =
    'ibc/27394FB092D2ECCD56123C74F36E4C1F926001CEADA9CA97EA622B25F41E5EB2';
  private static readonly LIST_BY_DENOM_URL =
    `https://lcd.osmosis.zone/osmosis/poolmanager/v1beta1/list-pools-by-denom?denom=${encodeURIComponent(
      OsmosisService.ATOM_IBC_DENOM
    )}`;

  // Assetlist for denom->symbol mapping
  private static readonly ASSETLIST_URL =
    'https://raw.githubusercontent.com/osmosis-labs/assetlists/main/osmosis-1/generated/asset_detail/assetlist.json';

  // Osmosis SQS API for APRs
  private static readonly SQS_POOLS_URL =
    'https://sqsprod.osmosis.zone/pools?filter%5Bid%5D%5Bnot_in%5D=2159&filter%5Btype%5D=0%2C1%2C2%2C3&filter%5Bincentive%5D=0%2C1%2C2%2C3&filter%5Bmin_liquidity_cap%5D=1000&filter%5Bwith_market_incentives%5D=true&page%5Bcursor%5D=0&page%5Bsize%5D=1000&sort=-market.volume24hUsd';

  // In-memory cache for assetlist mapping
  private static assetMap: Record<string, string> | null = null; // base/denom -> symbol
  private static assetMapFetchedAt = 0;
  private static readonly ASSETMAP_TTL_MS = 60 * 60 * 1000; // 1 hour

  private static async getAssetMap(): Promise<Record<string, string>> {
    const now = Date.now();
    if (this.assetMap && now - this.assetMapFetchedAt < this.ASSETMAP_TTL_MS) {
      return this.assetMap;
    }
    try {
      const res = await fetch(this.ASSETLIST_URL, { cache: 'no-store' as RequestCache });
      if (!res.ok) throw new Error(`assetlist ${res.status}`);
      const json = await res.json();
      const assets: AssetData[] = json?.assets || [];
      const map: Record<string, string> = {};
      for (const a of assets) {
        const symbol: string = (a?.symbol as string) || (a?.name as string) || '';
        const base: string = (a?.base as string) || '';
        if (base && symbol) map[base] = symbol;
        // Also index denom_units denoms if present
        const units = a?.denom_units || [];
        for (const u of units) {
          const d = u?.denom as string;
          if (d && symbol) map[d] = symbol;
        }
      }
      this.assetMap = map;
      this.assetMapFetchedAt = now;
      return map;
    } catch (e) {
      console.warn('Failed to load Osmosis assetlist, falling back to heuristics:', e);
      this.assetMap = {};
      this.assetMapFetchedAt = now;
      return this.assetMap;
    }
  }

  private static async denomToSymbol(denom: string): Promise<string> {
    if (!denom) return '';
    const map = await this.getAssetMap();
    // Direct map by base/denom
    const mapped = map[denom];
    if (mapped) return mapped;
    // Heuristics fallback
    if (denom === 'uosmo') return 'OSMO';
    if (denom === 'uion') return 'ION';
    if (denom === OsmosisService.ATOM_IBC_DENOM) return 'ATOM';
    if (denom.startsWith('gamm/pool/')) return `GAMM-${denom.split('/').pop()}`;
    if (denom.startsWith('ibc/')) return denom.slice(0, 7) + '…' + denom.slice(-5);
    return denom.toUpperCase();
  }

  // Public helper for other services to map denom->symbol using the cached asset map
  static async symbolForDenom(denom: string): Promise<string> {
    return this.denomToSymbol(denom);
  }

  private static formatAprRange(lower?: number, upper?: number): string {
    // SQS APR values are already in percent units. Show raw value as %, trimmed.
    const norm = (x?: number): number | null => (x == null || isNaN(x as number) ? null : x);
    const lNum = norm(lower);
    const uNum = norm(upper);
    const fmt = (n: number) => {
      const s = n.toFixed(2);
      const trimmed = s.replace(/\.00$/, '').replace(/(\.\d*[1-9])0$/, '$1');
      return `${trimmed}%`;
    };
    if (lNum != null && uNum != null) {
      if (Math.abs(lNum - uNum) < 0.005) return fmt(lNum);
      return `${fmt(lNum)} - ${fmt(uNum)}`;
    }
    if (lNum != null) return fmt(lNum);
    if (uNum != null) return fmt(uNum);
    return '—';
  }

  private static buildSqsUrl(ids?: string[]): string {
    const base = 'https://sqsprod.osmosis.zone/pools';
    const params = new URLSearchParams();
    params.set('filter[id][not_in]', '2159');
    params.set('filter[type]', '0,1,2,3');
    params.set('filter[incentive]', '0,1,2,3');
    params.set('filter[min_liquidity_cap]', '1000');
    params.set('filter[with_market_incentives]', 'true');
    // If specific IDs provided, request only those to avoid pagination
    if (ids && ids.length) {
      params.set('filter[id][in]', ids.join(','));
    } else {
      params.set('page[cursor]', '0');
      params.set('page[size]', '1000');
      params.set('sort', '-market.volume24hUsd');
    }
    return `${base}?${params.toString()}`;
  }

  private static async fetchSqsAprMap(ids?: string[]): Promise<Record<string, { lower?: number; upper?: number }>> {
    try {
      let json: any = null;
      const url = this.buildSqsUrl(ids);
      // 1) Try Vite dev proxy
      try {
        const proxiedUrl = `/osmo-sqs/${url.replace('https://sqsprod.osmosis.zone/', '')}`;
        const r = await fetch(proxiedUrl);
        if (!r.ok) throw new Error(`dev proxy ${r.status}`);
        json = await r.json();
      } catch (devErr) {
        console.warn('Osmosis SQS dev proxy failed, trying direct:', devErr);
        // 2) Direct
        try {
          const r2 = await fetch(url);
          if (!r2.ok) throw new Error(`SQS ${r2.status}`);
          json = await r2.json();
        } catch (directErr) {
          console.warn('Osmosis SQS direct failed, trying CORS proxy:', directErr);
          // 3) Generic CORS proxy
          const proxyUrl = `https://cors.isomorphic-git.org/${encodeURI(url)}`;
          const r3 = await fetch(proxyUrl);
          if (!r3.ok) throw new Error(`SQS proxy ${r3.status}`);
          json = await r3.json();
        }
      }

      const arr: SqsPoolItem[] = Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : [];
      const map: Record<string, { lower?: number; upper?: number }> = {};
      for (const item of arr) {
        const poolId = item?.chain_model?.id ?? item?.id;
        const id = poolId != null ? String(poolId) : '';
        if (!id) continue;
        const lower = item?.apr_data?.total_apr?.lower;
        const upper = item?.apr_data?.total_apr?.upper;
        map[id] = { lower, upper };
      }
      return map;
    } catch (e) {
      console.warn('Failed to fetch Osmosis SQS APRs:', e);
      return {};
    }
  }

  static async fetchAtomPools(): Promise<FormattedPool[]> {
    try {
      // Try simplified API first
      const simplified = await this.fetchAtomPoolsSimplified();
      if (simplified.length > 0) {
        return simplified;
      }
      console.warn('Simplified API returned no pools, falling back to original method');
    } catch (e) {
      console.warn('Simplified API failed, falling back to original method:', e);
    }

    // Fallback to original method
    return this.fetchAtomPoolsOriginal();
  }

  private static async fetchAtomPoolsSimplified(): Promise<FormattedPool[]> {
    let res: Response;
    let data: unknown;
    
    try {
      // Try direct call first
      res = await fetch('http://provider.akash-palmito.org:31328/liquidity/ATOM');
      if (!res.ok) {
        throw new Error(`Simplified API error ${res.status}`);
      }
      data = await res.json();
    } catch (directError) {
      console.warn('Direct simplified API failed, trying CORS proxy:', directError);
      // Try with different CORS proxy
      try {
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent('http://provider.akash-palmito.org:31328/liquidity/ATOM')}`;
        res = await fetch(proxyUrl);
        if (!res.ok) {
          throw new Error(`CORS proxy error ${res.status}`);
        }
        const proxyData = await res.json();
        data = JSON.parse(proxyData.contents);
      } catch (proxyError) {
        console.warn('CORS proxy failed, trying another:', proxyError);
        // Try corsproxy.io
        const proxyUrl2 = `https://corsproxy.io/?${encodeURIComponent('http://provider.akash-palmito.org:31328/liquidity/ATOM')}`;
        res = await fetch(proxyUrl2);
        if (!res.ok) {
          throw new Error(`Second CORS proxy error ${res.status}`);
        }
        data = await res.json();
      }
    }
    
    console.log('Simplified API response:', data);
    console.log('Data type:', typeof data);
    console.log('Is array:', Array.isArray(data));
    
    // Handle case where proxy might wrap the response
    let pools: SimplifiedPoolData[] = [];
    if (Array.isArray(data)) {
      pools = data as SimplifiedPoolData[];
    } else if (data && typeof data === 'object') {
      const dataObj = data as Record<string, unknown>;
      if (Array.isArray(dataObj.data)) {
        pools = dataObj.data as SimplifiedPoolData[];
        console.log('Found array in data.data property');
      } else if (Array.isArray(dataObj.pools)) {
        pools = dataObj.pools as SimplifiedPoolData[];
        console.log('Found array in data.pools property');
      } else {
        console.log('Expected array but got:', data);
        throw new Error(`Simplified API returned non-array data: ${typeof data}`);
      }
    } else {
      throw new Error(`Simplified API returned non-array data: ${typeof data}`);
    }

    // Get APR data for cross-reference (keep existing APR logic)
    const poolIds = pools.map((pool) => String(pool.pool_id)).filter(Boolean);
    const aprMap = await this.fetchSqsAprMap(poolIds);

    const formatted: FormattedPool[] = [];
    console.log(`Processing ${pools.length} pools from simplified API`);
    
    for (const pool of pools) {
      const poolId = String(pool.pool_id || '');
      const tvlUsd = pool.liquidity_usd || 0;
      
      // Extract symbol from token_liquidity array
      let symbol = pool.symbol || '';
      if (!symbol && pool.token_liquidity && Array.isArray(pool.token_liquidity)) {
        const tokens = pool.token_liquidity.map((token) => {
          return token.symbol || token.denom || '';
        }).filter(Boolean);
        symbol = tokens.join('/');
      }
      
      console.log(`Pool ${poolId}: symbol=${symbol}, tvl=${tvlUsd}, raw pool:`, pool);
      
      if (!poolId || !symbol) {
        console.log(`Skipping pool - missing poolId (${poolId}) or symbol (${symbol})`);
        continue;
      }

      // Get APR from existing cross-reference
      const apr = aprMap[poolId] || {};
      const apy = this.formatAprRange(apr.lower, apr.upper);
      
      // Format TVL
      const tvl = tvlUsd > 0 ? `$${Math.round(tvlUsd).toLocaleString()}` : '—';

      console.log(`Adding pool ${poolId} with apy=${apy}, tvl=${tvl}`);

      formatted.push({
        id: `osmosis-${poolId}`,
        type: 'liquidity' as const,
        platform: 'Osmosis',
        apy,
        tvl,
        description: `${symbol} liquidity pool`,
        url: `https://app.osmosis.zone/pool/${poolId}`,
        pair: symbol,
        chain: 'Osmosis',
      });
    }

    console.log('Formatted pools from simplified API:', formatted.length);
    return formatted;
  }

  private static async fetchAtomPoolsOriginal(): Promise<FormattedPool[]> {
    try {
      // Ensure asset map is loaded before we map symbols
      await this.getAssetMap();
      // Load pools first to know which IDs we actually need APRs for
      const res = await fetch(this.LIST_BY_DENOM_URL);
      if (!res.ok) {
        throw new Error(`Osmosis LCD error ${res.status}`);
      }
      const data: OsmosisListByDenomResponse = await res.json();
      const pools = data.pools || [];

      // Collect pool IDs to request precise APRs and avoid pagination gaps
      const poolIds: string[] = pools.map((p) => String(p.id));
      const aprMap = await this.fetchSqsAprMap(poolIds);

      const formatted: FormattedPool[] = [];
      for (const pool of pools) {
        const assets = pool.pool_assets || [];
        const symbols: string[] = [];
        for (const a of assets) {
          const sym = await this.denomToSymbol(a.token?.denom || '');
          if (sym) symbols.push(sym);
        }
        // Require at least two symbols to form a proper pair; skip otherwise
        if (symbols.length < 2) continue;
        const pair = symbols.map((s) => s.toUpperCase()).join('/');
        const apr = aprMap[String(pool.id)] || {};
        const apy = this.formatAprRange(apr.lower, apr.upper);
        // If APR data missing for this pool, skip to avoid blank APY entries
        if (!apr || (apr.lower == null && apr.upper == null)) continue;
        formatted.push({
          id: `osmosis-${pool.id}`,
          type: 'liquidity' as const,
          platform: 'Osmosis',
          apy,
          tvl: '—',
          description: `${pair || 'ATOM'} liquidity pool`,
          url: `https://app.osmosis.zone/pool/${pool.id}`,
          pair: pair || 'ATOM/—',
          chain: 'Osmosis',
        });
      }

      return formatted;
    } catch (e) {
      console.error('Failed to fetch Osmosis pools:', e);
      return [];
    }
  }
}
