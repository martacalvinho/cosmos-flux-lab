import { useState } from "react";
import { Wallet, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

const WALLETS = [
  { name: "Keplr", icon: "🔮", color: "text-primary" },
  { name: "Leap", icon: "🐸", color: "text-success" },
  { name: "Cosmostation", icon: "🌌", color: "text-liquidity" }
];

const MOCK_BALANCE = {
  address: "cosmos1...",
  atom: "1,234.56",
  stAtom: "567.89", 
  qAtom: "123.45",
  chain: "Osmosis"
};

export const WalletConnect = () => {
  const [connected, setConnected] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);

  const handleConnect = (walletName: string) => {
    setSelectedWallet(walletName);
    setConnected(true);
  };

  const handleDisconnect = () => {
    setConnected(false);
    setSelectedWallet(null);
  };

  if (!connected) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Wallet className="h-4 w-4" />
            Connect Wallet
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {WALLETS.map((wallet) => (
            <DropdownMenuItem
              key={wallet.name}
              onClick={() => handleConnect(wallet.name)}
              className="cursor-pointer gap-3"
            >
              <span className="text-lg">{wallet.icon}</span>
              <span>{wallet.name}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <div className="w-2 h-2 bg-success rounded-full" />
          <span className="hidden sm:inline">
            {MOCK_BALANCE.address.slice(0, 8)}...
          </span>
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <div className="p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Connected via {selectedWallet}</span>
            <Badge variant="outline" className="text-xs">
              {MOCK_BALANCE.chain}
            </Badge>
          </div>
          
          <div className="text-xs text-muted-foreground font-mono">
            {MOCK_BALANCE.address}
          </div>
          
          <div className="space-y-1 pt-2">
            <div className="flex justify-between text-sm">
              <span>ATOM</span>
              <span className="font-mono">{MOCK_BALANCE.atom}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>stATOM</span>
              <span className="font-mono">{MOCK_BALANCE.stAtom}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>qATOM</span>
              <span className="font-mono">{MOCK_BALANCE.qAtom}</span>
            </div>
          </div>
        </div>
        
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleDisconnect} className="text-error cursor-pointer">
          Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};