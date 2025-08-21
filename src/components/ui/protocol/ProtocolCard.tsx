import { ExternalLink, Info, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface ProtocolCardProps {
  category: "staking" | "liquid-staking" | "liquidity" | "lending" | "perps";
  protocol: string;
  chain: string;
  title: string;
  assets: string[];
  status: "active" | "paused" | "new";
  metrics: Record<string, string | number>;
  risks: string[];
  howItWorks: string[];
  links: {
    app?: string;
    docs?: string;
    pool?: string;
  };
  dataSource: string;
  lastUpdated: string;
}

const CATEGORY_STYLES = {
  staking: { color: "text-staking", bg: "bg-staking/10", border: "border-staking/20" },
  "liquid-staking": { color: "text-liquid-staking", bg: "bg-liquid-staking/10", border: "border-liquid-staking/20" },
  liquidity: { color: "text-liquidity", bg: "bg-liquidity/10", border: "border-liquidity/20" },
  lending: { color: "text-lending", bg: "bg-lending/10", border: "border-lending/20" },
  perps: { color: "text-perps", bg: "bg-perps/10", border: "border-perps/20" }
};

const STATUS_STYLES = {
  active: { color: "text-success", bg: "bg-success/10" },
  paused: { color: "text-warning", bg: "bg-warning/10" },
  new: { color: "text-info", bg: "bg-info/10" }
};

export const ProtocolCard = ({ 
  category, 
  protocol, 
  chain, 
  title, 
  assets, 
  status, 
  metrics,
  risks,
  howItWorks,
  links,
  dataSource,
  lastUpdated
}: ProtocolCardProps) => {
  const categoryStyle = CATEGORY_STYLES[category];
  const statusStyle = STATUS_STYLES[status];

  return (
    <Card className="p-6 shadow-card border-border hover:shadow-elevated transition-all duration-200">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge 
              variant="outline" 
              className={cn(categoryStyle.color, categoryStyle.bg, categoryStyle.border)}
            >
              {category.replace("-", " ")}
            </Badge>
            <Badge variant="outline">{protocol}</Badge>
            <Badge variant="outline">{chain}</Badge>
            <Badge 
              variant="outline"
              className={cn(statusStyle.color, statusStyle.bg)}
            >
              {status}
            </Badge>
          </div>
          
          <h3 className="text-lg font-semibold">{title}</h3>
          
          <div className="flex items-center gap-1 flex-wrap">
            {assets.map((asset, index) => (
              <span key={asset} className="text-sm text-muted-foreground">
                {asset}
                {index < assets.length - 1 && <span className="mx-1">•</span>}
              </span>
            ))}
          </div>
        </div>

        <div className="flex gap-1">
          {links.app && (
            <Button size="sm" variant="outline">
              <ExternalLink className="h-3 w-3" />
            </Button>
          )}
          {links.docs && (
            <Button size="sm" variant="ghost">
              <Info className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
        {Object.entries(metrics).map(([key, value]) => (
          <div key={key} className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">{key}</p>
            <p className="text-sm font-semibold">{value}</p>
          </div>
        ))}
      </div>

      {/* Risk Chips */}
      {risks.length > 0 && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <AlertTriangle className="h-4 w-4 text-warning" />
          {risks.map((risk) => (
            <Badge key={risk} variant="outline" className="text-xs bg-warning/10 text-warning border-warning/20">
              {risk}
            </Badge>
          ))}
        </div>
      )}

      {/* How it Works */}
      <div className="space-y-2 mb-4">
        <p className="text-sm font-medium">How it works:</p>
        <ol className="text-sm text-muted-foreground space-y-1">
          {howItWorks.map((step, index) => (
            <li key={index} className="flex gap-2">
              <span className="text-primary font-medium">{index + 1}.</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <div className="text-xs text-muted-foreground">
          <div>Data: {dataSource}</div>
          <div>Updated: {lastUpdated}</div>
        </div>
        
        <div className="flex gap-2">
          {links.pool && (
            <Button size="sm" variant="outline">
              Direct Pool
            </Button>
          )}
          <Button size="sm" variant={category}>
            Open App
          </Button>
        </div>
      </div>
    </Card>
  );
};