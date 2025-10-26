import React from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
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

const safeDateLabel = (value: string | number) => {
  return formatDate(value, { month: "short", day: "numeric" });
};

interface IssuanceOutlookChartProps {
  emissionData: Array<{
    date: string;
    emission: number;
  }>;
  inflationData: Array<{
    date: string;
    inflation: number;
    floor: number;
    ceiling: number;
  }>;
  currentInflation: number;
  loading?: boolean;
  config: ChartConfig;
}

export const IssuanceOutlookChart: React.FC<IssuanceOutlookChartProps> = ({
  emissionData,
  inflationData,
  currentInflation,
  loading = false,
  config,
}) => {
  // Combine the data by mapping emission data with inflation data
  const combinedData = emissionData.map((point, idx) => ({
    date: point.date,
    emission: point.emission,
    inflation: inflationData[idx]?.inflation ?? currentInflation,
  }));

  if (loading || combinedData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full px-4">
        <div className="text-center space-y-2">
          <p className="text-base sm:text-lg font-semibold text-muted-foreground">Coming Soon</p>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-xs">
            Historical emission data requires indexer API
          </p>
        </div>
      </div>
    );
  }

  const inflationColor = "var(--color-inflation, #c084fc)";
  const emissionColor = "var(--color-emission, #fcd34d)";

  return (
    <ChartContainer config={config} className="h-full">
      <ComposedChart data={combinedData}>
        <defs>
          <linearGradient id="inflationArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={inflationColor} stopOpacity={0.4} />
            <stop offset="100%" stopColor={inflationColor} stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="1 8" stroke="rgba(255,255,255,0.08)" />
        <XAxis
          dataKey="date"
          tickFormatter={safeDateLabel}
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
          tickFormatter={(value) => value.toFixed(2)}
          width={60}
          tickMargin={8}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Area
          type="monotone"
          dataKey="inflation"
          stroke={inflationColor}
          strokeWidth={2}
          fill="url(#inflationArea)"
          dot={false}
          isAnimationActive={false}
        />
        <Line
          type="monotone"
          dataKey="emission"
          stroke={emissionColor}
          strokeWidth={2}
          strokeDasharray="4 4"
          dot={false}
          isAnimationActive={false}
        />
      </ComposedChart>
    </ChartContainer>
  );
};
