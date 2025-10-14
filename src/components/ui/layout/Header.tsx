import { Search, ArrowLeftRight, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WalletConnect } from "./WalletConnect";
import SwapWidget from "@/components/SwapPanel";
import AgendaModal from "@/components/AgendaModal";
import { Link } from "react-router-dom";

export const Header = () => {
  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-4 min-w-0">
        {/* Global Search */}
        <div className="flex-1 min-w-0 max-w-full sm:max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search protocols, pools, assets..."
              className="pl-10 bg-surface border-border text-sm sm:text-base"
            />
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-2">
            {/* Agenda */}
            <AgendaModal>
              <Button variant="ghost" size="sm" aria-label="Open Cosmos Agenda">
                <CalendarDays className="h-4 w-4" />
              </Button>
            </AgendaModal>

            {/* Skip.go Swap Button */}
            <SwapWidget>
              <Button 
                className="bg-blue-600 hover:bg-blue-700 text-white border border-blue-500 gap-2 px-2 sm:px-4 py-2 rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
                size="sm"
              >
                <ArrowLeftRight className="h-4 w-4" />
                <span className="hidden sm:inline">Swap</span>
              </Button>
            </SwapWidget>
            
            {/* Wallet Connect */}
            <WalletConnect />
          </div>
        </div>
      </div>
    </header>
  );
}
;
