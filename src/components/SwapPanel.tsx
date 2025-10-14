import { useState, useEffect } from 'react';
import { ArrowLeftRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Widget } from '@skip-go/widget';
import { useWallet } from '@/context/WalletContext';

interface SwapWidgetProps {
  children: React.ReactNode;
  destChainId?: string; // e.g. 'osmosis-1', 'neutron-1', 'cosmoshub-4'
  destAtomDenom?: string; // optional override of ATOM denom on dest chain
}

const ATOM_IBC_ON_OSMOSIS = 'ibc/27394FB092D2ECCD56123C74F36E4C1F926001CEADA9CA97EA622B25F41E5EB2';
const ATOM_IBC_ON_NEUTRON = 'ibc/C4CFF46FD6DE35CA4CF4CE031E643C8FDC9BA4B99AE598E9B0ED98FE3A2319F9';

const ATOM_DENOM_BY_CHAIN: Record<string, string> = {
  'cosmoshub-4': 'uatom',
  'osmosis-1': ATOM_IBC_ON_OSMOSIS,
  'neutron-1': ATOM_IBC_ON_NEUTRON,
};

const SwapWidget = ({ children, destChainId, destAtomDenom }: SwapWidgetProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [widgetKey, setWidgetKey] = useState(0);
  const [viewportH, setViewportH] = useState<number>(typeof window !== 'undefined' ? window.innerHeight : 800);
  const { address, client, walletType, chainId } = useWallet();

  // Force widget re-render when dialog opens or wallet changes
  useEffect(() => {
    if (isOpen) {
      setWidgetKey(prev => prev + 1);
    }
  }, [isOpen, address, walletType, chainId]);

  // Track viewport height for responsive widget sizing
  useEffect(() => {
    const onResize = () => setViewportH(window.innerHeight);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Prepare connected addresses for Skip widget
  const connectedAddresses = address && chainId ? { [chainId]: address } : undefined;

  const defaultDestChainId = destChainId || 'osmosis-1';
  const defaultDestDenom = destAtomDenom || ATOM_DENOM_BY_CHAIN[defaultDestChainId] || 'uatom';
  const defaultSrcChainId = chainId || 'cosmoshub-4';

  // Cosmos signer function for Skip widget
  // This function must accept a chainId parameter to support multi-chain swaps
  const getCosmosSigner = async (chainIdToSign: string) => {
    if (!walletType) {
      throw new Error('No wallet connected');
    }

    const wallet = walletType === 'keplr' ? window.keplr : window.leap;
    if (!wallet) {
      throw new Error(`${walletType} wallet not found`);
    }

    try {
      // Enable the chain if not already enabled
      await wallet.enable(chainIdToSign);
      // Return the offline signer for the specific chain
      return await wallet.getOfflineSigner(chainIdToSign);
    } catch (error) {
      console.error(`Failed to get signer for chain ${chainIdToSign}:`, error);
      throw new Error(`Failed to get signer for chain ${chainIdToSign}`);
    }
  };

  // Conditionally include Skip API credentials from env for testing
  const apiUrl = import.meta.env.VITE_SKIP_API_URL as string | undefined;
  const apiKey = import.meta.env.VITE_SKIP_API_KEY as string | undefined;
  const includeApiCreds = Boolean(apiUrl && apiKey);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent
        noTransformCenter
        overlayClassName="z-0 bg-black/60"
        className="max-w-[95vw] sm:max-w-xl bg-card border-border p-0 shadow-modal sm:rounded-lg max-h-[90vh] overflow-y-auto flex flex-col"
        hideClose
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="sticky top-0 z-20 bg-card p-4 sm:p-6 pb-4 border-b border-border/20 relative">
          <DialogTitle className="text-center text-xl font-semibold flex items-center justify-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-primary" />
            Cross-Chain Swap
            <Badge variant="outline" className="text-xs ml-2">
              Skip.go
            </Badge>
          </DialogTitle>
          <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
            <span className="sr-only">Close</span>
            ✕
          </DialogClose>
        </DialogHeader>
        
        {/* Scrollable body */}
        <div className="px-4 sm:px-6">
          <Card className="p-3 mb-4 bg-primary/10 border-primary/20">
            <div className="text-sm text-foreground">
              <div className="font-medium mb-1">Service Fee: 0.75%</div>
              <div className="text-xs text-muted-foreground">
                Applied to all swaps to support UseAtom platform
              </div>
            </div>
          </Card>
        </div>

        {/* Widget Container */}
        <div className="px-4 sm:px-6 pb-6">
          {/**
           * Container height is responsive to viewport: min 420px, max 560px, ideally ~80vh
           */}
          <div
            className="w-full relative"
            style={{
              width: '100%',
              height: `${Math.min(560, Math.max(400, Math.floor(viewportH * 0.75)))}px`,
              position: 'relative'
            }}
          >
            {isOpen && (
              <div 
                style={{ width: '100%', height: '100%', position: 'relative' }}
                data-skip-widget
              >
                <Widget
                  key={widgetKey}
                  apiUrl="https://api.skip.build"
                  apiKey="100dbe62-40a0-4d83-bdc8-7a69c55d352c"
                  connectedAddresses={connectedAddresses}
                  getCosmosSigner={address ? getCosmosSigner : undefined}
                  onWalletConnected={(params) => {
                    console.log('Skip widget wallet connected:', params);
                  }}
                  onWalletDisconnected={(params) => {
                    console.log('Skip widget wallet disconnected:', params);
                  }}
                  persistSwapsBetweenSessions={false}
                  theme={{
                    brandColor: '#3366ff',
                    borderRadius: {
                      main: 12,
                      selectionButton: 12,
                      ghostButton: 12,
                      modalContainer: 12,
                      rowItem: 12,
                    },
                    primary: {
                      background: { normal: 'hsl(var(--surface))' },
                      text: {
                        normal: 'hsl(var(--foreground))',
                        lowContrast: 'hsl(var(--muted-foreground))',
                        ultraLowContrast: 'hsl(var(--muted-foreground))',
                      },
                      ghostButtonHover: 'hsl(var(--hover))',
                    },
                    secondary: {
                      background: {
                        normal: 'hsl(var(--card))',
                        transparent: 'transparent',
                        hover: 'hsl(var(--hover))',
                      },
                    },
                    success: { background: 'hsl(var(--success))', text: 'hsl(var(--background))' },
                    warning: { background: 'hsl(var(--warning))', text: 'hsl(var(--background))' },
                    error: { background: 'hsl(var(--error))', text: 'hsl(var(--background))' },
                  }}
                  defaultRoute={{
                    srcChainId: defaultSrcChainId,
                    srcAssetDenom: 'uatom',
                    destChainId: defaultDestChainId,
                    destAssetDenom: defaultDestDenom,
                  }}
                  settings={{
                    slippage: 3,
                  }}
                  cumulative_affiliate_fee_bps="75"
                  onTransactionComplete={(txInfo) => {
                    console.log('=== SKIP TRANSACTION COMPLETED ===');
                    console.log('Full transaction info:', JSON.stringify(txInfo, null, 2));
                    console.log('Using API credentials:', includeApiCreds, includeApiCreds ? { apiUrl } : {});
                    console.log('Cumulative affiliate fee bps:', '75');
                    console.log('Affiliate addresses:', {
                      'cosmoshub-4': { affiliates: [{ address: 'cosmos13lkew03teg5sukpgy5lj6z27x9nqylcxjzx4mc' }] },
                      'osmosis-1': { affiliates: [{ address: 'osmo13lkew03teg5sukpgy5lj6z27x9nqylcx6e49d2' }] },
                      'noble-1': { affiliates: [{ address: 'noble13lkew03teg5sukpgy5lj6z27x9nqylcx6pnark' }] },
                      'neutron-1': { affiliates: [{ address: 'neutron13lkew03teg5sukpgy5lj6z27x9nqylcxka0hpl' }] },
                      'stargaze-1': { affiliates: [{ address: 'stars13lkew03teg5sukpgy5lj6z27x9nqylcxx73gsf' }] },
                      'juno-1': { affiliates: [{ address: 'juno13lkew03teg5sukpgy5lj6z27x9nqylcxys9wuy' }] },
                      'akashnet-2': { affiliates: [{ address: 'akash13lkew03teg5sukpgy5lj6z27x9nqylcxletjzz' }] },
                      'secret-4': { affiliates: [{ address: 'secret19txusvc7xf54utpxcheljxuphyrq8sm2ugdwcr' }] }
                    });
                    
                    // Check if transaction contains fee information
                    if (txInfo && txInfo.txs) {
                      txInfo.txs.forEach((tx, index) => {
                        console.log(`Transaction ${index + 1}:`, tx);
                        if (tx.msgs) {
                          tx.msgs.forEach((msg, msgIndex) => {
                            console.log(`Message ${msgIndex + 1}:`, msg);
                          });
                        }
                      });
                    }
                    console.log('=== END TRANSACTION INFO ===');
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-card px-4 sm:px-6 pb-6 pt-2 border-t border-border/20">
          <div className="text-xs text-muted-foreground text-center">
            Powered by{' '}
            <a
              href="https://skip.money"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Skip Protocol
            </a>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SwapWidget;
