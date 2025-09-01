import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Line, LineChart } from "recharts";

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
  const priceData = [
    { x: 1, value: 8.2 },
    { x: 2, value: 8.6 },
    { x: 3, value: 8.4 },
    { x: 4, value: 9.1 },
    { x: 5, value: 8.9 },
    { x: 6, value: 9.4 },
    { x: 7, value: 9.2 },
    { x: 8, value: 9.8 },
    { x: 9, value: 10.1 },
  ];
  const chartConfig = {
    price: {
      label: "ATOM",
      color: "hsl(var(--primary))",
    },
  } as const;
  return (
    <>
      {/* Coming Soon banner */}
      <section className="mb-8">
        <Card className="p-8 md:p-10 bg-primary/5 border-primary/40 shadow-md">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-sm px-2 py-1">Coming Soon</Badge>
              <h2 className="text-2xl md:text-3xl font-bold mt-3">Personal Dashboard</h2>
              <p className="text-base text-muted-foreground max-w-2xl mt-2">
                A single place to track your NFTs, open positions, favorite tokens, and portfolio changes across Cosmos.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <Badge variant="secondary" className="bg-surface border-border">NFTs</Badge>
                <Badge variant="secondary" className="bg-surface border-border">Open Positions</Badge>
                <Badge variant="secondary" className="bg-surface border-border">Watchlist</Badge>
                <Badge variant="secondary" className="bg-surface border-border">Portfolio</Badge>
              </div>
            </div>
            <div className="shrink-0">
              <Button variant="outline" className="opacity-60 cursor-not-allowed" disabled>
                Get notified
              </Button>
            </div>
          </div>
        </Card>
      </section>

      <div className="space-y-8 opacity-50 grayscale pointer-events-none select-none">
      {/* Preview grid */}
      <section className="mb-8">
        <h3 className="text-lg font-semibold mb-3">Preview</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* NFTs Preview */}
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Your NFTs</h4>
              <Badge variant="outline" className="text-xs">Preview</Badge>
            </div>
            <div className="grid grid-cols-4 gap-2 mt-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <img
                  key={i}
                  src="/placeholder.svg"
                  alt="NFT preview"
                  className="rounded-md aspect-square object-cover bg-surface border border-border"
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3">Showing top items from Stargaze</p>
          </Card>

          {/* Open Positions Preview */}
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Open Positions</h4>
              <Badge variant="outline" className="text-xs">Preview</Badge>
            </div>
            <div className="mt-3 space-y-3">
              {[{p:"Osmosis", t:"ATOM/OSMO", apr:"12.4%"}, {p:"Stride", t:"stATOM", apr:"16.2%"}, {p:"Mars", t:"ATOM Supply", apr:"6.8%"}].map((row, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{row.p}</span>
                    <span className="font-medium">{row.t}</span>
                  </div>
                  <Badge variant="outline" className="text-xs">APR {row.apr}</Badge>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3">Connected wallet positions will appear here</p>
          </Card>

          {/* Favorite Tokens Preview */}
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Favorites</h4>
              <Badge variant="outline" className="text-xs">Preview</Badge>
            </div>
            <div className="h-28 mt-2">
              <ChartContainer config={chartConfig} className="aspect-auto h-full">
                <LineChart data={priceData}>
                  <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                  <Line type="monotone" dataKey="value" stroke="var(--color-price)" strokeWidth={2} dot={false} />
                </LineChart>
              </ChartContainer>
            </div>
            <div className="flex items-center justify-between mt-2 text-xs">
              <span className="text-muted-foreground">ATOM</span>
              <span className="font-medium text-success">+3.1%</span>
            </div>
          </Card>

          {/* Portfolio Changes Preview */}
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Portfolio</h4>
              <Badge variant="outline" className="text-xs">Preview</Badge>
            </div>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">24h PnL</span>
                <span className="font-medium text-success">+$124.32</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total Value</span>
                <span className="font-medium">$12,480.10</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Chains</span>
                <span className="font-medium">Cosmos Hub, Osmosis, Stride</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">Aggregated balances across connected chains</p>
          </Card>
        </div>
      </section>
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
      </div>
    </>
  );
};

export default DashboardTab;
