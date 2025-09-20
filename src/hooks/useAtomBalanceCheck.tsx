import { useCallback, useEffect, useMemo, useState } from 'react';
import { useWallet } from '@/context/WalletContext';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import SwapWidget from '@/components/SwapPanel';
import { AlertTriangle } from 'lucide-react';
import { StargateClient } from '@cosmjs/stargate';

const ATOM_IBC_ON_OSMOSIS = 'ibc/27394FB092D2ECCD56123C74F36E4C1F926001CEADA9CA97EA622B25F41E5EB2';
const ATOM_IBC_ON_NEUTRON = 'ibc/C4CFF46FD6DE35CA4CF4CE031E643C8FDC9BA4B99AE598E9B0ED98FE3A2319F9';
const USD_THRESHOLD = 1;
const PRICE_CACHE_KEY = 'atom:price:usd:v1';
const PRICE_CACHE_TTL_MS = 5 * 60_000;

async function fetchAtomPriceUsd(): Promise<number | null> {
  try {
    const now = Date.now();
    const cached = localStorage.getItem(PRICE_CACHE_KEY);
    if (cached) {
      const { ts, price } = JSON.parse(cached);
      if (now - ts < PRICE_CACHE_TTL_MS && typeof price === 'number') {
        return price;
      }
    }
    const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=cosmos&vs_currencies=usd');
    if (!res.ok) return null;
    const json = await res.json();
    const price = json?.cosmos?.usd ?? null;
    if (typeof price === 'number') {
      localStorage.setItem(PRICE_CACHE_KEY, JSON.stringify({ ts: now, price }));
      return price;
    }
    return null;
  } catch {
    return null;
  }
}

export function useAtomBalanceCheck() {
  const { address, client, chainId, walletType } = useWallet() as any;
  const [isOpen, setIsOpen] = useState(false);
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);
  const [atomUsd, setAtomUsd] = useState<number | null>(null);
  const [checkedChain, setCheckedChain] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const CHAIN_ID_BY_NAME: Record<string, string> = {
    'cosmos hub': 'cosmoshub-4',
    'osmosis': 'osmosis-1',
    'neutron': 'neutron-1',
    'terra': 'phoenix-1',
    'archway': 'archway-1',
  };

  const ATOM_DENOM_BY_CHAIN: Record<string, string> = {
    'cosmoshub-4': 'uatom',
    'osmosis-1': ATOM_IBC_ON_OSMOSIS,
    'neutron-1': ATOM_IBC_ON_NEUTRON,
  };

  const RPC_BY_CHAIN: Record<string, string> = {
    'cosmoshub-4': 'https://cosmos-rpc.polkachu.com',
    'osmosis-1': 'https://osmosis-rpc.polkachu.com',
    'neutron-1': 'https://neutron-rpc.polkachu.com',
    'phoenix-1': 'https://terra-rpc.publicnode.com',
    'archway-1': 'https://archway-rpc.polkachu.com',
  };

  const normalizeChainId = (input?: string | null): string | null => {
    if (!input) return null;
    const s = input.trim();
    if (s.includes('-')) return s; // looks like a chain ID already
    const key = s.toLowerCase();
    return CHAIN_ID_BY_NAME[key] || null;
  };

  const computeUsdBalance = useCallback(async (destChainId?: string | null): Promise<number | null> => {
    try {
      if (!address) return null;

      // Determine which chain to check
      const targetChain = normalizeChainId(destChainId) || chainId;
      setCheckedChain(targetChain);

      // Determine denom for ATOM on target chain
      const denom = ATOM_DENOM_BY_CHAIN[targetChain] || 'uatom';

      // If current client is already on target chain, reuse
      if (client && chainId === targetChain) {
        const bal = await client.getBalance(address, denom);
        const atom = parseFloat(bal.amount || '0') / 1_000_000;
        const price = await fetchAtomPriceUsd();
        if (!price) return atom === 0 ? 0 : null;
        return atom * price;
      }

      // Otherwise, try a read-only query on the destination chain
      // Get address for the destination chain via wallet, if possible
      let destAddress = address;
      try {
        const wallet = walletType === 'keplr' ? (window as any).keplr : (window as any).leap;
        if (wallet && targetChain) {
          try {
            await wallet.enable(targetChain);
          } catch {}
          try {
            const key = await wallet.getKey(targetChain);
            if (key?.bech32Address) destAddress = key.bech32Address;
          } catch {}
        }
      } catch {}

      const rpc = targetChain ? RPC_BY_CHAIN[targetChain] : null;
      if (!rpc || !targetChain) return null;
      const roClient = await StargateClient.connect(rpc);
      const bal = await roClient.getBalance(destAddress, denom);
      const atom = parseFloat(bal.amount || '0') / 1_000_000; // 6 decimals
      const price = await fetchAtomPriceUsd();
      if (!price) return atom === 0 ? 0 : null;
      return atom * price;
    } catch {
      // If we cannot verify balance, assume 0 to err on the safe side and prompt
      return 0;
    }
  }, [client, address, chainId, walletType]);

  const ensureEnoughAtomThen = useCallback(async (url: string, destChain?: string) => {
    if (!address) {
      // No wallet connected or unusable client -> allow navigation
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }
    setIsChecking(true);
    try {
      const usd = await computeUsdBalance(destChain || null);
      if (usd !== null) setAtomUsd(usd);
      if (usd !== null && usd < USD_THRESHOLD) {
        setPendingUrl(url);
        setIsOpen(true);
        return;
      }
      // Enough ATOM or unknown -> proceed
      window.open(url, '_blank', 'noopener,noreferrer');
    } finally {
      setIsChecking(false);
    }
  }, [address, client, computeUsdBalance]);

  const modal = (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Low ATOM balance
          </DialogTitle>
          <DialogDescription>
            {atomUsd !== null
              ? `You have approximately $${atomUsd.toFixed(2)} in ATOM on ${checkedChain || chainId}.`
              : `Your ATOM balance on ${checkedChain || chainId} appears to be low.`}
            {' '}We recommend swapping to ATOM before entering a pool.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2 mt-2">
          <SwapWidget destChainId={checkedChain || undefined}>
            <Button className="w-full" variant="default">Swap to ATOM</Button>
          </SwapWidget>
          <div className="flex gap-2">
            <Button className="flex-1" variant="outline" onClick={() => {
              setIsOpen(false);
              if (pendingUrl) window.open(pendingUrl, '_blank', 'noopener,noreferrer');
            }}>
              Continue anyway
            </Button>
            <Button className="flex-1" variant="ghost" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>

      </DialogContent>
    </Dialog>
  );

  return { ensureEnoughAtomThen, isChecking, modal } as const;
}
