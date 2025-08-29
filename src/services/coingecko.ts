// CoinGecko service: fetch crypto prices

const COINGECKO_API_BASE = 'https://api.coingecko.com/api/v3';

export type CoinGeckoPriceResponse = {
  [coinId: string]: { [currency: string]: number };
};

/**
 * Fetches the price of one or more coins from CoinGecko.
 * @param coinIds - An array of CoinGecko coin IDs (e.g., ['cosmos', 'stride']).
 * @param vsCurrencies - An array of currency codes (e.g., ['usd']).
 * @returns A promise that resolves to a price response object.
 */
export async function fetchCoinGeckoPrice(
  coinIds: string[],
  vsCurrencies: string[] = ['usd']
): Promise<CoinGeckoPriceResponse> {
  const ids = coinIds.join(',');
  const currencies = vsCurrencies.join(',');
  const url = `${COINGECKO_API_BASE}/simple/price?ids=${ids}&vs_currencies=${currencies}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch CoinGecko price for ${ids}`);
  }
  const data = await res.json();
  return data;
}
