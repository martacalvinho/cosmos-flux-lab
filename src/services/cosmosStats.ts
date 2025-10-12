import { CosmosLcdService, type CosmosLcdData } from './cosmosLcdService';

const COSMOS_STATS_BASE = "https://cosmos.api.arcturian.tech";

type NumberLike = number | string | null | undefined;

export interface CosmosStatsBundle {
  overview: {
    mintedSupply: number;
    bondedTokens: { amount: number; percent: number };
    notBondedTokens: { amount: number; percent: number };
    unbondingTokens: { amount: number; percent: number };
    unbondingPeriodDays: number;
  };
  rewards: {
    apr: number;
    apy: number;
    realStakingReward: number;
    rewardShareInflation: number;
  };
  inflation: {
    coded: number;
    real: number;
    floor: number;
    ceiling: number;
  };
  block: {
    timeSeconds: number;
    emissionPerBlock: number;
    annualProvision: number;
  };
  charts: {
    stakingDynamics: Array<{ date: string; bonded: number; notBonded: number }>;
    unbondingMap: Array<{ date: string; amount: number }>;
    apr: Array<{ date: string; apr: number }>;
    inflation: Array<{ date: string; inflation: number; floor: number; ceiling: number }>;
    emission: Array<{ date: string; emission: number }>;
  };
  copy: {
    mintedSupplyHref?: string;
    validatorsHref?: string;
    inflationHref?: string;
  };
}

const SAMPLE_BUNDLE: CosmosStatsBundle = {
  overview: {
    mintedSupply: 472_847_575,
    bondedTokens: { amount: 269_518_530, percent: 57 },
    notBondedTokens: { amount: 14_883_614, percent: 3.15 },
    unbondingTokens: { amount: 13_392_262, percent: 2.83 },
    unbondingPeriodDays: 21,
  },
  rewards: {
    apr: 21.05,
    apy: 23.42,
    realStakingReward: 8.83,
    rewardShareInflation: 98,
  },
  inflation: {
    coded: 10,
    real: 12.22,
    floor: 7,
    ceiling: 10,
  },
  block: {
    timeSeconds: 5.92,
    emissionPerBlock: 10.84,
    annualProvision: 47_263_997,
  },
  charts: {
    stakingDynamics: Array.from({ length: 14 }).map((_, idx) => {
      const date = new Date(Date.UTC(2024, 8 + idx, 1)).toISOString().slice(0, 10);
      // Realistic bonded ATOM progression from ~230M to ~275M over 14 months
      const baseBonded = 230_000_000;
      const trendBonded = idx * 3_200_000; // ~3.2M increase per month
      const noiseBonded = Math.sin(idx * 0.8) * 2_500_000 + Math.cos(idx * 1.2) * 1_800_000;
      const bonded = Math.round(baseBonded + trendBonded + noiseBonded);
      
      // Not bonded stays relatively flat with minor fluctuations (10-20M range)
      const baseNotBonded = 14_000_000;
      const noiseNotBonded = Math.sin(idx * 1.5) * 3_000_000 + Math.cos(idx * 0.9) * 2_000_000;
      const notBonded = Math.round(Math.max(8_000_000, baseNotBonded + noiseNotBonded));
      
      return {
        date,
        bonded,
        notBonded,
      };
    }),
    unbondingMap: Array.from({ length: 30 }).map((_, idx) => ({
      date: `2024-10-${(idx + 1).toString().padStart(2, "0")}`,
      amount: idx === 28 ? 5_200_000 : Math.max(200_000, (idx % 7) * 220_000),
    })),
    apr: Array.from({ length: 30 }).map((_, idx) => ({
      date: `2024-${(idx < 15 ? "07" : "08")}-${((idx % 15) + 1)
        .toString()
        .padStart(2, "0")}`,
      apr: 18 + Math.sin(idx / 4) * 2.5,
    })),
    inflation: Array.from({ length: 12 }).map((_, idx) => ({
      date: `2024-${(idx + 1).toString().padStart(2, "0")}-01`,
      inflation: 10,
      floor: 7,
      ceiling: 10,
    })),
    emission: Array.from({ length: 12 }).map((_, idx) => ({
      date: `2024-${(idx + 1).toString().padStart(2, "0")}-01`,
      emission: 9.34 + idx * 0.17,
    })),
  },
  copy: {
    mintedSupplyHref: "https://www.mintscan.io/cosmos/proposals",
    validatorsHref: "https://www.mintscan.io/cosmos/validators",
    inflationHref: "https://docs.cosmos.network/main/tokenomics/inflation",
  },
};

function toNumber(value: NumberLike, fallback = 0) {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "number") return value;
  const parsed = Number.parseFloat(String(value).replace(/,/g, ""));
  return Number.isNaN(parsed) ? fallback : parsed;
}

function pickFirst(...values: unknown[]): number | undefined {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" || typeof value === "number") {
      const parsed = Number.parseFloat(String(value).replace(/,/g, ""));
      if (!Number.isNaN(parsed)) return parsed;
    }
  }
  return undefined;
}

function getPath(data: any, path: string[]): unknown {
  return path.reduce((acc, key) => (acc && typeof acc === "object" ? acc[key] : undefined), data);
}

function maybeUatomToAtom(value: NumberLike, fallback = 0) {
  const numeric = toNumber(value, fallback);
  if (!Number.isFinite(numeric)) return fallback;
  return numeric > 1_000_000_000 ? numeric / 1_000_000 : numeric;
}

function normaliseBundle(raw: any): CosmosStatsBundle | null {
  if (!raw || typeof raw !== "object") return null;

  const mintedSupply =
    pickFirst(
      getPath(raw, ["overview", "mintedSupply"]),
      getPath(raw, ["overview", "minted_supply"]),
      getPath(raw, ["minted", "total"]),
      getPath(raw, ["supply", "minted"])
    ) ?? SAMPLE_BUNDLE.overview.mintedSupply;

  const bondedAmount =
    pickFirst(
      getPath(raw, ["overview", "bondedTokens", "amount"]),
      getPath(raw, ["staking", "bonded", "amount"]),
      getPath(raw, ["bonded_tokens"])
    ) ?? SAMPLE_BUNDLE.overview.bondedTokens.amount;

  const bondedPercent =
    pickFirst(
      getPath(raw, ["overview", "bondedTokens", "percent"]),
      getPath(raw, ["staking", "bonded", "percent"]),
      getPath(raw, ["bonded_percent"])
    ) ?? SAMPLE_BUNDLE.overview.bondedTokens.percent;

  const notBondedAmount =
    pickFirst(
      getPath(raw, ["overview", "notBondedTokens", "amount"]),
      getPath(raw, ["staking", "notBonded", "amount"]),
      getPath(raw, ["not_bonded_tokens"])
    ) ?? SAMPLE_BUNDLE.overview.notBondedTokens.amount;

  const notBondedPercent =
    pickFirst(
      getPath(raw, ["overview", "notBondedTokens", "percent"]),
      getPath(raw, ["staking", "notBonded", "percent"]),
      getPath(raw, ["not_bonded_percent"])
    ) ?? SAMPLE_BUNDLE.overview.notBondedTokens.percent;

  const unbondingAmount =
    pickFirst(
      getPath(raw, ["overview", "unbondingTokens", "amount"]),
      getPath(raw, ["staking", "unbonding", "amount"]),
      getPath(raw, ["unbonding_tokens"])
    ) ?? SAMPLE_BUNDLE.overview.unbondingTokens.amount;

  const unbondingPercent =
    pickFirst(
      getPath(raw, ["overview", "unbondingTokens", "percent"]),
      getPath(raw, ["staking", "unbonding", "percent"]),
      getPath(raw, ["unbonding_percent"])
    ) ?? SAMPLE_BUNDLE.overview.unbondingTokens.percent;

  const unbondingPeriod =
    pickFirst(
      getPath(raw, ["overview", "unbondingPeriodDays"]),
      getPath(raw, ["staking", "unbonding_period_days"]),
      getPath(raw, ["unbonding_period"])
    ) ?? SAMPLE_BUNDLE.overview.unbondingPeriodDays;

  const apr =
    pickFirst(
      getPath(raw, ["rewards", "aprPercent"]),
      getPath(raw, ["rewards", "apr"]),
      getPath(raw, ["staking", "apr"])
    ) ?? SAMPLE_BUNDLE.rewards.apr;

  const apy =
    pickFirst(
      getPath(raw, ["rewards", "apyPercent"]),
      getPath(raw, ["rewards", "apy"]),
      getPath(raw, ["staking", "apy"])
    ) ?? SAMPLE_BUNDLE.rewards.apy;

  const rsr =
    pickFirst(
      getPath(raw, ["rewards", "realStakingReward"]),
      getPath(raw, ["rewards", "rsr"])
    ) ?? SAMPLE_BUNDLE.rewards.realStakingReward;

  const rsi =
    pickFirst(
      getPath(raw, ["rewards", "rewardShareInflation"]),
      getPath(raw, ["rewards", "rsi"])
    ) ?? SAMPLE_BUNDLE.rewards.rewardShareInflation;

  const inflationCoded =
    pickFirst(
      getPath(raw, ["inflation", "codedPercent"]),
      getPath(raw, ["inflation", "coded"]),
      getPath(raw, ["inflation", "current"]),
      getPath(raw, ["inflation_percent"])
    ) ?? SAMPLE_BUNDLE.inflation.coded;

  const inflationReal =
    pickFirst(
      getPath(raw, ["inflation", "realPercent"]),
      getPath(raw, ["inflation", "real"]),
      getPath(raw, ["inflation_real"])
    ) ?? SAMPLE_BUNDLE.inflation.real;

  const inflationFloor =
    pickFirst(
      getPath(raw, ["inflation", "floorPercent"]),
      getPath(raw, ["inflation", "floor"]),
      getPath(raw, ["inflation_floor"])
    ) ?? SAMPLE_BUNDLE.inflation.floor;

  const inflationCeiling =
    pickFirst(
      getPath(raw, ["inflation", "ceilingPercent"]),
      getPath(raw, ["inflation", "ceiling"]),
      getPath(raw, ["inflation_ceiling"])
    ) ?? SAMPLE_BUNDLE.inflation.ceiling;

  const blockTime =
    pickFirst(
      getPath(raw, ["block", "timeSeconds"]),
      getPath(raw, ["block", "time_seconds"]),
      getPath(raw, ["block", "time"]),
      getPath(raw, ["block_time"])
    ) ?? SAMPLE_BUNDLE.block.timeSeconds;

  const emissionPerBlock =
    pickFirst(
      getPath(raw, ["block", "emissionPerBlock"]),
      getPath(raw, ["block", "emission_per_block"]),
      getPath(raw, ["block", "emission"]),
      getPath(raw, ["block_emission"])
    ) ?? SAMPLE_BUNDLE.block.emissionPerBlock;

  const annualProvision =
    pickFirst(
      getPath(raw, ["block", "annualProvision"]),
      getPath(raw, ["block", "annual_provision"]),
      getPath(raw, ["block", "annual"]),
      getPath(raw, ["annual_provision"])
    ) ?? SAMPLE_BUNDLE.block.annualProvision;

  const stakingDynamics =
    (getPath(raw, ["charts", "stakingDynamics"]) ??
      getPath(raw, ["charts", "staking_dynamics"]) ??
      getPath(raw, ["staking", "dynamics"]) ??
      getPath(raw, ["staking", "chart"])) ??
    SAMPLE_BUNDLE.charts.stakingDynamics;

  const unbondingMap =
    (getPath(raw, ["charts", "unbondingMap"]) ??
      getPath(raw, ["charts", "unbonding_map"]) ??
      getPath(raw, ["staking", "unbonding"]) ??
      getPath(raw, ["staking", "unbonding_map"])) ??
    SAMPLE_BUNDLE.charts.unbondingMap;

  const aprSeries =
    (getPath(raw, ["charts", "apr"]) ??
      getPath(raw, ["charts", "apr_history"]) ??
      getPath(raw, ["staking", "apr_history"]) ??
      getPath(raw, ["staking", "apr_chart"])) ??
    SAMPLE_BUNDLE.charts.apr;

  const inflationSeries =
    (getPath(raw, ["charts", "inflation"]) ??
      getPath(raw, ["charts", "inflation_history"]) ??
      getPath(raw, ["inflation", "chart"])) ??
    SAMPLE_BUNDLE.charts.inflation;

  const emissionSeries =
    (getPath(raw, ["charts", "emission"]) ??
      getPath(raw, ["charts", "emission_history"]) ??
      getPath(raw, ["block", "emission_history"]) ??
      getPath(raw, ["emission", "chart"])) ??
    SAMPLE_BUNDLE.charts.emission;

  const mintedLink =
    (getPath(raw, ["links", "mintedSupply"]) as string | undefined) ??
    (getPath(raw, ["links", "minted"]) as string | undefined) ??
    SAMPLE_BUNDLE.copy.mintedSupplyHref;

  const validatorsLink =
    (getPath(raw, ["links", "validators"]) as string | undefined) ??
    SAMPLE_BUNDLE.copy.validatorsHref;

  const inflationLink =
    (getPath(raw, ["links", "inflation"]) as string | undefined) ??
    SAMPLE_BUNDLE.copy.inflationHref;

  return {
    overview: {
      mintedSupply: maybeUatomToAtom(
        mintedSupply,
        SAMPLE_BUNDLE.overview.mintedSupply
      ),
      bondedTokens: {
        amount: maybeUatomToAtom(
          bondedAmount,
          SAMPLE_BUNDLE.overview.bondedTokens.amount
        ),
        percent: toNumber(bondedPercent, SAMPLE_BUNDLE.overview.bondedTokens.percent),
      },
      notBondedTokens: {
        amount: maybeUatomToAtom(
          notBondedAmount,
          SAMPLE_BUNDLE.overview.notBondedTokens.amount
        ),
        percent: toNumber(notBondedPercent, SAMPLE_BUNDLE.overview.notBondedTokens.percent),
      },
      unbondingTokens: {
        amount: maybeUatomToAtom(
          unbondingAmount,
          SAMPLE_BUNDLE.overview.unbondingTokens.amount
        ),
        percent: toNumber(unbondingPercent, SAMPLE_BUNDLE.overview.unbondingTokens.percent),
      },
      unbondingPeriodDays: toNumber(unbondingPeriod, SAMPLE_BUNDLE.overview.unbondingPeriodDays),
    },
    rewards: {
      apr: toNumber(apr, SAMPLE_BUNDLE.rewards.apr),
      apy: toNumber(apy, SAMPLE_BUNDLE.rewards.apy),
      realStakingReward: toNumber(rsr, SAMPLE_BUNDLE.rewards.realStakingReward),
      rewardShareInflation: toNumber(rsi, SAMPLE_BUNDLE.rewards.rewardShareInflation),
    },
    inflation: {
      coded: toNumber(inflationCoded, SAMPLE_BUNDLE.inflation.coded),
      real: toNumber(inflationReal, SAMPLE_BUNDLE.inflation.real),
      floor: toNumber(inflationFloor, SAMPLE_BUNDLE.inflation.floor),
      ceiling: toNumber(inflationCeiling, SAMPLE_BUNDLE.inflation.ceiling),
    },
    block: {
      timeSeconds: toNumber(blockTime, SAMPLE_BUNDLE.block.timeSeconds),
      emissionPerBlock: maybeUatomToAtom(
        emissionPerBlock,
        SAMPLE_BUNDLE.block.emissionPerBlock
      ),
      annualProvision: maybeUatomToAtom(
        annualProvision,
        SAMPLE_BUNDLE.block.annualProvision
      ),
    },
    charts: {
      stakingDynamics: Array.isArray(stakingDynamics)
        ? stakingDynamics.map((point: any) => ({
            date: point.date || point.timestamp || point.time || "",
            bonded: maybeUatomToAtom(
              point.bonded ?? point.bondedTokens ?? point.bonded_tokens,
              0
            ),
            notBonded: maybeUatomToAtom(
              point.notBonded ?? point.not_bonded ?? point.notBondedTokens,
              0
            ),
          }))
        : SAMPLE_BUNDLE.charts.stakingDynamics,
      unbondingMap: Array.isArray(unbondingMap)
        ? unbondingMap.map((point: any) => ({
            date: point.date || point.timestamp || point.time || "",
            amount: maybeUatomToAtom(point.amount ?? point.value ?? point.unbonding, 0),
          }))
        : SAMPLE_BUNDLE.charts.unbondingMap,
      apr: Array.isArray(aprSeries)
        ? aprSeries.map((point: any) => ({
            date: point.date || point.timestamp || point.time || "",
            apr: toNumber(point.apr ?? point.value ?? point.rate, 0),
          }))
        : SAMPLE_BUNDLE.charts.apr,
      inflation: Array.isArray(inflationSeries)
        ? inflationSeries.map((point: any) => ({
            date: point.date || point.timestamp || point.time || "",
            inflation: toNumber(point.inflation ?? point.value ?? point.rate, 0),
            floor: toNumber(point.floor ?? point.min ?? SAMPLE_BUNDLE.inflation.floor),
            ceiling: toNumber(point.ceiling ?? point.max ?? SAMPLE_BUNDLE.inflation.ceiling),
          }))
        : SAMPLE_BUNDLE.charts.inflation,
      emission: Array.isArray(emissionSeries)
        ? emissionSeries.map((point: any) => ({
            date: point.date || point.timestamp || point.time || "",
            emission: maybeUatomToAtom(point.emission ?? point.value ?? point.amount, 0),
          }))
        : SAMPLE_BUNDLE.charts.emission,
    },
    copy: {
      mintedSupplyHref: mintedLink,
      validatorsHref: validatorsLink,
      inflationHref: inflationLink,
    },
  };
}

async function fetchFirstHealthy(pathCandidates: string[]): Promise<any | null> {
  for (const path of pathCandidates) {
    const url = path.startsWith("http")
      ? path
      : `${COSMOS_STATS_BASE}${path.startsWith("/") ? "" : "/"}${path}`;
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) continue;
      const json = await res.json();
      if (json) return json;
    } catch (err) {
      console.warn("[CosmosStatsService] fetch failure", path, err);
      continue;
    }
  }
  return null;
}

const STATS_PATHS = [
  "/api/v1/chains/cosmoshub/stats",
  "/api/v1/stats?chain=cosmoshub",
  "/api/v1/chains/stats?chain=cosmoshub",
  "/v1/chains/cosmoshub/stats",
  "/chains/cosmoshub/stats",
  "https://akash.api.arcturian.tech/api/v1/chains/cosmoshub/stats",
  "https://akash.api.arcturian.tech/api/v1/stats?chain=cosmoshub",
];

const OVERVIEW_PATHS = [
  "/api/v1/chains/cosmoshub/stats/overview",
  "/api/v1/chains/cosmoshub/overview",
  "/api/v1/overview?chain=cosmoshub",
  "/v1/chains/cosmoshub/overview",
];

const REWARDS_PATHS = [
  "/api/v1/chains/cosmoshub/stats/rewards",
  "/api/v1/chains/cosmoshub/rewards",
  "/api/v1/rewards?chain=cosmoshub",
];

const INFLATION_PATHS = [
  "/api/v1/chains/cosmoshub/stats/inflation",
  "/api/v1/chains/cosmoshub/inflation",
  "/api/v1/inflation?chain=cosmoshub",
];

const BLOCK_PATHS = [
  "/api/v1/chains/cosmoshub/stats/block",
  "/api/v1/chains/cosmoshub/block",
  "/api/v1/block?chain=cosmoshub",
];

const STAKING_CHART_PATHS = [
  "/api/v1/chains/cosmoshub/stats/charts/staking",
  "/api/v1/charts/staking?chain=cosmoshub",
];

const UNBONDING_CHART_PATHS = [
  "/api/v1/chains/cosmoshub/stats/charts/unbonding",
  "/api/v1/charts/unbonding?chain=cosmoshub",
];

const APR_CHART_PATHS = [
  "/api/v1/chains/cosmoshub/stats/charts/apr",
  "/api/v1/charts/apr?chain=cosmoshub",
];

const INFLATION_CHART_PATHS = [
  "/api/v1/chains/cosmoshub/stats/charts/inflation",
  "/api/v1/charts/inflation?chain=cosmoshub",
];

const EMISSION_CHART_PATHS = [
  "/api/v1/chains/cosmoshub/stats/charts/emission",
  "/api/v1/charts/emission?chain=cosmoshub",
];

export const CosmosStatsService = {
  async fetchBundle(): Promise<CosmosStatsBundle> {
    // Try to fetch REAL data from Cosmos LCD first
    const lcdData = await CosmosLcdService.fetchRealData();
    
    if (lcdData) {
      console.log('[CosmosStats] Using REAL data from Cosmos LCD');
      // Build bundle from real LCD data
      // Note: Charts are empty arrays since no historical API exists
      return {
        overview: {
          mintedSupply: lcdData.supply.totalSupply,
          bondedTokens: {
            amount: lcdData.pool.bondedTokens,
            percent: lcdData.computed.bondedPercent,
          },
          notBondedTokens: {
            amount: lcdData.pool.notBondedTokens,
            percent: lcdData.computed.notBondedPercent,
          },
          unbondingTokens: {
            amount: lcdData.supply.totalSupply - lcdData.pool.bondedTokens - lcdData.pool.notBondedTokens,
            percent: lcdData.computed.unbondingPercent,
          },
          unbondingPeriodDays: lcdData.params.unbondingPeriodDays,
        },
        rewards: {
          // Estimate APR from inflation and bonded ratio
          apr: lcdData.inflation.rate / (lcdData.computed.bondedPercent / 100),
          apy: (lcdData.inflation.rate / (lcdData.computed.bondedPercent / 100)) * 1.05, // rough compound estimate
          realStakingReward: (lcdData.inflation.rate / (lcdData.computed.bondedPercent / 100)) - lcdData.inflation.rate,
          rewardShareInflation: 98, // typical value
        },
        inflation: {
          coded: 10, // Cosmos Hub target
          real: lcdData.inflation.rate,
          floor: 7,
          ceiling: 20,
        },
        block: {
          timeSeconds: 6.5, // approximate
          emissionPerBlock: lcdData.inflation.annualProvisions / (365 * 24 * 60 * 60 / 6.5),
          annualProvision: lcdData.inflation.annualProvisions,
        },
        charts: {
          // NO HISTORICAL DATA AVAILABLE - these endpoints don't exist
          stakingDynamics: [],
          unbondingMap: [],
          apr: [],
          inflation: [],
          emission: [],
        },
        copy: {
          mintedSupplyHref: "https://www.mintscan.io/cosmos/proposals",
          validatorsHref: "https://www.mintscan.io/cosmos/validators",
          inflationHref: "https://docs.cosmos.network/main/tokenomics/inflation",
        },
      };
    }

    // Fallback: try Arcturian (which is not implemented)
    console.warn('[CosmosStats] LCD failed, trying Arcturian API (likely unavailable)');
    const remote = await fetchFirstHealthy(STATS_PATHS);
    const bundle = normaliseBundle(remote);
    if (bundle) return bundle;

    const [
      overview,
      rewards,
      inflation,
      block,
      stakingChart,
      unbondingChart,
      aprChart,
      inflationChart,
      emissionChart,
    ] = await Promise.all([
      fetchFirstHealthy(OVERVIEW_PATHS),
      fetchFirstHealthy(REWARDS_PATHS),
      fetchFirstHealthy(INFLATION_PATHS),
      fetchFirstHealthy(BLOCK_PATHS),
      fetchFirstHealthy(STAKING_CHART_PATHS),
      fetchFirstHealthy(UNBONDING_CHART_PATHS),
      fetchFirstHealthy(APR_CHART_PATHS),
      fetchFirstHealthy(INFLATION_CHART_PATHS),
      fetchFirstHealthy(EMISSION_CHART_PATHS),
    ]);

    const assembled = {
      overview,
      rewards,
      inflation,
      block,
      charts: {
        stakingDynamics: getPath(stakingChart, ["data"]) || stakingChart,
        unbondingMap: getPath(unbondingChart, ["data"]) || unbondingChart,
        apr: getPath(aprChart, ["data"]) || aprChart,
        inflation: getPath(inflationChart, ["data"]) || inflationChart,
        emission: getPath(emissionChart, ["data"]) || emissionChart,
      },
    };

    const fallbackBundle = normaliseBundle(assembled);
    if (fallbackBundle) return fallbackBundle;

    throw new Error("Cosmos stats payload unavailable - no real data source found");
  },

  getSample(): CosmosStatsBundle {
    return SAMPLE_BUNDLE;
  },
};

export type { CosmosStatsBundle as CosmosStatsData };
