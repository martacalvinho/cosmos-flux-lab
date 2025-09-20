import { ExternalLink, Info } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAtomBalanceCheck } from "@/hooks/useAtomBalanceCheck";

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

// Header shows action label + category-colored asset pills in the title

export const ProtocolCard = ({ 
  category,
  chain,
  title, 
  assets,
  metrics,
  howItWorks,
  links,
  dataSource,
  lastUpdated
}: ProtocolCardProps) => {
  const { ensureEnoughAtomThen, modal } = useAtomBalanceCheck();

  const handleNavigate = (e: React.MouseEvent<HTMLAnchorElement>, href?: string) => {
    if (!href || href === '#') return;
    if (category !== 'liquidity') return; // Only gate liquidity pool/app clicks
    e.preventDefault();
    ensureEnoughAtomThen(href, chain);
  };
  // Helpers for header styling
  const pillClasses = (cat: ProtocolCardProps["category"]) => {
    switch (cat) {
      case "liquid-staking":
        return "inline-flex items-center rounded-full border border-liquid-staking/20 bg-liquid-staking/10 text-liquid-staking px-2.5 py-0.5 text-xs font-semibold";
      case "liquidity":
        return "inline-flex items-center rounded-full border border-liquidity/20 bg-liquidity/10 text-liquidity px-2.5 py-0.5 text-xs font-semibold";
      case "lending":
        return "inline-flex items-center rounded-full border border-lending/20 bg-lending/10 text-lending px-2.5 py-0.5 text-xs font-semibold";
      case "perps":
        return "inline-flex items-center rounded-full border border-perps/20 bg-perps/10 text-perps px-2.5 py-0.5 text-xs font-semibold";
      case "staking":
      default:
        return "inline-flex items-center rounded-full border border-yellow-400/30 bg-yellow-500/15 text-yellow-300 px-2.5 py-0.5 text-xs font-semibold";
    }
  };

  const actionLabel = (cat: ProtocolCardProps["category"]) => {
    switch (cat) {
      case "liquid-staking":
        return "Liquid Stake";
      case "liquidity":
        return "Liquidity";
      case "lending":
        return "Lend/Borrow";
      case "perps":
        return "Trade";
      case "staking":
      default:
        return "Stake";
    }
  };

  return (
    <>
    <Card className="p-6 shadow-card border-border hover:shadow-elevated transition-all duration-200">
      {/* Header */}
      <div className="flex flex-wrap items-start gap-3 mb-4">
        <div className="space-y-2 min-w-0 flex-1">
          {/* Title rendering with category-colored asset pills */}
          <h3 className="text-lg font-semibold flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="uppercase tracking-wide">{actionLabel(category)}</span>
            {category === "staking" && Array.isArray(assets) && assets[0] && (
              <span className={pillClasses("staking")}>{assets[0]}</span>
            )}
            {category === "liquid-staking" && Array.isArray(assets) && assets.length > 0 && (
              <span className="flex items-center gap-2">
                <span className={pillClasses("liquid-staking")}>{assets[0]}</span>
                {assets[1] && <span className="text-muted-foreground">→</span>}
                {assets[1] && <span className={pillClasses("liquid-staking")}>{assets[1]}</span>}
              </span>
            )}
            {category === "liquidity" && Array.isArray(assets) && assets.length > 0 && (
              <span className="flex items-center gap-2">
                <span className={pillClasses("liquidity")}>{assets[0]}</span>
                {assets[1] && <span className="text-muted-foreground">/</span>}
                {assets[1] && <span className={pillClasses("liquidity")}>{assets[1]}</span>}
              </span>
            )}
            {category === "lending" && Array.isArray(assets) && assets.length > 0 && (
              <span className="flex items-center gap-2 flex-wrap">
                {assets.slice(0, 3).map((a) => (
                  <span key={a} className={pillClasses("lending")}>{a}</span>
                ))}
              </span>
            )}
            {category === "perps" && Array.isArray(assets) && assets[0] && (
              <span className={pillClasses("perps")}>{assets[0]}</span>
            )}
          </h3>
        </div>

        <div className="flex gap-1 flex-none ml-auto">
          {links.app && (
            <Button size="sm" variant="outline" asChild>
              <a
                href={links.app}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Open App"
                onClick={(e) => handleNavigate(e, links.app)}
              >
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
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-4">
        {Object.entries(metrics)
          .filter(([key]) => key !== 'Chain')
          .map(([key, value]) => (
            <div key={key} className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">{key}</p>
              {key === 'Pair' ? (
                <div className="text-sm font-semibold">
                  <div>{String(value)}</div>
                  {/* Render chain directly under pair */}
                  <div className="text-xs text-muted-foreground mt-0.5">Chain: {String((metrics as any).Chain ?? '')}</div>
                </div>
              ) : (
                <p className="text-sm font-semibold">{value}</p>
              )}
            </div>
          ))}
      </div>

      {/* Risk chips removed for a cleaner, informational-only card UI */}


      {/* Footer: only action buttons */}
      <div className="flex items-center justify-end pt-4 border-t border-border">
        <div className="flex gap-2 flex-wrap">
          {links.pool && (
            <Button size="sm" variant="outline" asChild>
              <a
                href={links.pool}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => handleNavigate(e, links.pool!)}
              >
                Direct Pool
              </a>
            </Button>
          )}
          <Button size="sm" variant={category} asChild>
            <a
              href={links.app ?? '#'}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => handleNavigate(e, links.app)}
            >
              Open App
            </a>
          </Button>
        </div>
      </div>
    </Card>
    {modal}
    </>
  );
};