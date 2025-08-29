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
};
