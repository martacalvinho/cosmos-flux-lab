import { useState } from "react";
import { Filter, SortDesc } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ProtocolCard } from "@/components/ui/protocol/ProtocolCard";

const LIQUIDITY_PROTOCOLS = [
  {
    category: "liquidity" as const,
    protocol: "Osmosis",
    chain: "Osmosis",
    title: "ATOM/OSMO Liquidity Pool",
    assets: ["ATOM", "OSMO"],
    status: "active" as const,
    metrics: {
      "Pool ID": "#1",
      "Type": "Weighted 50/50",
      "Fee Tier": "0.3%",
      "TVL": "$125M",
      "24h Volume": "$8.2M",
      "Fee APR": "12.4%"
    },
    risks: ["Impermanent Loss", "Smart-contract"],
    howItWorks: [
      "Provide equal value of ATOM and OSMO",
      "Receive LP tokens representing your share",
      "Earn trading fees from swaps",
      "Optionally superfluid stake for extra rewards"
    ],
    links: {
      app: "https://app.osmosis.zone",
      docs: "https://docs.osmosis.zone/overview/getting-started",
      pool: "https://app.osmosis.zone/pool/1"
    },
    dataSource: "Osmosis API",
    lastUpdated: "30 secs ago"
  },
  {
    category: "liquidity" as const,
    protocol: "Osmosis",
    chain: "Osmosis", 
    title: "ATOM/stATOM Concentrated Liquidity",
    assets: ["ATOM", "stATOM"],
    status: "active" as const,
    metrics: {
      "Pool ID": "#803",
      "Type": "Concentrated CL",
      "Fee Tier": "0.05%",
      "TVL": "$45M",
      "24h Volume": "$3.1M", 
      "Fee APR": "18.7%"
    },
    risks: ["Impermanent Loss", "Smart-contract"],
    howItWorks: [
      "Set price range for concentrated liquidity",
      "Deposit ATOM and stATOM within range",
      "Earn higher fees when price stays in range",
      "Rebalance position as needed"
    ],
    links: {
      app: "https://app.osmosis.zone",
      docs: "https://docs.osmosis.zone/osmosis-core/modules/concentrated-liquidity",
      pool: "https://app.osmosis.zone/pool/803"
    },
    dataSource: "Osmosis API",
    lastUpdated: "1 min ago"
  },
  {
    category: "liquidity" as const,
    protocol: "Astroport",
    chain: "Neutron",
    title: "ATOM/NTRN Stable Pool",
    assets: ["ATOM", "NTRN"],
    status: "active" as const,
    metrics: {
      "Pool": "Stable Pool",
      "Type": "StableSwap",
      "Fee Tier": "0.05%",
      "TVL": "$8.5M",
      "24h Volume": "$450K",
      "Fee APR": "8.9%"
    },
    risks: ["Impermanent Loss", "Smart-contract"],
    howItWorks: [
      "Provide liquidity to stable swap pool",
      "Earn trading fees from arbitrageurs", 
      "Benefit from reduced impermanent loss",
      "Optionally stake LP tokens for ASTRO rewards"
    ],
    links: {
      app: "https://app.astroport.fi",
      docs: "https://docs.astroport.fi"
    },
    dataSource: "Astroport API",
    lastUpdated: "2 mins ago"
  }
];

export default function Liquidity() {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredProtocols = LIQUIDITY_PROTOCOLS.filter(protocol =>
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
                <div className="w-8 h-8 rounded-lg bg-liquidity/10 flex items-center justify-center">
                  <div className="w-4 h-4 bg-liquidity rounded-full" />
                </div>
                Liquidity
              </h1>
              <p className="text-muted-foreground mt-2">
                Provide liquidity to DEXs and earn trading fees
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="bg-liquidity/10 text-liquidity border-liquidity/20">
                {filteredProtocols.length} pools
              </Badge>
              <Badge variant="outline">
                Avg APR: 13.3%
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
              placeholder="Search pools, assets, chains..."
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
            Sort by APR
          </Button>
        </div>

        {/* Protocol Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredProtocols.map((protocol, index) => (
            <ProtocolCard
              key={`${protocol.protocol}-${protocol.assets.join("-")}-${index}`}
              {...protocol}
            />
          ))}
        </div>

        {filteredProtocols.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No pools found matching your search.</p>
          </div>
        )}
      </div>
    </div>
  );
}