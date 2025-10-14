import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Activity,
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  Coins,
  Flame,
  Home,
  Layers,
  Shield,
  Sparkles,
  Timer,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";
import { CosmosStatsService, type CosmosStatsData } from "@/services/cosmosStats";

const percent = (value: number, fractionDigits = 2) =>
  `${value.toLocaleString("en-US", {
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
  })}%`;

const atom = (value: number, fractionDigits = 0) =>
  `${value.toLocaleString("en-US", {
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
  })} ATOM`;

const numberFormat = (value: number, options: Intl.NumberFormatOptions = {}) =>
  value.toLocaleString("en-US", options);

const parseDateValue = (value: string | number | Date | null | undefined): Date | null => {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;

  if (typeof value === "number" && Number.isFinite(value)) {
    const milliseconds = value > 1_000_000_000_000 ? value : value * 1000;
    const parsed = new Date(milliseconds);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const stringValue = typeof value === "string" ? value.trim() : "";
  if (!stringValue) return null;

  if (/^\d+$/.test(stringValue)) {
    return parseDateValue(Number(stringValue));
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(stringValue)) {
    const [year, month, day] = stringValue.split("-").map((part) => Number.parseInt(part, 10));
    if (Number.isFinite(year) && Number.isFinite(month) && Number.isFinite(day)) {
      const parsed = new Date(Date.UTC(year, Math.max(0, month - 1), day));
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
  }

  const fallback = new Date(stringValue);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
};

const formatDate = (
  value: string | number | Date,
  options: Intl.DateTimeFormatOptions
): string => {
  const parsed = parseDateValue(value);
  if (!parsed) return typeof value === "string" ? value : "";
  return parsed.toLocaleDateString("en-US", options);
};

const safeDateLabel = (value: string | number) =>
  formatDate(value, { month: "short", day: "numeric" });

const safeMonthLabel = (value: string | number) => {
  const formatted = formatDate(value, { month: "short", year: "2-digit" });
  return formatted.replace(/ (\d{2})$/, " '$1");
};

const useCosmosStats = () => {
  return useQuery({
    queryKey: ["cosmos-stats"],
    queryFn: () => CosmosStatsService.fetchBundle(),
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
  });
};

const InfoPill = ({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) => (
  <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
    {icon}
    {label}
  </span>
);

const MetricTile = ({
  title,
  value,
  subtext,
  icon,
  loading,
  tone = "default",
}: {
  title: string;
  value: string;
  subtext?: string;
  icon?: React.ReactNode;
  loading?: boolean;
  tone?: "default" | "success" | "warning";
}) => {
  const toneClasses =
    tone === "success"
      ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/40"
      : tone === "warning"
      ? "bg-amber-500/10 text-amber-300 border-amber-500/40"
      : "bg-surface/60 text-foreground border-border/60";

  return (
    <Card className={cn("relative overflow-hidden border touch-manipulation", toneClasses)}>
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-black/10" />
      <div className="relative p-4 sm:p-5 space-y-2">
        <div className="flex items-center justify-between text-sm font-medium text-muted-foreground">
          <span>{title}</span>
          {icon}
        </div>
        <div className="text-2xl sm:text-3xl font-semibold tracking-tight">
          {loading ? <Skeleton className="h-8 sm:h-9 w-28 sm:w-32" /> : value}
        </div>
        {subtext ? (
          <p className="text-xs text-muted-foreground">{subtext}</p>
        ) : null}
      </div>
    </Card>
  );
};

const ChartPanel = ({
  title,
  description,
  loading,
  config,
  children,
}: {
  title: string;
  description?: string;
  loading?: boolean;
  config: ChartConfig;
  children: React.ReactElement;
}) => (
  <Card className="bg-surface/60 border-border/60 overflow-hidden">
    <div className="px-3 sm:px-5 py-3 sm:py-4 flex items-center justify-between">
      <div>
        <h3 className="text-base sm:text-lg font-semibold">{title}</h3>
        {description ? (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        ) : null}
      </div>
      {loading ? (
        <Skeleton className="h-4 w-16 rounded-full" />
      ) : (
        <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
      )}
    </div>
    <div className="h-56 sm:h-64 md:h-72 px-2 sm:px-3 md:px-4 pb-4 sm:pb-6">
      {loading ? (
        <div className="flex h-full items-center justify-center">
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      ) : (
        <ChartContainer config={config} className="h-full">
          {children}
        </ChartContainer>
      )}
    </div>
  </Card>
);

const StakeComposition = ({
  stats,
  loading,
}: {
  stats: CosmosStatsData;
  loading?: boolean;
}) => {
  const slices = [
    {
      label: "Bonded",
      value: stats.overview.bondedTokens.percent,
      amount: atom(stats.overview.bondedTokens.amount),
      tone: "bg-primary/20",
      bar: "bg-primary",
    },
    {
      label: "Unbonding",
      value: stats.overview.unbondingTokens.percent,
      amount: atom(stats.overview.unbondingTokens.amount),
      tone: "bg-amber-500/20",
      bar: "bg-amber-500",
    },
    {
      label: "Liquid / not bonded",
      value: stats.overview.notBondedTokens.percent,
      amount: atom(stats.overview.notBondedTokens.amount),
      tone: "bg-muted/40",
      bar: "bg-muted-foreground/70",
    },
  ];

  return (
    <Card className="h-full border border-border/60 bg-surface/60">
      <div className="p-6 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold">Stake composition</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Distribution of minted ATOM across bonded, liquid, and unbonding balances.
            </p>
          </div>
          <InfoPill
            icon={<Layers className="h-3.5 w-3.5" />}
            label={`${percent(stats.overview.bondedTokens.percent, 0)} bonded`}
          />
        </div>

        <div className="space-y-4">
          {slices.map((slice) => (
            <div key={slice.label} className="space-y-2">
              <div className="flex items-center justify-between text-sm font-medium">
                <span className="flex items-center gap-2">
                  <span className={cn("inline-block h-2.5 w-2.5 rounded-full", slice.tone)} />
                  {slice.label}
                </span>
                <span className="text-muted-foreground">
                  {percent(slice.value, 2)} • {slice.amount}
                </span>
              </div>
              <div className="relative h-2 overflow-hidden rounded-full bg-surface border border-border/60">
                {loading ? (
                  <Skeleton className="h-full w-full" />
                ) : (
                  <div
                    className={cn("absolute inset-y-0 rounded-full", slice.bar)}
                    style={{ width: `${Math.min(100, Math.max(0, slice.value))}%` }}
                  />
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-border/60 bg-background/80 px-4 py-3 text-xs text-muted-foreground leading-relaxed">
          {numberFormat(stats.overview.mintedSupply)} ATOM minted on-chain. Bonded supply
          remains the dominant share, while {percent(stats.overview.unbondingTokens.percent, 2)} of supply is
          waiting for the {stats.overview.unbondingPeriodDays}-day unbonding period to complete.
        </div>
      </div>
    </Card>
  );
};

const SectionHeading = ({
  title,
  description,
}: {
  title: string;
  description?: string;
}) => (
  <div className="space-y-1">
    <h2 className="text-2xl font-semibold">{title}</h2>
    {description ? (
      <p className="text-sm text-muted-foreground max-w-2xl">{description}</p>
    ) : null}
  </div>
);

const Stats = () => {
  const { data, isLoading, isError } = useCosmosStats();
  const stats: CosmosStatsData = data ?? CosmosStatsService.getSample();
  const [showAllAssets, setShowAllAssets] = useState(false);

  const stakingChartConfig = useMemo<ChartConfig>(
    () => ({
      bonded: { label: "Bonded", color: "hsl(142, 76%, 36%)" },
      notBonded: { label: "Not bonded", color: "hsl(38, 92%, 50%)" },
    }),
    []
  );

  const unbondingChartConfig = useMemo<ChartConfig>(
    () => ({
      amount: { label: "Unbonding", color: "hsl(var(--destructive))" },
    }),
    []
  );

  const aprChartConfig = useMemo<ChartConfig>(
    () => ({
      apr: { label: "Staking APR", color: "hsl(var(--primary))" },
    }),
    []
  );

  const issuanceChartConfig = useMemo<ChartConfig>(
    () => ({
      inflation: { label: "Inflation", color: "hsl(var(--primary))" },
      emission: { label: "New ATOM / block", color: "hsl(var(--warning))" },
    }),
    []
  );

  const stakingSeries = useMemo(() => {
    const rawPoints = stats?.charts?.stakingDynamics ?? [];
    return rawPoints
      .map((point) => {
        const parsedDate = parseDateValue(point.date);
        const bonded = Number(point.bonded);
        const notBonded = Number(point.notBonded);
        if (!parsedDate || !Number.isFinite(bonded) || !Number.isFinite(notBonded)) {
          return null;
        }
        return {
          date: parsedDate.toISOString(),
          bonded,
          notBonded,
        };
      })
      .filter(
        (entry): entry is { date: string; bonded: number; notBonded: number } =>
          entry !== null
      )
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [stats?.charts?.stakingDynamics]);

  const bondedDomain = useMemo<[number, number]>(() => {
    if (!stakingSeries.length) return [0, 1];
    const values = stakingSeries.map((point) => point.bonded);
    const min = Math.min(...values);
    const max = Math.max(...values);
    if (!Number.isFinite(min) || !Number.isFinite(max)) return [0, 1];
    const padding =
      min === max
        ? Math.max(1, max * 0.2)
        : Math.max(250_000, (max - min) * 0.3);
    return [Math.max(0, min - padding), max + padding];
  }, [stakingSeries]);

  const notBondedDomain = useMemo<[number, number]>(() => {
    if (!stakingSeries.length) return [0, 1];
    const values = stakingSeries.map((point) => point.notBonded);
    const min = Math.min(...values);
    const max = Math.max(...values);
    if (!Number.isFinite(min) || !Number.isFinite(max)) return [0, 1];
    const padding =
      min === max
        ? Math.max(1, max * 0.2)
        : Math.max(250_000, (max - min) * 0.3);
    return [Math.max(0, min - padding), max + padding];
  }, [stakingSeries]);

  const healthScore = useMemo(() => {
    const stakeScore = Math.min(60, stats.overview.bondedTokens.percent * 0.6);
    const inflationScore = Math.max(0, 20 - stats.inflation.real);
    const blockScore = Math.min(20, (8 / stats.block.timeSeconds) * 20);
    return Math.round(Math.min(100, stakeScore + inflationScore + blockScore + 20));
  }, [stats]);

  const healthGradient = {
    background: `conic-gradient(var(--primary) ${healthScore * 3.6}deg, rgba(148,163,184,0.2) ${
      healthScore * 3.6
    }deg)`,
  };

  return (
    <div className="bg-background min-h-screen pb-16">
      {/* Fixed Home Button */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 py-3 sm:py-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm sm:text-base font-medium text-foreground hover:text-primary transition-colors group"
          >
            <Home className="h-4 w-4 sm:h-5 sm:w-5 group-hover:scale-110 transition-transform" />
            <span className="hidden sm:inline">Back to Home</span>
            <span className="sm:hidden">Home</span>
          </Link>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 py-6 sm:py-10 space-y-8 sm:space-y-12">
        <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-border/60 bg-gradient-to-br from-primary/10 via-background to-background px-4 sm:px-6 md:px-12 py-8 sm:py-12">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.1),transparent)] pointer-events-none" />
          <div className="relative flex flex-col gap-10 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-5 max-w-2xl">
              <InfoPill
                icon={<Shield className="h-3.5 w-3.5" />}
                label="Cosmoshub network pulse"
              />
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight">
                Real-time insights for Cosmoshub stakers
              </h1>
              <p className="text-sm sm:text-base md:text-lg text-muted-foreground leading-relaxed">
                Monitor staking participation, validator emissions, and inflation dynamics
                from a single dashboard tuned for AtomHub. Designed for treasury managers and
                active ATOM stakers who need quick answers.
              </p>
              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                <Link
                  to="/"
                  className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-surface/70 px-4 py-2 font-medium text-foreground hover:bg-surface transition-colors"
                >
                  Back to AtomHub
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
                <a
                  href={stats.copy.validatorsHref}
                  className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-2 font-medium text-primary hover:bg-primary/20 transition-colors"
                  target="_blank"
                  rel="noreferrer"
                >
                  Browse validators
                  <ArrowUpRight className="h-4 w-4" />
                </a>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="relative flex h-24 w-24 sm:h-32 sm:w-32 items-center justify-center rounded-full border border-border/60 bg-background/80">
                {isLoading ? (
                  <Skeleton className="h-24 w-24 rounded-full" />
                ) : (
                  <div className="relative flex h-20 w-20 sm:h-28 sm:w-28 items-center justify-center rounded-full bg-background/80">
                    <div className="absolute inset-0 rounded-full" style={healthGradient} />
                    <div className="absolute inset-[10%] rounded-full bg-background/90 border border-border/60 flex flex-col items-center justify-center">
                      <span className="text-xl sm:text-2xl font-semibold">{healthScore}</span>
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        Health
                      </span>
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-2 sm:space-y-3 text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
                <div>
                  <span className="font-medium text-foreground block">
                    {atom(stats.overview.mintedSupply)}
                  </span>
                  <span>Total ATOM minted</span>
                </div>
                <div>
                  <span className="font-medium text-foreground block">
                    {percent(stats.rewards.apr, 2)}
                  </span>
                  <span>Current staking APR</span>
                </div>
                <div>
                  <span className="font-medium text-foreground block">
                    {stats.overview.unbondingPeriodDays} days
                  </span>
                  <span>Unbonding period</span>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section className="space-y-6">
          <SectionHeading
            title="Staking Overview"
            description="Participation metrics, rewards, and validator activity."
          />
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
            <MetricTile
              title="Bonded share"
              value={percent(stats.overview.bondedTokens.percent, 2)}
              subtext={`${atom(stats.overview.bondedTokens.amount)} securing the network`}
              icon={<Shield className="h-4 w-4 text-primary" />}
              loading={isLoading}
              tone="success"
            />
            <MetricTile
              title="Real staking reward"
              value={percent(stats.rewards.realStakingReward, 2)}
              subtext={`APR net of ${percent(stats.inflation.real, 2)} real inflation`}
              icon={<Sparkles className="h-4 w-4 text-emerald-300" />}
              loading={isLoading}
            />
            <MetricTile
              title="Unbonding queue"
              value={percent(stats.overview.unbondingTokens.percent, 2)}
              subtext={`${atom(stats.overview.unbondingTokens.amount)} awaiting ${stats.overview.unbondingPeriodDays}-day release`}
              icon={<Activity className="h-4 w-4 text-amber-300" />}
              loading={isLoading}
              tone="warning"
            />
          </div>

          <div className="grid gap-4 sm:gap-6 lg:grid-cols-[minmax(0,2fr),minmax(0,1fr)]">
            <StakeComposition stats={stats} loading={isLoading} />
            <Card className="border border-border/60 bg-surface/60 p-6 h-full">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-muted-foreground">Rewards mix</h3>
                <Activity className="h-4 w-4 text-primary" />
              </div>
              <div className="mt-4 space-y-3">
                <div>
                  <span className="text-2xl font-semibold tracking-tight">
                    {percent(stats.rewards.apy, 2)}
                  </span>
                  <p className="text-xs text-muted-foreground mt-1">
                    Compounded staking APY
                  </p>
                </div>
                <div className="rounded-xl border border-border/50 bg-background/60 px-4 py-3 text-xs text-muted-foreground leading-relaxed">
                  RSI {numberFormat(stats.rewards.rewardShareInflation, { maximumFractionDigits: 1 })}/100 • staking rewards capture staker share of
                  inflation versus other sinks like the community pool.
                </div>
              </div>
            </Card>
          </div>

          <div className="grid gap-4 sm:gap-6 grid-cols-1 xl:grid-cols-2">
            <ChartPanel
              title="Validator participation"
              description="Bonded vs liquid ATOM over time"
              loading={isLoading}
              config={stakingChartConfig}
            >
              {stats.charts.stakingDynamics.length > 0 ? (
              <AreaChart data={stats.charts.stakingDynamics}>
                <defs>
                  <linearGradient id="bondedArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.1} />
                  </linearGradient>
                  <linearGradient id="notBondedArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(38, 92%, 50%)" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="hsl(38, 92%, 50%)" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={safeMonthLabel}
                  stroke="hsl(var(--muted-foreground))"
                  tickLine={false}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  tickFormatter={(value) => `${(value / 1_000_000).toLocaleString("en-US", { maximumFractionDigits: 0 })}`}
                  domain={[0, 'auto']}
                  width={80}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="bonded"
                  stackId="1"
                  stroke="hsl(142, 76%, 36%)"
                  fill="url(#bondedArea)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="notBonded"
                  stackId="1"
                  stroke="hsl(38, 92%, 50%)"
                  fill="url(#notBondedArea)"
                  strokeWidth={2}
                />
              </AreaChart>
              ) : (
                <div className="flex items-center justify-center h-full px-4">
                  <div className="text-center space-y-2">
                    <p className="text-base sm:text-lg font-semibold text-muted-foreground">Coming Soon</p>
                    <p className="text-xs sm:text-sm text-muted-foreground max-w-xs">Historical staking data requires indexer API</p>
                  </div>
                </div>
              )}
            </ChartPanel>

            <ChartPanel
              title="APR outlook"
              description="Rewards volatility across recent epochs"
              loading={isLoading}
              config={aprChartConfig}
            >
              {stats.charts.apr.length > 0 ? (
              <LineChart data={stats.charts.apr}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  tickFormatter={safeDateLabel}
                  stroke="hsl(var(--muted-foreground))"
                  tickLine={false}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  tickFormatter={(value) => `${value.toFixed(1)}%`}
                  width={60}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="apr"
                  stroke="var(--color-apr)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
              ) : (
                <div className="flex items-center justify-center h-full px-4">
                  <div className="text-center space-y-2">
                    <p className="text-base sm:text-lg font-semibold text-muted-foreground">Coming Soon</p>
                    <p className="text-xs sm:text-sm text-muted-foreground max-w-xs">Historical APR data requires indexer API</p>
                  </div>
                </div>
              )}
            </ChartPanel>
          </div>

          <ChartPanel
            title="Unbonding calendar"
            description="ATOM scheduled to exit staking"
            loading={isLoading}
            config={unbondingChartConfig}
          >
            {stats.charts.unbondingMap.length > 0 ? (
            <BarChart data={stats.charts.unbondingMap}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="date"
                tickFormatter={safeDateLabel}
                stroke="hsl(var(--muted-foreground))"
                tickLine={false}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                tickFormatter={(value) => `${(value / 1_000_000).toLocaleString("en-US")}M`}
                width={70}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="amount" radius={[4, 4, 0, 0]} fill="var(--color-amount)" />
            </BarChart>
            ) : (
              <div className="flex items-center justify-center h-full px-4">
                <div className="text-center space-y-2">
                  <p className="text-base sm:text-lg font-semibold text-muted-foreground">Coming Soon</p>
                  <p className="text-xs sm:text-sm text-muted-foreground max-w-xs">Unbonding schedule data requires indexer API</p>
                </div>
              </div>
            )}
          </ChartPanel>
        </section>

        <section className="space-y-6">
          <SectionHeading
            title="Issuance & Inflation"
            description="Understand monetary policy and emission schedules."
          />
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
            <MetricTile
              title="Inflation target"
              value={percent(stats.inflation.coded, 2)}
              subtext={`Realized ${percent(stats.inflation.real, 2)} • Guardrails ${percent(
                stats.inflation.floor,
                0
              )}-${percent(stats.inflation.ceiling, 0)}`}
              icon={<BarChart3 className="h-4 w-4 text-primary" />}
              loading={isLoading}
            />
            <MetricTile
              title="New ATOM per block"
              value={stats.block.emissionPerBlock.toFixed(2)}
              subtext={`${numberFormat(stats.block.annualProvision)} annual provision`}
              icon={<Flame className="h-4 w-4 text-amber-300" />}
              loading={isLoading}
              tone="warning"
            />
            <MetricTile
              title="Block cadence"
              value={`${stats.block.timeSeconds.toFixed(2)}s`}
              subtext={`${numberFormat(
                Math.round((365 * 24 * 60 * 60) / stats.block.timeSeconds)
              )} blocks / year`}
              icon={<Timer className="h-4 w-4 text-sky-300" />}
              loading={isLoading}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr),minmax(0,1.5fr)]">
            <Card className="border border-border/60 bg-surface/60 p-6 h-full">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-muted-foreground">Inflation guardrails</h3>
                <BarChart3 className="h-4 w-4 text-primary" />
              </div>
              <div className="mt-4 space-y-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-semibold tracking-tight">
                    {percent(stats.inflation.coded, 2)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    target [{percent(stats.inflation.floor, 0)} – {percent(stats.inflation.ceiling, 0)}]
                  </span>
                </div>
                <div className="rounded-xl border border-border/50 bg-background/60 px-4 py-3 text-xs text-muted-foreground leading-relaxed">
                  Realized inflation currently {percent(stats.inflation.real, 2)}. Track how
                  this interacts with emissions to anticipate real yield.
                </div>
              </div>
            </Card>

            <ChartPanel
              title="Issuance outlook"
              description="Inflation schedule vs. emissions"
              loading={isLoading}
              config={issuanceChartConfig}
            >
              {stats.charts.emission.length > 0 ? (
              <LineChart
                data={stats.charts.emission.map((point, idx) => ({
                  date: point.date,
                  emission: point.emission,
                  inflation: stats.charts.inflation[idx]?.inflation ?? stats.inflation.coded,
                }))}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  tickFormatter={safeDateLabel}
                  stroke="hsl(var(--muted-foreground))"
                  tickLine={false}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  tickFormatter={(value) => value.toFixed(2)}
                  width={60}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="inflation"
                  stroke="var(--color-inflation)"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="emission"
                  stroke="var(--color-emission)"
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  dot={false}
                />
              </LineChart>
              ) : (
                <div className="flex items-center justify-center h-full px-4">
                  <div className="text-center space-y-2">
                    <p className="text-base sm:text-lg font-semibold text-muted-foreground">Coming Soon</p>
                    <p className="text-xs sm:text-sm text-muted-foreground max-w-xs">Historical emission data requires indexer API</p>
                  </div>
                </div>
              )}
            </ChartPanel>
          </div>
        </section>

        <section className="space-y-6">
          <SectionHeading
            title="Community Pool"
            description="Treasury funds available for governance proposals and ecosystem development."
          />
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
            <MetricTile
              title="Total Pool Value"
              value={stats.communityPool.totalUsdValue > 0 ? `$${numberFormat(stats.communityPool.totalUsdValue, { maximumFractionDigits: 0 })}` : 'Loading...'}
              subtext={`${numberFormat(stats.communityPool.assets.length)} different assets`}
              icon={<Coins className="h-4 w-4 text-primary" />}
              loading={isLoading}
              tone="success"
            />
            <MetricTile
              title="Total ATOM in Pool"
              value={atom(stats.communityPool.totalAtom, 0)}
              subtext={`${percent((stats.communityPool.totalAtom / stats.overview.mintedSupply) * 100, 2)} of supply`}
              icon={<BarChart3 className="h-4 w-4 text-emerald-300" />}
              loading={isLoading}
            />
            <MetricTile
              title="Largest by Value"
              value={stats.communityPool.assets.sort((a, b) => (b.usdValue || 0) - (a.usdValue || 0))[0]?.displayDenom || 'N/A'}
              subtext={stats.communityPool.assets[0]?.usdValue ? `$${numberFormat(stats.communityPool.assets.sort((a, b) => (b.usdValue || 0) - (a.usdValue || 0))[0].usdValue || 0, { maximumFractionDigits: 0 })}` : 'Loading...'}
              icon={<Sparkles className="h-4 w-4 text-amber-300" />}
              loading={isLoading}
            />
            <MetricTile
              title="Community Pool Tax"
              value={`${stats.communityPool.communityTax.toFixed(1)}%`}
              subtext="Of staking rewards to pool"
              icon={<Activity className="h-4 w-4 text-sky-300" />}
              loading={isLoading}
            />
          </div>

          <Card className="border border-border/60 bg-surface/60 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Top Assets in Community Pool</h3>
              <Coins className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {stats.communityPool.assets.slice(0, showAllAssets ? stats.communityPool.assets.length : 10).map((asset, idx) => (
                <div
                  key={asset.denom}
                  className="flex items-center justify-between p-3 rounded-lg bg-background/60 border border-border/40 hover:border-primary/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-semibold">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="font-medium text-sm">{asset.displayDenom}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[200px] sm:max-w-none">
                        {asset.denom}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-sm">
                      {numberFormat(asset.amount, { maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {asset.usdValue ? `$${numberFormat(asset.usdValue, { maximumFractionDigits: 0 })}` : asset.displayDenom}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            {stats.communityPool.assets.length > 10 && (
              <div className="mt-4 text-center">
                <button
                  onClick={() => setShowAllAssets(!showAllAssets)}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors rounded-lg hover:bg-primary/10"
                >
                  {showAllAssets ? (
                    <>
                      <ArrowUpRight className="h-4 w-4 rotate-180" />
                      Show Less
                    </>
                  ) : (
                    <>
                      <ArrowUpRight className="h-4 w-4" />
                      Show All {stats.communityPool.assets.length} Assets
                    </>
                  )}
                </button>
                <p className="text-xs text-muted-foreground mt-2">
                  {showAllAssets 
                    ? `Showing all ${stats.communityPool.assets.length} assets` 
                    : `Showing top 10 of ${stats.communityPool.assets.length} assets`
                  }
                </p>
              </div>
            )}
          </Card>
        </section>

        {isError ? (
          <div className="flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            <Flame className="mt-0.5 h-4 w-4" />
            <div>
              <p className="font-semibold text-amber-100">Showing cached metrics</p>
              <p className="mt-1 text-amber-100/80">
                The Cosmos API could not be reached, so the dashboard fell back to a cached
                sample bundle. Refresh when your connection is available to reload live data.
              </p>
            </div>
          </div>
        ) : null}

        <footer className="flex flex-col gap-3 border-t border-border/60 pt-6 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between">
          <span>
            Stats refreshed automatically from Cosmos Arcturian datasets every 10 minutes.
          </span>
          <div className="flex items-center gap-3">
            <a
              href={stats.copy.mintedSupplyHref}
              className="inline-flex items-center gap-1 hover:text-primary transition-colors"
              target="_blank"
              rel="noreferrer"
            >
              Minted supply reference
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
            <a
              href={stats.copy.inflationHref}
              className="inline-flex items-center gap-1 hover:text-primary transition-colors"
              target="_blank"
              rel="noreferrer"
            >
              Inflation docs
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Stats;
