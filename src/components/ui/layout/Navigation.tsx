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

const SECONDARY_ITEMS = [
  {
    label: "Portfolio",
    path: "/portfolio",
    icon: User
  },
  {
    label: "Risks",
    path: "/risks",
    icon: Shield
  }
];

export const Navigation = () => {
  return (
    <nav className="border-b border-border bg-surface/50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between">
          {/* Main Navigation */}
          <div className="flex items-center space-x-1">
            {NAVIGATION_ITEMS.map((item) => (
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
                {item.path !== "/" && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    New
                  </Badge>
                )}
              </NavLink>
            ))}
          </div>

          {/* Secondary Navigation */}
          <div className="flex items-center space-x-1">
            {SECONDARY_ITEMS.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                    "hover:bg-hover/50",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )
                }
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
};