import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { NFTApiService, Collection, NFTToken } from '@/services/nftApi';
import { ExternalLink, Filter } from 'lucide-react';

const NFTCollections: React.FC = () => {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollections, setSelectedCollections] = useState<string[]>([]);
  const [allNfts, setAllNfts] = useState<NFTToken[]>([]);
  const [filteredNfts, setFilteredNfts] = useState<NFTToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [nftsLoading, setNftsLoading] = useState(false);

  useEffect(() => {
    const fetchCollectionsAndNfts = async () => {
      try {
        setLoading(true);
        setNftsLoading(true);
        
        console.log('Starting to fetch collections...');
        const collectionsData = await NFTApiService.fetchCollections();
        console.log('Collections fetched:', collectionsData.length);
        setCollections(collectionsData);
        
        // Set loading to false immediately after collections are fetched
        setLoading(false);
        
        // Fetch NFTs from all collections using the API
        console.log('Fetching NFTs from all collections...');
        const allNftsPromises = collectionsData.map(collection => 
          NFTApiService.fetchTokensByCollection(collection.contract_address)
        );
        
        const allNftsResults = await Promise.all(allNftsPromises);
        const combinedNfts: NFTToken[] = [];
        
        allNftsResults.forEach((nfts, collectionIndex) => {
          nfts.forEach(nft => {
            combinedNfts.push({
              ...nft,
              collectionAddress: nft.collection_address
            });
          });
        });
        
        console.log(`Total NFTs loaded: ${combinedNfts.length}`);
        console.log('Combined NFTs:', combinedNfts);
        
        
        console.log('Setting NFT states with combined NFTs:', combinedNfts);
        setAllNfts(combinedNfts);
        setFilteredNfts(combinedNfts);
        setNftsLoading(false);
        
        // Log state after setting
        setTimeout(() => {
          console.log('State after setting - allNfts length should be:', combinedNfts.length);
          console.log('NFTs loading state should be false');
        }, 100);
      } catch (error) {
        console.error('Failed to fetch data:', error);
        setLoading(false);
        setNftsLoading(false);
      }
    };

    fetchCollectionsAndNfts();
  }, []);

  const handleCollectionFilter = (collectionAddress: string) => {
    const newSelected = selectedCollections.includes(collectionAddress)
      ? selectedCollections.filter(addr => addr !== collectionAddress)
      : [...selectedCollections, collectionAddress];
    
    setSelectedCollections(newSelected);
    
    console.log('Selected collections:', newSelected);
    console.log('Total NFTs available:', allNfts.length);
    console.log('Sample NFT structure:', allNfts[0]);
    console.log('All NFTs:', allNfts);
    
    if (newSelected.length === 0) {
      console.log('No collections selected, showing all NFTs');
      setFilteredNfts(allNfts);
    } else {
      const filtered = allNfts.filter(nft => {
        const matches = newSelected.some(addr => {
          console.log(`Comparing NFT collection_address: "${nft.collection_address}" with selected: "${addr}"`);
          return nft.collection_address === addr;
        });
        return matches;
      });
      console.log('Filtered NFTs count:', filtered.length);
      console.log('Filtered NFTs:', filtered);
      setFilteredNfts(filtered);
    }
  };

  const getStargazeCollectionUrl = (contractAddress: string) => {
    return `https://www.stargaze.zone/m/${contractAddress}`;
  };

  const getStargazeTokenUrl = (contractAddress: string, tokenId: string) => {
    return `https://www.stargaze.zone/m/${contractAddress}/${tokenId}`;
  };


  return (
    <div className="flex gap-6 h-full">
      {/* Left Sidebar - Collections Filter */}
      <div className="w-80 flex-shrink-0">
        <Card className="backdrop-blur-sm bg-card/80 border-border/30 shadow-table h-full">
          <div className="p-4 border-b border-border/20">
            <div className="flex items-center gap-2 mb-2">
              <Filter className="w-4 h-4" />
              <h3 className="font-semibold text-foreground">Collections</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Filter NFTs by collection
            </p>
          </div>
          <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
            {loading ? (
              <div className="text-center py-4 text-muted-foreground text-sm">Loading...</div>
            ) : (
              collections.map((collection) => (
                <div
                  key={collection.contract_address}
                  onClick={() => handleCollectionFilter(collection.contract_address)}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedCollections.includes(collection.contract_address)
                      ? 'bg-primary/10 border-primary/30'
                      : 'bg-muted/5 border-border/20 hover:bg-muted/10'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <h4 className="font-medium text-sm text-foreground truncate">{collection.name}</h4>
                      <a
                        href={getStargazeCollectionUrl(collection.contract_address)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-primary hover:text-primary/80 transition-colors flex-shrink-0"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    
                    <div className="flex flex-wrap gap-1">
                      {collection.categories.slice(0, 2).map((category) => (
                        <Badge key={category} variant="outline" className="text-xs">
                          {category}
                        </Badge>
                      ))}
                    </div>

                    <div className="text-xs text-muted-foreground">
                      Floor: {collection.floor_price.formatted} {collection.floor_price.symbol}
                    </div>
                    
                    <div className="text-xs text-muted-foreground">
                      Listed: {collection.token_counts.listed}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Main Content - NFTs Grid */}
      <div className="flex-1">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foreground">NFT Marketplace</h2>
              <p className="text-muted-foreground">
                {selectedCollections.length === 0 
                  ? `Showing all ${filteredNfts.length} NFTs from ${collections.length} collections`
                  : `Showing ${filteredNfts.length} NFTs from ${selectedCollections.length} selected collection${selectedCollections.length > 1 ? 's' : ''}`
                }
              </p>
            </div>
            {selectedCollections.length > 0 && (
              <button
                onClick={() => {
                  setSelectedCollections([]);
                  setFilteredNfts(allNfts);
                }}
                className="px-3 py-1 text-sm bg-muted/20 hover:bg-muted/30 rounded-lg transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>

          <Card className="backdrop-blur-sm bg-card/80 border-border/30 shadow-table">
            <div className="p-6">
              {nftsLoading ? (
                <div className="text-center py-12 text-muted-foreground">Loading NFTs...</div>
              ) : (
                <div>
                  <div className="text-xs text-muted-foreground mb-4">
                    Debug: Showing {filteredNfts.length} NFTs | Loading: {nftsLoading.toString()} | All NFTs: {allNfts.length}
                  </div>
                  {filteredNfts.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      {allNfts.length === 0 
                        ? 'No NFTs currently listed for sale' 
                        : selectedCollections.length > 0 
                          ? 'No NFTs currently listed for sale in the selected collections'
                          : 'No NFTs match the selected filters'
                      }
                      <div className="text-xs mt-2 opacity-75">
                        This marketplace shows only NFTs that are actively listed for sale
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                      {filteredNfts.map((nft) => {
                        const collection = collections.find(c => c.contract_address === nft.collection_address);
                        return (
                          <div
                            key={`${nft.collection_address}-${nft.token_id}`}
                            className="bg-muted/5 border border-border/20 rounded-lg p-3 hover:bg-muted/10 transition-colors"
                          >
                            <div className="aspect-square mb-3 rounded-lg overflow-hidden bg-muted/20">
                              {nft.image_url ? (
                                <img
                                  src={nft.image_url}
                                  alt={nft.name}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                                  No Image
                                </div>
                              )}
                            </div>
                            <div className="space-y-2">
                              <div className="font-medium text-foreground truncate text-sm">{nft.name}</div>
                              <div className="text-xs text-muted-foreground">#{nft.token_id}</div>
                              {collection && (
                                <div className="text-xs text-muted-foreground truncate">
                                  {collection.name}
                                </div>
                              )}
                              {nft.list_price && (
                                <div className="text-sm">
                                  <div className="text-primary font-semibold">
                                    {NFTApiService.formatPrice(nft.list_price.amount, 6)} ATOM
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {nft.list_price.formatted_usd}
                                  </div>
                                </div>
                              )}
                              <a
                                href={getStargazeTokenUrl(nft.collection_address, nft.token_id)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
                              >
                                View on Stargaze <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default NFTCollections;
