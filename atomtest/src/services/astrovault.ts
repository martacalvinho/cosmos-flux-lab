// Astrovault pools service: fetch liquidity pools and map to Opportunity rows
import { ArchwayAssetService } from '@/services/archwayAssets';

export interface AstrovaultPoolAssetInfoNative {
  native_token: { denom: string };
}

export interface AstrovaultPoolAssetInfoToken {
  token: { contract_addr: string };
}

export type AstrovaultPoolAssetInfo = AstrovaultPoolAssetInfoNative | AstrovaultPoolAssetInfoToken;

export interface AstrovaultPoolAsset {
  info?: AstrovaultPoolAssetInfo;
  amount?: string;
}

export interface AstrovaultPool {
  id?: string | number;
  poolId?: string | number;
  poolAssets?: AstrovaultPoolAsset[];
  percentageAPRs?: number[]; // e.g., [0.02] meaning 2% APR
  contextChainId?: string; // e.g., 'archway-1'
  detailsUrl?: string; // if provided
}

export interface FormattedPool {
  id: string;
  type: 'liquidity';
  platform: string;
  apy: string; // show APR as a % string for now
  tvl: string; // unknown from API -> '—'
  description: string;
  url: string;
  pair: string;
  chain: string;
}

export class AstrovaultService {
  private static readonly API_URL = 'https://ext.astrovault.io/pool';
  private static readonly NEUTRON_ASSETLIST_URL =
    'https://raw.githubusercontent.com/cosmos/chain-registry/master/neutron/assetlist.json';

  // Cache for Neutron asset mapping: base/denom/address -> symbol
  private static neutronAssetMap: Record<string, string> | null = null;
  private static neutronAssetMapFetchedAt = 0;
  private static readonly ASSETMAP_TTL_MS = 60 * 60 * 1000; // 1 hour

  private static async getNeutronAssetMap(): Promise<Record<string, string>> {
    const now = Date.now();
    if (this.neutronAssetMap && now - this.neutronAssetMapFetchedAt < this.ASSETMAP_TTL_MS) {
      return this.neutronAssetMap;
    }
    try {
      const res = await fetch(this.NEUTRON_ASSETLIST_URL, { cache: 'no-store' as any });
      if (!res.ok) throw new Error(`neutron assetlist ${res.status}`);
      const json = await res.json();
      const assets: any[] = json?.assets || [];
      const map: Record<string, string> = {};
      for (const a of assets) {
        const symbol: string = a?.symbol || a?.name || '';
        const base: string = a?.base || '';
        if (base && symbol) map[base] = symbol;
        // index denom_units denoms
        const units: any[] = a?.denom_units || [];
        for (const u of units) {
          const d = u?.denom;
          if (d && symbol) map[d] = symbol;
        }
        // index CW20 address if present
        const addr = a?.address;
        if (addr && symbol) map[String(addr).toLowerCase()] = symbol;
      }
      this.neutronAssetMap = map;
      this.neutronAssetMapFetchedAt = now;
      return map;
    } catch (e) {
      console.warn('Failed to load Neutron assetlist:', e);
      this.neutronAssetMap = {};
      this.neutronAssetMapFetchedAt = now;
      return this.neutronAssetMap;
    }
  }

  private static chainNameFromId(chainId?: string): string {
    if (!chainId) return '—';
    switch (chainId) {
      case 'archway-1':
        return 'Archway';
      default: {
        // Fallback: capitalize prefix before first '-'
        const prefix = chainId.split('-')[0] || chainId;
        return prefix.charAt(0).toUpperCase() + prefix.slice(1);
      }
    }
  }

  private static shortenMiddle(s: string, head = 6, tail = 6): string {
    if (!s) return '';
    if (s.length <= head + tail + 1) return s;
    return `${s.slice(0, head)}…${s.slice(-tail)}`;
  }

  private static denomToReadable(denom?: string): string {
    if (!denom) return '';
    // Quick mappings/heuristics
    const d = denom.toLowerCase();
    if (d === 'uatom') return 'ATOM';
    if (d === 'uarch') return 'ARCH';
    if (d.startsWith('ibc/')) return this.shortenMiddle(denom, 7, 5); // e.g., ibc/ABC…12345
    return denom.toUpperCase();
  }

  private static async assetToSymbol(a?: AstrovaultPoolAsset, chainId?: string): Promise<string> {
    if (!a || !a.info) return '';
    const info: any = a.info as any;
    if (info.native_token && info.native_token.denom) {
      const denom: string = info.native_token.denom;
      // Prefer chain-specific mapping when available
      if (chainId === 'neutron-1') {
        const nmap = await this.getNeutronAssetMap();
        const mappedN = nmap[denom] || nmap[denom.toLowerCase()];
        if (mappedN) return mappedN;
      }
      const mapped = await ArchwayAssetService.symbolForDenomOrAddress(denom, undefined);
      return mapped || this.denomToReadable(denom);
    }
    if (info.token && info.token.contract_addr) {
      const addr: string = info.token.contract_addr;
      if (chainId === 'neutron-1') {
        const nmap = await this.getNeutronAssetMap();
        const mappedN = nmap[addr] || nmap[addr.toLowerCase()];
        if (mappedN) return mappedN;
      }
      const mapped = await ArchwayAssetService.symbolForDenomOrAddress(undefined, addr);
      return mapped || this.shortenMiddle(addr);
    }
    return '';
  }

  private static formatAprToPercent(aprs?: number[]): string {
    if (!aprs || aprs.length === 0) return '—';
    const apr = aprs[0];
    if (apr == null || isNaN(apr)) return '—';
    // APR values from Astrovault are already in percent units (e.g., 1.0 -> 1%).
    const s = Number(apr).toFixed(2);
    const trimmed = s.replace(/\.00$/, '').replace(/(\.\d*[1-9])0$/, '$1');
    return `${trimmed}%`;
  }

  static async fetchPools(): Promise<FormattedPool[]> {
    try {
      let json: any = null;
      // 1) Try Vite dev proxy first (works only in dev with our proxy config)
      try {
        const proxiedDev = await fetch('/av/pool');
        if (!proxiedDev.ok) throw new Error(`Dev proxy error ${proxiedDev.status}`);
        json = await proxiedDev.json();
      } catch (devErr) {
        console.warn('Astrovault dev proxy fetch failed, trying direct:', devErr);
        // 2) Try direct
        try {
          const res = await fetch(this.API_URL);
          if (!res.ok) throw new Error(`Astrovault API error ${res.status}`);
          json = await res.json();
        } catch (primaryErr) {
          console.warn('Astrovault direct fetch failed, retrying via generic CORS proxy:', primaryErr);
          // 3) Generic CORS proxy
          const proxyUrl = `https://cors.isomorphic-git.org/${encodeURI(this.API_URL)}`;
          const proxied = await fetch(proxyUrl);
          if (!proxied.ok) throw new Error(`Astrovault proxy error ${proxied.status}`);
          json = await proxied.json();
        }
      }

      // Accept multiple shapes
      const list: AstrovaultPool[] = Array.isArray(json)
        ? json
        : Array.isArray(json?.data)
        ? json.data
        : Array.isArray(json?.pools)
        ? json.pools
        : [];

      console.log('Astrovault pools fetched:', Array.isArray(list) ? list.length : 0);

      const formatted: FormattedPool[] = [];
      for (let idx = 0; idx < list.length; idx++) {
        const p = list[idx];
        const assets = p.poolAssets || [];
        const symbolsRaw = await Promise.all(assets.map((a) => this.assetToSymbol(a, p.contextChainId)));
        const symbols = (symbolsRaw.filter((s) => !!s) as string[]).map((s) => s.toUpperCase());
        // Only include pools that involve ATOM
        if (!symbols.includes('ATOM')) continue;
        const pair = symbols.join('/') || '—';
        const chain = this.chainNameFromId(p.contextChainId);
        const apy = this.formatAprToPercent(p.percentageAPRs);
        const idRaw = p.id ?? p.poolId ?? idx;
        const id = `astrovault-${idRaw}`;
        const url = p.detailsUrl || 'https://astrovault.io/pool';
        formatted.push({
          id,
          type: 'liquidity' as const,
          platform: 'Astrovault',
          apy,
          tvl: '—',
          description: `${pair} Liquidity Pool`,
          url,
          pair,
          chain,
        });
      }

      console.log('Astrovault formatted pools (ATOM only):', formatted.length);
      return formatted;
    } catch (e) {
      console.error('Failed to fetch Astrovault pools:', e);
      return [];
    }
  }
}
