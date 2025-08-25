import { 
  Coins, 
  Layers,
  Droplets, 
  PiggyBank, 
  TrendingUp,
  Home,
  User,
  Shield
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const NAVIGATION_ITEMS = [
  {
    label: "All",
    value: "all",
    icon: Home,
    color: "text-primary",
    bgColor: "bg-primary/10"
  },
  {
    label: "Staking",
    value: "staking",
    icon: Coins,
    color: "text-staking",
    bgColor: "bg-staking/10"
  },
  {
    label: "Liquid Staking", 
    value: "liquid-staking",
    icon: Layers,
    color: "text-liquid-staking",
    bgColor: "bg-liquid-staking/10"
  },
  {
    label: "Liquidity",
    value: "liquidity", 
    icon: Droplets,
    color: "text-liquidity",
    bgColor: "bg-liquidity/10"
  },
  {
    label: "Lending",
    value: "lending",
    icon: PiggyBank,
    color: "text-lending", 
    bgColor: "bg-lending/10"
  },
  {
    label: "Perps",
    value: "perps",
    icon: TrendingUp,
    color: "text-perps",
    bgColor: "bg-perps/10"
  }
];

interface NavigationProps {
  className?: string;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const Navigation = ({ className, activeTab, onTabChange }: NavigationProps) => {
  return (
    <nav className={cn("border-b border-border bg-surface/50", className)}>
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-center">
          {/* Main Navigation */}
          <div className="flex items-center space-x-2">
            {NAVIGATION_ITEMS.map((item) => (
              <button
                key={item.value}
                onClick={() => onTabChange(item.value)}
                className={cn(
                  "flex items-center gap-2 px-16 py-3 text-sm font-medium rounded-lg transition-colors",
                  "hover:bg-hover/50",
                  activeTab === item.value
                    ? `${item.bgColor || "bg-primary/10"} ${item.color || "text-primary"}`
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
};