import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

type Protocol = any;

const FEATURED_PROTOCOLS: Protocol[] = [
  {
    category: "liquid-staking",
    protocol: "Stride",
    chain: "Stride",
    title: "Liquid Stake ATOM → stATOM",
    metrics: { APR: "16.2%" },
  },
  {
    category: "perps",
    protocol: "dYdX",
    chain: "dYdX",
    title: "ATOM Perpetuals",
    metrics: { "Funding Rate": "-0.02%" },
  },
];

const RECENT_UPDATES = [
  { protocol: "Osmosis", update: "New ATOM/OSMO superfluid staking pool", time: "2 mins ago", change: "+2.4%", positive: true },
  { protocol: "Stride", update: "stATOM exchange rate updated", time: "5 mins ago", change: "1.087", positive: true },
  { protocol: "Mars Protocol", update: "ATOM supply APY increased", time: "12 mins ago", change: "+0.8%", positive: true },
  { protocol: "dYdX", update: "ATOM-PERP funding rate changed", time: "18 mins ago", change: "-0.05%", positive: false },
];

const DashboardTab: React.FC = () => {
  return (
    <>
      {/* Featured Protocols */}
      <section className="mb-8">
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          Featured Opportunities
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURED_PROTOCOLS.map((protocol: any, index: number) => (
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
                  {String((Object.entries(protocol.metrics)[0]?.[1] ?? "N/A"))}
                </span>
                <Button size="sm" variant="outline" className="h-6 px-2 text-xs">
                  View
                </Button>
              </div>
            </Card>
          ))}
        </div>
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
    </>
  );
};

export default DashboardTab;
