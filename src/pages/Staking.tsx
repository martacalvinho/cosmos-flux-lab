import { useState } from "react";
import { Filter, SortDesc } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ProtocolCard } from "@/components/ui/protocol/ProtocolCard";

// Mock data for staking protocols
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
  },
  {
    category: "staking" as const,
    protocol: "Juno Network", 
    chain: "Juno",
    title: "Stake JUNO",
    assets: ["JUNO"],
    status: "active" as const,
    metrics: {
      "APR": "25.8%",
      "Commission": "5-12%",
      "Validators": "125 active",
      "Unbonding": "28 days" 
    },
    risks: ["Unbonding", "Slashing"],
    howItWorks: [
      "Set up Juno wallet",
      "Research validator performance and commission",
      "Delegate JUNO tokens",
      "Monitor validator performance"
    ],
    links: {
      app: "https://www.mintscan.io/juno",
      docs: "https://docs.junonetwork.io/validators"
    },
    dataSource: "Juno RPC",
    lastUpdated: "5 mins ago"
  }
];

export default function Staking() {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("apr");

  const filteredProtocols = STAKING_PROTOCOLS.filter(protocol =>
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
                <div className="w-8 h-8 rounded-lg bg-staking/10 flex items-center justify-center">
                  <div className="w-4 h-4 bg-staking rounded-full" />
                </div>
                Staking
              </h1>
              <p className="text-muted-foreground mt-2">
                Secure networks and earn rewards by staking your tokens
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="bg-staking/10 text-staking border-staking/20">
                {filteredProtocols.length} protocols
              </Badge>
              <Badge variant="outline">
                Avg APR: 22.1%
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
              placeholder="Search protocols, chains, assets..."
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