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
];

export const LENDING_PROTOCOLS = [
  {
    category: "lending" as const,
    protocol: "Mars Protocol",
    chain: "Osmosis",
    title: "Supply/Borrow ATOM",
    assets: ["ATOM", "OSMO", "stATOM"],
    status: "active" as const,
    metrics: {
      "Supply APY": "8.2%",
      "Borrow APY": "12.5%",
      "Collateral Factor": "75%",
      "Liquidation Threshold": "80%",
      TVL: "$125M",
      Oracle: "Pyth Network",
    },
    risks: ["Liquidation", "Smart-contract", "Oracle-Peg"],
    howItWorks: [
      "Supply assets to earn interest",
      "Use supplied assets as collateral",
      "Borrow against your collateral",
      "Monitor health factor to avoid liquidation",
    ],
    links: {
      app: "https://app.marsprotocol.io",
      docs: "https://docs.marsprotocol.io",
    },
    dataSource: "Mars API",
    lastUpdated: "2 mins ago",
  },
];

export const PERPS_PROTOCOLS = [
  {
    category: "perps" as const,
    protocol: "dYdX",
    chain: "dYdX",
    title: "ATOM Perpetuals",
    assets: ["ATOM-PERP"],
    status: "active" as const,
    metrics: {
      "Funding Rate": "-0.02%",
      "Open Interest": "$45M",
      "24h Volume": "$125M",
      "Max Leverage": "20x",
    },
    risks: ["Liquidation", "Funding", "Market"],
    howItWorks: [
      "Deposit collateral (USDC)",
      "Open long/short ATOM position",
      "Pay/receive funding every hour",
      "Close position or get liquidated",
    ],
    links: {
      app: "https://trade.dydx.exchange",
      docs: "https://docs.dydx.exchange",
    },
    dataSource: "dYdX API",
    lastUpdated: "30 secs ago",
  },
];

export const PROTOCOL_DATA = {
  "staking": STAKING_PROTOCOLS,
  "liquid-staking": LIQUID_STAKING_PROTOCOLS,
  "lending": LENDING_PROTOCOLS,
  "perps": PERPS_PROTOCOLS,
} as const;
