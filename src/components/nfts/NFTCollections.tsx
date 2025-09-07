import React, { useState, useEffect, useMemo } from 'react';
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
  const [collectionSort, setCollectionSort] = useState<'alpha-asc' | 'alpha-desc' | 'floor-asc' | 'floor-desc' | 'volume-desc' | 'volume-asc' | 'owners-desc' | 'owners-asc' | 'listed-desc' | 'listed-asc' | 'top12'>('alpha-asc');
  const [showTop12InSidebar, setShowTop12InSidebar] = useState(false);
  const [volumeTimeframe, setVolumeTimeframe] = useState<'24h' | '7d' | '30d'>('24h');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [searchText, setSearchText] = useState('');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

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

  

  // Helpers
  const getVolume = (c: Collection) => {
    if (volumeTimeframe === '24h') return c.stats?.volume_24h || 0;
    if (volumeTimeframe === '7d') return c.stats?.volume_7d || 0;
    return c.stats?.volume_30d || 0;
  };
  const getFormattedVolume = (c: Collection) => {
    if (volumeTimeframe === '24h') return c.stats?.formatted_volume_24h || '-';
    if (volumeTimeframe === '7d') return c.stats?.formatted_volume_7d || '-';
    return c.stats?.formatted_volume_30d || '-';
  };
  const getListedPercent = (c: Collection) => {
    const listed = c.token_counts?.listed || 0;
    const active = c.token_counts?.active || 0;
    if (!active) return 0;
    return (listed / active) * 100;
  };

  const uniqueCategories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of collections) {
      for (const cat of c.categories || []) {
        counts.set(cat, (counts.get(cat) || 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([cat]) => cat);
  }, [collections]);

  // Derived: collections to show in the left sidebar according to sorting and optional top-12 view
  const displayCollections = useMemo(() => {
    let arr = [...collections];
    // Text search
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      arr = arr.filter((c) => c.name.toLowerCase().includes(q));
    }
    // Category filter (any match)
    if (selectedCategories.length > 0) {
      const setCats = new Set(selectedCategories);
      arr = arr.filter((c) => (c.categories || []).some((cat) => setCats.has(cat)));
    }
    // Sorting
    switch (collectionSort) {
      case 'alpha-asc':
        arr.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'alpha-desc':
        arr.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'floor-asc':
        arr.sort((a, b) => (a.floor_price?.amount_usd || 0) - (b.floor_price?.amount_usd || 0));
        break;
      case 'floor-desc':
        arr.sort((a, b) => (b.floor_price?.amount_usd || 0) - (a.floor_price?.amount_usd || 0));
        break;
      case 'volume-asc':
        arr.sort((a, b) => getVolume(a) - getVolume(b));
        break;
      case 'volume-desc':
        arr.sort((a, b) => getVolume(b) - getVolume(a));
        break;
      case 'owners-asc':
        arr.sort((a, b) => (a.stats?.unique_owner_percent || 0) - (b.stats?.unique_owner_percent || 0));
        break;
      case 'owners-desc':
        arr.sort((a, b) => (b.stats?.unique_owner_percent || 0) - (a.stats?.unique_owner_percent || 0));
        break;
      case 'listed-asc':
        arr.sort((a, b) => getListedPercent(a) - getListedPercent(b));
        break;
      case 'listed-desc':
        arr.sort((a, b) => getListedPercent(b) - getListedPercent(a));
        break;
      case 'top12':
        arr.sort((a, b) => getVolume(b) - getVolume(a));
        arr = arr.slice(0, 12);
        break;
    }
    if (showTop12InSidebar) {
      // Always slice top 12 based on current volume timeframe
      arr.sort((a, b) => getVolume(b) - getVolume(a));
      arr = arr.slice(0, 12);
    }
    return arr;
  }, [collections, collectionSort, showTop12InSidebar, selectedCategories, searchText, volumeTimeframe]);

  // Recompute NFT feed whenever selection or sidebar filters change (after displayCollections exists)
  useEffect(() => {
    const visibleSet = new Set(displayCollections.map((c) => c.contract_address));
    if (selectedCollections.length > 0) {
      const setSel = new Set(selectedCollections);
      setFilteredNfts(allNfts.filter((n) => setSel.has(n.collection_address)));
    } else if (collectionSort === 'top12' || selectedCategories.length > 0 || searchText.trim().length > 0) {
      setFilteredNfts(allNfts.filter((n) => visibleSet.has(n.collection_address)));
    } else {
      setFilteredNfts(allNfts);
    }
  }, [displayCollections, selectedCollections, selectedCategories, searchText, allNfts]);

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
            <p className="text-xs text-muted-foreground">Filter NFTs by collection</p>
            {/* Search */}
            <div className="mt-3 flex items-center gap-2">
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Search collections..."
                className="text-xs bg-transparent border border-border/30 rounded px-2 py-1 focus:outline-none flex-1"
              />
            </div>
            {/* Categories Dropdown */}
            <div className="mt-2 relative">
              <button
                onClick={() => setShowCategoryDropdown((v) => !v)}
                className="text-xs px-2 py-1 rounded border bg-muted/10 border-border/30 hover:bg-muted/20"
                aria-haspopup="listbox"
                aria-expanded={showCategoryDropdown}
              >
                {selectedCategories.length > 0 ? `Categories (${selectedCategories.length})` : 'Categories'}
              </button>
              {showCategoryDropdown && (
                <div className="absolute z-10 mt-2 w-64 bg-background border border-border/30 rounded shadow-lg p-2">
                  <div className="max-h-48 overflow-y-auto pr-1">
                    {uniqueCategories.map((cat) => (
                      <label key={cat} className="flex items-center gap-2 px-2 py-1 text-xs hover:bg-muted/10 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedCategories.includes(cat)}
                          onChange={() => setSelectedCategories((prev) => prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat])}
                        />
                        <span>{cat}</span>
                      </label>
                    ))}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <button
                      onClick={() => setSelectedCategories([])}
                      className="text-[10px] px-2 py-1 rounded border bg-muted/10 border-border/30 hover:bg-muted/20"
                    >
                      Clear
                    </button>
                    <button
                      onClick={() => setShowCategoryDropdown(false)}
                      className="text-[10px] px-2 py-1 rounded border bg-muted/10 border-border/30 hover:bg-muted/20"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>
            {/* Volume timeframe, sort, and Top 12 */}
            <div className="mt-2 flex items-center gap-2">
              <label className="text-xs text-muted-foreground">Volume:</label>
              <select
                value={volumeTimeframe}
                onChange={(e) => setVolumeTimeframe(e.target.value as any)}
                className="text-xs bg-transparent border border-border/30 rounded px-2 py-1 focus:outline-none"
              >
                <option value="24h">24h</option>
                <option value="7d">7d</option>
                <option value="30d">30d</option>
              </select>
              <label className="text-xs text-muted-foreground ml-2">Sort:</label>
              <select
                value={collectionSort}
                onChange={(e) => setCollectionSort(e.target.value as any)}
                className="text-xs bg-transparent border border-border/30 rounded px-2 py-1 focus:outline-none"
              >
                <option value="alpha-asc">A → Z</option>
                <option value="alpha-desc">Z → A</option>
                <option value="floor-asc">Floor: Low → High</option>
                <option value="floor-desc">Floor: High → Low</option>
                <option value="volume-desc">Volume: High → Low</option>
                <option value="volume-asc">Volume: Low → High</option>
                <option value="owners-desc">Owners %: High → Low</option>
                <option value="owners-asc">Owners %: Low → High</option>
                <option value="listed-desc">Listed %: High → Low</option>
                <option value="listed-asc">Listed %: Low → High</option>
                <option value="top12">Top 12 by Volume</option>
              </select>
              <button
                onClick={() => {
                  setShowTop12InSidebar((v) => {
                    const next = !v;
                    if (next) {
                      const top = [...collections]
                        .sort((a, b) => getVolume(b) - getVolume(a))
                        .slice(0, 12)
                        .map((c) => c.contract_address);
                      setSelectedCollections(top);
                    } else {
                      setSelectedCollections([]);
                    }
                    return next;
                  });
                }}
                className={`text-xs px-2 py-1 rounded border transition-colors ${showTop12InSidebar ? 'bg-primary/10 border-primary/30' : 'bg-muted/10 border-border/30 hover:bg-muted/20'}`}
                title="Toggle Top 12 by Volume"
              >
                Top 12
              </button>
            </div>
          </div>
          {/* Height tuned to show ~6 items; reduced item padding for density */}
          <div className="p-3 space-y-1 max-h-[36rem] overflow-y-auto">
            {loading ? (
              <div className="text-center py-4 text-muted-foreground text-sm">Loading...</div>
            ) : (
              displayCollections.map((collection) => (
                <div
                  key={collection.contract_address}
                  onClick={() => handleCollectionFilter(collection.contract_address)}
                  className={`p-2 rounded-lg border cursor-pointer transition-colors ${
                    selectedCollections.includes(collection.contract_address)
                      ? 'bg-primary/10 border-primary/30'
                      : 'bg-muted/5 border-border/20 hover:bg-muted/10'
                  }`}
                >
                  <div className="space-y-1">
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
                      {collection.categories.slice(0, 1).map((category) => (
                        <Badge key={category} variant="outline" className="text-[10px]">
                          {category}
                        </Badge>
                      ))}
                    </div>

                    <div className="text-[11px] text-muted-foreground">
                      Floor: {collection.floor_price.formatted} {collection.floor_price.symbol}
                      <span className="mx-1">•</span>
                      Vol {volumeTimeframe}: {getFormattedVolume(collection)}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      Owners: {(collection.stats?.unique_owner_percent ?? 0).toFixed(1)}%
                      <span className="mx-1">•</span>
                      Listed %: {getListedPercent(collection).toFixed(1)}%
                      <span className="mx-1">•</span>
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
