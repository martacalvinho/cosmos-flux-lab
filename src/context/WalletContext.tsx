import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Window as KeplrWindow } from '@keplr-wallet/types';
import { SigningStargateClient } from '@cosmjs/stargate';

declare global {
  interface Window {
    keplr?: KeplrWindow['keplr'];
    leap?: KeplrWindow['keplr'];
  }
}

interface WalletContextType {
  address: string | null;
  client: SigningStargateClient | null;
  connect: (type: 'keplr' | 'leap') => Promise<void>;
  disconnect: () => void;
  isConnecting: boolean;
  error: string | null;
  walletType: 'keplr' | 'leap' | null;
  chainId: string;
}

const WalletContext = createContext<WalletContextType>({
  address: null,
  client: null,
  connect: async () => {},
  disconnect: () => {},
  isConnecting: false,
  error: null,
  walletType: null,
  chainId: 'cosmoshub-4',
});

export const useWallet = () => useContext(WalletContext);

interface WalletProviderProps {
  children: React.ReactNode;
}

// Chain configurations for major Cosmos chains
const CHAIN_CONFIGS = {
  'cosmoshub-4': {
    chainId: 'cosmoshub-4',
    chainName: 'Cosmos Hub',
    rpc: 'https://cosmos-rpc.polkachu.com',
    rest: 'https://cosmos-api.polkachu.com',
    bip44: { coinType: 118 },
    bech32Config: {
      bech32PrefixAccAddr: 'cosmos',
      bech32PrefixAccPub: 'cosmospub',
      bech32PrefixValAddr: 'cosmosvaloper',
      bech32PrefixValPub: 'cosmosvaloperpub',
      bech32PrefixConsAddr: 'cosmosvalcons',
      bech32PrefixConsPub: 'cosmosvalconspub',
    },
    currencies: [{
      coinDenom: 'ATOM',
      coinMinimalDenom: 'uatom',
      coinDecimals: 6,
    }],
    feeCurrencies: [{
      coinDenom: 'ATOM',
      coinMinimalDenom: 'uatom',
      coinDecimals: 6,
      gasPriceStep: {
        low: 0.01,
        average: 0.025,
        high: 0.04,
      },
    }],
    stakeCurrency: {
      coinDenom: 'ATOM',
      coinMinimalDenom: 'uatom',
      coinDecimals: 6,
    },
    features: ['ibc-transfer', 'ibc-go'],
  },
  'osmosis-1': {
    chainId: 'osmosis-1',
    chainName: 'Osmosis',
    rpc: 'https://osmosis-rpc.polkachu.com',
    rest: 'https://osmosis-api.polkachu.com',
    bip44: { coinType: 118 },
    bech32Config: {
      bech32PrefixAccAddr: 'osmo',
      bech32PrefixAccPub: 'osmopub',
      bech32PrefixValAddr: 'osmovaloper',
      bech32PrefixValPub: 'osmovaloperpub',
      bech32PrefixConsAddr: 'osmovalcons',
      bech32PrefixConsPub: 'osmovalconspub',
    },
    currencies: [{
      coinDenom: 'OSMO',
      coinMinimalDenom: 'uosmo',
      coinDecimals: 6,
    }],
    feeCurrencies: [{
      coinDenom: 'OSMO',
      coinMinimalDenom: 'uosmo',
      coinDecimals: 6,
      gasPriceStep: {
        low: 0.0025,
        average: 0.025,
        high: 0.04,
      },
    }],
    stakeCurrency: {
      coinDenom: 'OSMO',
      coinMinimalDenom: 'uosmo',
      coinDecimals: 6,
    },
    features: ['ibc-transfer', 'ibc-go'],
  }
};

// RPC endpoints with fallbacks
const RPC_ENDPOINTS = {
  'cosmoshub-4': [
    'https://cosmos-rpc.polkachu.com',
    'https://rpc-cosmoshub.blockapsis.com',
    'https://cosmos-rpc.quickapi.com',
  ],
  'osmosis-1': [
    'https://osmosis-rpc.polkachu.com',
    'https://rpc-osmosis.blockapsis.com',
    'https://osmosis-rpc.quickapi.com',
  ]
};

export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  const [address, setAddress] = useState<string | null>(null);
  const [client, setClient] = useState<SigningStargateClient | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [walletType, setWalletType] = useState<'keplr' | 'leap' | null>(null);
  const [chainId, setChainId] = useState('cosmoshub-4');

  const getNextRPCEndpoint = (currentEndpoint: string, chainId: string) => {
    const endpoints = RPC_ENDPOINTS[chainId as keyof typeof RPC_ENDPOINTS] || RPC_ENDPOINTS['cosmoshub-4'];
    const currentIndex = endpoints.indexOf(currentEndpoint);
    if (currentIndex === -1) {
      throw new Error('Current endpoint not found in RPC endpoints list');
    }
    const nextIndex = (currentIndex + 1) % endpoints.length;
    return endpoints[nextIndex];
  };

  const connect = useCallback(async (type: 'keplr' | 'leap') => {
    try {
      setIsConnecting(true);
      setError(null);

      // Check if wallet is available
      const wallet = type === 'keplr' ? window.keplr : window.leap;
      if (!wallet) {
        throw new Error(`${type} wallet is not installed`);
      }

      const chainConfig = CHAIN_CONFIGS[chainId as keyof typeof CHAIN_CONFIGS];
      if (!chainConfig) {
        throw new Error(`Unsupported chain: ${chainId}`);
      }

      // Suggest chain to wallet if not already added
      try {
        await wallet.experimentalSuggestChain(chainConfig);
      } catch (err) {
        console.warn('Failed to suggest chain:', err);
        // Continue anyway, as the chain might already be added
      }

      // Enable the chain
      try {
        await wallet.enable(chainId);
      } catch (err) {
        console.error('Failed to enable chain:', err);
        throw new Error(`Failed to enable ${chainId} in ${type} wallet. Please check your wallet and try again.`);
      }

      // Get the offline signer
      const offlineSigner = await wallet.getOfflineSigner(chainId);
      if (!offlineSigner) {
        throw new Error(`Failed to get offline signer from ${type} wallet`);
      }

      // Get the user's address
      const accounts = await offlineSigner.getAccounts();
      if (accounts.length === 0) {
        throw new Error('No accounts found in wallet');
      }

      // Try connecting with each RPC endpoint until successful
      const endpoints = RPC_ENDPOINTS[chainId as keyof typeof RPC_ENDPOINTS] || RPC_ENDPOINTS['cosmoshub-4'];
      let currentEndpoint = endpoints[0];
      let client = null;
      let retryCount = 0;
      const maxRetries = endpoints.length;

      while (retryCount < maxRetries) {
        try {
          client = await SigningStargateClient.connectWithSigner(
            currentEndpoint,
            offlineSigner
          );
          // Test the connection by getting balance
          await client.getBalance(accounts[0].address, chainConfig.currencies[0].coinMinimalDenom);
          break;
        } catch (err) {
          console.warn(`Failed to connect to RPC endpoint ${currentEndpoint}:`, err);
          currentEndpoint = getNextRPCEndpoint(currentEndpoint, chainId);
          retryCount++;
          if (retryCount === maxRetries) {
            throw new Error('Failed to connect to any RPC endpoint');
          }
        }
      }

      if (!client) {
        throw new Error('Failed to establish connection');
      }

      setAddress(accounts[0].address);
      setClient(client);
      setWalletType(type);

      // Store wallet type and chain in local storage for persistence
      localStorage.setItem('walletType', type);
      localStorage.setItem('chainId', chainId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect wallet';
      setError(errorMessage);
      throw err;
    } finally {
      setIsConnecting(false);
    }
  }, [chainId]);

  const disconnect = useCallback(() => {
    setAddress(null);
    setClient(null);
    setError(null);
    setWalletType(null);
    localStorage.removeItem('walletType');
    localStorage.removeItem('chainId');
  }, []);

  // Auto-connect on page load if wallet type is stored
  useEffect(() => {
    const storedWalletType = localStorage.getItem('walletType') as 'keplr' | 'leap' | null;
    const storedChainId = localStorage.getItem('chainId') || 'cosmoshub-4';
    
    if (storedChainId) {
      setChainId(storedChainId);
    }
    
    if (storedWalletType) {
      // Try to auto-connect with the stored wallet type
      const autoConnect = async () => {
        try {
          // Check if the wallet is available
          const wallet = storedWalletType === 'keplr' ? window.keplr : window.leap;
          if (wallet) {
            await connect(storedWalletType);
          } else {
            // If wallet isn't available, clear the stored type
            localStorage.removeItem('walletType');
            setWalletType(null);
          }
        } catch (err) {
          console.error('Failed to auto-connect wallet:', err);
          // Clear stored wallet type on connection failure
          localStorage.removeItem('walletType');
          setWalletType(null);
        }
      };
      
      autoConnect();
    }
  }, [connect]);

  // Listen for account changes
  useEffect(() => {
    if (!walletType) return;

    const handleChange = () => {
      // Reconnect to get the new account
      connect(walletType).catch((err) => {
        console.error('Failed to reconnect after account change:', err);
        disconnect();
      });
    };

    window.addEventListener('keplr_keystorechange', handleChange);
    window.addEventListener('leap_keystorechange', handleChange);

    return () => {
      window.removeEventListener('keplr_keystorechange', handleChange);
      window.removeEventListener('leap_keystorechange', handleChange);
    };
  }, [walletType, connect, disconnect]);

  return (
    <WalletContext.Provider
      value={{
        address,
        client,
        connect,
        disconnect,
        isConnecting,
        error,
        walletType,
        chainId,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};
