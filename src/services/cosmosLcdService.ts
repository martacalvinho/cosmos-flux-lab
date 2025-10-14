/**
 * Cosmos LCD (Light Client Daemon) Service
 * Fetches REAL current data from Cosmos Hub REST API
 * 
 * Note: These endpoints provide current snapshots only, not historical time-series data.
 * Historical charts require an indexer/analytics service.
 */

import { fetchCoinGeckoPrice } from './coingecko';

const LCD_BASE = 'https://cosmos-api.polkachu.com';

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

interface CommunityPoolCoin {
  denom: string;
  amount: string;
}

interface CommunityPoolResponse {
  pool: CommunityPoolCoin[];
}

interface DistributionParamsResponse {
  params: {
    community_tax: string;
    base_proposer_reward?: string;
    bonus_proposer_reward?: string;
    withdraw_addr_enabled?: boolean;
  };
}

interface MintParamsResponse {
  params: {
    mint_denom: string;
    inflation_rate_change: string;
    inflation_max: string;
    inflation_min: string;
    goal_bonded: string;
    blocks_per_year: string;
  };
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
    min: number; // minimum inflation as percentage
    max: number; // maximum inflation as percentage
    goalBonded: number; // target bonded ratio as percentage
  };
  block: {
    timeSeconds: number; // average block time in seconds
    blocksPerYear: number; // expected blocks per year
  };
  computed: {
    bondedPercent: number;
    notBondedPercent: number;
    unbondingPercent: number; // derived
  };
  communityPool: {
    assets: Array<{
      denom: string;
      displayDenom: string;
      amount: number;
      rawAmount: string;
      usdValue?: number;
    }>;
    totalAtom: number;
    totalUsdValue: number;
    communityTax: number; // as percentage
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

// CoinGecko ID mapping for token symbols
const COINGECKO_ID_MAP: Record<string, string> = {
  'ATOM': 'cosmos',
  'TIA': 'celestia',
  'stTIA': 'stride-staked-tia',
  'USDC': 'usd-coin',
  'NTRN': 'neutron-3',
  'OSMO': 'osmosis',
  'STARS': 'stargaze',
  'JUNO': 'juno-network',
  'AKT': 'akash-network',
  'SCRT': 'secret',
  'REGEN': 'regen',
  'DVPN': 'sentinel',
  'XPRT': 'persistence',
  'stATOM': 'stride-staked-atom',
  'IRIS': 'iris-network',
  'CRO': 'crypto-com-chain',
  'KAVA': 'kava',
  'BAND': 'band-protocol',
  'PICA': 'picasso',
  'SOMM': 'sommelier',
  'DYDX': 'dydx-chain',
  'stOSMO': 'stride-staked-osmo',
  'UMEE': 'umee',
  'CMDX': 'comdex',
  'HUAHUA': 'chihuahua-token',
  'LUM': 'lum-network',
  'DSM': 'desmos',
  'CHEQ': 'cheqd-network',
  'rATOM': 'stafi-staked-atom',
  'qATOM': 'quicksilver-liquid-staked-atom',
  'GRAV': 'graviton',
  'INJ': 'injective-protocol',
  'TORI': 'teritori',
  'WHALE': 'white-whale',
  'stJUNO': 'stride-staked-juno',
  'stSTARS': 'stride-staked-stars',
  'JKL': 'jackal-protocol',
  'ARCH': 'archway',
  'CORE': 'coreum',
  'QSR': 'quasar-2',
  'MARS': 'mars-protocol-a7fcbcfb-fd61-4017-92f0-7ee9f9cc6da3',
};

// IBC Token Registry for Cosmos Hub (actual hashes from community pool)
const IBC_TOKEN_REGISTRY: Record<string, { symbol: string; decimals: number }> = {
  // Top tokens in community pool
  'ibc/0025F8A87464A471E66B234C4F93AEC5B4DA3D42D7986451A059273426290DD5': { symbol: 'TIA', decimals: 6 }, // Celestia
  'ibc/054892D6BB43AF8B93AAC28AA5FD7019D2C59A15DAFD6F45C1FA2BF9BDA22454': { symbol: 'stTIA', decimals: 6 }, // Stride staked TIA
  'ibc/05C7702E4C88217C9D9E3EC63EF3B90B4BBC4B75F213E201295F35C9D89416AD': { symbol: 'MNTL', decimals: 6 }, // AssetMantle
  'ibc/0872AF0D1B0F6F23BA67631F9A4AFF633F289EE7B390478D7BA4F064A5135162': { symbol: 'USDC', decimals: 6 }, // Noble USDC
  'ibc/12DA42304EE1CE96071F712AA4D58186AD11C3165C0DCDA71E017A54F3935E66': { symbol: 'NTRN', decimals: 6 }, // Neutron
  'ibc/14F9BC3E44B8A9C1BE1FB08980FAB87034C9905EF17CF2F5008FC085218811CC': { symbol: 'OSMO', decimals: 6 }, // Osmosis
  'ibc/1FBDD58D438B4D04D26CBFB2E722C18984A0F1A52468C4F42F37D102F3D3F399': { symbol: 'STARS', decimals: 6 }, // Stargaze
  'ibc/2181AAB0218EAC24BC9F86BD1364FBBFA3E6E3FCC25E88E3E68C15DC6E752D86': { symbol: 'JUNO', decimals: 6 }, // Juno
  'ibc/27BCBC098A3AE31C80E18A3EA7A516F2530B7362F83D7992A4D7888DBB586D33': { symbol: 'AKT', decimals: 6 }, // Akash
  'ibc/42E47A5BA708EBE6E0C227006254F2784E209F4DBD3C6BB77EDC4B29EF875E8E': { symbol: 'SCRT', decimals: 6 }, // Secret
  'ibc/5CAE744C89BC70AE7B38019A1EDF83199B7E10F00F160E7F4F12BCA7A32A7EE5': { symbol: 'REGEN', decimals: 6 }, // Regen
  'ibc/6B8A3F5C2AD51CD6171FA41A7E8C35AD594AB69226438DB94450436EA57B3A89': { symbol: 'DVPN', decimals: 6 }, // Sentinel
  'ibc/715BD634CF4D914C3EE93B0F8A9D2514B743F6FE36BC80263D1BC5EE4B3C5D40': { symbol: 'XPRT', decimals: 6 }, // Persistence
  'ibc/7A64BFC809209157A1330CE199891B699A2C3B55C384EAFCCDD23ECDC735BA73': { symbol: 'stATOM', decimals: 6 }, // Stride staked ATOM
  'ibc/81D08BC39FB520EBD948CF017910DD69702D34BF5AC160F76D3B5CFC444EBCE0': { symbol: 'IRIS', decimals: 6 }, // IRISnet
  'ibc/88DCAA43A9CD099E1F9BBB80B9A90F64782EBA115A84B2CD8398757ADA4F4B40': { symbol: 'CRO', decimals: 8 }, // Crypto.org
  'ibc/A4D99E716D91A579AC3A9684AAB7B5CB0A0861DD3DD942901D970EDB6787860E': { symbol: 'KAVA', decimals: 6 }, // Kava
  'ibc/AFC2F1B2FD45D549E34445E63921ECDECF1EAC68DA72412C2E087BEB503693F2': { symbol: 'BAND', decimals: 6 }, // Band Protocol
  'ibc/B011C1A0AD5E717F674BA59FD8E05B2F946E4FD41C9CB3311C95F7ED4B815620': { symbol: 'PICA', decimals: 12 }, // Composable
  'ibc/B05539B66B72E2739B986B86391E5D08F12B8D5D2C2A7F8F8CF9ADF674DFA231': { symbol: 'SOMM', decimals: 6 }, // Sommelier
  'ibc/B38AAA0F7A3EC4D7C8E12DFA33FF93205FE7A42738A4B0590E2FF15BC60A612B': { symbol: 'DYDX', decimals: 18 }, // dYdX
  'ibc/D3FB6378599E31A4BD5965173BF6CE873DD2FD5270F8ABD8769765BEF2E0EA5D': { symbol: 'stOSMO', decimals: 6 }, // Stride staked OSMO
  'ibc/D41ECC8FEF1B7E9C4BCC58B1362588420853A9D0B898EDD513D9B79AFFA195C8': { symbol: 'UMEE', decimals: 6 }, // Umee
  'ibc/DA8A15E8BC3962CC433F2B4CA0B3233723DE4A1A68B17DB85C63ECC5B0F83F65': { symbol: 'CMDX', decimals: 6 }, // Comdex
  'ibc/DEC41A02E47658D40FC71E5A35A9C807111F5A6662A3FB5DA84C4E6F53E616B3': { symbol: 'HUAHUA', decimals: 6 }, // Chihuahua
  'ibc/E92E07E68705FAD13305EE9C73684B30A7B66A52F54C9890327E0A4C0F1D22E3': { symbol: 'LUM', decimals: 6 }, // Lum Network
  'ibc/F663521BF1836B00F5F177680F74BFB9A8B5654A694D0D2BC249E03CF2509013': { symbol: 'DSM', decimals: 6 }, // Desmos
  'ibc/FA33D22EED651DC2D251315AAE2E7C5BA924D308081EE9760AE653AA2F6661CB': { symbol: 'CHEQ', decimals: 9 }, // Cheqd
  // Additional tokens
  'ibc/C140AFD542AE77BD7DCC83F13FDD8C5E5BB8C4929785E6EC2F4C636F98F17901': { symbol: 'stATOM', decimals: 6 }, // Alt Stride stATOM
  'ibc/C3E53D20BC7A4CC993B17C7971F8ECD06A433C10B6A96F4C4C3714F0624C56DA': { symbol: 'rATOM', decimals: 6 }, // Stafi rATOM
  'ibc/FA602364BEC305A696CBDF987058E99D8B479F0318E47314C49173E8838C5BAC': { symbol: 'qATOM', decimals: 6 }, // Quicksilver qATOM
  'ibc/E97634A40119F1898989C2A23224ED83FDD0A57EA46B3A094E287288D1672B44': { symbol: 'GRAV', decimals: 6 }, // Gravity Bridge
  'ibc/64BA6E31FE887D66C6F8F31C7B1A80C7CA179239677B4088BB55F5EA07DBE273': { symbol: 'INJ', decimals: 18 }, // Injective
  'ibc/EB7FB9C8B425F289B63703413327C2051030E848CE4EAAEA2E51199D6D39D3EC': { symbol: 'TORI', decimals: 6 }, // Teritori
  'ibc/36A02FFC4E74DF4F64305130C3DFA1B06BEAC775648927AA44467C76A77AB8DB': { symbol: 'WHALE', decimals: 6 }, // Migaloo
  'ibc/D24B4564BCD51D3D02D9987D92571EAC5915676A9BD6D9B0C1D0254CB8A5EA34': { symbol: 'stOSMO', decimals: 6 }, // Alt Stride stOSMO
  'ibc/84502A75BCA4A5F68D464C00B3F610CE2585847D59B52E5FFB7C3C9D2DDCD3FE': { symbol: 'stJUNO', decimals: 6 }, // Stride stJUNO
  'ibc/49BAE4CD2172833F14000627DA87ED8024AD46A38D6ED33F6239F22B5832F958': { symbol: 'stSTARS', decimals: 6 }, // Stride stSTARS
  'ibc/08095CEDEA29977C9DD0CE9A48329FDA622C183359D5F90CF04CC4FF80CBE431': { symbol: 'stLUNA', decimals: 6 }, // Stride stLUNA
  'ibc/655BCEF3CDEBE32863FF281DBBE3B06160339E9897DC9C9C9821932A5F8BA6F8': { symbol: 'stEVMOS', decimals: 18 }, // Stride stEVMOS
  'ibc/8E697BDABE97ACE8773C6DF7402B2D1D5104DD1EEABE12608E3469B7F64C15BA': { symbol: 'JKL', decimals: 6 }, // Jackal
  'ibc/23AB778D694C1ECFC59B91D8C399C115CC53B0BD1C61020D8E19519F002BDD85': { symbol: 'ARCH', decimals: 18 }, // Archway
  'ibc/F3166F4D31D6BA1EC6C9F5536F5DDDD4CC93DBA430F7419E7CDC41C497944A65': { symbol: 'CORE', decimals: 6 }, // Coreum
  'ibc/1B708808D372E959CD4839C594960309283424C775F4A038AAEBE7F83A988477': { symbol: 'QSR', decimals: 6 }, // Quasar
  'ibc/573FCD90FACEE750F55A8864EF7D38265F07E5A9273FA0E8DAFD39951332B580': { symbol: 'MARS', decimals: 6 }, // Mars Protocol
};

// Convert micro tokens to normal denomination
function convertMicroDenom(denom: string, amount: string): { displayDenom: string; amount: number; rawAmount: string } {
  const rawAmount = amount;
  
  // Handle micro tokens (uatom, uosmo, etc.)
  if (denom.startsWith('u') && denom.length > 1 && !denom.startsWith('ibc/')) {
    const baseDenom = denom.substring(1).toUpperCase();
    return {
      displayDenom: baseDenom,
      amount: parseFloat(amount) / 1_000_000,
      rawAmount,
    };
  }
  
  // Handle IBC tokens with registry lookup
  if (denom.startsWith('ibc/')) {
    const tokenInfo = IBC_TOKEN_REGISTRY[denom];
    if (tokenInfo) {
      return {
        displayDenom: tokenInfo.symbol,
        amount: parseFloat(amount) / Math.pow(10, tokenInfo.decimals),
        rawAmount,
      };
    }
    // Unknown IBC token - show shortened hash
    return {
      displayDenom: `IBC/${denom.substring(4, 12)}...`,
      amount: parseFloat(amount),
      rawAmount,
    };
  }
  
  // Default case
  return {
    displayDenom: denom.toUpperCase(),
    amount: parseFloat(amount),
    rawAmount,
  };
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
      const [poolData, paramsData, supplyData, inflationData, provisionsData, communityPoolData, distributionParamsData, mintParamsData] = await Promise.all([
        fetchJson<PoolResponse>('/cosmos/staking/v1beta1/pool'),
        fetchJson<ParamsResponse>('/cosmos/staking/v1beta1/params'),
        fetchJson<SupplyResponse>('/cosmos/bank/v1beta1/supply?pagination.limit=5000'),
        fetchJson<InflationResponse>('/cosmos/mint/v1beta1/inflation'),
        fetchJson<AnnualProvisionsResponse>('/cosmos/mint/v1beta1/annual_provisions'),
        fetchJson<CommunityPoolResponse>('/cosmos/distribution/v1beta1/community_pool'),
        fetchJson<DistributionParamsResponse>('/cosmos/distribution/v1beta1/params'),
        fetchJson<MintParamsResponse>('/cosmos/mint/v1beta1/params'),
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
      
      // Parse mint params
      const inflationMin = mintParamsData?.params?.inflation_min ? parseFloat(mintParamsData.params.inflation_min) * 100 : 7.0;
      const inflationMax = mintParamsData?.params?.inflation_max ? parseFloat(mintParamsData.params.inflation_max) * 100 : 20.0;
      const goalBonded = mintParamsData?.params?.goal_bonded ? parseFloat(mintParamsData.params.goal_bonded) * 100 : 67.0;
      const blocksPerYear = mintParamsData?.params?.blocks_per_year ? parseInt(mintParamsData.params.blocks_per_year, 10) : 4_360_000;
      
      // Calculate block time from blocks per year
      const secondsPerYear = 365.25 * 24 * 60 * 60; // 31,557,600 seconds
      const blockTimeSeconds = secondsPerYear / blocksPerYear;

      // Compute percentages
      const bondedPercent = (bondedTokens / totalSupply) * 100;
      const notBondedPercent = (notBondedTokens / totalSupply) * 100;
      const unbondingPercent = Math.max(0, 100 - bondedPercent - notBondedPercent);

      // Parse community pool
      const communityPoolAssets = communityPoolData?.pool.map((coin) => {
        const converted = convertMicroDenom(coin.denom, coin.amount);
        return {
          denom: coin.denom,
          displayDenom: converted.displayDenom,
          amount: converted.amount,
          rawAmount: converted.rawAmount,
        };
      }) || [];

      // Fetch prices from CoinGecko for all tokens
      let assetsWithPrices = communityPoolAssets;
      let totalUsdValue = 0;
      
      try {
        // Get unique symbols and their CoinGecko IDs
        const symbolsToFetch = Array.from(new Set(
          communityPoolAssets
            .map(asset => asset.displayDenom)
            .filter(symbol => COINGECKO_ID_MAP[symbol])
        ));
        
        const coinGeckoIds = symbolsToFetch
          .map(symbol => COINGECKO_ID_MAP[symbol])
          .filter(Boolean);

        if (coinGeckoIds.length > 0) {
          const prices = await fetchCoinGeckoPrice(coinGeckoIds, ['usd']);
          
          // Create a reverse map from CoinGecko ID to price
          const priceMap: Record<string, number> = {};
          for (const [symbol, geckoId] of Object.entries(COINGECKO_ID_MAP)) {
            if (prices[geckoId]?.usd) {
              priceMap[symbol] = prices[geckoId].usd;
            }
          }

          // Add USD values to assets
          assetsWithPrices = communityPoolAssets.map(asset => {
            const price = priceMap[asset.displayDenom];
            const usdValue = price ? asset.amount * price : undefined;
            if (usdValue) {
              totalUsdValue += usdValue;
            }
            return {
              ...asset,
              usdValue,
            };
          });
        }
      } catch (error) {
        console.warn('[CosmosLCD] Failed to fetch CoinGecko prices:', error);
        // Continue without prices
      }

      // Calculate total ATOM in community pool
      const atomInPool = assetsWithPrices.find((asset) => asset.denom === 'uatom');
      const totalAtomInPool = atomInPool ? atomInPool.amount : 0;

      // Parse community tax
      const communityTax = distributionParamsData?.params?.community_tax 
        ? parseFloat(distributionParamsData.params.community_tax) * 100 
        : 2.0; // default 2%

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
          min: inflationMin,
          max: inflationMax,
          goalBonded,
        },
        block: {
          timeSeconds: blockTimeSeconds,
          blocksPerYear,
        },
        computed: {
          bondedPercent,
          notBondedPercent,
          unbondingPercent,
        },
        communityPool: {
          assets: assetsWithPrices,
          totalAtom: totalAtomInPool,
          totalUsdValue,
          communityTax,
        },
      };
    } catch (error) {
      console.error('[CosmosLCD] Failed to fetch real data:', error);
      return null;
    }
  },
};
