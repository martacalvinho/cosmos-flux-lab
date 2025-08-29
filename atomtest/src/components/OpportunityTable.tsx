import { ExternalLink, TrendingUp, Droplets, DollarSign, Activity, Menu, X } from "lucide-react";
import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AstroportService } from "@/services/astroport";
import { OsmosisService } from "@/services/osmosis";
import { AstrovaultService } from "@/services/astrovault";
import CosmosStaking from "@/components/staking/CosmosStaking";
import NFTCollections from "@/components/nfts/NFTCollections";

interface Opportunity {
  id: string;
  type: 'staking' | 'liquidity' | 'lending' | 'leverage';
  platform: string;
  apy: string;
  tvl: string;
  description: string;
  url: string;
  // Optional fields used by liquidity pools
  pair?: string;
  chain?: string;
}

// Static opportunities for staking, lending, and leverage
const staticOpportunities: Opportunity[] = [
  // Staking
  {
    id: '1',
    type: 'staking',
    platform: 'Cosmos Hub',
    apy: '19.2%',
    tvl: '$2.1B',
    description: 'Native ATOM staking on Cosmos Hub',
    url: 'https://wallet.keplr.app/chains/cosmos-hub',
  },
  {
    id: '2',
    type: 'staking',
    platform: 'Stride',
    apy: '18.8%',
    tvl: '$45M',
    description: 'Liquid staking with stATOM',
    url: 'https://stride.zone/',
  },
  {
    id: '3',
    type: 'staking',
    platform: 'pStake',
    apy: '17.5%',
    tvl: '$12M',
    description: 'Liquid staking derivatives',
    url: 'https://pstake.finance/',
  },

  // Lending
  {
    id: '7',
    type: 'lending',
    platform: 'Kava Lend',
    apy: '12.3%',
    tvl: '$25M',
    description: 'Supply ATOM to earn yield',
    url: 'https://app.kava.io/lend',
  },
  {
    id: '8',
    type: 'lending',
    platform: 'Mars Protocol',
    apy: '14.8%',
    tvl: '$18M',
    description: 'Lending and borrowing hub',
    url: 'https://app.marsprotocol.io/',
  },
  {
    id: '9',
    type: 'lending',
    platform: 'UX Chain',
    apy: '11.2%',
    tvl: '$5M',
    description: 'Cross-chain lending protocol',
    url: 'https://app.ux.xyz/assets/ibc%2FC4CFF46FD6DE35CA4CF4CE031E643C8FDC9BA4B99AE598E9B0ED98FE3A2319F9',
  },
  {
    id: '10',
    type: 'lending',
    platform: 'Inter Protocol',
    apy: '—',
    tvl: '—',
    description: 'Add collateral to mint IST',
    url: 'https://app.inter.trade/#/vaults',
  },
  {
    id: '11',
    type: 'lending',
    platform: 'Shade Lend',
    apy: '—',
    tvl: '—',
    description: 'Privacy-focused lending protocol on Secret Network',
    url: 'https://app.shadeprotocol.io/lend',
  },
  {
    id: '12',
    type: 'lending',
    platform: 'Neptune Finance',
    apy: '—',
    tvl: '—',
    description: 'Multi-chain lending and borrowing platform',
    url: 'https://nept.finance/rates/',
  },

  // Leverage
  {
    id: 'dydx',
    type: 'leverage',
    platform: 'dYdX',
    apy: '—',
    tvl: '—',
    description: 'Trade ATOM-USD perpetuals with up to 10x leverage.',
    url: 'https://dydx.trade/trade/ATOM-USD',
  },
  {
    id: 'levana',
    type: 'leverage',
    platform: 'Levana',
    apy: '—',
    tvl: '—',
    description: 'Perpetuals for ATOM on Osmosis with up to 10x leverage.',
    url: 'https://trade.levana.finance/osmosis/trade/ATOM_USD',
  },
  {
    id: 'nolus',
    type: 'leverage',
    platform: 'Nolus',
    apy: '—',
    tvl: '—',
    description: 'DeFi Lease to open leveraged positions with partial down payment.',
    url: 'https://app.nolus.io/',
  },
  {
    id: 'bullbear',
    type: 'leverage',
    platform: 'Bull v Bear',
    apy: '—',
    tvl: '—',
    description: 'Tokenized long/short exposure to ATOM using Bull/Bear tokens.',
    url: 'https://bullbear.zone/?long=ATOM',
  },
  {
    id: 'mars-perps',
    type: 'leverage',
    platform: 'Mars Protocol',
    apy: '—',
    tvl: '—',
    description: 'Perpetual futures trading for ATOM with advanced risk management.',
    url: 'https://app.marsprotocol.io/perps',
  },
  {
    id: 'helix',
    type: 'leverage',
    platform: 'Helix',
    apy: '—',
    tvl: '—',
    description: 'ATOM-USDT perpetual futures with up to 10x leverage.',
    url: 'https://helixapp.com/futures/atom-usdt-perp',
  },
];

const getIcon = (type: string) => {
  switch (type) {
    case 'staking':
      return <TrendingUp className="w-4 h-4" />;
    case 'liquidity':
      return <Droplets className="w-4 h-4" />;
    case 'lending':
      return <DollarSign className="w-4 h-4" />;
    case 'leverage':
      return <Activity className="w-4 h-4" />;
    default:
      return null;
  }
};

const getTypeColor = (type: string) => {
  switch (type) {
    case 'staking':
      return 'bg-primary/20 text-primary border-primary/30';
    case 'liquidity':
      return 'bg-accent/20 text-accent border-accent/30';
    case 'lending':
      return 'bg-secondary/20 text-secondary-foreground border-secondary/30';
    case 'leverage':
      return 'bg-destructive/20 text-destructive border-destructive/30';
    default:
      return 'bg-muted/20 text-muted-foreground border-muted/30';
  }
};

const OpportunityTable = () => {
  const [liquidityPools, setLiquidityPools] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Sorting state for Liquidity table
  type SortKey = 'pair' | 'type' | 'apy' | 'tvl' | 'chain' | 'platform';
  const [sortKey, setSortKey] = useState<SortKey>('apy');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    const fetchLiquidityData = async () => {
      try {
        const [astroPools, osmoPools, avPools] = await Promise.all([
          AstroportService.fetchPools(),
          OsmosisService.fetchAtomPools(),
          AstrovaultService.fetchPools(),
        ]);
        setLiquidityPools([
          ...astroPools,
          ...(osmoPools as unknown as Opportunity[]),
          ...(avPools as unknown as Opportunity[]),
        ]);
      } catch (error) {
        console.error('Failed to fetch liquidity pools:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLiquidityData();
  }, []);

  // Filter opportunities by type
  const stakingOpportunities = staticOpportunities.filter(op => op.type === 'staking');
  const lendingOpportunities = staticOpportunities.filter(op => op.type === 'lending');
  const leverageOpportunities = staticOpportunities.filter(op => op.type === 'leverage');
  const allOpportunities = [...staticOpportunities, ...liquidityPools];

  const renderOpportunityTable = (opportunities: Opportunity[], isLoading = false) => (
    <Card className="backdrop-blur-sm bg-card/80 border-border/30 shadow-table">
      <Table>
        <TableHeader>
          <TableRow className="border-border/30">
            <TableHead className="text-foreground font-semibold">Platform</TableHead>
            <TableHead className="text-foreground font-semibold">APY</TableHead>
            <TableHead className="text-foreground font-semibold">TVL</TableHead>
            <TableHead className="text-foreground font-semibold">Description</TableHead>
            <TableHead className="text-foreground font-semibold w-24">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                Loading...
              </TableCell>
            </TableRow>
          ) : opportunities.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                No opportunities available
              </TableCell>
            </TableRow>
          ) : (
            opportunities.map((opportunity) => (
            <TableRow 
              key={opportunity.id} 
              className="border-border/20 hover:bg-muted/5 transition-colors"
            >
              <TableCell className="font-medium text-foreground">
                {opportunity.platform}
              </TableCell>
              <TableCell className="text-primary font-semibold">
                {opportunity.apy}
              </TableCell>
              <TableCell className="text-accent font-medium">
                {opportunity.tvl}
              </TableCell>
              <TableCell className="text-muted-foreground max-w-xs">
                {opportunity.description}
              </TableCell>
              <TableCell>
                <a
                  href={opportunity.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 hover:bg-primary/20 text-primary transition-colors group"
                >
                  <ExternalLink className="w-4 h-4 group-hover:scale-110 transition-transform" />
                </a>
              </TableCell>
            </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </Card>
  );

  // Leverage table (no APY or TVL columns)
  const renderLeverageTable = (opportunities: Opportunity[], isLoading = false) => (
    <Card className="backdrop-blur-sm bg-card/80 border-border/30 shadow-table">
      <Table>
        <TableHeader>
          <TableRow className="border-border/30">
            <TableHead className="text-foreground font-semibold">Platform</TableHead>
            <TableHead className="text-foreground font-semibold">Description</TableHead>
            <TableHead className="text-foreground font-semibold w-24">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                Loading...
              </TableCell>
            </TableRow>
          ) : opportunities.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                No opportunities available
              </TableCell>
            </TableRow>
          ) : (
            opportunities.map((opportunity) => (
            <TableRow 
              key={opportunity.id} 
              className="border-border/20 hover:bg-muted/5 transition-colors"
            >
              <TableCell className="font-medium text-foreground">
                {opportunity.platform}
              </TableCell>
              <TableCell className="text-muted-foreground max-w-xs">
                {opportunity.description}
              </TableCell>
              <TableCell>
                <a
                  href={opportunity.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 hover:bg-primary/20 text-primary transition-colors group"
                >
                  <ExternalLink className="w-4 h-4 group-hover:scale-110 transition-transform" />
                </a>
              </TableCell>
            </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </Card>
  );

  // Dedicated liquidity table with requested columns
  const renderLiquidityTable = (opportunities: Opportunity[], isLoading = false) => {
    const toggleSort = (key: SortKey) => {
      if (sortKey === key) {
        setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
      } else {
        setSortKey(key);
        setSortDir('desc');
      }
    };

    const indicator = (key: SortKey) => (
      <span className="ml-1 text-xs text-muted-foreground">{sortKey === key ? (sortDir === 'asc' ? '▲' : '▼') : ''}</span>
    );

    const parseApy = (apy?: string) => {
      if (!apy) return 0;
      const n = parseFloat(apy.replace('%', ''));
      return isNaN(n) ? 0 : n;
    };

    const parseTvl = (tvl?: string) => {
      if (!tvl) return 0;
      const hasM = tvl.includes('M');
      const hasK = tvl.includes('K');
      const num = parseFloat(tvl.replace(/[$MK,]/g, ''));
      if (isNaN(num)) return 0;
      return hasM ? num * 1_000_000 : hasK ? num * 1_000 : num;
    };

    const collator = new Intl.Collator(undefined, { sensitivity: 'base' });

    const sorted = [...opportunities].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'pair':
          cmp = collator.compare(a.pair || '', b.pair || '');
          break;
        case 'type':
          cmp = collator.compare(a.type, b.type);
          break;
        case 'apy':
          cmp = parseApy(a.apy) - parseApy(b.apy);
          break;
        case 'tvl':
          cmp = parseTvl(a.tvl) - parseTvl(b.tvl);
          break;
        case 'chain':
          cmp = collator.compare(a.chain || '', b.chain || '');
          break;
        case 'platform':
          cmp = collator.compare(a.platform, b.platform);
          break;
        default:
          cmp = 0;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    const rows = isLoading ? opportunities : sorted;

    return (
    <Card className="backdrop-blur-sm bg-card/80 border-border/30 shadow-table">
      {/* Desktop Table */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow className="border-border/30">
              <TableHead className="text-foreground font-semibold cursor-pointer select-none" onClick={() => toggleSort('pair')}>Pair{indicator('pair')}</TableHead>
              <TableHead className="text-foreground font-semibold cursor-pointer select-none" onClick={() => toggleSort('type')}>Type{indicator('type')}</TableHead>
              <TableHead className="text-foreground font-semibold cursor-pointer select-none" onClick={() => toggleSort('apy')}>APY{indicator('apy')}</TableHead>
              <TableHead className="text-foreground font-semibold cursor-pointer select-none" onClick={() => toggleSort('tvl')}>TVL{indicator('tvl')}</TableHead>
              <TableHead className="text-foreground font-semibold cursor-pointer select-none" onClick={() => toggleSort('chain')}>Chain{indicator('chain')}</TableHead>
              <TableHead className="text-foreground font-semibold cursor-pointer select-none" onClick={() => toggleSort('platform')}>Platform{indicator('platform')}</TableHead>
              <TableHead className="text-foreground font-semibold w-24">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : opportunities.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No liquidity pools available
                </TableCell>
              </TableRow>
            ) : (
              rows.map((opportunity) => (
              <TableRow
                key={opportunity.id}
                className="border-border/20 hover:bg-muted/5 transition-colors"
              >
                <TableCell className="font-medium text-foreground">
                  {opportunity.pair || opportunity.description?.split(' ')[0] || '—'}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={getTypeColor('liquidity')}>Liquidity Pool</Badge>
                </TableCell>
                <TableCell className="text-primary font-semibold">
                  {opportunity.apy}
                </TableCell>
                <TableCell className="text-accent font-medium">
                  {opportunity.tvl}
                </TableCell>
                <TableCell className="text-foreground">
                  {opportunity.chain || '—'}
                </TableCell>
                <TableCell className="text-foreground">
                  {opportunity.platform}
                </TableCell>
                <TableCell>
                  <a
                    href={opportunity.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 hover:bg-primary/20 text-primary transition-colors group"
                  >
                    <ExternalLink className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  </a>
                </TableCell>
              </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-4 p-4">
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading...
          </div>
        ) : opportunities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No liquidity pools available
          </div>
        ) : (
          rows.map((opportunity) => (
            <div
              key={opportunity.id}
              className="bg-muted/5 border border-border/20 rounded-lg p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="font-medium text-foreground">
                  {opportunity.pair || opportunity.description?.split(' ')[0] || '—'}
                </div>
                <a
                  href={opportunity.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 hover:bg-primary/20 text-primary transition-colors group"
                >
                  <ExternalLink className="w-4 h-4 group-hover:scale-110 transition-transform" />
                </a>
              </div>
              
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-muted-foreground">Type</div>
                  <Badge variant="outline" className={getTypeColor('liquidity')}>
                    Liquidity Pool
                  </Badge>
                </div>
                <div>
                  <div className="text-muted-foreground">APY</div>
                  <div className="text-primary font-semibold">{opportunity.apy}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">TVL</div>
                  <div className="text-accent font-medium">{opportunity.tvl}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Chain</div>
                  <div className="text-foreground">{opportunity.chain || '—'}</div>
                </div>
              </div>
              
              <div>
                <div className="text-muted-foreground text-sm">Platform</div>
                <div className="text-foreground font-medium">{opportunity.platform}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
    );
  };

  return (
    <div className="space-y-12">
      {/* Section Headers */}
      <div className="text-center space-y-8 py-16">
        {/* Hero Title */}
        <h1 className="font-title font-bold tracking-tight text-6xl md:text-7xl mb-8">
          <span className="text-accent">USE</span>
          <span className="text-primary">ATØM</span>
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto text-lg leading-relaxed">
          Discover the best ways to put your ATOM to work across staking, liquidity provision, lending, and leveraged trading
        </p>
      </div>

      {/* Tabbed Interface */}
      <Tabs defaultValue="dashboard" className="w-full">
        {/* Desktop Tab List */}
        <TabsList className="hidden md:grid w-full grid-cols-8 mb-8">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="staking" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Staking
          </TabsTrigger>
          <TabsTrigger value="liquid-staking" className="flex items-center gap-2">
            <Droplets className="w-4 h-4" />
            Liquid Staking
          </TabsTrigger>
          <TabsTrigger value="liquidity" className="flex items-center gap-2">
            <Droplets className="w-4 h-4" />
            Liquidity
          </TabsTrigger>
          <TabsTrigger value="lending" className="flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Lending
          </TabsTrigger>
          <TabsTrigger value="leverage" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Leverage
          </TabsTrigger>
          <TabsTrigger value="nfts" className="flex items-center gap-2">
            NFTs
          </TabsTrigger>
          <TabsTrigger value="others" className="flex items-center gap-2">
            Others
          </TabsTrigger>
        </TabsList>

        {/* Mobile Menu Button */}
        <div className="md:hidden mb-8 relative">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="flex items-center justify-center w-full p-3 bg-card/80 border border-border/30 rounded-lg backdrop-blur-sm hover:bg-card/90 transition-colors"
          >
            {isMobileMenuOpen ? (
              <X className="w-5 h-5 mr-2" />
            ) : (
              <Menu className="w-5 h-5 mr-2" />
            )}
            <span className="font-medium">{isMobileMenuOpen ? 'Close' : 'Menu'}</span>
          </button>
          
          {/* Mobile Menu Dropdown */}
          {isMobileMenuOpen && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-card/95 border border-border/30 rounded-lg backdrop-blur-md shadow-lg z-50">
              <TabsList className="flex flex-col w-full p-2 bg-transparent h-auto">
                <TabsTrigger 
                  value="dashboard" 
                  className="w-full justify-start gap-2 p-3 rounded-md hover:bg-muted/20 transition-colors mb-1"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Dashboard
                </TabsTrigger>
                <TabsTrigger 
                  value="staking" 
                  className="w-full justify-start gap-2 p-3 rounded-md hover:bg-muted/20 transition-colors mb-1"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <TrendingUp className="w-4 h-4" />
                  Staking
                </TabsTrigger>
                <TabsTrigger 
                  value="liquid-staking" 
                  className="w-full justify-start gap-2 p-3 rounded-md hover:bg-muted/20 transition-colors mb-1"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Droplets className="w-4 h-4" />
                  Liquid Staking
                </TabsTrigger>
                <TabsTrigger 
                  value="liquidity" 
                  className="w-full justify-start gap-2 p-3 rounded-md hover:bg-muted/20 transition-colors mb-1"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Droplets className="w-4 h-4" />
                  Liquidity
                </TabsTrigger>
                <TabsTrigger 
                  value="lending" 
                  className="w-full justify-start gap-2 p-3 rounded-md hover:bg-muted/20 transition-colors mb-1"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <DollarSign className="w-4 h-4" />
                  Lending
                </TabsTrigger>
                <TabsTrigger 
                  value="leverage" 
                  className="w-full justify-start gap-2 p-3 rounded-md hover:bg-muted/20 transition-colors mb-1"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Activity className="w-4 h-4" />
                  Leverage
                </TabsTrigger>
                <TabsTrigger 
                  value="nfts" 
                  className="w-full justify-start gap-2 p-3 rounded-md hover:bg-muted/20 transition-colors mb-1"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  NFTs
                </TabsTrigger>
                <TabsTrigger 
                  value="others" 
                  className="w-full justify-start gap-2 p-3 rounded-md hover:bg-muted/20 transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Others
                </TabsTrigger>
              </TabsList>
            </div>
          )}
        </div>

        <TabsContent value="dashboard">
          <Card className="backdrop-blur-sm bg-card/80 border-border/30 shadow-table">
            <div className="flex flex-col items-center justify-center py-24 px-8">
              <div className="text-center space-y-4">
                <h2 className="font-title font-bold text-3xl text-foreground">Dashboard</h2>
                <p className="text-muted-foreground text-lg">Coming Soon</p>
                <p className="text-muted-foreground max-w-md">
                  We're building a comprehensive dashboard to track all your ATOM positions and opportunities in one place.
                </p>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="staking">
          <CosmosStaking />
        </TabsContent>

        <TabsContent value="liquid-staking">
          <Card className="backdrop-blur-sm bg-card/80 border-border/30 shadow-table">
            <Table>
              <TableHeader>
                <TableRow className="border-border/30">
                  <TableHead className="text-foreground font-semibold">Platform</TableHead>
                  <TableHead className="text-foreground font-semibold">Description</TableHead>
                  <TableHead className="text-foreground font-semibold w-24">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="border-border/20 hover:bg-muted/5 transition-colors">
                  <TableCell className="font-medium text-foreground">Stride</TableCell>
                  <TableCell className="text-muted-foreground max-w-xs">
                    Liquid staking protocol that allows you to stake ATOM while maintaining liquidity through stATOM tokens.
                  </TableCell>
                  <TableCell>
                    <a
                      href="https://stride.zone/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 hover:bg-primary/20 text-primary transition-colors group"
                    >
                      <ExternalLink className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    </a>
                  </TableCell>
                </TableRow>
                <TableRow className="border-border/20 hover:bg-muted/5 transition-colors">
                  <TableCell className="font-medium text-foreground">Drop.money</TableCell>
                  <TableCell className="text-muted-foreground max-w-xs">
                    Liquid staking solution providing dropATOM tokens while earning staking rewards on your ATOM.
                  </TableCell>
                  <TableCell>
                    <a
                      href="https://drop.money/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 hover:bg-primary/20 text-primary transition-colors group"
                    >
                      <ExternalLink className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    </a>
                  </TableCell>
                </TableRow>
                <TableRow className="border-border/20 hover:bg-muted/5 transition-colors">
                  <TableCell className="font-medium text-foreground">pStake</TableCell>
                  <TableCell className="text-muted-foreground max-w-xs">
                    Multi-chain liquid staking platform offering stkATOM for liquid staking derivatives.
                  </TableCell>
                  <TableCell>
                    <a
                      href="https://pstake.finance/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 hover:bg-primary/20 text-primary transition-colors group"
                    >
                      <ExternalLink className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    </a>
                  </TableCell>
                </TableRow>
                <TableRow className="border-border/20 hover:bg-muted/5 transition-colors">
                  <TableCell className="font-medium text-foreground">Milky Way</TableCell>
                  <TableCell className="text-muted-foreground max-w-xs">
                    Liquid staking protocol providing milkATOM tokens with automated staking rewards distribution.
                  </TableCell>
                  <TableCell>
                    <a
                      href="https://milkyway.zone/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 hover:bg-primary/20 text-primary transition-colors group"
                    >
                      <ExternalLink className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    </a>
                  </TableCell>
                </TableRow>
                <TableRow className="border-border/20 hover:bg-muted/5 transition-colors">
                  <TableCell className="font-medium text-foreground">Quicksilver</TableCell>
                  <TableCell className="text-muted-foreground max-w-xs">
                    Interchain liquid staking protocol enabling users to stake assets across multiple Cosmos chains while maintaining liquidity.
                  </TableCell>
                  <TableCell>
                    <a
                      href="https://app.quicksilver.zone/staking"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 hover:bg-primary/20 text-primary transition-colors group"
                    >
                      <ExternalLink className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    </a>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="liquidity">
          {renderLiquidityTable(liquidityPools, loading)}
        </TabsContent>

        <TabsContent value="lending">
          {renderOpportunityTable(lendingOpportunities)}
        </TabsContent>

        <TabsContent value="leverage">
          {renderLeverageTable(leverageOpportunities)}
        </TabsContent>

        <TabsContent value="nfts">
          <NFTCollections />
        </TabsContent>

        <TabsContent value="others">
          <Card className="backdrop-blur-sm bg-card/80 border-border/30 shadow-table">
            <Table>
              <TableHeader>
                <TableRow className="border-border/30">
                  <TableHead className="text-foreground font-semibold">Platform</TableHead>
                  <TableHead className="text-foreground font-semibold">Description</TableHead>
                  <TableHead className="text-foreground font-semibold w-24">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="border-border/20 hover:bg-muted/5 transition-colors">
                  <TableCell className="font-medium text-foreground">dVPN</TableCell>
                  <TableCell className="text-muted-foreground max-w-xs">
                    Decentralized VPN services powered by the Cosmos ecosystem, providing privacy and security through blockchain technology.
                  </TableCell>
                  <TableCell>
                    <a
                      href="https://dvpn.me/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 hover:bg-primary/20 text-primary transition-colors group"
                    >
                      <ExternalLink className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    </a>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="backdrop-blur-sm bg-card/60 border-border/30 p-4 text-center">
          <div className="text-2xl font-bold text-primary">{allOpportunities.length}</div>
          <div className="text-sm text-muted-foreground">Opportunities</div>
        </Card>
        <Card className="backdrop-blur-sm bg-card/60 border-border/30 p-4 text-center">
          <div className="text-2xl font-bold text-accent">$2.6B+</div>
          <div className="text-sm text-muted-foreground">Total TVL</div>
        </Card>
        <Card className="backdrop-blur-sm bg-card/60 border-border/30 p-4 text-center">
          <div className="text-2xl font-bold text-secondary-foreground">25.4%</div>
          <div className="text-sm text-muted-foreground">Highest APY</div>
        </Card>
        <Card className="backdrop-blur-sm bg-card/60 border-border/30 p-4 text-center">
          <div className="text-2xl font-bold text-foreground">4</div>
          <div className="text-sm text-muted-foreground">Categories</div>
        </Card>
      </div>
    </div>
  );
};

export default OpportunityTable;