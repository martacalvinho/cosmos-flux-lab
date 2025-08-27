import { ExternalLink, Atom } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

const Header = () => {
  return (
    <header className="relative z-10 w-full border-b border-border/20 backdrop-blur-sm">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center shadow-orange">
              <Atom className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-foreground to-accent bg-clip-text text-transparent">
                ATOM Hub
              </h1>
              <p className="text-xs text-muted-foreground">DeFi Aggregator</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <a href="#staking" className="text-foreground/80 hover:text-foreground transition-colors">
              Staking
            </a>
            <a href="#liquidity" className="text-foreground/80 hover:text-foreground transition-colors">
              Liquidity
            </a>
            <a href="#lending" className="text-foreground/80 hover:text-foreground transition-colors">
              Lending
            </a>
            <a href="#perps" className="text-foreground/80 hover:text-foreground transition-colors">
              Perps
            </a>
          </nav>

          {/* Right side actions */}
          <div className="flex items-center space-x-4">
            <ThemeToggle />
            <a
              href="https://cosmos.network"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 text-foreground/60 hover:text-foreground transition-colors"
            >
              <span className="text-sm hidden sm:block">cosmos.network</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;