import React, { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CosmosHubService, HubValidator, HubValidatorMetaMap } from "@/services/cosmosHub";

const formatNumber = (n: number) => new Intl.NumberFormat("en-US").format(n);

interface Props {
  searchTerm: string;
  showHidden?: boolean;
}

const StakingTab: React.FC<Props> = ({ searchTerm, showHidden = false }) => {
  const [validators, setValidators] = useState<HubValidator[]>([]);
  const [loadingValidators, setLoadingValidators] = useState(false);
  const [logoMap, setLogoMap] = useState<Record<string, string | null>>({});
  const [loadingLogos, setLoadingLogos] = useState(false);
  const [metadataMap, setMetadataMap] = useState<HubValidatorMetaMap>({});
  const [loadingMetadata, setLoadingMetadata] = useState(false);
  const [sortBy, setSortBy] = useState<'default' | 'commission' | 'uptime' | 'votingPower'>('default');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingValidators(true);
      try {
        const vals = await CosmosHubService.fetchActiveValidators();
        if (!cancelled) setValidators(vals);
      } catch (e) {
        console.error('Failed to load validators', e);
        if (!cancelled) setValidators([]);
      } finally {
        if (!cancelled) setLoadingValidators(false);
      }
    })();
    return () => { cancelled = true };
  }, []);

  useEffect(() => {
    if (!validators.length || Object.keys(metadataMap).length === 0) { 
      setLogoMap({}); 
      return; 
    }
    let cancelled = false;
    (async () => {
      setLoadingLogos(true);
      try {
        // Only fetch Keybase logos for validators that don't have pfp in metadata
        const validatorsNeedingLogos = validators.filter(v => !metadataMap[v.operator_address]?.pfp);
        const logos = validatorsNeedingLogos.length > 0 
          ? await CosmosHubService.fetchValidatorLogos(validatorsNeedingLogos)
          : {};
        if (!cancelled) setLogoMap(logos);
      } catch (e) {
        console.error('Failed to load validator logos', e);
        if (!cancelled) setLogoMap({});
      } finally {
        if (!cancelled) setLoadingLogos(false);
      }
    })();
    return () => { cancelled = true };
  }, [validators, metadataMap]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingMetadata(true);
      try {
        const metadata = await CosmosHubService.fetchValidatorMetadata('cosmoshub', 'active');
        if (!cancelled) setMetadataMap(metadata);
      } catch (e) {
        console.error('Failed to load validator metadata', e);
        if (!cancelled) setMetadataMap({});
      } finally {
        if (!cancelled) setLoadingMetadata(false);
      }
    })();
    return () => { cancelled = true };
  }, []);

  const filteredValidators = useMemo(() => {
    return validators
      .filter((v) => {
        // Filter by search term
        const searchMatch = (v.description?.moniker || v.operator_address)
          .toLowerCase()
          .includes(searchTerm.toLowerCase());
        
        // Filter by hidden status
        const metadata = metadataMap[v.operator_address];
        const isHidden = metadata?.display === 'hidden';
        const hiddenMatch = showHidden || !isHidden;
        
        return searchMatch && hiddenMatch;
      })
      .map((v) => {
        const metadata = metadataMap[v.operator_address];
        return {
          id: v.operator_address,
          name: v.description?.moniker || v.operator_address,
          logoUrl: metadata?.pfp || logoMap[v.operator_address] || null,
          commission: Number(v.commission?.commission_rates?.rate || '0') * 100,
          uptime: 99,
          status: "Active" as const,
          votingPower: Math.round(Number(v.tokens || '0') / 1_000_000),
          tags: metadata?.tags || [],
          isHidden: metadata?.display === 'hidden',
        };
      });
  }, [validators, searchTerm, showHidden, metadataMap, logoMap]);

  const handleSort = (key: 'commission' | 'uptime' | 'votingPower') => {
    if (sortBy === key) {
      setSortDir(sortDir === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(key);
      setSortDir('desc');
    }
  };

  const sortedValidators = [...filteredValidators].sort((a, b) => {
    if (sortBy === 'default') {
      // Default sort: uptime desc, then commission asc, then voting power asc
      const uptimeDiff = b.uptime - a.uptime;
      if (uptimeDiff !== 0) return uptimeDiff;
      
      const commissionDiff = a.commission - b.commission;
      if (commissionDiff !== 0) return commissionDiff;
      
      return a.votingPower - b.votingPower;
    }
    
    let comp = 0;
    switch (sortBy) {
      case 'commission':
        comp = a.commission - b.commission; break;
      case 'uptime':
        comp = a.uptime - b.uptime; break;
      case 'votingPower':
        comp = a.votingPower - b.votingPower; break;
    }
    return sortDir === 'desc' ? -comp : comp;
  });

  return (
    <Card className="overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Validator</TableHead>
            <TableHead onClick={() => handleSort('commission')} className="cursor-pointer select-none">
              Commission {sortBy === 'commission' ? (sortDir === 'desc' ? '▼' : '▲') : ''}
            </TableHead>
            <TableHead onClick={() => handleSort('uptime')} className="cursor-pointer select-none">
              Uptime {sortBy === 'uptime' ? (sortDir === 'desc' ? '▼' : '▲') : ''}
            </TableHead>
            <TableHead>Status</TableHead>
            <TableHead onClick={() => handleSort('votingPower')} className="cursor-pointer select-none">
              Voting Power {sortBy === 'votingPower' ? (sortDir === 'desc' ? '▼' : '▲') : ''}
            </TableHead>
            <TableHead>Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(loadingValidators || loadingMetadata) ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading…</TableCell>
            </TableRow>
          ) : sortedValidators.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No validators found</TableCell>
            </TableRow>
          ) : (
            sortedValidators.map((v) => (
              <TableRow key={v.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      {v.logoUrl ? (
                        <AvatarImage src={v.logoUrl} alt={v.name} />
                      ) : null}
                      <AvatarFallback>{v.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="font-medium">{v.name}</div>
                        {v.isHidden && (
                          <Badge variant="secondary" className="text-xs px-1 py-0">Hidden</Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">Cosmos Hub</div>
                      {v.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {v.tags.slice(0, 3).map((tag, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs px-1 py-0">
                              {tag}
                            </Badge>
                          ))}
                          {v.tags.length > 3 && (
                            <Badge variant="outline" className="text-xs px-1 py-0">+{v.tags.length - 3}</Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>{v.commission.toFixed(2).replace(/\.00$/, '')}%</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Progress value={v.uptime} className="h-2" />
                    <span className="text-xs text-muted-foreground">{v.uptime}%</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={cn(
                    'text-green-500 border-green-500/30 bg-green-500/10'
                  )}>
                    Active
                  </Badge>
                </TableCell>
                <TableCell>{formatNumber(v.votingPower)} ATOM</TableCell>
                <TableCell>
                  <Button size="sm" variant="outline">Delegate</Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </Card>
  );
};

export default StakingTab;
