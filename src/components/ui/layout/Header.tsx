import { Search, Settings, Bell, Zap, User, Moon, Sun, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { WalletConnect } from "./WalletConnect";

export const Header = () => {
  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Spacer */}
        <div></div>

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
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            
            {/* Settings */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Settings className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-background border-border">
                <DropdownMenuItem>
                  <User className="h-4 w-4 mr-2" />
                  Profile Settings
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Moon className="h-4 w-4 mr-2" />
                  Dark Mode
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Volume2 className="h-4 w-4 mr-2" />
                  Notifications
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Settings className="h-4 w-4 mr-2" />
                  Preferences
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            {/* Notifications */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="relative">
                  <Bell className="h-4 w-4" />
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 bg-background border-border">
                <div className="p-4 border-b">
                  <h3 className="font-semibold">Notifications</h3>
                  <p className="text-sm text-muted-foreground">3 new updates</p>
                </div>
                <DropdownMenuItem className="p-4">
                  <div className="flex flex-col gap-1">
                    <p className="font-medium text-sm">New Stride Liquid Staking Rate</p>
                    <p className="text-xs text-muted-foreground">APR increased to 16.2% • 2 min ago</p>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem className="p-4">
                  <div className="flex flex-col gap-1">
                    <p className="font-medium text-sm">Osmosis Pool Update</p>
                    <p className="text-xs text-muted-foreground">ATOM/OSMO pool incentives renewed • 5 min ago</p>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem className="p-4">
                  <div className="flex flex-col gap-1">
                    <p className="font-medium text-sm">Mars Protocol Risk Alert</p>
                    <p className="text-xs text-muted-foreground">High utilization on ATOM market • 12 min ago</p>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="p-2 text-center">
                  <span className="text-sm">View All Notifications</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            {/* Wallet Connect */}
            <WalletConnect />
          </div>
        </div>
      </div>
    </header>
  );
};