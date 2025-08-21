import { useState } from "react";
import { 
  Coins, 
  Layers, 
  Droplets, 
  PiggyBank, 
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Clock
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Navigation } from "@/components/ui/layout/Navigation";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

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

export default function Home() {
  const [dataMode, setDataMode] = useState<"live" | "demo">("live");

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
      <Navigation />

      <div className="container mx-auto px-4 py-12 space-y-12">
        {/* Categories Grid */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold">DeFi Categories</h2>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Last updated: {new Date().toLocaleTimeString()}
              </span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {CATEGORIES.map((category) => (
              <Link key={category.path} to={category.path}>
                <Card className={cn(
                  "p-6 shadow-card hover:shadow-elevated transition-all duration-200 cursor-pointer group",
                  "border-border hover:border-primary/20"
                )}>
                  <div className="flex items-start justify-between mb-4">
                    <div className={cn(
                      "p-3 rounded-lg",
                      category.bg,
                      category.border,
                      "border"
                    )}>
                      <category.icon className={cn("h-6 w-6", category.color)} />
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  
                  <h3 className="text-lg font-semibold mb-2">{category.title}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{category.description}</p>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Protocols</span>
                      <span className="font-medium">{category.stats.protocols}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>TVL</span>
                      <span className="font-medium">{category.stats.tvl}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>{category.title === "Perps" ? "Avg Funding" : "Best APY"}</span>
                      <span className={cn(
                        "font-medium",
                        category.title === "Perps" && category.stats.funding?.startsWith("-") 
                          ? "text-error" 
                          : "text-success"
                      )}>
                        {category.stats.apy || category.stats.funding}
                      </span>
                    </div>
                  </div>
                </Card>
              </Link>
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
    </div>
  );
}