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
  pool_params: any;
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
      const res = await fetch(this.ASSETLIST_URL, { cache: 'no-store' as any });
      if (!res.ok) throw new Error(`assetlist ${res.status}`);
      const json = await res.json();
      const assets: any[] = json?.assets || [];
      const map: Record<string, string> = {};
      for (const a of assets) {
        const symbol: string = a?.symbol || a?.name || '';
        const base: string = a?.base || '';
        if (base && symbol) map[base] = symbol;
        // Also index denom_units denoms if present
        const units: any[] = a?.denom_units || [];
        for (const u of units) {
          const d = u?.denom;
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
    const norm = (x?: number): number | null => (x == null || isNaN(x as any) ? null : x);
    const lNum = norm(lower);
    const uNum = norm(upper);
    const fmt = (n: number) => {
      const s = n.toFixed(2);
      return `${s}%`;
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

  private static formatTvl(liquidityUsd?: number): string {
    if (!liquidityUsd || liquidityUsd <= 0) return '—';
    if (liquidityUsd >= 1000000) {
      return `$${(liquidityUsd / 1000000).toFixed(1)}M`;
    }
    if (liquidityUsd >= 1000) {
      return `$${Math.round(liquidityUsd / 1000)}K`;
    }
    return `$${Math.round(liquidityUsd)}`;
  }

  private static async fetchSqsAprMap(ids?: string[]): Promise<Record<string, { lower?: number; upper?: number; tvl?: number }>> {
    try {
      const fetchJson = async (url: string) => {
        // 1) Try Vite dev proxy
        try {
          const proxiedUrl = `/osmo-sqs/${url.replace('https://sqsprod.osmosis.zone/', '')}`;
          const r = await fetch(proxiedUrl);
          if (!r.ok) throw new Error(`dev proxy ${r.status}`);
          return await r.json();
        } catch (devErr) {
          console.warn('Osmosis SQS dev proxy failed, trying direct:', devErr);
          // 2) Direct
          try {
            const r2 = await fetch(url);
            if (!r2.ok) throw new Error(`SQS ${r2.status}`);
            return await r2.json();
          } catch (directErr) {
            console.warn('Osmosis SQS direct failed, trying CORS proxy:', directErr);
            // 3) Generic CORS proxy
            const proxyUrl = `https://cors.isomorphic-git.org/${encodeURI(url)}`;
            const r3 = await fetch(proxyUrl);
            if (!r3.ok) throw new Error(`SQS proxy ${r3.status}`);
            return await r3.json();
          }
        }
      };

      const map: Record<string, { lower?: number; upper?: number; tvl?: number }> = {};

      if (ids && ids.length) {
        // Chunk IDs to avoid URL-length and server limits
        const chunkSize = 150;
        for (let i = 0; i < ids.length; i += chunkSize) {
          const chunk = ids.slice(i, i + chunkSize);
          const url = this.buildSqsUrl(chunk);
          const json = await fetchJson(url);
          const arr: any[] = Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : [];
          for (const item of arr) {
            const poolId = item?.chain_model?.id ?? item?.id;
            const id = poolId != null ? String(poolId) : '';
            if (!id) continue;
            const lower = item?.apr_data?.total_apr?.lower;
            const upper = item?.apr_data?.total_apr?.upper;
            const tvl = item?.market?.liquidity_cap_usd || item?.liquidity?.cap_usd || item?.tvl || item?.market?.tvl_usd || item?.tvl_usd;
            map[id] = { lower, upper, tvl };
          }
        }
      } else {
        // Broad fetch mode
        const url = this.buildSqsUrl(undefined);
        const json = await fetchJson(url);
        const arr: any[] = Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : [];
        for (const item of arr) {
          const poolId = item?.chain_model?.id ?? item?.id;
          const id = poolId != null ? String(poolId) : '';
          if (!id) continue;
          const lower = item?.apr_data?.total_apr?.lower;
          const upper = item?.apr_data?.total_apr?.upper;
          const tvl = item?.market?.liquidity_cap_usd || item?.liquidity?.cap_usd || item?.tvl || item?.market?.tvl_usd || item?.tvl_usd;
          map[id] = { lower, upper, tvl };
        }
      }

      // Backfill missing TVL with a secondary broad fetch
      const needsTvlBackfill = Object.values(map).some((v) => v.tvl == null);
      if (needsTvlBackfill) {
        try {
          const urlAll = this.buildSqsUrl(undefined);
          const jsonAll = await fetchJson(urlAll);
          const arrAll: any[] = Array.isArray(jsonAll) ? jsonAll : Array.isArray(jsonAll?.data) ? jsonAll.data : [];
          const tvlMap: Record<string, number | undefined> = {};
          for (const item of arrAll) {
            const poolId = item?.chain_model?.id ?? item?.id;
            const id = poolId != null ? String(poolId) : '';
            if (!id) continue;
            const tvl = item?.market?.liquidity_cap_usd || item?.liquidity?.cap_usd || item?.tvl || item?.market?.tvl_usd || item?.tvl_usd;
            if (tvl != null) tvlMap[id] = tvl;
          }
          for (const [id, entry] of Object.entries(map)) {
            if (entry.tvl == null && tvlMap[id] != null) {
              entry.tvl = tvlMap[id];
            }
          }
        } catch (e) {
          console.warn('Osmosis SQS TVL backfill failed:', e);
        }
      }

      return map;
    } catch (e) {
      console.warn('Failed to fetch Osmosis SQS APRs:', e);
      return {};
    }
  }

  static async fetchAtomPools(): Promise<FormattedPool[]> {
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
        const tvl = this.formatTvl(apr.tvl);
        // If APR data missing for this pool, skip to avoid blank APY entries
        if (!apr || (apr.lower == null && apr.upper == null)) continue;
        formatted.push({
          id: `osmosis-${pool.id}`,
          type: 'liquidity' as const,
          platform: 'Osmosis',
          apy,
          tvl,
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
