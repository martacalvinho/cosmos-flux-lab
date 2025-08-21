import { useState } from "react";
import { Filter, SortDesc } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ProtocolCard } from "@/components/ui/protocol/ProtocolCard";

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
  },
  {
    category: "liquid-staking" as const,
    protocol: "Quicksilver",
    chain: "Quicksilver", 
    title: "Liquid Stake ATOM → qATOM",
    assets: ["ATOM", "qATOM"],
    status: "active" as const,
    metrics: {
      "APR": "15.8%",
      "Exchange Rate": "1.094 ATOM", 
      "Protocol Fee": "5%",
      "TVL": "$180M",
      "Redemption": "21-day unbond"
    },
    risks: ["Smart-contract", "Unbonding"],
    howItWorks: [
      "Liquid stake via Quicksilver protocol",
      "Receive qATOM liquid staking tokens", 
      "Participate in DeFi with qATOM",
      "Unbond for underlying ATOM when ready"
    ],
    links: {
      app: "https://app.quicksilver.zone",
      docs: "https://docs.quicksilver.zone"
    },
    dataSource: "Quicksilver API", 
    lastUpdated: "2 mins ago"
  },
  {
    category: "liquid-staking" as const,
    protocol: "pStake",
    chain: "Persistence",
    title: "Liquid Stake ATOM → stkATOM", 
    assets: ["ATOM", "stkATOM"],
    status: "active" as const,
    metrics: {
      "APR": "16.5%",
      "Exchange Rate": "1.076 ATOM",
      "Protocol Fee": "8%", 
      "TVL": "$95M",
      "Redemption": "Instant + fee"
    },
    risks: ["Smart-contract", "Unbonding"],
    howItWorks: [
      "Deposit ATOM via pStake Finance",
      "Mint stkATOM liquid staking derivative",
      "Earn staking rewards automatically",
      "Instant unstake with small fee or wait for free unbonding"
    ],
    links: {
      app: "https://app.pstake.finance",
      docs: "https://docs.pstake.finance"
    },
    dataSource: "pStake API",
    lastUpdated: "4 mins ago"
  }
];

export default function LiquidStaking() {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredProtocols = LIQUID_STAKING_PROTOCOLS.filter(protocol =>
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
                <div className="w-8 h-8 rounded-lg bg-liquid-staking/10 flex items-center justify-center">
                  <div className="w-4 h-4 bg-liquid-staking rounded-full" />
                </div>
                Liquid Staking
              </h1>
              <p className="text-muted-foreground mt-2">
                Stake tokens while maintaining liquidity with liquid staking derivatives
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="bg-liquid-staking/10 text-liquid-staking border-liquid-staking/20">
                {filteredProtocols.length} protocols
              </Badge>
              <Badge variant="outline">
                Avg APR: 16.2%
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
              placeholder="Search liquid staking protocols..."
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
              key={`${protocol.protocol}-${index}`}
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