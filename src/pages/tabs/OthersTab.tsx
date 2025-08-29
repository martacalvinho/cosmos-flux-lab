import React from "react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const OthersTab: React.FC = () => {
  return (
    <section>
      <Card className="overflow-hidden">
        <div className="p-6">
          <h3 className="text-xl font-semibold mb-2 text-others">Others</h3>
          <p className="text-muted-foreground mb-4">Additional ATOM ecosystem utilities.</p>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Platform</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-medium">
                <Badge variant="outline" className="text-others bg-others/10 border-others/20">dVPN</Badge>
              </TableCell>
              <TableCell>
                Decentralized VPN services powered by the Cosmos ecosystem, providing privacy and security through blockchain technology.
              </TableCell>
              <TableCell>
                <Button size="sm" variant="outline" asChild>
                  <a href="https://dvpn.me/" target="_blank" rel="noopener noreferrer">Visit</a>
                </Button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Card>
    </section>
  );
};

export default OthersTab;
