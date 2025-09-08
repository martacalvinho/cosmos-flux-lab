import React from "react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ExternalLink } from "lucide-react";
import { useKavaLend } from "@/hooks/useKavaLend";
import { useMarsLend } from "@/hooks/useMarsLend";

interface LendingTabProps {
  protocols: any[];
  viewMode: "card" | "list" | string;
  categoryInfo: { color: string; bg: string; border: string };
}

const LendingTab: React.FC<LendingTabProps> = ({ protocols }) => {
  const { isLoading: isKavaLoading, isError: isKavaError, supplyApyPct, supplyRewardApyPct, borrowApyPct, totalSupplyUsd, totalBorrowUsd } = useKavaLend();
  const { isLoading: isMarsLoading, isError: isMarsError, supplyApyPct: marsSupplyApyPct, borrowApyPct: marsBorrowApyPct, totalSupplyUsd: marsTotalSupplyUsd, totalBorrowUsd: marsTotalBorrowUsd } = useMarsLend('neutron', 'atom');

  const fmtPct = (v?: number) => {
    if (v === undefined || v === null || !Number.isFinite(v)) return "—";
    if (Math.abs(v) > 0 && Math.abs(v) < 0.01) return "<0.01%";
    return `${v.toFixed(2)}%`;
  };
  const fmtUsd = (v?: number) => {
    if (v === undefined || v === null || !Number.isFinite(v)) return "—";
    const abs = Math.abs(v);
    if (abs >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
    if (abs >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
    if (abs >= 1e3) return `$${(v / 1e3).toFixed(1)}K`;
    return `$${v.toFixed(0)}`;
  };
  return (
    <Card className="overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Platform</TableHead>
            <TableHead>APY</TableHead>
            <TableHead>Totals</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="w-24">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {protocols.map((protocol, index) => {
            const isKava = protocol.protocol === "Kava Lend";
            const isMars = protocol.protocol === "Mars Protocol";
            const apyCell = isKava
              ? (isKavaLoading || isKavaError
                  ? "—"
                  : (
                    <div className="space-y-1">
                      <div><span className="text-muted-foreground">Supply APY:</span> <span className="font-medium">{fmtPct(supplyApyPct)}</span></div>
                      <div><span className="text-muted-foreground">Supply Reward APY:</span> <span className="font-medium">{fmtPct(supplyRewardApyPct)}</span></div>
                      <div><span className="text-muted-foreground">Borrow Interest:</span> <span className="font-medium">{fmtPct(borrowApyPct)}</span></div>
                    </div>
                  ))
              : isMars
                ? (isMarsLoading || isMarsError
                    ? "—"
                    : (
                      <div className="space-y-1">
                        <div><span className="text-muted-foreground">Supply APY:</span> <span className="font-medium">{fmtPct(marsSupplyApyPct)}</span></div>
                        <div><span className="text-muted-foreground">Borrow Interest:</span> <span className="font-medium">{fmtPct(marsBorrowApyPct)}</span></div>
                      </div>
                    ))
                : (protocol.metrics?.["Supply APY"] || protocol.metrics?.["APR"] || "—");
            return (
              <TableRow key={`${protocol.protocol}-${protocol.chain}-${index}`}>
                <TableCell className="font-medium">{protocol.protocol}</TableCell>
                <TableCell className="text-primary font-semibold">{apyCell}</TableCell>
                <TableCell className="font-medium">
                  {isKava ? (
                    isKavaLoading || isKavaError ? "—" : (
                      <div className="space-y-1">
                        <div>
                          <span className="text-muted-foreground">Supply:</span>
                          {' '}
                          <span className="text-white font-semibold">{fmtUsd(totalSupplyUsd)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Borrow:</span>
                          {' '}
                          <span className="text-white font-semibold">{fmtUsd(totalBorrowUsd)}</span>
                        </div>
                      </div>
                    )
                  ) : isMars ? (
                    isMarsLoading || isMarsError ? "—" : (
                      <div className="space-y-1">
                        <div>
                          <span className="text-muted-foreground">Supply:</span>
                          {' '}
                          <span className="text-white font-semibold">{fmtUsd(marsTotalSupplyUsd)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Borrow:</span>
                          {' '}
                          <span className="text-white font-semibold">{fmtUsd(marsTotalBorrowUsd)}</span>
                        </div>
                      </div>
                    )
                  ) : (<span className="text-white font-semibold">{protocol.metrics?.["TVL"] || "—"}</span>)}
                </TableCell>
                <TableCell className="text-muted-foreground max-w-xs">
                  {protocol.description || protocol.title || "—"}
                </TableCell>
                <TableCell>
                  <a
                    href={protocol.links?.app || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 hover:bg-primary/20 text-primary transition-colors group"
                  >
                    <ExternalLink className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  </a>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
};

export default LendingTab;


