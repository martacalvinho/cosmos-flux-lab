const COSMOSHUB_REST = 'https://rest.cosmos.directory/cosmoshub';

export interface HubValidator {
  operator_address: string;
  description: { moniker: string; identity?: string };
  commission: { commission_rates: { rate: string } };
  status?: string;
  jailed?: boolean;
  tokens?: string; // uatom
  consensus_pubkey?: { '@type'?: string; typeUrl?: string; key?: string };
}

export interface HubValidatorMeta {
  operator_address: string;
  pfp?: string | null;
  display?: string | null; // e.g. 'hidden'
  tag?: string | null; // comma separated
}

export type HubValidatorMetaMap = Record<string, {
  pfp: string | null;
  display: string | null;
  tags: string[];
}>;

export const CosmosHubService = {
  async fetchActiveValidators(): Promise<HubValidator[]> {
    const validators: HubValidator[] = [];
    let nextKey: string | null = null;
    do {
      const params = new URLSearchParams({ status: 'BOND_STATUS_BONDED', 'pagination.limit': '200' });
      if (nextKey) params.set('pagination.key', nextKey);
      const url = `${COSMOSHUB_REST}/cosmos/staking/v1beta1/validators?${params.toString()}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`validators ${res.status}`);
      const json = await res.json();
      validators.push(...(json?.validators || []));
      nextKey = json?.pagination?.next_key ?? null;
    } while (nextKey);

    // filter + sort similar to atomtest
    const filtered = validators.filter(v => (v.status === 'BOND_STATUS_BONDED' || v.status === undefined) && v.jailed !== true);
    const sorted = filtered.sort((a, b) => {
      const ta = BigInt(a.tokens || '0');
      const tb = BigInt(b.tokens || '0');
      return tb > ta ? 1 : tb < ta ? -1 : 0;
    });
    return sorted.slice(0, 180);
  },

  async fetchValidatorLogos(validators: HubValidator[]): Promise<Record<string, string | null>> {
    const cache: Record<string, string | null> = {};
    const lookups = validators.map(async (v) => {
      const id = v?.description?.identity?.trim();
      if (!id) { cache[v.operator_address] = null; return; }
      try {
        const url = `https://keybase.io/_/api/1.0/user/lookup.json?key_suffix=${encodeURIComponent(id)}&fields=pictures`;
        const res = await fetch(url);
        if (!res.ok) { cache[v.operator_address] = null; return; }
        const json = await res.json();
        const pic = json?.them?.[0]?.pictures?.primary?.url || null;
        cache[v.operator_address] = pic;
      } catch {
        cache[v.operator_address] = null;
      }
    });
    await Promise.all(lookups);
    return cache;
  },

  async fetchValidatorMetadata(chain: string, status: 'active' | 'all' = 'active'): Promise<HubValidatorMetaMap> {
    // Fetch metadata from useatom API with pagination support
    const map: HubValidatorMetaMap = {};
    let page = 1;
    let hasMore = true;
    
    try {
      while (hasMore) {
        const url = `https://api.useatom.fun/api/validators/${encodeURIComponent(chain)}/${encodeURIComponent(status)}?page=${page}&limit=100`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`validator meta ${res.status}`);
        const json = await res.json();
        
        // Handle both paginated and non-paginated responses
        const list: HubValidatorMeta[] = Array.isArray(json) ? json : (json?.data ?? []);
        const pagination = json?.pagination;
        
        for (const item of list) {
          const key = (item as any).operator_address || (item as any).operatorAddress || (item as any).address;
          if (!key) continue;
          const rawTag = item.tag ?? (item as any).tags ?? null;
          const tags = String(rawTag ?? '')
            .split(',')
            .map(t => t.trim())
            .filter(Boolean);
          map[key] = {
            pfp: item.pfp ?? null,
            display: item.display ?? null,
            tags,
          };
        }
        
        // Check if there are more pages
        if (pagination) {
          hasMore = pagination.hasNext || (pagination.page < pagination.totalPages);
          page++;
        } else {
          // If no pagination info, assume single page response
          hasMore = false;
        }
        
        // Safety check to prevent infinite loops
        if (page > 50) {
          console.warn('Validator metadata pagination exceeded 50 pages, stopping');
          break;
        }
      }
      
      return map;
    } catch (e) {
      console.error('Failed to load validator metadata', e);
      return {};
    }
  },
};
