import React from "react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProtocolCard } from "@/components/ui/protocol/ProtocolCard";
import { cn } from "@/lib/utils";

interface LiquidStakingTabProps {
  protocols: any[];
  viewMode: "card" | "list" | string;
  categoryInfo: { color: string; bg: string; border: string };
}

const LiquidStakingTab: React.FC<LiquidStakingTabProps> = ({ protocols, viewMode, categoryInfo }) => {
  if (viewMode === "card") {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
        {protocols.map((protocol, index) => (
          <ProtocolCard
            key={`${protocol.protocol}-${protocol.chain}-${index}`}
            {...protocol}
          />
        ))}
      </div>
    );
  }

  return (
    <Card className="overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Assets</TableHead>
            <TableHead>APY</TableHead>
            <TableHead>Protocol</TableHead>
            <TableHead>Chain</TableHead>
            <TableHead>TVL</TableHead>
            <TableHead>Volume 24h</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {protocols.map((protocol, index) => (
            <TableRow key={`${protocol.protocol}-${protocol.chain}-${index}`}>
              <TableCell>
                <div className="flex gap-1 flex-wrap">
                  {protocol.assets.map((asset: string) => (
                    <Badge
                      key={asset}
                      variant="outline"
                      className={cn(
                        "text-xs font-semibold",
                        categoryInfo.color,
                        categoryInfo.bg,
                        categoryInfo.border
                      )}
                    >
                      {asset}
                    </Badge>
                  ))}
                </div>
              </TableCell>
              <TableCell className="font-medium">
                {(protocol.metrics as any).APY || Object.entries(protocol.metrics)[0]?.[1] || "—"}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={cn(categoryInfo.color, categoryInfo.bg, categoryInfo.border)}>
                  {protocol.protocol}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant="outline">{protocol.chain}</Badge>
              </TableCell>
              <TableCell>
                {(protocol.metrics as any).TVL ||
                  Object.entries(protocol.metrics).find(([key]) => key.toLowerCase().includes("tvl"))?.[1] ||
                  "—"}
              </TableCell>
              <TableCell>
                {(protocol.metrics as any)["Volume (24h)"] ||
                  Object.entries(protocol.metrics).find(([key]) => key.toLowerCase().includes("volume"))?.[1] ||
                  "—"}
              </TableCell>
              <TableCell>
                <Button size="sm" variant="outline" asChild>
                  <a href={protocol.links.app || "#"} target="_blank" rel="noopener noreferrer">
                    Open App
                  </a>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
};

export default LiquidStakingTab;
