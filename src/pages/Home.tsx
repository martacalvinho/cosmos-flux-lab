import { useState } from "react";
import { 
  Coins, 
  Layers, 
  Droplets, 
  PiggyBank, 
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Clock,
  Filter,
  SortDesc,
  Grid3X3,
  List,
  ChevronDown
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Navigation } from "@/components/ui/layout/Navigation";
import { ProtocolCard } from "@/components/ui/protocol/ProtocolCard";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  {
    title: "Staking",
    description: "Earn rewards by securing the network",
    icon: Coins,
    path: "/staking",
    color: "text-staking",
    bg: "bg-staking/10",
    border: "border-staking/20",
    stats: { protocols: 12, tvl: "$2.1B", apy: "18.5%" }
  },
  {
    title: "Liquid Staking",
    description: "Stake while keeping liquidity with LSTs",
    icon: Layers,
    path: "/liquid-staking", 
    color: "text-liquid-staking",
    bg: "bg-liquid-staking/10",
    border: "border-liquid-staking/20",
    stats: { protocols: 8, tvl: "$890M", apy: "16.2%" }
  },
  {
    title: "Liquidity",
    description: "Provide liquidity to DEXs and earn fees",
    icon: Droplets,
    path: "/liquidity",
    color: "text-liquidity", 
    bg: "bg-liquidity/10",
    border: "border-liquidity/20",
    stats: { protocols: 15, tvl: "$1.5B", apy: "24.1%" }
  },
  {
    title: "Lending",
    description: "Lend assets or use them as collateral",
    icon: PiggyBank,
    path: "/lending",
    color: "text-lending",
    bg: "bg-lending/10", 
    border: "border-lending/20",
    stats: { protocols: 6, tvl: "$450M", apy: "12.8%" }
  },
  {
    title: "Perps",
    description: "Trade perpetual futures with leverage",
    icon: TrendingUp,
    path: "/perps",
    color: "text-perps",
    bg: "bg-perps/10",
    border: "border-perps/20", 
    stats: { protocols: 4, tvl: "$280M", funding: "-0.02%" }
  }
];

const RECENT_UPDATES = [
  {
    protocol: "Osmosis",
    update: "New ATOM/OSMO superfluid staking pool",
    time: "2 mins ago",
    change: "+2.4%",
    positive: true
  },
  {
    protocol: "Stride",
    update: "stATOM exchange rate updated",
    time: "5 mins ago",
    change: "1.087",
    positive: true
  },
  {
    protocol: "Mars Protocol", 
    update: "ATOM supply APY increased",
    time: "12 mins ago",
    change: "+0.8%",
    positive: true
  },
  {
    protocol: "dYdX",
    update: "ATOM-PERP funding rate changed",
    time: "18 mins ago", 
    change: "-0.05%",
    positive: false
  }
];

// Protocol data for each category
const STAKING_PROTOCOLS = [
  {
    category: "staking" as const,
    protocol: "Cosmos Hub",
    chain: "Cosmos", 
    title: "Stake ATOM",
    assets: ["ATOM"],
    status: "active" as const,
    metrics: {
      "APR": "18.5%",
      "Commission": "5-10%", 
      "Validators": "180 active",
      "Unbonding": "21 days"
    },
    risks: ["Unbonding", "Slashing"],
    howItWorks: [
      "Choose a validator from active set",
      "Delegate your ATOM tokens", 
      "Earn staking rewards daily",
      "Unbond with 21-day waiting period"
    ],
    links: {
      app: "https://wallet.keplr.app",
      docs: "https://hub.cosmos.network/main/delegators/delegator-guide-cli.html"
    },
    dataSource: "Cosmos Hub API",
    lastUpdated: "2 mins ago"
  },
  {
    category: "staking" as const,
    protocol: "Osmosis",
    chain: "Osmosis",
    title: "Stake OSMO",
    assets: ["OSMO"],
    status: "active" as const,
    metrics: {
      "APR": "22.1%",
      "Commission": "1-8%",
      "Validators": "150 active", 
      "Unbonding": "14 days"
    },
    risks: ["Unbonding", "Slashing"],
    howItWorks: [
      "Connect to Osmosis network",
      "Select validator with good performance",
      "Delegate OSMO tokens",
      "Compound rewards regularly"
    ],
    links: {
      app: "https://app.osmosis.zone",
      docs: "https://docs.osmosis.zone/overview/validate"
    },
    dataSource: "Osmosis API",
    lastUpdated: "3 mins ago"
  }
];

const LIQUID_STAKING_PROTOCOLS = [
  {
    category: "liquid-staking" as const,
    protocol: "Stride",
    chain: "Stride",
    title: "Liquid Stake ATOM → stATOM",
    assets: ["ATOM", "stATOM"],
    status: "active" as const,
    metrics: {
      "APR": "16.2%", 
      "Exchange Rate": "1.087 ATOM",
      "Protocol Fee": "10%",
      "TVL": "$450M",
      "Redemption": "Instant swap"
    },
    risks: ["Smart-contract", "Unbonding"],
    howItWorks: [
      "Send ATOM to Stride protocol",
      "Receive liquid stATOM tokens",
      "Use stATOM in DeFi while earning staking rewards",
      "Redeem anytime via DEX or wait for unbonding"
    ],
    links: {
      app: "https://app.stride.zone",
      docs: "https://docs.stride.zone",
      pool: "https://app.osmosis.zone/pool/803"
    },
    dataSource: "Stride API",
    lastUpdated: "1 min ago"
  }
];

const LIQUIDITY_PROTOCOLS = [
  {
    category: "liquidity" as const,
    protocol: "Osmosis",
    chain: "Osmosis",
    title: "ATOM/OSMO Pool",
    assets: ["ATOM", "OSMO"],
    status: "active" as const,
    metrics: {
      "APR": "24.1%",
      "Pool TVL": "$125M",
      "Volume 24h": "$8.2M",
      "Fees": "0.2%"
    },
    risks: ["Impermanent Loss", "Smart-contract"],
    howItWorks: [
      "Provide equal value ATOM and OSMO",
      "Receive LP tokens representing your share",
      "Earn trading fees and liquidity rewards",
      "Remove liquidity anytime"
    ],
    links: {
      app: "https://app.osmosis.zone",
      docs: "https://docs.osmosis.zone"
    },
    dataSource: "Osmosis API",
    lastUpdated: "1 min ago"
  }
];

const LENDING_PROTOCOLS = [
  {
    category: "lending" as const,
    protocol: "Mars Protocol",
    chain: "Osmosis",
    title: "Supply/Borrow ATOM",
    assets: ["ATOM", "OSMO", "stATOM"],
    status: "active" as const,
    metrics: {
      "Supply APY": "8.2%",
      "Borrow APY": "12.5%",
      "Collateral Factor": "75%",
      "Liquidation Threshold": "80%",
      "TVL": "$125M",
      "Oracle": "Pyth Network"
    },
    risks: ["Liquidation", "Smart-contract", "Oracle-Peg"],
    howItWorks: [
      "Supply assets to earn interest",
      "Use supplied assets as collateral",
      "Borrow against your collateral",
      "Monitor health factor to avoid liquidation"
    ],
    links: {
      app: "https://app.marsprotocol.io",
      docs: "https://docs.marsprotocol.io"
    },
    dataSource: "Mars API",
    lastUpdated: "2 mins ago"
  }
];

const PERPS_PROTOCOLS = [
  {
    category: "perps" as const,
    protocol: "dYdX",
    chain: "dYdX",
    title: "ATOM Perpetuals",
    assets: ["ATOM-PERP"],
    status: "active" as const,
    metrics: {
      "Funding Rate": "-0.02%",
      "Open Interest": "$45M",
      "24h Volume": "$125M",
      "Max Leverage": "20x"
    },
    risks: ["Liquidation", "Funding", "Market"],
    howItWorks: [
      "Deposit collateral (USDC)",
      "Open long/short ATOM position",
      "Pay/receive funding every hour",
      "Close position or get liquidated"
    ],
    links: {
      app: "https://trade.dydx.exchange",
      docs: "https://docs.dydx.exchange"
    },
    dataSource: "dYdX API",
    lastUpdated: "30 secs ago"
  }
];

// Featured protocols - new or interesting opportunities
const FEATURED_PROTOCOLS = [
  {
    ...LIQUID_STAKING_PROTOCOLS[0], // Stride
    featured: true,
    featuredReason: "New liquid staking with instant redemption"
  },
  {
    ...PERPS_PROTOCOLS[0], // dYdX
    featured: true,
    featuredReason: "Recently launched ATOM perpetuals"
  }
];

const ALL_PROTOCOLS = [
  ...STAKING_PROTOCOLS,
  ...LIQUID_STAKING_PROTOCOLS,
  ...LIQUIDITY_PROTOCOLS,
  ...LENDING_PROTOCOLS,
  ...PERPS_PROTOCOLS
];

const PROTOCOL_DATA = {
  "all": ALL_PROTOCOLS,
  "staking": STAKING_PROTOCOLS,
  "liquid-staking": LIQUID_STAKING_PROTOCOLS,
  "liquidity": LIQUIDITY_PROTOCOLS,
  "lending": LENDING_PROTOCOLS,
  "perps": PERPS_PROTOCOLS
};

export default function Home() {
  const [dataMode, setDataMode] = useState<"live" | "demo">("live");
  const [activeTab, setActiveTab] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"card" | "list">("card");
  const [sortBy, setSortBy] = useState<"default" | "apr" | "tvl">("default");
  const [filterBy, setFilterBy] = useState<"all" | "active" | "paused">("all");

  const currentProtocols = PROTOCOL_DATA[activeTab as keyof typeof PROTOCOL_DATA] || [];
  
  // Apply search filter
  let filteredProtocols = currentProtocols.filter(protocol =>
    protocol.protocol.toLowerCase().includes(searchTerm.toLowerCase()) ||
    protocol.chain.toLowerCase().includes(searchTerm.toLowerCase()) ||
    protocol.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Apply status filter
  if (filterBy !== "all") {
    filteredProtocols = filteredProtocols.filter(protocol => protocol.status === filterBy);
  }

  // Apply sorting
  if (sortBy === "apr") {
    filteredProtocols.sort((a, b) => {
      // Extract APR/APY values from metrics
      const getAPR = (protocol: any) => {
        const apr = protocol.metrics["APR"] || protocol.metrics["Supply APY"] || "0%";
        return parseFloat(apr.replace('%', ''));
      };
      return getAPR(b) - getAPR(a); // Descending order
    });
  } else if (sortBy === "tvl") {
    filteredProtocols.sort((a, b) => {
      // Extract TVL values from metrics
      const getTVL = (protocol: any) => {
        const tvl = protocol.metrics["TVL"] || protocol.metrics["Pool TVL"] || "$0";
        const numValue = tvl.replace(/[$M]/g, '');
        return parseFloat(numValue) * (tvl.includes('M') ? 1000000 : 1);
      };
      return getTVL(b) - getTVL(a); // Descending order
    });
  }

  const getCategoryInfo = (tab: string) => {
    if (tab === "all") {
      return {
        title: "All Protocols",
        description: "Explore all DeFi opportunities across the Cosmos ecosystem",
        icon: ArrowRight,
        color: "text-primary",
        bg: "bg-primary/10",
        border: "border-primary/20",
        stats: { protocols: ALL_PROTOCOLS.length, tvl: "$3.2B", apy: "18.5%" }
      };
    }
    const category = CATEGORIES.find(cat => cat.title.toLowerCase().replace(" ", "-") === tab);
    return category || CATEGORIES[0];
  };

  const categoryInfo = getCategoryInfo(activeTab);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-surface/30">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <Badge variant="outline" className="mb-2">
              <div className="w-2 h-2 bg-success rounded-full mr-2 animate-pulse" />
              All systems operational • {dataMode} data
            </Badge>
            
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
              ATOM DeFi
              <span className="text-primary block">Ecosystem</span>
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

      <div className="container mx-auto px-4 py-12 space-y-12">
        {/* Featured Protocols - Only show on All tab */}
        {activeTab === "all" && (
          <section className="mb-8">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Featured Opportunities
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {FEATURED_PROTOCOLS.map((protocol, index) => (
                <Card key={`featured-${protocol.protocol}-${index}`} className="p-3 shadow-sm border-primary/20 bg-primary/5 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs">
                      Featured
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {protocol.protocol}
                    </Badge>
                  </div>
                  <h4 className="font-medium text-sm mb-1">{protocol.title}</h4>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {Object.entries(protocol.metrics)[0]?.[1] || "N/A"}
                    </span>
                    <Button size="sm" variant="outline" className="h-6 px-2 text-xs">
                      View
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Tab Content Header */}
        <section>
          <div className="border-b border-border bg-surface/30 -mx-4 px-4 py-8 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-2">
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", categoryInfo.bg)}>
                    <div className={cn("w-4 h-4 rounded-full", categoryInfo.color.replace("text-", "bg-"))} />
                  </div>
                  {categoryInfo.title}
                </h1>
                <p className="text-muted-foreground mt-2">
                  {categoryInfo.description}
                </p>
              </div>
              
              <div className="flex items-center gap-4">
                <Badge variant="outline" className={cn(categoryInfo.bg, categoryInfo.color, categoryInfo.border)}>
                  {filteredProtocols.length} protocols
                </Badge>
                <Badge variant="outline">
                  {categoryInfo.stats.apy || (categoryInfo.stats as any).funding}
                </Badge>
              </div>
            </div>
          </div>

          {/* Filters and Search */}
          <div className="flex items-center gap-4 mb-8">
            <div className="flex-1 max-w-md">
              <Input
                placeholder={`Search ${categoryInfo.title.toLowerCase()} protocols...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-surface border-border"
              />
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" className="gap-2 bg-surface border-border">
                  <Filter className="h-4 w-4" />
                  Filter: {filterBy === "all" ? "All" : filterBy.charAt(0).toUpperCase() + filterBy.slice(1)}
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
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" className="gap-2 bg-surface border-border">
                  <SortDesc className="h-4 w-4" />
                  Sort: {sortBy === "default" ? "Default" : sortBy === "apr" ? "APR" : "TVL"}
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
            
            <Button 
              variant={viewMode === "list" ? "default" : "outline"} 
              className="gap-2"
              onClick={() => setViewMode(viewMode === "card" ? "list" : "card")}
            >
              {viewMode === "card" ? <List className="h-4 w-4" /> : <Grid3X3 className="h-4 w-4" />}
              {viewMode === "card" ? "View as List" : "View as Cards"}
            </Button>
          </div>


          {/* Protocol Display - Cards or List */}
          {viewMode === "card" ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredProtocols.map((protocol, index) => (
                <ProtocolCard
                  key={`${protocol.protocol}-${protocol.chain}-${index}`}
                  {...protocol}
                />
              ))}
            </div>
          ) : (
            <Card className="overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Protocol</TableHead>
                    <TableHead>Chain</TableHead>
                    <TableHead>Assets</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Main Metric</TableHead>
                    <TableHead>TVL/Volume</TableHead>
                    <TableHead>Risks</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProtocols.map((protocol, index) => (
                    <TableRow key={`${protocol.protocol}-${protocol.chain}-${index}`}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant="outline" 
                            className={cn(categoryInfo.bg, categoryInfo.color, categoryInfo.border)}
                          >
                            {protocol.protocol}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{protocol.chain}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {protocol.assets.slice(0, 2).map((asset) => (
                            <span key={asset} className="text-xs bg-muted px-2 py-1 rounded">
                              {asset}
                            </span>
                          ))}
                          {protocol.assets.length > 2 && (
                            <span className="text-xs text-muted-foreground">
                              +{protocol.assets.length - 2}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline"
                          className={cn(
                            protocol.status === "active" ? "text-success bg-success/10" :
                            protocol.status === "paused" ? "text-warning bg-warning/10" :
                            "text-info bg-info/10"
                          )}
                        >
                          {protocol.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {Object.entries(protocol.metrics)[0]?.[1] || "N/A"}
                      </TableCell>
                      <TableCell>
                        {protocol.metrics["TVL"] || protocol.metrics["Volume 24h"] || protocol.metrics["Open Interest"] || "N/A"}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {protocol.risks.slice(0, 2).map((risk) => (
                            <Badge key={risk} variant="outline" className="text-xs bg-warning/10 text-warning border-warning/20">
                              {risk}
                            </Badge>
                          ))}
                          {protocol.risks.length > 2 && (
                            <span className="text-xs text-muted-foreground">
                              +{protocol.risks.length - 2}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {protocol.links.app && (
                            <Button size="sm" variant="outline">
                              Open App
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}

          {filteredProtocols.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No protocols found matching your search.</p>
            </div>
          )}
        </section>

        {/* Recent Updates */}
        <section>
          <h2 className="text-2xl font-bold mb-6">Recent Updates</h2>
          <Card className="divide-y divide-border">
            {RECENT_UPDATES.map((update, index) => (
              <div key={index} className="p-4 flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs">{update.protocol}</Badge>
                    <span className="text-xs text-muted-foreground">{update.time}</span>
                  </div>
                  <p className="text-sm">{update.update}</p>
                </div>
                <div className="flex items-center gap-2">
                  {update.positive ? (
                    <TrendingUp className="h-4 w-4 text-success" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-error" />
                  )}
                  <span className={cn(
                    "text-sm font-medium",
                    update.positive ? "text-success" : "text-error"
                  )}>
                    {update.change}
                  </span>
                </div>
              </div>
            ))}
          </Card>
        </section>
      </div>
    </div>
  );
}