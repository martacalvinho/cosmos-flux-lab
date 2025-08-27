// Archway asset mapping service: fetch Archway chain-registry assetlist and map denom/base/addresses to symbols

export class ArchwayAssetService {
  private static readonly ASSETLIST_URL =
    'https://raw.githubusercontent.com/cosmos/chain-registry/master/archway/assetlist.json';

  private static assetMap: Record<string, string> | null = null; // key -> symbol
  private static fetchedAt = 0;
  private static readonly TTL_MS = 60 * 60 * 1000; // 1 hour

  private static indexAsset(asset: any, map: Record<string, string>) {
    const symbol: string = asset?.symbol || asset?.name || '';
    if (!symbol) return;

    const base: string | undefined = asset?.base;
    if (base) map[base] = symbol;

    const denomUnits: any[] = asset?.denom_units || [];
    for (const u of denomUnits) {
      const d = u?.denom;
      if (d) map[d] = symbol;
    }

    // Some assets may include IBC hash within base or in traces
    const traces: any[] = asset?.traces || [];
    for (const t of traces) {
      const hash: string | undefined = t?.ibc?.hash || t?.hash;
      if (hash) map[`ibc/${hash}`] = symbol;
    }

    // Try common extension fields
    const address: string | undefined = asset?.address || asset?.contract_address || asset?.extensions?.address;
    if (address) map[address] = symbol;
  }

  private static async getMap(): Promise<Record<string, string>> {
    const now = Date.now();
    if (this.assetMap && now - this.fetchedAt < this.TTL_MS) return this.assetMap;
    try {
      const res = await fetch(this.ASSETLIST_URL, { cache: 'no-store' as any });
      if (!res.ok) throw new Error(`archway assetlist ${res.status}`);
      const json = await res.json();
      const assets: any[] = json?.assets || [];
      const map: Record<string, string> = {};
      for (const a of assets) this.indexAsset(a, map);
      this.assetMap = map;
      this.fetchedAt = now;
      return map;
    } catch (e) {
      console.warn('Archway assetlist load failed, using empty map', e);
      this.assetMap = {};
      this.fetchedAt = now;
      return this.assetMap;
    }
  }

  static async symbolForDenomOrAddress(denom?: string, address?: string): Promise<string> {
    const map = await this.getMap();
    const key = denom || address || '';
    if (!key) return '';
    const fromMap = map[key];
    if (fromMap) return fromMap;
    // Heuristics for Archway
    const d = key.toLowerCase();
    if (d === 'uatom') return 'ATOM';
    if (d === 'uarch') return 'ARCH';
    return '';
  }
}
