import { ApolloClient, InMemoryCache, gql, createHttpLink } from '@apollo/client';

const STARGAZE_GRAPHQL_URI = 'https://graphql.mainnet.stargaze-apis.com/graphql';

// Create HTTP Link
const httpLink = createHttpLink({
  uri: STARGAZE_GRAPHQL_URI,
});

// Initialize Apollo Client
const client = new ApolloClient({
  link: httpLink,
  cache: new InMemoryCache(),
});

// GraphQL Queries
const GET_COLLECTIONS = gql`
  query MarketplaceCollections(
    $offset: Int
    $limit: Int
    $sortBy: CollectionSort
    $searchQuery: String
    $filterByCategories: [String!]
    $minMaxFilters: CollectionMinMaxFilters
    $filterByDenoms: [String!]
    $filterByVerified: Boolean = false
  ) {
    collections(
      offset: $offset
      limit: $limit
      sortBy: $sortBy
      searchQuery: $searchQuery
      filterByCategories: $filterByCategories
      minMaxFilters: $minMaxFilters
      filterByDenoms: $filterByDenoms
      filterByVerified: $filterByVerified
    ) {
      __typename
      collections {
        __typename
        contractAddress
        contractUri
        name
        description
        isExplicit
        categories {
          public
          __typename
        }
        tradingAsset {
          denom
          symbol
          price
          exponent
          __typename
        }
        floor {
          amount
          amountUsd
          denom
          symbol
          exponent
          __typename
        }
        highestOffer {
          offerPrice {
            amount
            amountUsd
            denom
            symbol
            exponent
            __typename
          }
          __typename
        }
        tokenCounts {
          listed
          active
          __typename
        }
        categories {
          public
          __typename
        }
        stats {
          collectionAddr
          change6HourPercent
          change24HourPercent
          change7DayPercent
          change30dayPercent
          volume6Hour
          volume24Hour
          volume7Day
          volume30Day
          changeUsd6hourPercent
          changeUsd24hourPercent
          changeUsd7dayPercent
          changeUsd30dayPercent
          volumeUsd6hour
          volumeUsd24hour
          volumeUsd7day
          volumeUsd30day
          bestOffer
          bestOfferUsd
          numOwners
          uniqueOwnerPercent
          salesCountTotal
          __typename
        }
      }
      pageInfo {
        __typename
        total
        offset
        limit
      }
    }
  }
`;

const GET_TOKENS = gql`
  query Tokens($collectionAddr: String, $offset: Int, $limit: Int, $filterForSale: SaleType) {
    tokens(collectionAddr: $collectionAddr, offset: $offset, limit: $limit, filterForSale: $filterForSale) {
      tokens {
        description
        imageUrl
        tokenId
        name
        rarityOrder
        rarityScore
        listPrice {
          amount
          denom
          amountUsd
        }
      }
    }
  }
`;

// Types
export interface Collection {
  contractAddress: string;
  contractUri: string;
  name: string;
  description: string;
  isExplicit: boolean;
  categories: {
    public: string[];
  };
  tradingAsset: {
    denom: string;
    symbol: string;
    price: string;
    exponent: number;
  };
  floor: {
    amount: string;
    amountUsd: number;
    denom: string;
    symbol: string;
    exponent: number;
  };
  highestOffer: {
    offerPrice: {
      amount: string;
      amountUsd: number;
      denom: string;
      symbol: string;
      exponent: number;
    };
  };
  tokenCounts: {
    listed: number;
    active: number;
  };
  stats: {
    collectionAddr: string;
    change6HourPercent: number;
    change24HourPercent: number;
    change7DayPercent: number;
    change30dayPercent: number;
    volume6Hour: string;
    volume24Hour: string;
    volume7Day: string;
    volume30Day: string;
    changeUsd6hourPercent: number;
    changeUsd24hourPercent: number;
    changeUsd7dayPercent: number;
    changeUsd30dayPercent: number;
    volumeUsd6hour: number;
    volumeUsd24hour: number;
    volumeUsd7day: number;
    volumeUsd30day: number;
    bestOffer: string;
    bestOfferUsd: number;
    numOwners: number;
    uniqueOwnerPercent: number;
    salesCountTotal: number;
  };
}

export interface NFTToken {
  tokenId: string;
  name: string;
  imageUrl?: string;
  listPrice?: {
    amount: string;
    amountUsd: number | null;
  };
  collectionAddress?: string;
}

// Service functions
export const StargazeService = {
  async fetchCollections(): Promise<Collection[]> {
    try {
      const { data } = await client.query({
        query: GET_COLLECTIONS,
        variables: {
          filterByVerified: false,
          filterByDenoms: ["atom"],
          minMaxFilters: {},
          sortBy: "VOLUME_USD_7_DAY_DESC",
          limit: 100
        }
      });

      return (data as any)?.collections?.collections || [];
    } catch (error) {
      console.error('Failed to fetch collections:', error);
      return [];
    }
  },

  async fetchTokensByCollection(collectionAddr: string): Promise<NFTToken[]> {
    try {
      const { data } = await client.query({
        query: GET_TOKENS,
        variables: {
          collectionAddr,
          offset: 0,
          limit: 10000,
          filterForSale: "LISTED"
        }
      });

      return (data as any)?.tokens?.tokens || [];
    } catch (error) {
      console.error('Failed to fetch tokens for collection:', collectionAddr, error);
      return [];
    }
  },

  formatPrice(amount: string, exponent: number): string {
    const num = Number(amount) / Math.pow(10, exponent);
    return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
  },

  formatUsdPrice(amountUsd: number | null | undefined): string {
    if (amountUsd == null) {
      return '$0.00';
    }
    return `$${amountUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  }
};
