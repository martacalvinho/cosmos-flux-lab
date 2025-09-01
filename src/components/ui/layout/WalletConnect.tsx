import { useState, useEffect } from "react";
import { Wallet, ChevronDown, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useWallet } from "@/context/WalletContext";

const WALLETS = [
  { name: "Keplr", icon: "", color: "text-primary", type: "keplr" as const },
  { name: "Leap", icon: "", color: "text-success", type: "leap" as const },
];

export const WalletConnect = () => {
  const { 
    address, 
    client, 
    connect, 
    disconnect, 
    isConnecting, 
    error, 
    walletType,
    chainId 
  } = useWallet();
  
  const [balances, setBalances] = useState<Record<string, string>>({});
  const [connected, setConnected] = useState(false);

  // Fetch balances when wallet is connected
  useEffect(() => {
    const fetchBalances = async () => {
      if (client && address) {
        try {
          const atomBalance = await client.getBalance(address, "uatom");
          setBalances({
            atom: (parseFloat(atomBalance.amount) / 1000000).toFixed(2),
          });
        } catch (err) {
          console.error("Failed to fetch balances:", err);
        }
      }
    };

    fetchBalances();
  }, [client, address]);

  const handleConnect = async (walletType: 'keplr' | 'leap') => {
    try {
      await connect(walletType);
    } catch (err) {
      console.error("Failed to connect wallet:", err);
    }
  };

  const handleDisconnect = () => {
    disconnect();
    setBalances({});
  };

  // Show loading state
  if (isConnecting) {
    return (
      <Button variant="outline" disabled className="gap-2">
        <Wallet className="h-4 w-4 animate-spin" />
        Connecting...
      </Button>
    );
  }

  // Show error state
  if (error) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2 text-red-500">
            <AlertCircle className="h-4 w-4" />
            Error
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <div className="p-3">
            <p className="text-sm text-red-500">{error}</p>
          </div>
          <DropdownMenuSeparator />
          {WALLETS.map((wallet) => (
            <DropdownMenuItem
              key={wallet.name}
              onClick={() => handleConnect(wallet.type)}
              className="cursor-pointer gap-3"
            >
              <span className="text-lg">{wallet.icon}</span>
              <span>Retry {wallet.name}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Show connect options if not connected
  if (!address) {
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
              onClick={() => handleConnect(wallet.type)}
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

  // Connected state - show wallet info
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full" />
          <span className="hidden sm:inline">
            {address?.slice(0, 8)}...
          </span>
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <div className="p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              Connected via {walletType === 'keplr' ? 'Keplr' : 'Leap'}
            </span>
            <Badge variant="outline" className="text-xs">
              {chainId === 'cosmoshub-4' ? 'Cosmos Hub' : 'Osmosis'}
            </Badge>
          </div>
          
          <div className="text-xs text-muted-foreground font-mono">
            {address}
          </div>
          
          <div className="space-y-1 pt-2">
            <div className="flex justify-between text-sm">
              <span>ATOM</span>
              <span className="font-mono">{balances.atom || '0.00'}</span>
            </div>
            {chainId === 'osmosis-1' && (
              <div className="flex justify-between text-sm">
                <span>OSMO</span>
                <span className="font-mono">{balances.osmo || '0.00'}</span>
              </div>
            )}
          </div>
        </div>
        
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleDisconnect} className="text-red-500 cursor-pointer">
          Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};