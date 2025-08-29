import React from "react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ExternalLink } from "lucide-react";
import { useStride } from "@/hooks/useStride";
import { useDropMoney } from "@/hooks/useDropMoney";

interface LiquidStakingTabProps {
  protocols: any[];
  viewMode: "card" | "list" | string;
  categoryInfo: { color: string; bg: string; border: string };
}

const LiquidStakingTab: React.FC<LiquidStakingTabProps> = ({ protocols }) => {
  const { isLoading: isStrideLoading, isError: isStrideError, tvlUsd: strideTvl, apy: strideApy, apr: strideApr } = useStride();
  const { data: dropMoneyData, isLoading: isDropMoneyLoading, isError: isDropMoneyError } = useDropMoney();

  const fmtPct = (v?: number | string) => {
    if (v === undefined || v === null || v === "—") return "—";
    if (typeof v === "string") return v;
    const pct = v * 100;
    if (pct !== 0 && Math.abs(pct) < 0.01) return "<0.01%";
    return `${pct.toFixed(2)}%`;
  };

  const fmtUsd = (v?: number | string) => {
    if (v === undefined || v === null || v === "—") return "—";
    if (typeof v === "string") return v;
    return `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  };

  return (
    <Card className="overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Platform</TableHead>
            <TableHead>Current Rate</TableHead>
            <TableHead>APY (30d)</TableHead>
            <TableHead>TVL</TableHead>
            <TableHead>Fee</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="w-24">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {protocols.map((protocol, index) => {
            const isStride = protocol.protocol === "Stride";
            const isDropMoney = protocol.protocol === "Drop.money";

            let aprDisplay = protocol.metrics?.["APR"] || "—";
            let apyDisplay = "—";
            let tvlDisplay = protocol.metrics?.["TVL"] || "—";
            let feeDisplay = protocol.metrics?.["Protocol Fee"] || "—";

            if (isStride) {
              aprDisplay = isStrideLoading || isStrideError ? "—" : fmtPct(strideApr);
              apyDisplay = isStrideLoading || isStrideError ? "—" : fmtPct(strideApy);
              tvlDisplay = isStrideLoading || isStrideError ? "—" : fmtUsd(strideTvl);
              feeDisplay = "10% of rewards";
            } else if (isDropMoney) {
              aprDisplay = isDropMoneyLoading || isDropMoneyError ? "—" : fmtPct(dropMoneyData?.apr);
              apyDisplay = isDropMoneyLoading || isDropMoneyError ? "—" : fmtPct(dropMoneyData?.apy);
              tvlDisplay = isDropMoneyLoading || isDropMoneyError ? "—" : fmtUsd(dropMoneyData?.tvlUsd);
              feeDisplay = "10% of rewards";
            }
            return (
              <TableRow key={`${protocol.protocol}-${protocol.chain}-${index}`}>
                <TableCell className="font-medium">{protocol.protocol}</TableCell>
                <TableCell className="text-primary font-semibold">{aprDisplay}</TableCell>
                <TableCell className="text-primary font-semibold">{apyDisplay}</TableCell>
                <TableCell className="text-foreground font-medium">{tvlDisplay}</TableCell>
                <TableCell className="text-muted-foreground">{feeDisplay}</TableCell>
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

export default LiquidStakingTab;

