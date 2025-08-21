import { NavLink } from "react-router-dom";
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
    label: "Home",
    path: "/",
    icon: Home,
    exact: true
  },
  {
    label: "Staking",
    path: "/staking",
    icon: Coins,
    color: "text-staking",
    bgColor: "bg-staking/10"
  },
  {
    label: "Liquid Staking", 
    path: "/liquid-staking",
    icon: Layers,
    color: "text-liquid-staking",
    bgColor: "bg-liquid-staking/10"
  },
  {
    label: "Liquidity",
    path: "/liquidity", 
    icon: Droplets,
    color: "text-liquidity",
    bgColor: "bg-liquidity/10"
  },
  {
    label: "Lending",
    path: "/lending",
    icon: PiggyBank,
    color: "text-lending", 
    bgColor: "bg-lending/10"
  },
  {
    label: "Perps",
    path: "/perps",
    icon: TrendingUp,
    color: "text-perps",
    bgColor: "bg-perps/10"
  }
];

const SECONDARY_ITEMS: any[] = [];

interface NavigationProps {
  className?: string;
}

export const Navigation = ({ className }: NavigationProps) => {
  return (
    <nav className={cn("border-b border-border bg-surface/50", className)}>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-center">
          {/* Main Navigation */}
          <div className="flex items-center space-x-1">
            {NAVIGATION_ITEMS.slice(1).map((item) => ( // Skip Home item when used in hero
              <NavLink
                key={item.path}
                to={item.path}
                end={item.exact}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-lg transition-colors",
                    "hover:bg-hover/50",
                    isActive
                      ? `${item.bgColor || "bg-primary/10"} ${item.color || "text-primary"}`
                      : "text-muted-foreground hover:text-foreground"
                  )
                }
              >
                <item.icon className="h-4 w-4" />
                {item.label}
                <Badge variant="secondary" className="ml-1 text-xs">
                  New
                </Badge>
              </NavLink>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
};