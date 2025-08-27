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
  volume24h: string;
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
      console.log('[OsmosisService] Loaded Osmosis assetlist symbols:', Object.keys(map).length);
      return map;
    } catch (e) {
      console.warn('[OsmosisService] Failed to load Osmosis assetlist, falling back to heuristics:', e);
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
    return '$<1K';
  }

  private static formatVolume(volumeUsd?: number): string {
    if (!volumeUsd || volumeUsd <= 0) return '—';
    if (volumeUsd >= 1000000) {
      return `$${(volumeUsd / 1000000).toFixed(1)}M`;
    }
    if (volumeUsd >= 1000) {
      return `$${Math.round(volumeUsd / 1000)}K`;
    }
    return '$<1K';
  }

  private static formatCurrency(value?: number | string): string {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (num == null || isNaN(num) || num <= 0) return '—';
    if (num < 1000) return `$${Math.round(num)}`;
    if (num < 1000000) return `$${Math.round(num / 1000)}K`;
    return `$${(num / 1000000).toFixed(1)}M`;
  }

  private static async fetchSqsAprMap(ids?: string[]): Promise<Record<string, { lower?: number; upper?: number; tvl?: number; volume?: number }>> {
    try {
      const fetchJson = async (url: string) => {
        // 1) Try Vite dev proxy
        try {
          const proxiedUrl = `/osmo-sqs/${url.replace('https://sqsprod.osmosis.zone/', '')}`;
          const r = await fetch(proxiedUrl);
          if (!r.ok) throw new Error(`dev proxy ${r.status}`);
          return await r.json();
        } catch (devErr) {
          console.warn('[OsmosisService] SQS dev proxy failed, trying direct:', devErr);
          // 2) Direct
          try {
            const r2 = await fetch(url);
            if (!r2.ok) throw new Error(`SQS ${r2.status}`);
            return await r2.json();
          } catch (directErr) {
            console.warn('[OsmosisService] SQS direct failed, trying CORS proxy:', directErr);
            // 3) Generic CORS proxy
            const proxyUrl = `https://cors.isomorphic-git.org/${encodeURI(url)}`;
            const r3 = await fetch(proxyUrl);
            if (!r3.ok) throw new Error(`SQS proxy ${r3.status}`);
            return await r3.json();
          }
        }
      };

      const map: Record<string, { lower?: number; upper?: number; tvl?: number; volume?: number }> = {};

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
            
            // Debug first few items to see actual structure
            if (Object.keys(map).length < 3) {
              console.log(`[OsmosisService] Raw SQS item for pool ${id}:`, item);
            }
            
            const lower = item?.apr_data?.total_apr?.lower;
            const upper = item?.apr_data?.total_apr?.upper;
            const tvl = item?.liquidity_cap || item?.liquidity_cap_usd;
            const volume = item?.fees_data?.volume_24h;
            map[id] = { lower, upper, tvl, volume };
          }
          console.log(`[OsmosisService] SQS chunk fetched: ${chunk.length} IDs, mapped ${Object.keys(map).length} so far.`);
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
          const tvl = item?.liquidity_cap || item?.liquidity_cap_usd;
          const volume = item?.fees_data?.volume_24h;
          map[id] = { lower, upper, tvl, volume };
        }
        console.log(`[OsmosisService] SQS broad fetch mapped ${Object.keys(map).length} pools.`);
      }

      // Backfill missing TVL with a secondary broad fetch
      const needsTvlBackfill = Object.values(map).some((v) => v.tvl == null);
      if (needsTvlBackfill) {
        try {
          const urlAll = this.buildSqsUrl(undefined);
          const jsonAll = await fetchJson(urlAll);
          const arrAll: any[] = Array.isArray(jsonAll) ? jsonAll : Array.isArray(jsonAll?.data) ? jsonAll.data : [];
          const tvlMap: Record<string, number | undefined> = {};
        } catch (e) {
          console.warn('Osmosis SQS TVL backfill failed:', e);
        }
      }

      return map;
    } catch (e) {
      console.warn('[OsmosisService] Failed to fetch Osmosis SQS APRs:', e);
      return {};
    }
  }

  /**
   * Fetch ATOM pools using the API approach since scraping has CORS issues.
   * The API approach is working well with 500+ pools found and good SQS mapping.
   */
  static async fetchAtomPools(): Promise<FormattedPool[]> {
    // Skip scraping for now due to CORS issues, go directly to API approach
    console.log('[OsmosisService] Using API approach (scraping disabled due to CORS)...');
    return this.fetchAtomPoolsViaApi();
  }

  /**
   * Parse pool data from the Osmosis pools page HTML
   */
  private static parsePoolsFromHtml(html: string): FormattedPool[] {
    const pools: FormattedPool[] = [];
    
    try {
      // Create a temporary DOM parser using DOMParser if available
      if (typeof DOMParser !== 'undefined') {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // Look for pool rows in the table structure
        const poolRows = doc.querySelectorAll('[data-testid*="pool-row"], tr');
        
        for (const row of poolRows) {
          const poolData = this.extractPoolDataFromRow(row);
          if (poolData) {
            pools.push(poolData);
          }
        }
      } else {
        // Fallback regex parsing for server-side or environments without DOMParser
        this.parsePoolsWithRegex(html, pools);
      }
    } catch (e) {
      console.warn('[OsmosisService] Failed to parse HTML with DOM parser, trying regex:', e);
      this.parsePoolsWithRegex(html, pools);
    }
    
    return pools;
  }

  /**
   * Extract pool data from a DOM row element
   */
  private static extractPoolDataFromRow(row: Element): FormattedPool | null {
    try {
      // Look for pool number/ID
      const poolNumberElement = row.querySelector('[data-testid*="pool-number"], .pool-number');
      const poolNumberText = poolNumberElement?.textContent || '';
      const poolIdMatch = poolNumberText.match(/Pool #(\d+)/i) || poolNumberText.match(/#(\d+)/);
      
      if (!poolIdMatch) return null;
      
      const poolId = poolIdMatch[1];
      
      // Extract pair information
      const pairElement = row.querySelector('[data-testid*="pool-name"], .pool-name, .token-pair');
      const pairText = pairElement?.textContent?.trim() || 'ATOM/—';
      
      // Extract volume (24H)
      const volumeElement = row.querySelector('[data-testid*="volume"], .volume');
      const volumeText = volumeElement?.textContent?.trim() || '—';
      
      // Extract liquidity/TVL
      const liquidityElement = row.querySelector('[data-testid*="liquidity"], .liquidity, .tvl');
      const liquidityText = liquidityElement?.textContent?.trim() || '—';
      
      // Extract APR
      const aprElement = row.querySelector('[data-testid*="apr"], .apr, .apy');
      const aprText = aprElement?.textContent?.trim() || '—';
      
      return {
        id: `osmosis-${poolId}`,
        type: 'liquidity' as const,
        platform: 'Osmosis',
        apy: this.cleanAprText(aprText),
        tvl: this.cleanCurrencyText(liquidityText),
        volume24h: this.cleanCurrencyText(volumeText),
        description: `${pairText} liquidity pool`,
        url: `https://app.osmosis.zone/pool/${poolId}`,
        pair: pairText,
        chain: 'Osmosis',
      };
    } catch (e) {
      console.warn('[OsmosisService] Failed to extract data from row:', e);
      return null;
    }
  }

  /**
   * Fallback regex parsing when DOM parser is not available
   */
  private static parsePoolsWithRegex(html: string, pools: FormattedPool[]): void {
    // More comprehensive regex patterns
    const patterns = [
      // Pattern for pool data in table rows
      /Pool #(\d+).*?([A-Z]+\/[A-Z]+).*?\$([0-9,]+).*?\$([0-9,]+).*?([\d.]+%|< [\d.]+% - [\d.]+%)/gs,
      // Alternative pattern
      /#(\d+).*?(\w+\/\w+).*?Volume.*?\$([0-9,]+).*?Liquidity.*?\$([0-9,]+).*?APR.*?([\d.]+%)/gs,
    ];
    
    for (const pattern of patterns) {
      const matches = html.matchAll(pattern);
      
      for (const match of matches) {
        const [, poolId, pair, volume, liquidity, apr] = match;
        
        pools.push({
          id: `osmosis-${poolId}`,
          type: 'liquidity' as const,
          platform: 'Osmosis',
          apy: this.cleanAprText(apr),
          tvl: this.cleanCurrencyText(liquidity),
          volume24h: this.cleanCurrencyText(volume),
          description: `${pair} liquidity pool`,
          url: `https://app.osmosis.zone/pool/${poolId}`,
          pair: pair || 'ATOM/—',
          chain: 'Osmosis',
        });
      }
    }
  }

  /**
   * Clean and format APR text
   */
  private static cleanAprText(text: string): string {
    if (!text || text === '—') return '—';
    
    // Handle ranges like "< 0.1% - 3.2%"
    const rangeMatch = text.match(/<?\s*([\d.]+)%\s*-\s*([\d.]+)%/);
    if (rangeMatch) {
      const [, lower, upper] = rangeMatch;
      return `${lower}% - ${upper}%`;
    }
    
    // Handle single percentages
    const singleMatch = text.match(/([\d.]+)%/);
    if (singleMatch) {
      return `${singleMatch[1]}%`;
    }
    
    return text.trim() || '—';
  }

  /**
   * Clean and format currency text
   */
  private static cleanCurrencyText(text: string): string {
    if (!text || text === '—') return '—';
    
    // Extract dollar amounts
    const match = text.match(/\$([0-9,]+)/);
    if (match) {
      const amount = parseInt(match[1].replace(/,/g, ''));
      return this.formatCurrency(amount);
    }
    
    return text.trim() || '—';
  }

  /**
   * Fallback to original API approach if scraping fails
   */
  private static async fetchAtomPoolsViaApi(): Promise<FormattedPool[]> {
    try {
      console.log('[OsmosisService] Falling back to API approach...');
      
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
      console.log('[OsmosisService] Found', pools.length, 'ATOM pools from LCD. IDs:', poolIds);
      const aprMap = await this.fetchSqsAprMap(poolIds);
      console.log('[OsmosisService] SQS map entries:', Object.keys(aprMap).length, 'of', poolIds.length);

      const formatted: FormattedPool[] = [];
      let skippedNoSymbols = 0;
      let skippedNoSqs = 0;
      
      for (const pool of pools) {
        const assets = pool.pool_assets || [];
        const symbols: string[] = [];
        for (const a of assets) {
          const sym = await this.denomToSymbol(a.token?.denom || '');
          if (sym) symbols.push(sym);
        }
        // Require at least two symbols to form a proper pair; skip otherwise
        if (symbols.length < 2) {
          skippedNoSymbols++;
          continue;
        }
        const pair = symbols.map((s) => s.toUpperCase()).join('/');
        const apr = aprMap[String(pool.id)];
        if (!apr) {
          console.warn(`[OsmosisService] No SQS data found for pool ID: ${pool.id}. It will be skipped.`);
          skippedNoSqs++;
          continue;
        }
        
        // Debug the actual SQS data for first few pools
        if (formatted.length < 3) {
          console.log(`[OsmosisService] Pool ${pool.id} SQS data:`, apr);
          console.log(`[OsmosisService] Pool ${pool.id} formatted - TVL: ${this.formatTvl(apr.tvl)}, Volume: ${this.formatVolume(apr.volume)}, APY: ${this.formatAprRange(apr.lower, apr.upper)}`);
        }
        
        const apy = this.formatAprRange(apr.lower, apr.upper);
        const tvl = this.formatTvl(apr.tvl);
        const volume24h = this.formatVolume(apr.volume);
        formatted.push({
          id: `osmosis-${pool.id}`,
          type: 'liquidity' as const,
          platform: 'Osmosis',
          apy,
          tvl,
          volume24h,
          description: `${pair || 'ATOM'} liquidity pool`,
          url: `https://app.osmosis.zone/pool/${pool.id}`,
          pair: pair || 'ATOM/—',
          chain: 'Osmosis',
        });
      }
      
      console.log(`[OsmosisService] Processing summary: ${pools.length} total pools, ${skippedNoSymbols} skipped (no symbols), ${skippedNoSqs} skipped (no SQS), ${formatted.length} formatted`);
      
      // Show sample of what we're returning
      if (formatted.length > 0) {
        console.log(`[OsmosisService] Sample formatted pool:`, formatted[0]);
      }

      console.log(`[OsmosisService] Successfully merged and formatted ${formatted.length} pools.`);
      return formatted;
    } catch (e) {
      console.error('[OsmosisService] Failed to fetch and process Osmosis pools via API:', e);
      return [];
    }
  }
}
