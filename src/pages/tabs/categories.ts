import { Coins, Layers, Droplets, PiggyBank, TrendingUp } from "lucide-react";

export const CATEGORIES = [
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
