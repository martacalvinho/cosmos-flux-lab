import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Header } from "@/components/ui/layout/Header";
import { Navigation } from "@/components/ui/layout/Navigation";
import Home from "./pages/Home";
import Staking from "./pages/Staking";
import LiquidStaking from "./pages/LiquidStaking";
import Liquidity from "./pages/Liquidity";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Header />
          <Navigation />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/staking" element={<Staking />} />
            <Route path="/liquid-staking" element={<LiquidStaking />} />
            <Route path="/liquidity" element={<Liquidity />} />
            <Route path="/lending" element={<NotFound />} />
            <Route path="/perps" element={<NotFound />} />
            <Route path="/portfolio" element={<NotFound />} />
            <Route path="/risks" element={<NotFound />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </div>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
