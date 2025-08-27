import { DeliverTxResponse, SigningStargateClient, StdFee } from '@cosmjs/stargate';
import { toBech32 } from '@cosmjs/encoding';

const COSMOSHUB_REST = 'https://rest.cosmos.directory/cosmoshub';

export interface Validator {
  operator_address: string;
  description: { moniker: string; identity?: string };
  commission: { commission_rates: { rate: string } };
  status?: 'BOND_STATUS_UNSPECIFIED' | 'BOND_STATUS_UNBONDED' | 'BOND_STATUS_UNBONDING' | 'BOND_STATUS_BONDED';
  jailed?: boolean;
  tokens?: string; // for voting power estimation
  consensus_pubkey?: { '@type'?: string; typeUrl?: string; key?: string };
}

export interface Delegation {
  delegation: {
    delegator_address: string;
    validator_address: string;
    shares: string;
  };
  balance?: { denom: string; amount: string };
}

export const CosmosHubService = {
  async fetchActiveValidators(): Promise<Validator[]> {
    // Paginate through all bonded validators
    const validators: Validator[] = [];
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

    // Filter to bonded + not jailed (defensive), sort by tokens desc, and cap to active set size (180)
    const filtered = validators.filter(v => (v.status === 'BOND_STATUS_BONDED' || v.status === undefined) && v.jailed !== true);
    const sorted = filtered.sort((a, b) => {
      const ta = BigInt(a.tokens || '0');
      const tb = BigInt(b.tokens || '0');
      return tb > ta ? 1 : tb < ta ? -1 : 0;
    });
    return sorted.slice(0, 180);
  },

  async fetchSigningInfoMap(validators: Validator[]): Promise<Record<string, { missed: number; tombstoned: boolean; slashCount: number }>> {
    const infos = await this.fetchSigningInfos();
    const byValcons = new Map<string, { missed: number; tombstoned: boolean }>();
    for (const i of infos) {
      const missed = Number(i.missed_blocks_counter || '0') || 0;
      const tombstoned = !!i.tombstoned;
      byValcons.set(i.address, { missed, tombstoned });
    }

    const base64ToBytes = (b64: string): Uint8Array => {
      const bin = atob(b64);
      const arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      return arr;
    };
    const toValcons = async (v: Validator): Promise<string | null> => {
      const key = v?.consensus_pubkey?.key;
      if (!key) return null;
      const pub = base64ToBytes(key);
      const hashBuffer = await crypto.subtle.digest('SHA-256', pub);
      const hash = new Uint8Array(hashBuffer);
      const addr20 = hash.slice(0, 20);
      return toBech32('cosmosvalcons', addr20);
    };

    // Fetch slash counts for all validators
    const slashCounts = await this.fetchSlashCounts(validators);

    const out: Record<string, { missed: number; tombstoned: boolean; slashCount: number }> = {};
    for (const v of validators) {
      try {
        const valcons = await toValcons(v);
        if (!valcons) continue;
        const info = byValcons.get(valcons);
        const slashCount = slashCounts[v.operator_address] || 0;
        out[v.operator_address] = info 
          ? { ...info, slashCount } 
          : { missed: 0, tombstoned: false, slashCount };
      } catch {
        // ignore and default
        out[v.operator_address] = { missed: 0, tombstoned: false, slashCount: 0 };
      }
    }
    return out;
  },

  async fetchSlashCounts(validators: Validator[]): Promise<Record<string, number>> {
    const slashCounts: Record<string, number> = {};
    
    // Process validators in batches to avoid overwhelming the API
    const batchSize = 10;
    for (let i = 0; i < validators.length; i += batchSize) {
      const batch = validators.slice(i, i + batchSize);
      const batchPromises = batch.map(async (v) => {
        try {
          const count = await this.fetchValidatorSlashCount(v.operator_address);
          slashCounts[v.operator_address] = count;
        } catch {
          slashCounts[v.operator_address] = 0;
        }
      });
      await Promise.all(batchPromises);
      
      // Small delay between batches to be respectful to the API
      if (i + batchSize < validators.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return slashCounts;
  },

  async fetchValidatorSlashCount(validatorAddress: string): Promise<number> {
    try {
      // Query for slash events involving this validator
      const events = `slash.validator='${validatorAddress}'`;
      const url = `${COSMOSHUB_REST}/cosmos/tx/v1beta1/txs?events=${encodeURIComponent(events)}&pagination.limit=100`;
      
      const res = await fetch(url);
      if (!res.ok) return 0;
      
      const json = await res.json();
      const txs = json?.tx_responses || [];
      
      // Count unique slash events
      let slashCount = 0;
      for (const tx of txs) {
        // Look for slash events in the transaction logs
        const logs = tx?.logs || [];
        for (const log of logs) {
          const events = log?.events || [];
          for (const event of events) {
            if (event.type === 'slash') {
              slashCount++;
              break; // Only count once per transaction
            }
          }
        }
      }
      
      return slashCount;
    } catch {
      return 0;
    }
  },

  async fetchDelegations(address: string): Promise<Delegation[]> {
    const url = `${COSMOSHUB_REST}/cosmos/staking/v1beta1/delegations/${address}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const json = await res.json();
    return json?.delegation_responses || [];
  },

  async fetchSlashingParams(): Promise<{ signed_blocks_window: string }> {
    const res = await fetch(`${COSMOSHUB_REST}/cosmos/slashing/v1beta1/params`);
    if (!res.ok) throw new Error(`slashing params ${res.status}`);
    const json = await res.json();
    return json?.params || { signed_blocks_window: '0' };
  },

  async fetchSigningInfos(): Promise<Array<{ address: string; missed_blocks_counter: string; tombstoned?: boolean }>> {
    const infos: Array<{ address: string; missed_blocks_counter: string; tombstoned?: boolean }> = [];
    let nextKey: string | null = null;
    do {
      const params = new URLSearchParams({ 'pagination.limit': '200' });
      if (nextKey) params.set('pagination.key', nextKey);
      const url = `${COSMOSHUB_REST}/cosmos/slashing/v1beta1/signing_infos?${params.toString()}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`signing infos ${res.status}`);
      const json = await res.json();
      infos.push(...(json?.info || []));
      nextKey = json?.pagination?.next_key ?? null;
    } while (nextKey);
    return infos;
  },

  async fetchUptimeMap(validators: Validator[]): Promise<Record<string, number>> {
    // Map valoper -> uptimePct (0..1)
    const [params, infos] = await Promise.all([
      this.fetchSlashingParams(),
      this.fetchSigningInfos(),
    ]);
    const windowN = Number(params.signed_blocks_window || '0') || 0;
    if (windowN <= 0) return {};

    // Build fast lookup: valcons -> missed
    const missedByValcons = new Map<string, number>();
    for (const i of infos) {
      const missed = Number(i.missed_blocks_counter || '0') || 0;
      missedByValcons.set(i.address, missed);
    }

    // Helper to compute valcons from consensus pubkey key (base64 ed25519)
    const base64ToBytes = (b64: string): Uint8Array => {
      const bin = atob(b64);
      const arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      return arr;
    };

    const toValcons = async (v: Validator): Promise<string | null> => {
      const key = v?.consensus_pubkey?.key;
      if (!key) return null;
      const pub = base64ToBytes(key);
      const hashBuffer = await crypto.subtle.digest('SHA-256', pub);
      const hash = new Uint8Array(hashBuffer);
      const addr20 = hash.slice(0, 20);
      return toBech32('cosmosvalcons', addr20);
    };

    const result: Record<string, number> = {};
    // Compute in sequence to keep it simple (validator set is small)
    for (const v of validators) {
      try {
        const valcons = await toValcons(v);
        if (!valcons) continue;
        const missed = missedByValcons.get(valcons) ?? 0;
        const uptime = Math.max(0, Math.min(1, 1 - missed / windowN));
        result[v.operator_address] = uptime;
      } catch {
        // ignore
      }
    }
    return result;
  },

  async fetchValidatorLogos(validators: Validator[]): Promise<Record<string, string | null>> {
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

  async delegate(
    client: SigningStargateClient,
    fromAddress: string,
    validatorAddress: string,
    amountUatom: string,
    fee: StdFee | 'auto' = 'auto'
  ): Promise<DeliverTxResponse> {
    return client.delegateTokens(fromAddress, validatorAddress, { denom: 'uatom', amount: amountUatom }, fee);
  },

  async redelegate(
    client: SigningStargateClient,
    fromAddress: string,
    srcValoper: string,
    dstValoper: string,
    amountUatom: string,
    fee: StdFee | 'auto' = 'auto'
  ): Promise<DeliverTxResponse> {
    // Use delegateTokens method signature for beginRedelegate
    const redelegateClient = client as unknown as {
      beginRedelegate: (
        delegatorAddress: string,
        srcValidatorAddress: string,
        dstValidatorAddress: string,
        amount: { denom: string; amount: string },
        fee: StdFee | 'auto'
      ) => Promise<DeliverTxResponse>;
    };
    return redelegateClient.beginRedelegate(
      fromAddress,
      srcValoper,
      dstValoper,
      { denom: 'uatom', amount: amountUatom },
      fee
    );
  },

  async undelegate(
    client: SigningStargateClient,
    fromAddress: string,
    validatorAddress: string,
    amountUatom: string,
    fee: StdFee | 'auto' = 'auto'
  ): Promise<DeliverTxResponse> {
    return client.undelegateTokens(fromAddress, validatorAddress, { denom: 'uatom', amount: amountUatom }, fee);
  },
};
