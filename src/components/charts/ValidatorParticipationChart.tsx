import React from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

// Utility functions for date formatting
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
    const numValue = Number(stringValue);
    if (Number.isFinite(numValue)) {
      const milliseconds = numValue > 1_000_000_000_000 ? numValue : numValue * 1000;
      const parsed = new Date(milliseconds);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    return null;
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

const safeMonthLabel = (value: string | number) => {
  const formatted = formatDate(value, { month: "short", year: "2-digit" });
  return formatted.replace(/ (\d{2})$/, " '$1");
};

interface ValidatorParticipationChartProps {
  data: Array<{
    date: string;
    bonded: number;
    notBonded: number;
  }>;
  loading?: boolean;
  config: ChartConfig;
}

export const ValidatorParticipationChart: React.FC<ValidatorParticipationChartProps> = ({
  data,
  loading = false,
  config,
}) => {
  if (loading || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full px-4">
        <div className="text-center space-y-2">
          <p className="text-base sm:text-lg font-semibold text-muted-foreground">Coming Soon</p>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-xs">
            Historical staking data requires indexer API
          </p>
        </div>
      </div>
    );
  }

  const bondedColor = "var(--color-bonded, hsl(142, 76%, 36%))"
  const notBondedColor = "var(--color-notBonded, hsl(38, 92%, 50%))"

  return (
    <ChartContainer config={config} className="h-full">
      <AreaChart data={data}>
        <defs>
          <linearGradient id="bondedArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={bondedColor} stopOpacity={0.9} />
            <stop offset="95%" stopColor={bondedColor} stopOpacity={0.05} />
          </linearGradient>
          <linearGradient id="notBondedArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={notBondedColor} stopOpacity={0.9} />
            <stop offset="95%" stopColor={notBondedColor} stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="2 6" stroke="rgba(255,255,255,0.08)" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={safeMonthLabel}
          stroke="#7693C5"
          tickLine={false}
          angle={-45}
          textAnchor="end"
          height={60}
          interval="preserveStartEnd"
          minTickGap={50}
        />
        <YAxis
          stroke="#7693C5"
          tickFormatter={(value) => `${(value / 1_000_000).toLocaleString("en-US", { maximumFractionDigits: 0 })}`}
          domain={[0, 'auto']}
          width={80}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Area
          type="monotone"
          dataKey="bonded"
          stroke={bondedColor}
          fill="url(#bondedArea)"
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
        <Area
          type="monotone"
          dataKey="notBonded"
          stroke={notBondedColor}
          fill="url(#notBondedArea)"
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ChartContainer>
  );
};
