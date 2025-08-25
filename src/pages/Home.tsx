import { useState, useEffect } from "react";
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
import { AstroportService } from "@/services/astroportService";
import { OsmosisService } from "@/services/osmosisService";
import { AstrovaultService } from "@/services/astrovaultService";

interface LiquidityPool {
  id: string;
  type: 'liquidity';
  platform: string;
  apy: string;
  tvl: string;
  description: string;
  url: string;
  pair: string;
  chain: string;
}

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

export const Home = () => {
  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterBy, setFilterBy] = useState<"all" | "active" | "paused">("all");
  const [sortBy, setSortBy] = useState("default");
  const [viewMode, setViewMode] = useState("card");
  const [liquidityPools, setLiquidityPools] = useState<LiquidityPool[]>([]);
  const [isLoadingPools, setIsLoadingPools] = useState(false);
  
  // Liquidity sorting state
  const [liquiditySortBy, setLiquiditySortBy] = useState<'apy' | 'pair' | 'tvl'>('apy');
  const [liquiditySortDir, setLiquiditySortDir] = useState<'asc' | 'desc'>('desc');

  // Convert liquidity pools to protocol format for display - simplified atom test pattern
  const convertPoolsToProtocols = (pools: LiquidityPool[]) => {
    return pools.map((pool) => {
      const isOsmosis = pool.platform === 'Osmosis';
      const isAstroport = pool.platform === 'Astroport';
      const isAstrovault = pool.platform === 'Astrovault';
      
      const poolId = isOsmosis ? pool.id.replace('osmosis-', '') : undefined;
      const links = {
        app: isOsmosis 
          ? 'https://app.osmosis.zone' 
          : isAstroport 
          ? 'https://app.astroport.fi'
          : isAstrovault
          ? 'https://astrovault.io'
          : pool.url,
        docs: isOsmosis 
          ? 'https://docs.osmosis.zone' 
          : isAstroport 
          ? 'https://docs.astroport.fi'
          : isAstrovault
          ? 'https://docs.astrovault.io'
          : undefined,
        pool: isOsmosis && poolId ? `https://app.osmosis.zone/pool/${poolId}` : pool.url,
      } as const;
      
      const dataSource = isOsmosis 
        ? 'Osmosis SQS + LCD API'
        : isAstroport 
        ? 'Astroport API'
        : isAstrovault
        ? 'Astrovault API'
        : 'Live API Data';

      // Parse assets from pair string
      const assets = pool.pair ? pool.pair.split('/').filter(Boolean) : ['ATOM'];

      return {
        category: "liquidity" as const,
        protocol: pool.platform,
        chain: pool.chain || "unknown",
        title: pool.description,
        assets,
        status: "active" as const,
        metrics: {
          "APY": pool.apy,
          "TVL": pool.tvl,
          "Pair": pool.pair || 'ATOM',
          "Chain": pool.chain || 'Unknown',
        },
        risks: ["Impermanent Loss Risk", "Smart Contract Risk"],
        howItWorks: [
          `Provide liquidity to the ${pool.pair || 'ATOM'} pool on ${pool.platform}`,
          `Earn trading fees from swaps and liquidity provision`,
          `${pool.platform} pools offer ${pool.apy || 'variable'} APY`,
          `Withdraw liquidity at any time (subject to pool conditions)`,
        ],
        links,
        dataSource,
        lastUpdated: "Just now",
      };
    });
  };

  // Effect to fetch liquidity pools when liquidity tab is active - simplified atom test pattern
  useEffect(() => {
    if (activeTab === "liquidity") {
      setIsLoadingPools(true);
      const fetchLiquidityData = async () => {
        try {
          const [astroPools, osmoPools, avPools] = await Promise.all([
            AstroportService.fetchPools(),
            OsmosisService.fetchAtomPools(),
            AstrovaultService.fetchAtomPools(),
          ]);
          
          // Convert all to LiquidityPool format since services return different types
          const avFormatted: LiquidityPool[] = await Promise.all(
            avPools.map(async pool => {
              // Use service helpers for correct symbol and chain mapping
              const poolData = pool as any;
              const symbols = await AstrovaultService.symbolsForPool(pool as any);
              const pair = symbols.length >= 2 ? symbols.join('/') : symbols[0] ? `${symbols[0]}/ATOM` : 'ATOM';

              const aprRaw = (pool as any).percentageAPRs?.[0];
              let apy = '—';
              if (aprRaw != null && !isNaN(aprRaw)) {
                let v = Number(aprRaw);
                if (v > 0 && v < 1) v = v * 100; // scale fraction to percentage
                const s = v.toFixed(2);
                apy = `${s}%`;
              }

              // Extract TVL from pool data
              const tvlRaw = poolData.totalValueLockedUSD || poolData.tvl || poolData.totalLiquidity;
              let tvlFormatted = '—';
              if (tvlRaw && typeof tvlRaw === 'number' && tvlRaw > 0) {
                if (tvlRaw >= 1000000) {
                  tvlFormatted = `$${(tvlRaw / 1000000).toFixed(1)}M`;
                } else if (tvlRaw >= 1000) {
                  tvlFormatted = `$${Math.round(tvlRaw / 1000)}K`;
                } else {
                  tvlFormatted = `$${Math.round(tvlRaw)}`;
                }
              }

              return {
                id: `astrovault-${poolData.id || poolData.poolId || Math.random()}`,
                type: 'liquidity' as const,
                platform: 'Astrovault',
                apy,
                tvl: tvlFormatted,
                description: `${pair} AMM Pool on Astrovault`,
                url: poolData.detailsUrl || 'https://astrovault.io',
                pair,
                chain: AstrovaultService.chainNameFromId(poolData.contextChainId),
              };
            })
          );

          const normalizedPools: LiquidityPool[] = [
            ...astroPools.map(pool => ({
              id: pool.id,
              type: 'liquidity' as const,
              platform: pool.platform,
              apy: pool.apy,
              tvl: pool.tvl,
              description: pool.description,
              url: pool.url,
              pair: pool.pair,
              chain: pool.chain,
            })),
            ...osmoPools.map(pool => ({
              id: pool.id,
              type: 'liquidity' as const,
              platform: pool.platform,
              apy: pool.apy,
              tvl: pool.tvl,
              description: pool.description,
              url: pool.url,
              pair: pool.pair,
              chain: pool.chain,
            })),
            ...avFormatted,
          ];
          
          setLiquidityPools(normalizedPools);
        } catch (error) {
          console.error('Failed to fetch liquidity pools:', error);
        } finally {
          setIsLoadingPools(false);
        }
      };
      fetchLiquidityData();
    }
  }, [activeTab]);

  // Helper function to parse TVL strings to numbers for sorting
  const parseTvlToNumber = (tvl: string): number => {
    if (!tvl || tvl === '—') return 0;
    const cleanTvl = tvl.replace(/[$,]/g, '');
    const multiplier = cleanTvl.includes('M') ? 1_000_000 : cleanTvl.includes('K') ? 1_000 : 1;
    const number = parseFloat(cleanTvl.replace(/[MK]/g, ''));
    return isNaN(number) ? 0 : number * multiplier;
  };

  // Sort liquidity pools before converting to protocols
  const sortedLiquidityPools = [...liquidityPools].sort((a, b) => {
    let comparison = 0;
    
    switch (liquiditySortBy) {
      case 'apy':
        const apyA = parseFloat(a.apy.replace('%', '').replace('—', '0'));
        const apyB = parseFloat(b.apy.replace('%', '').replace('—', '0'));
        comparison = apyA - apyB;
        break;
      case 'pair':
        comparison = (a.pair || '').localeCompare(b.pair || '');
        break;
      case 'tvl':
        const tvlA = parseTvlToNumber(a.tvl);
        const tvlB = parseTvlToNumber(b.tvl);
        comparison = tvlA - tvlB;
        break;
    }
    
    return liquiditySortDir === 'desc' ? -comparison : comparison;
  });
  
  const liquidityProtocols = convertPoolsToProtocols(sortedLiquidityPools);
  
  // Handle liquidity sorting toggle
  const handleLiquiditySort = (sortKey: 'apy' | 'pair' | 'tvl') => {
    if (liquiditySortBy === sortKey) {
      setLiquiditySortDir(liquiditySortDir === 'desc' ? 'asc' : 'desc');
    } else {
      setLiquiditySortBy(sortKey);
      setLiquiditySortDir('desc');
    }
  };

  const currentProtocols = activeTab === "liquidity" 
    ? liquidityProtocols
    : PROTOCOL_DATA[activeTab as keyof typeof PROTOCOL_DATA] || [];
  
  // Apply search filter
  let filteredProtocols = currentProtocols.filter(protocol =>
    protocol.protocol.toLowerCase().includes(searchTerm.toLowerCase()) ||
    protocol.chain.toLowerCase().includes(searchTerm.toLowerCase()) ||
    protocol.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        const apr = protocol.metrics["APR"] || protocol.metrics["Fee APR"] || protocol.metrics["Supply APY"] || "0%";
        return parseFloat(String(apr).replace('%', ''));
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
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
              <span className="text-white">USE</span>
              <span className={cn(
                "ml-1",
                activeTab === "all" && "text-primary",
                activeTab === "staking" && "text-staking",
                activeTab === "liquid-staking" && "text-liquid-staking",
                activeTab === "liquidity" && "text-liquidity",
                activeTab === "lending" && "text-lending",
                activeTab === "perps" && "text-perps"
              )}>ATOM</span>
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

      <div className="max-w-6xl mx-auto px-4 py-12 space-y-12">
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
                    <Badge variant="outline" className="text-xs text-purple-400 bg-purple-500/10 border-purple-500/30">
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
          <div className="border-b border-border bg-surface/30 -mx-4 px-4 py-6 mb-8">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center", categoryInfo.bg)}>
                  <div className={cn("w-3 h-3 rounded-full", categoryInfo.color.replace("text-", "bg-"))} />
                </div>
                {categoryInfo.title}
              </h1>
              <p className="text-muted-foreground mt-1 text-sm">
                {categoryInfo.description}
              </p>
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
            
            {activeTab === "liquidity" ? (
              // Liquidity-specific sorting buttons with arrows
              <div className="flex items-center gap-2 bg-surface border border-border rounded-lg p-1">
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
              </div>
            ) : (
              // Regular sorting dropdown for other tabs
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
            )}
            
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
          {activeTab === "liquidity" && isLoadingPools && (
            <div className="mb-4 text-sm text-muted-foreground">Loading live pools...</div>
          )}
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
                    <TableHead>Assets</TableHead>
                    <TableHead>APY</TableHead>
                    <TableHead>Protocol</TableHead>
                    <TableHead>Chain</TableHead>
                    <TableHead>TVL/Volume</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProtocols.map((protocol, index) => {
                    return (
                    <TableRow key={`${protocol.protocol}-${protocol.chain}-${index}`}>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {protocol.assets.map((asset) => (
                            <Badge key={asset} variant="outline" className="text-xs font-semibold text-purple-400 bg-purple-500/10 border-purple-500/30">
                              {asset}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {(protocol.metrics as any).APY || Object.entries(protocol.metrics)[0]?.[1] || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-purple-400 bg-purple-500/10 border-purple-500/30">
                          {protocol.protocol}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{protocol.chain}</Badge>
                      </TableCell>
                      <TableCell>
                        {(protocol.metrics as any).TVL || Object.entries(protocol.metrics).find(([key]) => 
                          key.toLowerCase().includes('tvl') || key.toLowerCase().includes('volume')
                        )?.[1] || "—"}
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" asChild>
                          <a href={protocol.links.app || "#"} target="_blank" rel="noopener noreferrer">
                            Open App
                          </a>
                        </Button>
                      </TableCell>
                    </TableRow>
                  )})}
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

export default Home;