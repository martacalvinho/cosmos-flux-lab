import { Search, Settings, Bell, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { WalletConnect } from "./WalletConnect";

export const Header = () => {
  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Zap className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-bold text-lg">ATOM DeFi</h1>
            <p className="text-xs text-muted-foreground">Cosmos Aggregator</p>
          </div>
        </div>

        {/* Global Search */}
        <div className="flex-1 max-w-2xl mx-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search protocols, pools, assets..."
              className="pl-10 bg-surface border-border"
            />
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {/* Data Status */}
          <Badge variant="outline" className="text-xs gap-1">
            <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
            Live Data
          </Badge>
          
          {/* Settings */}
          <Button variant="ghost" size="sm">
            <Settings className="h-4 w-4" />
          </Button>
          
          {/* Notifications */}
          <Button variant="ghost" size="sm" className="relative">
            <Bell className="h-4 w-4" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full" />
          </Button>
          
          {/* Wallet Connect */}
          <WalletConnect />
        </div>
      </div>
    </header>
  );
};