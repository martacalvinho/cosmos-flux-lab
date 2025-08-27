import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { SigningStargateClient } from '@cosmjs/stargate';

interface WalletContextValue {
  chainId: string;
  address: string | null;
  client: SigningStargateClient | null;
  connecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const WalletContext = createContext<WalletContextValue | undefined>(undefined);

const COSMOSHUB_CHAIN_ID = 'cosmoshub-4';
const COSMOSHUB_RPC = 'https://rpc.cosmos.directory/cosmoshub';

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [address, setAddress] = useState<string | null>(null);
  const [client, setClient] = useState<SigningStargateClient | null>(null);
  const [connecting, setConnecting] = useState(false);

  const connect = useCallback(async () => {
    try {
      setConnecting(true);
      const anyWindow = window as any;
      const keplr = anyWindow.keplr;
      if (!keplr) {
        throw new Error('Keplr wallet not found. Please install Keplr.');
      }

      // Suggest chain if not present
      if (keplr?.experimentalSuggestChain) {
        try {
          await keplr.experimentalSuggestChain({
            chainId: COSMOSHUB_CHAIN_ID,
            chainName: 'Cosmos Hub',
            rpc: COSMOSHUB_RPC,
            rest: 'https://rest.cosmos.directory/cosmoshub',
            bip44: { coinType: 118 },
            bech32Config: {
              bech32PrefixAccAddr: 'cosmos',
              bech32PrefixAccPub: 'cosmospub',
              bech32PrefixValAddr: 'cosmosvaloper',
              bech32PrefixValPub: 'cosmosvaloperpub',
              bech32PrefixConsAddr: 'cosmosvalcons',
              bech32PrefixConsPub: 'cosmosvalconspub',
            },
            currencies: [
              { coinDenom: 'ATOM', coinMinimalDenom: 'uatom', coinDecimals: 6 },
            ],
            feeCurrencies: [
              { coinDenom: 'ATOM', coinMinimalDenom: 'uatom', coinDecimals: 6 },
            ],
            stakeCurrency: { coinDenom: 'ATOM', coinMinimalDenom: 'uatom', coinDecimals: 6 },
            gasPriceStep: { low: 0.01, average: 0.025, high: 0.04 },
          });
        } catch (_) {
          // ignore if already added
        }
      }

      await keplr.enable(COSMOSHUB_CHAIN_ID);
      const offlineSigner = await keplr.getOfflineSignerAuto(COSMOSHUB_CHAIN_ID);
      const accounts = await offlineSigner.getAccounts();
      const addr = accounts?.[0]?.address;
      if (!addr) throw new Error('No account found');

      const sgClient = await SigningStargateClient.connectWithSigner(COSMOSHUB_RPC, offlineSigner);

      setAddress(addr);
      setClient(sgClient);
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    try { client?.disconnect?.(); } catch {}
    setClient(null);
    setAddress(null);
  }, [client]);

  const value = useMemo<WalletContextValue>(() => ({
    chainId: COSMOSHUB_CHAIN_ID,
    address,
    client,
    connecting,
    connect,
    disconnect,
  }), [address, client, connecting, connect, disconnect]);

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
};

export const useWallet = (): WalletContextValue => {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used within WalletProvider');
  return ctx;
};
