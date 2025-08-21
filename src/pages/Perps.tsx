import { useState } from "react";
import { Filter, SortDesc } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ProtocolCard } from "@/components/ui/protocol/ProtocolCard";

const PERPS_PROTOCOLS = [
  {
    category: "perps" as const,
    protocol: "dYdX",
    chain: "dYdX Chain",
    title: "Trade ATOM-PERP",
    assets: ["ATOM-USD"],
    status: "active" as const,
    metrics: {
      "Funding Rate": "-0.02%",
      "Open Interest": "$25.8M",
      "24h Volume": "$125M",
      "Taker Fee": "0.05%",
      "Maker Fee": "0.02%",
      "Max Leverage": "20x"
    },
    risks: ["Liquidation", "Funding"],
    howItWorks: [
      "Deposit USDC as collateral",
      "Open long or short ATOM position",
      "Pay/receive funding every 8 hours",
      "Close position or get liquidated"
    ],
    links: {
      app: "https://trade.dydx.exchange",
      docs: "https://docs.dydx.exchange"
    },
    dataSource: "dYdX Indexer",
    lastUpdated: "30 secs ago"
  },
  {
    category: "perps" as const,
    protocol: "Injective",
    chain: "Injective",
    title: "Trade ATOM/USDT Perp",
    assets: ["ATOM-USDT"],
    status: "active" as const,
    metrics: {
      "Funding Rate": "0.008%",
      "Open Interest": "$12.4M", 
      "24h Volume": "$45M",
      "Taker Fee": "0.10%",
      "Maker Fee": "-0.01%",
      "Max Leverage": "25x"
    },
    risks: ["Liquidation", "Funding"],
    howItWorks: [
      "Connect Injective wallet",
      "Deposit margin (USDT/INJ)",
      "Trade ATOM perpetual futures",
      "Manage position and funding costs"
    ],
    links: {
      app: "https://helixapp.com",
      docs: "https://docs.injective.network"
    },
    dataSource: "Injective API",
    lastUpdated: "1 min ago"
  },
  {
    category: "perps" as const,
    protocol: "Levana",
    chain: "Osmosis",
    title: "Trade ATOM Leveraged Tokens",
    assets: ["ATOM3L", "ATOM3S"],
    status: "active" as const,
    metrics: {
      "Funding Rate": "0.05%",
      "Open Interest": "$8.9M",
      "24h Volume": "$2.8M", 
      "Management Fee": "0.50%",
      "Rebalance Fee": "0.30%",
      "Max Leverage": "3x"
    },
    risks: ["Liquidation", "Rebalancing"],
    howItWorks: [
      "Buy ATOM3L (3x long) or ATOM3S (3x short)",
      "Token automatically rebalances leverage", 
      "Hold leveraged exposure without margin calls",
      "Sell tokens anytime on DEX"
    ],
    links: {
      app: "https://app.levana.finance",
      docs: "https://docs.levana.finance"
    },
    dataSource: "Levana API", 
    lastUpdated: "2 mins ago"
  },
  {
    category: "perps" as const,
    protocol: "Kujira",
    chain: "Kujira",
    title: "Trade ATOM Margin",
    assets: ["ATOM-USK"],
    status: "active" as const,
    metrics: {
      "Funding Rate": "-0.01%",
      "Open Interest": "$5.2M",
      "24h Volume": "$1.9M",
      "Taker Fee": "0.075%", 
      "Maker Fee": "0.025%",
      "Max Leverage": "10x"
    },
    risks: ["Liquidation", "Funding"],
    howItWorks: [
      "Deposit USK or KUJI as margin",
      "Open leveraged ATOM position",
      "Earn maker rebates for limit orders",
      "Monitor margin ratio constantly"
    ],
    links: {
      app: "https://fin.kujira.app",
      docs: "https://docs.kujira.app"
    },
    dataSource: "Kujira API",
    lastUpdated: "4 mins ago"
  }
];

export default function Perps() {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredProtocols = PERPS_PROTOCOLS.filter(protocol =>
    protocol.protocol.toLowerCase().includes(searchTerm.toLowerCase()) ||
    protocol.chain.toLowerCase().includes(searchTerm.toLowerCase()) ||
    protocol.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Page Header */}
      <div className="border-b border-border bg-surface/30">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-perps/10 flex items-center justify-center">
                  <div className="w-4 h-4 bg-perps rounded-full" />
                </div>
                Perps
              </h1>
              <p className="text-muted-foreground mt-2">
                Trade perpetual futures and leveraged products
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="bg-perps/10 text-perps border-perps/20">
                {filteredProtocols.length} protocols
              </Badge>
              <Badge variant="outline">
                Avg Funding: -0.01%
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Filters and Search */}
        <div className="flex items-center gap-4 mb-8">
          <div className="flex-1 max-w-md">
            <Input
              placeholder="Search perp protocols..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-surface border-border"
            />
          </div>
          
          <Button variant="outline" className="gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </Button>
          
          <Button variant="outline" className="gap-2">
            <SortDesc className="h-4 w-4" />
            Sort by Volume
          </Button>
        </div>

        {/* Protocol Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredProtocols.map((protocol, index) => (
            <ProtocolCard
              key={`${protocol.protocol}-${protocol.title}-${index}`}
              {...protocol}
            />
          ))}
        </div>

        {filteredProtocols.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No protocols found matching your search.</p>
          </div>
        )}
      </div>
    </div>
  );
}