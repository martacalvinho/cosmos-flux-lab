import { useState, useEffect } from 'react';
import { ArrowLeftRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Widget } from '@skip-go/widget';

interface SwapWidgetProps {
  children: React.ReactNode;
}

const SwapWidget = ({ children }: SwapWidgetProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [widgetKey, setWidgetKey] = useState(0);

  // Force widget re-render when dialog opens
  useEffect(() => {
    if (isOpen) {
      setWidgetKey(prev => prev + 1);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent noTransformCenter overlayClassName="z-0 pointer-events-none" className="z-10 max-w-xl bg-card border-border p-0 overflow-visible shadow-modal sm:rounded-lg">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="text-center text-xl font-semibold flex items-center justify-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-primary" />
            Cross-Chain Swap
            <Badge variant="outline" className="text-xs ml-2">
              Skip.go
            </Badge>
          </DialogTitle>
        </DialogHeader>
        
        {/* Fee Notice */}
        <div className="px-6">
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
        <div className="px-6 pb-6">
          <div
            className="w-full"
            style={{
              width: '100%',
              height: '560px',
              position: 'relative'
            }}
          >
            {isOpen && (
              <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                <Widget
                  key={widgetKey}
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
                    srcChainId: 'cosmoshub-4',
                    srcAssetDenom: 'uatom',
                    destChainId: 'osmosis-1', 
                    destAssetDenom: 'ibc/27394FB092D2ECCD56123C74F36E4C1F926001CEADA9CA97EA622B25F41E5EB2',
                  }}
                  settings={{
                    slippage: 3,
                  }}
                  chainIdsToAffiliates={{
                    'cosmoshub-4': {
                      affiliates: [{
                        basisPointsFee: '75', // 0.75% fee
                        address: 'cosmos13lkew03teg5sukpgy5lj6z27x9nqylcxjzx4mc',
                      }]
                    },
                    'osmosis-1': {
                      affiliates: [{
                        basisPointsFee: '75', // 0.75% fee
                        address: 'osmo13lkew03teg5sukpgy5lj6z27x9nqylcx6e49d2',
                      }]
                    },
                    'noble-1': {
                      affiliates: [{
                        basisPointsFee: '75', // 0.75% fee
                        address: 'noble13lkew03teg5sukpgy5lj6z27x9nqylcxpnark',
                      }]
                    },
                    'neutron-1': {
                      affiliates: [{
                        basisPointsFee: '75', // 0.75% fee
                        address: 'neutron13lkew03teg5sukpgy5lj6z27x9nqylcxka0hpl',
                      }]
                    },
                    'stargaze-1': {
                      affiliates: [{
                        basisPointsFee: '75', // 0.75% fee
                        address: 'stars13lkew03teg5sukpgy5lj6z27x9nqylcxx73gsf',
                      }]
                    },
                    'juno-1': {
                      affiliates: [{
                        basisPointsFee: '75', // 0.75% fee
                        address: 'juno13lkew03teg5sukpgy5lj6z27x9nqylcxys9wuy',
                      }]
                    },
                    'akashnet-2': {
                      affiliates: [{
                        basisPointsFee: '75', // 0.75% fee
                        address: 'akash13lkew03teg5sukpgy5lj6z27x9nqylcxletjzz',
                      }]
                    },
                    'secret-4': {
                      affiliates: [{
                        basisPointsFee: '75', // 0.75% fee
                        address: 'secret19txusvc7xf54utpxcheljxuphyrq8sm2ugdwcr',
                      }]
                    }
                  }}
                  onTransactionComplete={(txInfo) => {
                    console.log('Swap completed:', txInfo);
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-2 border-t border-border/20">
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
