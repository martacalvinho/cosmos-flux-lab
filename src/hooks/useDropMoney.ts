import { useQuery } from '@tanstack/react-query';
import { CosmWasmClient } from '@cosmjs/cosmwasm-stargate';
import { daysBetween } from '@/lib/utils';
import { fetchCoinGeckoPrice } from '@/services/coingecko';

// Define interfaces for our data structures
interface ExchangeRateRow {
  id: number;
  timestamp: string;
  exchange_rate: number;
}

interface DropMoneyData {
  tvlUsd?: number;
  apy?: number;
  apr?: number;
  currentExchangeRate?: number;
  history?: ExchangeRateRow[];
}

// Constants
const RPC_ENDPOINT = 'https://rpc-kralum.neutron-1.neutron.org:443';
const REST_ENDPOINT = 'https://rest-kralum.neutron-1.neutron.org';
const CORE_CONTRACT = 'neutron16m3hjh7l04kap086jgwthduma0r5l0wh8kc6kaqk92ge9n5aqvys9q6lxr';
const TOKEN_CONTRACT = 'neutron1k6hr0f83e7un2wjf29cspk7j69jrnskk65k3ek2nj9dztrlzpj6q00rtsa';
const ATOM_COINGECKO_ID = 'cosmos';

// --- Calculation Functions ---

// Calculate APY and APR from historical snapshot data
function calcApyApr(history: ExchangeRateRow[]) {
  if (!history || history.length < 2) return { apy: undefined, periodDays: undefined };

  const sorted = [...history].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const latest = sorted[sorted.length - 1];
  let past = sorted[0]; // Default to the earliest record

  // Find the record closest to 30 days ago
  const targetDate = new Date(latest.timestamp);
  targetDate.setDate(targetDate.getDate() - 30);

  for (let i = sorted.length - 2; i >= 0; i--) {
    const dt = new Date(sorted[i].timestamp);
    if (dt <= targetDate) {
      past = sorted[i];
      break;
    }
  }

  const periodDays = Math.max(1, daysBetween(new Date(past.timestamp), new Date(latest.timestamp)));
  const periodicReturn = latest.exchange_rate / past.exchange_rate - 1;
  const factor = 365 / periodDays;

  // Only show APY if we have at least 28 days of data
  const apy = periodDays >= 28 ? Math.pow(1 + periodicReturn, factor) - 1 : undefined;

  return { apy, periodDays };
}

// Compute APR using only the latest snapshot vs the prior snapshot
function calcSnapshotApr(history: ExchangeRateRow[]) {
  if (!history || history.length < 2) return { apr: undefined as number | undefined };
  const sorted = [...history].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const prev = sorted[sorted.length - 2];
  const latest = sorted[sorted.length - 1];

  if (!prev || !latest) return { apr: undefined };

  // Min period of 1 hour to avoid extreme APRs from rapid snapshots
  const periodDays = Math.max(daysBetween(new Date(prev.timestamp), new Date(latest.timestamp)), 1 / 24);
  if (periodDays <= 0) return { apr: 0 }; // Avoid division by zero if timestamps are identical
  const periodicReturn = latest.exchange_rate / prev.exchange_rate - 1;
  const factor = 365 / periodDays;
  const apr = periodicReturn * factor;

  return { apr };
}

// --- Data Fetching Functions ---

// Fetch historical data from our JSON file
async function fetchHistory(): Promise<ExchangeRateRow[]> {
  const response = await fetch('/data/drop-money-exchange-history.json');
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }
  return response.json();
}

// Fetch live data from smart contracts and CoinGecko
async function fetchRealtimeData() {
  try {
    const client = await CosmWasmClient.connect(RPC_ENDPOINT);

    // Query contracts and price
    const [exchangeRateResult, tokenConfig, priceData] = await Promise.all([
      client.queryContractSmart(CORE_CONTRACT, { exchange_rate: {} }),
      client.queryContractSmart(TOKEN_CONTRACT, { config: {} }),
      fetchCoinGeckoPrice([ATOM_COINGECKO_ID]),
    ]);

    const dAtomDenom = tokenConfig.denom;
    if (!dAtomDenom) {
      throw new Error('Could not find dATOM denom in token contract config');
    }

    // Fetch total supply from the bank module
    const supplyRes = await fetch(`${REST_ENDPOINT}/cosmos/bank/v1beta1/supply/by_denom?denom=${dAtomDenom}`);
    if (!supplyRes.ok) {
      throw new Error(`Failed to fetch supply for ${dAtomDenom}`);
    }
    const supplyData = await supplyRes.json();

    const currentExchangeRate = parseFloat(exchangeRateResult);
    const totalSupply = parseInt(supplyData.amount.amount, 10) / 1e6; // Convert from udropATOM
    const priceUsd = priceData[ATOM_COINGECKO_ID]?.usd;

    if (isNaN(currentExchangeRate) || isNaN(totalSupply) || priceUsd === undefined) {
      throw new Error('Failed to fetch one or more realtime data points.');
    }

    // Calculate TVL
    const tvlAtom = totalSupply * currentExchangeRate;
    const tvlUsd = tvlAtom * priceUsd;

    return { tvlUsd, currentExchangeRate };
  } catch (error) {
    console.error('Error fetching Drop.money realtime data:', error);
    throw error;
  }
}

// --- React Hook ---

export function useDropMoney(): { data?: DropMoneyData; isLoading: boolean; isError: boolean } {
  const historyQuery = useQuery({
    queryKey: ['dropMoneyHistory'],
    queryFn: fetchHistory,
  });

  const realtimeQuery = useQuery({
    queryKey: ['dropMoneyRealtime'],
    queryFn: fetchRealtimeData,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Calculate APY (30d) from full history
  const { apy } = historyQuery.data ? calcApyApr(historyQuery.data) : { apy: undefined };
  // Calculate APR (Current Rate) from the last two snapshots
  const { apr } = historyQuery.data ? calcSnapshotApr(historyQuery.data) : { apr: undefined };

  const data: DropMoneyData = {
    tvlUsd: realtimeQuery.data?.tvlUsd,
    currentExchangeRate: realtimeQuery.data?.currentExchangeRate,
    apy: apy,
    apr: apr, // This is the 'Current Rate'
    history: historyQuery.data,
  };

  return {
    data,
    isLoading: historyQuery.isLoading || realtimeQuery.isLoading,
    isError: historyQuery.isError || realtimeQuery.isError,
  };
}
