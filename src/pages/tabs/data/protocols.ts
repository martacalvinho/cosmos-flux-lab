// Static protocol data per category, extracted from Home.tsx

export const STAKING_PROTOCOLS = [
  {
    category: "staking" as const,
    protocol: "Cosmos Hub",
    chain: "Cosmos",
    title: "Stake ATOM",
    assets: ["ATOM"],
    status: "active" as const,
    metrics: {
      APR: "18.5%",
      Commission: "5-10%",
      Validators: "180 active",
      Unbonding: "21 days",
    },
    risks: ["Unbonding", "Slashing"],
    howItWorks: [
      "Choose a validator from active set",
      "Delegate your ATOM tokens",
      "Earn staking rewards daily",
      "Unbond with 21-day waiting period",
    ],
    links: {
      app: "https://wallet.keplr.app",
      docs: "https://hub.cosmos.network/main/delegators/delegator-guide-cli.html",
    },
    dataSource: "Cosmos Hub API",
    lastUpdated: "2 mins ago",
  },
  {
    category: "staking" as const,
    protocol: "Osmosis",
    chain: "Osmosis",
    title: "Stake OSMO",
    assets: ["OSMO"],
    status: "active" as const,
    metrics: {
      APR: "22.1%",
      Commission: "1-8%",
      Validators: "150 active",
      Unbonding: "14 days",
    },
    risks: ["Unbonding", "Slashing"],
    howItWorks: [
      "Connect to Osmosis network",
      "Select validator with good performance",
      "Delegate OSMO tokens",
      "Compound rewards regularly",
    ],
    links: {
      app: "https://app.osmosis.zone",
      docs: "https://docs.osmosis.zone/overview/validate",
    },
    dataSource: "Osmosis API",
    lastUpdated: "3 mins ago",
  },
];

export const LIQUID_STAKING_PROTOCOLS = [
  {
    category: "liquid-staking" as const,
    protocol: "Stride",
    chain: "Stride",
    title: "Liquid Stake ATOM → stATOM",
    description:
      "Liquid staking protocol that allows you to stake ATOM while maintaining liquidity through stATOM tokens.",
    assets: ["ATOM", "stATOM"],
    status: "active" as const,
    metrics: {
      APR: "16.2%",
      "Exchange Rate": "1.087 ATOM",
      "Protocol Fee": "10%",
      TVL: "$450M",
      Redemption: "Instant swap",
    },
    risks: ["Smart-contract", "Unbonding"],
    howItWorks: [
      "Send ATOM to Stride protocol",
      "Receive liquid stATOM tokens",
      "Use stATOM in DeFi while earning staking rewards",
      "Redeem anytime via DEX or wait for unbonding",
    ],
    links: {
      app: "https://app.stride.zone",
      docs: "https://docs.stride.zone",
      pool: "https://app.osmosis.zone/pool/803",
    },
    dataSource: "Stride API",
    lastUpdated: "1 min ago",
  },
  {
    category: "liquid-staking" as const,
    protocol: "Drop.money",
    chain: "",
    title: "Liquid Stake ATOM → dropATOM",
    description:
      "Liquid staking solution providing dropATOM tokens while earning staking rewards on your ATOM.",
    assets: ["ATOM", "dropATOM"],
    status: "active" as const,
    metrics: {
      APR: "0%",
    },
    risks: ["Smart-contract", "Unbonding"],
    howItWorks: [
      "Deposit ATOM",
      "Receive dropATOM and keep liquidity",
      "Use dropATOM across DeFi",
    ],
    links: {
      app: "https://drop.money/",
    },
    dataSource: "Static",
    lastUpdated: "just now",
  },
  {
    category: "liquid-staking" as const,
    protocol: "pStake",
    chain: "",
    title: "Liquid Stake ATOM → stkATOM",
    description:
      "Multi-chain liquid staking platform offering stkATOM for liquid staking derivatives.",
    assets: ["ATOM", "stkATOM"],
    status: "active" as const,
    metrics: {
      APR: "0%",
    },
    risks: ["Smart-contract", "Unbonding"],
    howItWorks: [
      "Stake ATOM via pStake",
      "Receive stkATOM",
      "Use stkATOM in DeFi apps",
    ],
    links: {
      app: "https://pstake.finance/",
    },
    dataSource: "Static",
    lastUpdated: "just now",
  },
  {
    category: "liquid-staking" as const,
    protocol: "Milky Way",
    chain: "",
    title: "Liquid Stake ATOM → milkATOM",
    description:
      "Liquid staking protocol providing milkATOM tokens with automated staking rewards distribution.",
    assets: ["ATOM", "milkATOM"],
    status: "active" as const,
    metrics: {
      APR: "0%",
    },
    risks: ["Smart-contract", "Unbonding"],
    howItWorks: [
      "Stake to mint milkATOM",
      "Keep liquidity and earn rewards",
    ],
    links: {
      app: "https://milkyway.zone/",
    },
    dataSource: "Static",
    lastUpdated: "just now",
  },
  {
    category: "liquid-staking" as const,
    protocol: "Quicksilver",
    chain: "",
    title: "Liquid Stake ATOM → qATOM",
    description:
      "Interchain liquid staking protocol enabling users to stake assets across multiple Cosmos chains while maintaining liquidity.",
    assets: ["ATOM", "qATOM"],
    status: "active" as const,
    metrics: {
      APR: "0%",
    },
    risks: ["Smart-contract", "Unbonding"],
    howItWorks: [
      "Stake via Quicksilver",
      "Receive qATOM",
    ],
    links: {
      app: "https://app.quicksilver.zone/staking",
    },
    dataSource: "Static",
    lastUpdated: "just now",
  },
];

export const LENDING_PROTOCOLS = [
  // Copied to mirror atomtest static Lending entries
  {
    category: "lending" as const,
    protocol: "Kava Lend",
    chain: "Kava",
    description: "Supply ATOM to earn yield",
    status: "active" as const,
    metrics: {
      "Supply APY": "12.3%",
      TVL: "$25M",
    },
    links: {
      app: "https://app.kava.io/lend",
    },
    dataSource: "Static",
    lastUpdated: "just now",
  },
  {
    category: "lending" as const,
    protocol: "Mars Protocol",
    chain: "Osmosis",
    description: "Lending and borrowing hub",
    status: "active" as const,
    metrics: {
      "Supply APY": "14.8%",
      TVL: "$18M",
    },
    links: {
      app: "https://app.marsprotocol.io/",
    },
    dataSource: "Static",
    lastUpdated: "just now",
  },
  {
    category: "lending" as const,
    protocol: "UX Chain",
    chain: "UX",
    description: "Cross-chain lending protocol",
    status: "active" as const,
    metrics: {
      "Supply APY": "11.2%",
      TVL: "$5M",
    },
    links: {
      app: "https://app.ux.xyz/assets/ibc%2FC4CFF46FD6DE35CA4CF4CE031E643C8FDC9BA4B99AE598E9B0ED98FE3A2319F9",
    },
    dataSource: "Static",
    lastUpdated: "just now",
  },
  {
    category: "lending" as const,
    protocol: "Inter Protocol",
    chain: "Agoric",
    description: "Add collateral to mint IST",
    status: "active" as const,
    metrics: {
      "Supply APY": "—",
      TVL: "—",
    },
    links: {
      app: "https://app.inter.trade/#/vaults",
    },
    dataSource: "Static",
    lastUpdated: "just now",
  },
  {
    category: "lending" as const,
    protocol: "Shade Lend",
    chain: "Secret",
    description: "Privacy-focused lending protocol on Secret Network",
    status: "active" as const,
    metrics: {
      "Supply APY": "—",
      TVL: "—",
    },
    links: {
      app: "https://app.shadeprotocol.io/lend",
    },
    dataSource: "Static",
    lastUpdated: "just now",
  },
  {
    category: "lending" as const,
    protocol: "Neptune Finance",
    chain: "",
    description: "Multi-chain lending and borrowing platform",
    status: "active" as const,
    metrics: {
      "Supply APY": "—",
      TVL: "—",
    },
    links: {
      app: "https://nept.finance/rates/",
    },
    dataSource: "Static",
    lastUpdated: "just now",
  },
];

export const PERPS_PROTOCOLS = [
  {
    category: "perps" as const,
    protocol: "dYdX",
    chain: "dYdX",
    description: "Trade ATOM-USD perpetuals with up to 10x leverage.",
    status: "active" as const,
    links: {
      app: "https://dydx.trade/trade/ATOM-USD",
    },
    dataSource: "Static",
    lastUpdated: "just now",
  },
  {
    category: "perps" as const,
    protocol: "Levana",
    chain: "Osmosis",
    description: "Perpetuals for ATOM on Osmosis with up to 10x leverage.",
    status: "active" as const,
    links: {
      app: "https://trade.levana.finance/osmosis/trade/ATOM_USD",
    },
    dataSource: "Static",
    lastUpdated: "just now",
  },
  {
    category: "perps" as const,
    protocol: "Nolus",
    chain: "Nolus",
    description: "DeFi Lease to open leveraged positions with partial down payment.",
    status: "active" as const,
    links: {
      app: "https://app.nolus.io/",
    },
    dataSource: "Static",
    lastUpdated: "just now",
  },
  {
    category: "perps" as const,
    protocol: "Bull v Bear",
    chain: "",
    description: "Tokenized long/short exposure to ATOM using Bull/Bear tokens.",
    status: "active" as const,
    links: {
      app: "https://bullbear.zone/?long=ATOM",
    },
    dataSource: "Static",
    lastUpdated: "just now",
  },
  {
    category: "perps" as const,
    protocol: "Mars Protocol",
    chain: "Osmosis",
    description: "Perpetual futures trading for ATOM with advanced risk management.",
    status: "active" as const,
    links: {
      app: "https://app.marsprotocol.io/perps",
    },
    dataSource: "Static",
    lastUpdated: "just now",
  },
  {
    category: "perps" as const,
    protocol: "Helix",
    chain: "Injective",
    description: "ATOM-USDT perpetual futures with up to 10x leverage.",
    status: "active" as const,
    links: {
      app: "https://helixapp.com/futures/atom-usdt-perp",
    },
    dataSource: "Static",
    lastUpdated: "just now",
  },
];

export const PROTOCOL_DATA = {
  "staking": STAKING_PROTOCOLS,
  "liquid-staking": LIQUID_STAKING_PROTOCOLS,
  "lending": LENDING_PROTOCOLS,
  "perps": PERPS_PROTOCOLS,
  "leverage": PERPS_PROTOCOLS,
} as const;
