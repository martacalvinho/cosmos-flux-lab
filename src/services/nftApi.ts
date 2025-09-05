// New NFT API service using REST endpoints instead of GraphQL
export interface Collection {
  id: string;
  contract_address: string;
  name: string;
  description: string;
  is_explicit: boolean;
  categories: string[];
  trading_asset: {
    denom: string;
    symbol: string;
    price: string;
    exponent: number;
  };
  floor_price: {
    amount: string;
    amount_usd: number;
    denom: string;
    symbol: string;
    formatted: string;
    formatted_usd: string;
  };
  highest_offer: {
    amount: string;
    amount_usd: number;
    formatted: string;
    formatted_usd: string;
  };
  token_counts: {
    listed: number;
    active: number;
  };
  stats: {
    volume_24h: number;
    volume_7d: number;
    volume_30d: number;
    change_24h_percent: number;
    change_7d_percent: number;
    num_owners: number;
    unique_owner_percent: number;
    sales_count_total: number;
    formatted_volume_24h: string;
    formatted_volume_7d: string;
    formatted_volume_30d: string;
  };
  image: string | null;
  cached_image: string | null;
  url: string;
  marketplace: string;
}

export interface NFTToken {
  token_id: string;
  name: string;
  description: string;
  image_url: string;
  rarity_order?: number;
  rarity_score?: number;
  list_price?: {
    amount: string;
    denom: string;
    amount_usd: number;
    formatted_usd: string;
  };
  collection_address: string;
  url: string;
  marketplace: string;
  // Add a computed property for backward compatibility
  collectionAddress?: string;
}

export interface CollectionsResponse {
  success: boolean;
  data: {
    total_collections: number;
    collections: Collection[];
  };
  timestamp: string;
}

export interface NFTsResponse {
  success: boolean;
  data: {
    collection_address: string;
    total_nfts: number;
    page: number;
    limit: number;
    offset: number;
    nfts: NFTToken[];
    metadata: {
      source: string;
      filter_for_sale: string;
      last_updated: string;
    };
  };
  timestamp: string;
}

export const NFTApiService = {
  async fetchCollections(): Promise<Collection[]> {
    try {
      const response = await fetch('https://api.useatom.fun/api/nfts/collections');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data: CollectionsResponse = await response.json();
      if (!data.success) {
        throw new Error('API returned unsuccessful response');
      }
      
      return data.data.collections;
    } catch (error) {
      console.error('Error fetching collections:', error);
      throw error;
    }
  },

  async fetchTokensByCollection(collectionAddress: string, limit: number = 50, offset: number = 0): Promise<NFTToken[]> {
    try {
      const url = `https://api.useatom.fun/api/nfts/collections/${collectionAddress}/nfts?limit=${limit}&offset=${offset}`;
      const response = await fetch(url);
      
      // Log response details for debugging
      console.log(`Fetching from: ${url}`);
      console.log(`Response status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`HTTP error! status: ${response.status}, body: ${errorText}`);
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data: NFTsResponse = await response.json();
      console.log(`API response for ${collectionAddress}:`, data);
      console.log(`NFTs returned for ${collectionAddress}:`, data.data.nfts.length);
      console.log(`First NFT:`, data.data.nfts[0]);
      
      if (!data.success) {
        throw new Error(`API error: ${JSON.stringify(data)}`);
      }
      
      return data.data.nfts;
    } catch (error) {
      console.error(`Error fetching tokens for collection ${collectionAddress}:`, error);
      // Return empty array instead of throwing to prevent blocking other collections
      return [];
    }
  },

  async fetchAllTokensByCollection(collectionAddress: string): Promise<NFTToken[]> {
    const allTokens: NFTToken[] = [];
    let offset = 0;
    const limit = 100; // Fetch in batches of 100
    
    try {
      while (true) {
        const tokens = await this.fetchTokensByCollection(collectionAddress, limit, offset);
        
        if (tokens.length === 0) {
          break; // No more tokens to fetch
        }
        
        allTokens.push(...tokens);
        offset += limit;
        
        // If we got less than the limit, we've reached the end
        if (tokens.length < limit) {
          break;
        }
      }
      
      return allTokens;
    } catch (error) {
      console.error(`Error fetching all tokens for collection ${collectionAddress}:`, error);
      // Return empty array instead of throwing to prevent blocking the entire app
      return [];
    }
  },

  // Utility functions for formatting (keeping same interface as StargazeService)
  formatPrice(amount: string, exponent: number): string {
    const numAmount = parseFloat(amount);
    const divisor = Math.pow(10, exponent);
    const formatted = (numAmount / divisor).toFixed(2);
    return parseFloat(formatted).toString(); // Remove trailing zeros
  },

  formatUsdPrice(amountUsd: number | null | undefined): string {
    if (!amountUsd || amountUsd === 0) return '$0.00';
    
    if (amountUsd >= 1000) {
      return `$${(amountUsd / 1000).toFixed(1)}K`;
    }
    
    return `$${amountUsd.toFixed(2)}`;
  }
};
