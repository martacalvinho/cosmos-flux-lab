import { Search, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WalletConnect } from "./WalletConnect";
import SwapWidget from "@/components/SwapPanel";

export const Header = () => {
  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
        {/* Global Search */}
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search protocols, pools, assets..."
              className="pl-10 bg-surface border-border"
            />
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            
            {/* Settings and Notifications removed for now */}
            
            {/* Skip.go Swap Button */}
            <SwapWidget>
              <Button 
                className="bg-blue-600 hover:bg-blue-700 text-white border border-blue-500 gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
                size="sm"
              >
                <ArrowLeftRight className="h-4 w-4" />
                Swap
              </Button>
            </SwapWidget>
            
            {/* Wallet Connect */}
            <WalletConnect />
          </div>
        </div>
      </div>
    </header>
  );
};