import { useState } from "react";
import { 
  Filter,
  SortDesc,
  Grid3X3,
  List,
  ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Navigation } from "@/components/ui/layout/Navigation";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { CATEGORIES } from "@/pages/tabs/categories";
import { PROTOCOL_DATA } from "@/pages/tabs/data/protocols";
import { useLiquidityPools } from "@/pages/tabs/liquidity/useLiquidityPools";
import OthersTab from "@/pages/tabs/OthersTab";
import StakingTab from "@/pages/tabs/StakingTab";
import DashboardTab from "@/pages/tabs/DashboardTab";
import LiquidStakingTab from "@/pages/tabs/LiquidStakingTab";
import LiquidityTab from "@/pages/tabs/LiquidityTab";
import LendingTab from "@/pages/tabs/LendingTab";
import PerpsTab from "@/pages/tabs/PerpsTab";
import NFTsTab from "@/pages/tabs/NFTsTab";
import { useKavaLend } from "@/hooks/useKavaLend";
import { Link } from "react-router-dom";

// Liquidity handled via useLiquidityPools hook
// CATEGORIES moved to src/pages/tabs/categories

// Protocol lists moved to src/pages/tabs/data/protocols

export const Home = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterBy, setFilterBy] = useState<"all" | "active" | "paused">("all");
  const [sortBy, setSortBy] = useState("default");
  const [viewMode, setViewMode] = useState("card");
  const [showHidden, setShowHidden] = useState(false);
  const { protocols: liquidityProtocols, isLoading: isLoadingPools, sortBy: liquiditySortBy, sortDir: liquiditySortDir, handleSort: handleLiquiditySort } = useLiquidityPools(activeTab);
  const { supplyApyPct: kavaSupplyApyPct } = useKavaLend();

  // Staking moved into StakingTab component


  const currentProtocols = activeTab === "liquidity" 
    ? liquidityProtocols
    : PROTOCOL_DATA[activeTab as keyof typeof PROTOCOL_DATA] || [];
  
  // Apply search filter
  let filteredProtocols = currentProtocols.filter(protocol => {
    const p: any = protocol as any;
    const term = searchTerm.toLowerCase();
    const protocolName = String(p?.protocol || '').toLowerCase();
    const chain = String(p?.chain || '').toLowerCase();
    const title = String(p?.title || '').toLowerCase();
    const description = String(p?.description || '').toLowerCase();
    return (
      protocolName.includes(term) ||
      chain.includes(term) ||
      title.includes(term) ||
      description.includes(term)
    );
  });

  // Apply status filter
  if (filterBy !== "all") {
    filteredProtocols = filteredProtocols.filter(protocol => {
      // Convert status to lower case for comparison
      const protocolStatus = protocol.status?.toLowerCase();
      return filterBy === protocolStatus;
    });
  }

  // Apply sorting
  if (sortBy === "apr") {
    filteredProtocols.sort((a, b) => {
      // Extract APR/APY values from metrics
      const getAPR = (protocol: any) => {
        if (protocol?.protocol === "Kava Lend") {
          return Number.isFinite(kavaSupplyApyPct) ? (kavaSupplyApyPct as number) : 0;
        }
        const apr = protocol?.metrics?.["APR"] || protocol?.metrics?.["Fee APR"] || protocol?.metrics?.["Supply APY"] || "0%";
        const n = parseFloat(String(apr).replace('%', ''));
        return Number.isFinite(n) ? n : 0;
      };
      return getAPR(b) - getAPR(a); // Descending order
    });
  } else if (sortBy === "tvl") {
    filteredProtocols.sort((a, b) => {
      // Extract TVL values from metrics
      const getTVL = (protocol: any) => {
        const tvl = protocol.metrics?.["TVL"] || protocol.metrics?.["Pool TVL"] || "$0";
        const numValue = String(tvl).replace(/[$M]/g, '');
        return parseFloat(numValue) * (tvl.includes('M') ? 1000000 : 1);
      };
      return getTVL(b) - getTVL(a); // Descending order
    });
  }

  const getCategoryInfo = (tab: string) => {
    const category = CATEGORIES.find(cat => cat.title.toLowerCase().replace(" ", "-") === tab);
    return category || CATEGORIES[0];
  };

  const categoryInfo = getCategoryInfo(activeTab);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-surface/30">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
              <span className={cn(
                "",
                activeTab === "dashboard" && "text-primary",
                activeTab === "staking" && "text-staking",
                activeTab === "liquid-staking" && "text-liquid-staking",
                activeTab === "liquidity" && "text-liquidity",
                activeTab === "lending" && "text-lending",
                activeTab === "leverage" && "text-perps",
                activeTab === "nfts" && "text-primary",
                activeTab === "others" && "text-others"
              )}>USE</span>
              <span className="ml-1 text-white">ATOM</span>
            </h1>
            
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Discover and compare the best DeFi opportunities across the Cosmos ecosystem. 
              Track yields, manage risk, and optimize your ATOM holdings.
            </p>
          </div>
        </div>
      </section>

      {/* Navigation Tabs */}
      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-10">
        {/* Dashboard content */}
        {activeTab === "dashboard" && (
          <DashboardTab />
        )}

        {/* Protocol Tabs Content - hide on dashboard/nfts/others */}
        {!['dashboard','nfts','others'].includes(activeTab) && (
          <section>
            <div className="border-b border-border bg-surface/30 py-6 mb-8">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center", categoryInfo.bg)}>
                    <div className={cn("w-3 h-3 rounded-full", categoryInfo.color.replace("text-", "bg-"))} />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">{categoryInfo.title}</h2>
                    <p className="text-sm text-muted-foreground">{categoryInfo.description}</p>
                  </div>
                </div>
                <div className="w-full">
                  {activeTab === 'staking' ? (
                    <>
                      <div className="flex max-w-md w-full items-center gap-2">
                        <Input
                          placeholder="Search validators..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="bg-surface border-border"
                        />
                        {/* <Button asChild variant="secondary" className="shrink-0 bg-surface border-border hover:bg-surface/80">
                          <Link to="/stats">View stats</Link>
                        </Button> */}
                      </div>
                      <div className="flex items-center space-x-2 mt-2 md:mt-0">
                        <Checkbox
                          id="show-hidden"
                          checked={showHidden}
                          onCheckedChange={(v) => setShowHidden(Boolean(v))}
                        />
                        <Label
                          htmlFor="show-hidden"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          Show hidden
                        </Label>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex w-full items-center gap-2">
                        <Input
                          placeholder={`Search ${categoryInfo.title.toLowerCase()} protocols...`}
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="bg-surface border-border w-full"
                        />
                        {/* <Button asChild variant="secondary" className="shrink-0 bg-surface border-border hover:bg-surface/80">
                          <Link to="/stats">View stats</Link>
                        </Button> */}
                      </div>
                      <div className="mt-2 md:mt-0 flex items-center gap-2 overflow-x-auto no-scrollbar whitespace-nowrap -mx-2 px-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="secondary" className="gap-2 bg-surface border-border shrink-0">
                              <Filter className="h-4 w-4" />
                              <span className="hidden sm:inline">Filter: </span>{filterBy === "all" ? "All" : filterBy.charAt(0).toUpperCase() + filterBy.slice(1)}
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="bg-background border-border">
                            <DropdownMenuItem onClick={() => setFilterBy("all")}>
                              All Protocols
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setFilterBy("active")}>
                              Active Only
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setFilterBy("paused")}>
                              Paused Only
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        {activeTab === "liquidity" ? (
                          <div className="flex items-center gap-2 bg-surface border border-border rounded-lg p-1 shrink-0">
                            <Button
                              variant={liquiditySortBy === 'apy' ? 'default' : 'ghost'}
                              size="sm"
                              className="gap-1 text-xs"
                              onClick={() => handleLiquiditySort('apy')}
                            >
                              APY
                              {liquiditySortBy === 'apy' && (
                                <span className="text-xs">
                                  {liquiditySortDir === 'desc' ? '▼' : '▲'}
                                </span>
                              )}
                            </Button>
                            <Button
                              variant={liquiditySortBy === 'pair' ? 'default' : 'ghost'}
                              size="sm"
                              className="gap-1 text-xs"
                              onClick={() => handleLiquiditySort('pair')}
                            >
                              Pair
                              {liquiditySortBy === 'pair' && (
                                <span className="text-xs">
                                  {liquiditySortDir === 'desc' ? '▼' : '▲'}
                                </span>
                              )}
                            </Button>
                            <Button
                              variant={liquiditySortBy === 'tvl' ? 'default' : 'ghost'}
                              size="sm"
                              className="gap-1 text-xs"
                              onClick={() => handleLiquiditySort('tvl')}
                            >
                              TVL
                              {liquiditySortBy === 'tvl' && (
                                <span className="text-xs">
                                  {liquiditySortDir === 'desc' ? '▼' : '▲'}
                                </span>
                              )}
                            </Button>
                            <Button
                              variant={liquiditySortBy === 'volume' ? 'default' : 'ghost'}
                              size="sm"
                              className="gap-1 text-xs"
                              onClick={() => handleLiquiditySort('volume')}
                            >
                              Volume
                              {liquiditySortBy === 'volume' && (
                                <span className="text-xs">
                                  {liquiditySortDir === 'desc' ? '▼' : '▲'}
                                </span>
                              )}
                            </Button>
                          </div>
                        ) : (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="secondary" className="gap-2 bg-surface border-border shrink-0">
                                <SortDesc className="h-4 w-4" />
                                <span className="hidden sm:inline">Sort: </span>{sortBy === "default" ? "Default" : sortBy === "apr" ? "APR" : "TVL"}
                                <ChevronDown className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="bg-background border-border">
                              <DropdownMenuItem onClick={() => setSortBy("default")}>
                                Default Order
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setSortBy("apr")}>
                                Sort by APR/APY
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setSortBy("tvl")}>
                                Sort by TVL
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                        <Button 
                          variant={viewMode === "list" ? "default" : "outline"} 
                          className="gap-2 shrink-0"
                          onClick={() => setViewMode(viewMode === "card" ? "list" : "card")}
                        >
                          {viewMode === "card" ? <List className="h-4 w-4" /> : <Grid3X3 className="h-4 w-4" />}
                          <span className="hidden sm:inline">{viewMode === "card" ? "View as List" : "View as Cards"}</span>
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {activeTab === "staking" ? (
              <StakingTab searchTerm={searchTerm} showHidden={showHidden} />
            ) : activeTab === "liquid-staking" ? (
              <LiquidStakingTab 
                protocols={filteredProtocols} 
                viewMode={viewMode as any} 
                categoryInfo={{ color: categoryInfo.color, bg: categoryInfo.bg, border: categoryInfo.border }}
              />
            ) : activeTab === "lending" ? (
              <LendingTab
                protocols={filteredProtocols}
                viewMode={viewMode as any}
                categoryInfo={{ color: categoryInfo.color, bg: categoryInfo.bg, border: categoryInfo.border }}
              />
            ) : activeTab === "leverage" ? (
              <PerpsTab
                protocols={filteredProtocols}
                viewMode={viewMode as any}
                categoryInfo={{ color: categoryInfo.color, bg: categoryInfo.bg, border: categoryInfo.border }}
              />
            ) : activeTab === "liquidity" ? (
              <LiquidityTab
                protocols={filteredProtocols}
                viewMode={viewMode as any}
                categoryInfo={{ color: categoryInfo.color, bg: categoryInfo.bg, border: categoryInfo.border }}
                isLoading={isLoadingPools}
              />
            ) : null}

            {activeTab !== 'staking' && filteredProtocols.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No protocols found matching your search.</p>
              </div>
            )}
          </section>
        )}

        {/* NFTs Tab */}
        {activeTab === 'nfts' && (
          <NFTsTab />
        )}

        {/* Others Tab */}
        {activeTab === 'others' && <OthersTab />}

        {/* Recent updates moved into DashboardTab */}
      </div>
    </div>
  );
}

export default Home;
