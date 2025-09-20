import React from "react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ExternalLink } from "lucide-react";

interface PerpsTabProps {
  protocols: any[];
  viewMode: "card" | "list" | string;
  categoryInfo: { color: string; bg: string; border: string };
}

const PerpsTab: React.FC<PerpsTabProps> = ({ protocols }) => {
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto no-scrollbar">
      <Table className="min-w-[720px]">
        <TableHeader>
          <TableRow>
            <TableHead>Platform</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="w-24">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {protocols.map((protocol, index) => (
            <TableRow key={`${protocol.protocol}-${protocol.chain}-${index}`}>
              <TableCell className="font-medium">{protocol.protocol}</TableCell>
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
          ))}
        </TableBody>
      </Table>
      </div>
    </Card>
  );
};

export default PerpsTab;

