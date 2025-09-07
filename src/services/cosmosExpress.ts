// CosmosExpress unified API service for liquidity pools and NFTs

export interface CosmosExpressPool {
  id: string;
  type: 'liquidity';
  platform: string; // Osmosis | Astroport | Astrovault
  apy: string; // e.g., "1.93%" or "—"
  tvl: string; // e.g., "$2.9M" or "—"
  volume24h?: string; // e.g., "$80K" or "—"
  description: string;
  url: string;
  pair: string; // e.g., "ATOM/OSMO"
  chain: string; // e.g., "Osmosis" | "Neutron" | "Archway"
}

export interface CosmosExpressCollectionsResponse<T> {
  success: boolean;
  data: T;
  timestamp?: string;
}

const BASE_URL = 'https://cosmosexpress.onrender.com';

// Very lightweight in-memory cache to avoid repeated refetching during a session
type CacheEntry = { ts: number; data: any };
const memCache = new Map<string, CacheEntry>();

async function getJson<T>(path: string): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url); // allow default HTTP caching
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`CosmosExpress ${path} failed: ${res.status} ${body}`);
  }
  return res.json();
}

async function getJsonCached<T>(path: string, ttlMs = 60_000): Promise<T> {
  const now = Date.now();
  const key = path;
  const cached = memCache.get(key);
  if (cached && now - cached.ts < ttlMs) {
    return cached.data as T;
  }
  const data = await getJson<T>(path);
  memCache.set(key, { ts: now, data });
  return data;
}

export class CosmosExpressService {
  // --- Liquidity ---
  static async fetchOsmosisPools(): Promise<CosmosExpressPool[]> {
    const json = await getJsonCached<CosmosExpressCollectionsResponse<{ total_pools: number; pools: CosmosExpressPool[] }>>( 
      '/api/liquidity/osmosis/pools'
    );
    return json?.data?.pools ?? [];
  }

  static async fetchAstroportPools(): Promise<CosmosExpressPool[]> {
    const json = await getJsonCached<CosmosExpressCollectionsResponse<{ total_pools: number; pools: CosmosExpressPool[] }>>( 
      '/api/liquidity/astroport/pools'
    );
    return json?.data?.pools ?? [];
  }

  static async fetchAstrovaultPools(): Promise<CosmosExpressPool[]> {
    const json = await getJsonCached<CosmosExpressCollectionsResponse<{ total_pools: number; pools: CosmosExpressPool[] }>>( 
      '/api/liquidity/astrovault/pools'
    );
    return json?.data?.pools ?? [];
  }

  static async fetchAllPools(): Promise<CosmosExpressPool[]> {
    const [osmo, astro, av] = await Promise.all([
      this.fetchOsmosisPools(),
      this.fetchAstroportPools(),
      this.fetchAstrovaultPools(),
    ]);
    return [...osmo, ...astro, ...av];
  }

  // --- NFTs ---
  static async fetchCollections() {
    const json = await getJsonCached<CosmosExpressCollectionsResponse<{ total_collections: number; collections: any[] }>>( 
      '/api/nfts/collections'
    );
    return json?.data?.collections ?? [];
  }

  static async fetchNftsByCollection(collectionAddress: string, limit = 50, offset = 0) {
    const path = `/api/nfts/collections/${collectionAddress}/nfts?limit=${limit}&offset=${offset}`;
    const json = await getJsonCached<CosmosExpressCollectionsResponse<{ nfts: any[] }>>(path, 30_000);
    // Some responses include additional metadata; just return the NFTs list
    const data: any = (json as any)?.data;
    if (Array.isArray(data?.nfts)) return data.nfts;
    return [];
  }
}
