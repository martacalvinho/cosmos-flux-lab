import { useState } from "react";
import { Filter, SortDesc } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ProtocolCard } from "@/components/ui/protocol/ProtocolCard";

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
  },
  {
    category: "lending" as const,
    protocol: "Mars Protocol", 
    chain: "Neutron",
    title: "Supply/Borrow NTRN",
    assets: ["NTRN", "ATOM", "USDC"],
    status: "active" as const,
    metrics: {
      "Supply APY": "12.8%",
      "Borrow APY": "18.3%", 
      "Collateral Factor": "70%",
      "Liquidation Threshold": "75%",
      "TVL": "$45M",
      "Oracle": "Pyth + TWAP"
    },
    risks: ["Liquidation", "Smart-contract", "Oracle-Peg"],
    howItWorks: [
      "Connect to Neutron network",
      "Supply NTRN or other assets",
      "Borrow up to collateral limit",
      "Repay loans to unlock collateral"
    ],
    links: {
      app: "https://neutron.marsprotocol.io",
      docs: "https://docs.marsprotocol.io"
    },
    dataSource: "Mars API",
    lastUpdated: "3 mins ago"
  },
  {
    category: "lending" as const,
    protocol: "Umee",
    chain: "Umee",
    title: "Cross-Chain Lending",
    assets: ["UMEE", "ATOM", "ETH", "USDC"],
    status: "active" as const,
    metrics: {
      "Supply APY": "15.4%",
      "Borrow APY": "22.1%",
      "Collateral Factor": "80%", 
      "Liquidation Threshold": "85%",
      "TVL": "$28M",
      "Oracle": "Band Protocol"
    },
    risks: ["Liquidation", "Smart-contract", "Oracle-Peg"],
    howItWorks: [
      "Bridge assets to Umee network",
      "Supply assets to earn yield",
      "Borrow against cross-chain collateral", 
      "Leverage positions across chains"
    ],
    links: {
      app: "https://app.umee.cc",
      docs: "https://docs.umee.cc"
    },
    dataSource: "Umee API",
    lastUpdated: "5 mins ago"
  }
];

export default function Lending() {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredProtocols = LENDING_PROTOCOLS.filter(protocol =>
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
                <div className="w-8 h-8 rounded-lg bg-lending/10 flex items-center justify-center">
                  <div className="w-4 h-4 bg-lending rounded-full" />
                </div>
                Lending
              </h1>
              <p className="text-muted-foreground mt-2">
                Lend assets to earn interest or borrow against your collateral
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="bg-lending/10 text-lending border-lending/20">
                {filteredProtocols.length} protocols
              </Badge>
              <Badge variant="outline">
                Avg Supply APY: 12.1%
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
              placeholder="Search lending protocols..."
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
            Sort by APY
          </Button>
        </div>

        {/* Protocol Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredProtocols.map((protocol, index) => (
            <ProtocolCard
              key={`${protocol.protocol}-${protocol.chain}-${index}`}
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