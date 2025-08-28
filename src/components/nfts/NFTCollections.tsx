import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StargazeService, Collection, NFTToken } from '@/services/stargaze';
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
      setLoading(true);
      try {
        const collectionsData = await StargazeService.fetchCollections();
        setCollections(collectionsData);
        
        // Fetch NFTs from all collections
        setNftsLoading(true);
        const allNftsPromises = collectionsData.map(collection => 
          StargazeService.fetchTokensByCollection(collection.contractAddress)
        );
        
        const allNftsResults = await Promise.all(allNftsPromises);
        const combinedNfts: NFTToken[] = [];
        
        allNftsResults.forEach((nfts, collectionIndex) => {
          nfts.forEach(nft => {
            combinedNfts.push({
              ...nft,
              collectionAddress: collectionsData[collectionIndex]?.contractAddress || ''
            });
          });
        });
        
        setAllNfts(combinedNfts);
        setFilteredNfts(combinedNfts);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
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
    
    if (newSelected.length === 0) {
      setFilteredNfts(allNfts);
    } else {
      const filtered = allNfts.filter(nft => 
        newSelected.some(addr => nft.collectionAddress === addr)
      );
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
                  key={collection.contractAddress}
                  onClick={() => handleCollectionFilter(collection.contractAddress)}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedCollections.includes(collection.contractAddress)
                      ? 'bg-primary/10 border-primary/30'
                      : 'bg-muted/5 border-border/20 hover:bg-muted/10'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <h4 className="font-medium text-sm text-foreground truncate">{collection.name}</h4>
                      <a
                        href={getStargazeCollectionUrl(collection.contractAddress)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-primary hover:text-primary/80 transition-colors flex-shrink-0"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    
                    <div className="flex flex-wrap gap-1">
                      {collection.categories.public.slice(0, 2).map((category) => (
                        <Badge key={category} variant="outline" className="text-xs">
                          {category}
                        </Badge>
                      ))}
                    </div>

                    <div className="text-xs text-muted-foreground">
                      Floor: {StargazeService.formatPrice(collection.floor.amount, collection.floor.exponent)} {collection.floor.symbol}
                    </div>
                    
                    <div className="text-xs text-muted-foreground">
                      Listed: {collection.tokenCounts.listed}
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
              ) : filteredNfts.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  {allNfts.length === 0 ? 'No NFTs found' : 'No NFTs match the selected filters'}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {filteredNfts.map((nft) => {
                    const collection = collections.find(c => c.contractAddress === nft.collectionAddress);
                    return (
                      <div
                        key={`${nft.collectionAddress}-${nft.tokenId}`}
                        className="bg-muted/5 border border-border/20 rounded-lg p-3 hover:bg-muted/10 transition-colors"
                      >
                        <div className="aspect-square mb-3 rounded-lg overflow-hidden bg-muted/20">
                          {nft.imageUrl ? (
                            <img
                              src={nft.imageUrl}
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
                          <div className="text-xs text-muted-foreground">#{nft.tokenId}</div>
                          {collection && (
                            <div className="text-xs text-muted-foreground truncate">
                              {collection.name}
                            </div>
                          )}
                          {nft.listPrice && (
                            <div className="text-sm">
                              <div className="text-primary font-semibold">
                                {StargazeService.formatPrice(nft.listPrice.amount, 6)} ATOM
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {StargazeService.formatUsdPrice(nft.listPrice.amountUsd)}
                              </div>
                            </div>
                          )}
                          <a
                            href={getStargazeTokenUrl(nft.collectionAddress!, nft.tokenId)}
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
          </Card>
        </div>
      </div>
    </div>
  );
};

export default NFTCollections;
