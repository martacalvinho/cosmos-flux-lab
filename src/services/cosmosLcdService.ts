/**
 * Cosmos LCD (Light Client Daemon) Service
 * Fetches REAL current data from Cosmos Hub REST API
 * 
 * Note: These endpoints provide current snapshots only, not historical time-series data.
 * Historical charts require an indexer/analytics service.
 */

const LCD_BASE = 'https://rest.cosmos.directory/cosmoshub';

interface PoolResponse {
  pool: {
    not_bonded_tokens: string;
    bonded_tokens: string;
  };
}

interface ParamsResponse {
  params: {
    unbonding_time: string; // e.g., "1814400s"
    max_validators: number;
    max_entries: number;
    historical_entries: number;
    bond_denom: string;
    min_commission_rate: string;
  };
}

interface SupplyItem {
  denom: string;
  amount: string;
}

interface SupplyResponse {
  supply: SupplyItem[];
  pagination?: {
    next_key: string | null;
    total: string;
  };
}

interface InflationResponse {
  inflation: string; // e.g., "0.130000000000000000"
}

interface AnnualProvisionsResponse {
  annual_provisions: string; // e.g., "57841791588497.123456789012345678"
}

export interface CosmosLcdData {
  pool: {
    bondedTokens: number; // in ATOM
    notBondedTokens: number; // in ATOM
    totalStaked: number; // in ATOM
  };
  supply: {
    totalSupply: number; // in ATOM
  };
  params: {
    unbondingPeriodDays: number;
    maxValidators: number;
  };
  inflation: {
    rate: number; // as percentage
    annualProvisions: number; // in ATOM
  };
  computed: {
    bondedPercent: number;
    notBondedPercent: number;
    unbondingPercent: number; // derived
  };
}

function uatomToAtom(uatom: string | number): number {
  const num = typeof uatom === 'string' ? parseFloat(uatom) : uatom;
  return num / 1_000_000;
}

function secondsToDays(seconds: string): number {
  const sec = parseInt(seconds.replace('s', ''), 10);
  return Math.round(sec / 86400);
}

async function fetchJson<T>(path: string): Promise<T | null> {
  try {
    const url = `${LCD_BASE}${path}`;
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) {
      console.warn(`[CosmosLCD] HTTP ${response.status} for ${path}`);
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error(`[CosmosLCD] Fetch error for ${path}:`, error);
    return null;
  }
}

export const CosmosLcdService = {
  async fetchRealData(): Promise<CosmosLcdData | null> {
    try {
      // Fetch all endpoints in parallel
      const [poolData, paramsData, supplyData, inflationData, provisionsData] = await Promise.all([
        fetchJson<PoolResponse>('/cosmos/staking/v1beta1/pool'),
        fetchJson<ParamsResponse>('/cosmos/staking/v1beta1/params'),
        fetchJson<SupplyResponse>('/cosmos/bank/v1beta1/supply?pagination.limit=5000'),
        fetchJson<InflationResponse>('/cosmos/mint/v1beta1/inflation'),
        fetchJson<AnnualProvisionsResponse>('/cosmos/mint/v1beta1/annual_provisions'),
      ]);

      if (!poolData || !paramsData || !supplyData) {
        console.error('[CosmosLCD] Missing required data');
        return null;
      }

      // Parse pool data
      const bondedTokens = uatomToAtom(poolData.pool.bonded_tokens);
      const notBondedTokens = uatomToAtom(poolData.pool.not_bonded_tokens);
      const totalStaked = bondedTokens + notBondedTokens;

      // Parse total supply (find uatom in supply list)
      const atomSupplyItem = supplyData.supply.find((item) => item.denom === 'uatom');
      const totalSupply = atomSupplyItem ? uatomToAtom(atomSupplyItem.amount) : bondedTokens + notBondedTokens;

      // Parse params
      const unbondingPeriodDays = secondsToDays(paramsData.params.unbonding_time);
      const maxValidators = paramsData.params.max_validators;

      // Parse inflation
      const inflationRate = inflationData ? parseFloat(inflationData.inflation) * 100 : 13.0;
      const annualProvisions = provisionsData ? uatomToAtom(provisionsData.annual_provisions) : 0;

      // Compute percentages
      const bondedPercent = (bondedTokens / totalSupply) * 100;
      const notBondedPercent = (notBondedTokens / totalSupply) * 100;
      const unbondingPercent = Math.max(0, 100 - bondedPercent - notBondedPercent);

      return {
        pool: {
          bondedTokens,
          notBondedTokens,
          totalStaked,
        },
        supply: {
          totalSupply,
        },
        params: {
          unbondingPeriodDays,
          maxValidators,
        },
        inflation: {
          rate: inflationRate,
          annualProvisions,
        },
        computed: {
          bondedPercent,
          notBondedPercent,
          unbondingPercent,
        },
      };
    } catch (error) {
      console.error('[CosmosLCD] Failed to fetch real data:', error);
      return null;
    }
  },
};
