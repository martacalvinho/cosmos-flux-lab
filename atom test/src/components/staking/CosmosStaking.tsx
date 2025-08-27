import React, { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useWallet } from '@/context/WalletContext';
import { CosmosHubService, Validator, Delegation } from '@/services/cosmosHub';

const formatPct = (rate: string) => {
  const n = Number(rate);
  if (isNaN(n)) return '—';
  return `${(n * 100).toFixed(2).replace(/\.00$/, '')}%`;
};

const uatomToAtom = (amt?: string) => {
  if (!amt) return '0';
  const n = Number(amt) / 1_000_000;
  return n.toLocaleString(undefined, { maximumFractionDigits: 6 });
};

const atomToUatom = (amt: string) => {
  const n = Number(amt);
  if (isNaN(n) || n <= 0) return '0';
  return Math.round(n * 1_000_000).toString();
};

const rpcExplorerTx = (hash: string) => `https://www.mintscan.io/cosmos/txs/${hash}`;

export const CosmosStaking: React.FC = () => {
  const { address, connect, connecting, client } = useWallet();
  const [loading, setLoading] = useState(true);
  const [validators, setValidators] = useState<Validator[]>([]);
  const [delegations, setDelegations] = useState<Delegation[]>([]);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [logoMap, setLogoMap] = useState<Record<string, string | null>>({});
  const [uptimeMap, setUptimeMap] = useState<Record<string, number>>({});
  const [slashMap, setSlashMap] = useState<Record<string, { missed: number; tombstoned: boolean; slashCount: number }>>({});

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const vals = await CosmosHubService.fetchActiveValidators();
        setValidators(vals);
        if (address) {
          const dels = await CosmosHubService.fetchDelegations(address);
          setDelegations(dels);
        } else {
          setDelegations([]);
        }
      } catch (e) {
        console.error('staking load failed', e);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [address]);

  // Fetch validator extras: logos and uptime
  useEffect(() => {
    if (!validators || validators.length === 0) return;
    let cancelled = false;
    (async () => {
      try {
        const [logos, uptime] = await Promise.all([
          CosmosHubService.fetchValidatorLogos(validators),
          CosmosHubService.fetchUptimeMap(validators),
        ]);
        if (!cancelled) {
          setLogoMap(logos);
          setUptimeMap(uptime);
        }
      } catch (e) {
        // ignore extras fetch errors, keep core staking working
      }
    })();
    return () => { cancelled = true; };
  }, [validators]);

  // Fetch signing info to detect tombstoned and missed count, mapped by operator address
  useEffect(() => {
    if (!validators || validators.length === 0) return;
    let cancelled = false;
    (async () => {
      try {
        const map = await CosmosHubService.fetchSigningInfoMap(validators);
        if (!cancelled) setSlashMap(map);
      } catch {
        // ignore
      }
    })();
    return () => { cancelled = true; };
  }, [validators]);

  const delegationMap = useMemo(() => {
    const map: Record<string, Delegation> = {};
    for (const d of delegations) {
      map[d.delegation.validator_address] = d;
    }
    return map;
  }, [delegations]);

  const onDelegate = async (valoper: string) => {
    if (!client || !address) {
      await connect();
      return;
    }
    const input = window.prompt('Enter ATOM amount to delegate');
    if (!input) return;
    const amount = atomToUatom(input.trim());
    if (amount === '0') return;
    try {
      setSubmitting(valoper);
      const res = await CosmosHubService.delegate(client, address, valoper, amount, 'auto');
      if (res.code === 0) {
        const url = rpcExplorerTx(res.transactionHash);
        alert(`Delegation broadcasted. Tx: ${res.transactionHash}\n${url}`);
        // refresh balances/delegations
        const dels = await CosmosHubService.fetchDelegations(address);
        setDelegations(dels);
      } else {
        alert(`Tx failed: code ${res.code}`);
      }
    } catch (e: unknown) {
      alert(`Error: ${(e as Error)?.message || String(e)}`);
    } finally {
      setSubmitting(null);
    }
  };

  // Build sorted validators according to custom order:
  // 1) Uptime descending (highest first)
  // 2) Commission ascending (lowest first)
  // 3) Voting power ascending (lowest first)
  const sortedValidators = useMemo(() => {
    const getTokens = (v: Validator) => {
      try { return BigInt(v.tokens || '0'); } catch { return BigInt(0); }
    };
    
    const getCommission = (v: Validator) => {
      const rate = v.commission?.commission_rates?.rate;
      return rate ? Number(rate) : 0;
    };
    
    return [...validators].sort((a, b) => {
      // First: uptime descending (highest uptime first)
      const ua = uptimeMap[a.operator_address] ?? 0;
      const ub = uptimeMap[b.operator_address] ?? 0;
      if (ua !== ub) return ub - ua;
      
      // Second: commission ascending (lowest commission first)
      const ca = getCommission(a);
      const cb = getCommission(b);
      if (ca !== cb) return ca - cb;
      
      // Third: voting power ascending (lowest voting power first)
      const ta = getTokens(a);
      const tb = getTokens(b);
      if (ta !== tb) return ta < tb ? -1 : 1;
      
      return 0;
    });
  }, [validators, uptimeMap, slashMap]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold">Cosmos Hub Staking</h3>
        {!address ? (
          <button
            className="px-3 py-1.5 rounded bg-primary text-primary-foreground disabled:opacity-50"
            onClick={connect}
            disabled={connecting}
          >
            {connecting ? 'Connecting…' : 'Connect Keplr'}
          </button>
        ) : (
          <div className="text-sm text-muted-foreground">Connected: {address.slice(0, 10)}…</div>
        )}
      </div>

      <Card className="backdrop-blur-sm bg-card/80 border-border/30 shadow-table">
        <Table>
          <TableHeader>
            <TableRow className="border-border/30">
              <TableHead className="text-foreground font-semibold">Validator</TableHead>
              <TableHead className="text-foreground font-semibold">Commission</TableHead>
              <TableHead className="text-foreground font-semibold">Uptime</TableHead>
              <TableHead className="text-foreground font-semibold">Status</TableHead>
              <TableHead className="text-foreground font-semibold">Voting Power</TableHead>
              <TableHead className="text-foreground font-semibold w-32">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading…</TableCell>
              </TableRow>
            ) : validators.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No active validators</TableCell>
              </TableRow>
            ) : (
              sortedValidators.map((v) => {
                const vp = v.tokens ? `${uatomToAtom(v.tokens)} ATOM` : '—';
                const moniker = v.description?.moniker || v.operator_address;
                const logo = logoMap[v.operator_address] || '';
                const uptime = uptimeMap[v.operator_address];
                const uptimePct = typeof uptime === 'number' ? (uptime * 100) : undefined;
                const s = slashMap[v.operator_address];
                const slashCount = s?.slashCount || 0;
                const tombstoned = s?.tombstoned || false;
                
                return (
                  <TableRow key={v.operator_address} className="border-border/20 hover:bg-muted/5 transition-colors">
                    <TableCell className="font-medium text-foreground">
                      <div className="flex items-center gap-3">
                        {logo ? (
                          <img src={logo} alt={moniker} className="w-6 h-6 rounded-full object-cover" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs text-muted-foreground">
                            {moniker?.[0]?.toUpperCase() || '?'}
                          </div>
                        )}
                        <span>{moniker}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatPct(v.commission?.commission_rates?.rate ?? '0')}</TableCell>
                    <TableCell className="text-foreground min-w-[110px]">
                      {typeof uptimePct === 'number' ? (
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-muted rounded">
                            <div className="h-2 bg-green-500 rounded" style={{ width: `${Math.max(0, Math.min(100, uptimePct)).toFixed(0)}%` }} />
                          </div>
                          <span className="text-xs text-muted-foreground">{uptimePct.toFixed(2)}%</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-foreground">
                      <div className="flex items-center gap-2">
                        {tombstoned && (
                          <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">
                            Tombstoned
                          </span>
                        )}
                        {slashCount > 0 && (
                          <span className="px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded-full">
                            {slashCount} slash{slashCount > 1 ? 'es' : ''}
                          </span>
                        )}
                        {!tombstoned && slashCount === 0 && (
                          <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                            Active
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-foreground">{vp}</TableCell>
                    <TableCell>
                      <button
                        className="px-3 py-1.5 rounded bg-primary text-primary-foreground disabled:opacity-50"
                        onClick={() => onDelegate(v.operator_address)}
                        disabled={!!submitting}
                      >
                        {submitting === v.operator_address ? 'Submitting…' : 'Delegate'}
                      </button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

export default CosmosStaking;
