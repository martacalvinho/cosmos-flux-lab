import { ExternalLink, Info } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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

// note: header pills removed for a cleaner, informational-only card UI

export const ProtocolCard = ({ 
  category,
  title, 
  metrics,
  howItWorks,
  links,
  dataSource,
  lastUpdated
}: ProtocolCardProps) => {

  return (
    <Card className="p-6 shadow-card border-border hover:shadow-elevated transition-all duration-200">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>

        <div className="flex gap-1">
          {links.app && (
            <Button size="sm" variant="outline" asChild>
              <a href={links.app} target="_blank" rel="noopener noreferrer" aria-label="Open App">
                <ExternalLink className="h-3 w-3" />
              </a>
            </Button>
          )}
          {links.docs && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="sm" variant="ghost">
                    <Info className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left" className="max-w-xs bg-background border-border shadow-lg">
                  <div className="space-y-2">
                    <p className="font-medium text-sm">How it works:</p>
                    <ol className="text-sm space-y-1">
                      {howItWorks.map((step, index) => (
                        <li key={index} className="flex gap-2">
                          <span className="text-primary font-medium">{index + 1}.</span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
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

      {/* Risk chips removed for a cleaner, informational-only card UI */}


      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <div className="text-xs text-muted-foreground">
          <div>Data: {dataSource}</div>
          <div>Updated: {lastUpdated}</div>
        </div>
        
        <div className="flex gap-2">
          {links.pool && (
            <Button size="sm" variant="outline" asChild>
              <a href={links.pool} target="_blank" rel="noopener noreferrer">
                Direct Pool
              </a>
            </Button>
          )}
          <Button size="sm" variant={category} asChild>
            <a href={links.app ?? '#'} target="_blank" rel="noopener noreferrer">
              Open App
            </a>
          </Button>
        </div>
      </div>
    </Card>
  );
};