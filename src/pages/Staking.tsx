import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

// Mock data for Cosmos Hub validators (sampled)
type Validator = {
  name: string;
  commission: number; // percent
  uptime: number; // 0-100
  status: "Active" | "Inactive" | "Jailed";
  votingPower: number; // ATOM
};

const VALIDATORS: Validator[] = [
  { name: "Inter Blockchain Services", commission: 5, uptime: 100, status: "Active", votingPower: 11173263 },
  { name: "BLockPI", commission: 5, uptime: 100, status: "Active", votingPower: 2254567 },
  { name: "cosmos hub", commission: 5, uptime: 100, status: "Active", votingPower: 3135182 },
  { name: "Coinage x DAIC", commission: 5, uptime: 100, status: "Active", votingPower: 6342633 },
  { name: "CrowdControl", commission: 5, uptime: 100, status: "Active", votingPower: 9627277 },
  { name: "OWALLET", commission: 5, uptime: 100, status: "Active", votingPower: 9717370 },
  { name: "Oleg", commission: 5, uptime: 100, status: "Active", votingPower: 1411684 },
  { name: "bLockscape", commission: 5, uptime: 100, status: "Active", votingPower: 1635373 },
  { name: "EthicaNode", commission: 5, uptime: 100, status: "Active", votingPower: 1659810 },
];

const formatNumber = (n: number) => new Intl.NumberFormat("en-US").format(n);

// (Protocol list removed in favor of validators table)

export default function Staking() {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredValidators = VALIDATORS.filter((v) =>
    v.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Page Header */}
      <div className="border-b border-border bg-surface/30">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-staking/10 flex items-center justify-center">
                  <div className="w-4 h-4 bg-staking rounded-full" />
                </div>
                Cosmos Hub Staking
              </h1>
              <p className="text-muted-foreground mt-2">Browse validators and delegate your ATOM</p>
            </div>
            
            <div className="flex items-center gap-4">
              <Button variant="staking">Connect Keplr</Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Search */}
        <div className="flex items-center gap-4">
          <div className="flex-1 max-w-md">
            <Input
              placeholder="Search validators…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-surface border-border"
            />
          </div>
        </div>

        {/* Validators Table */}
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Validator</TableHead>
                <TableHead className="w-32">Commission</TableHead>
                <TableHead className="w-64">Uptime</TableHead>
                <TableHead className="w-28">Status</TableHead>
                <TableHead className="w-56">Voting Power</TableHead>
                <TableHead className="w-40 text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredValidators.map((v) => (
                <TableRow key={v.name}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 bg-muted/50">
                        <AvatarFallback className="text-xs font-semibold">
                          {v.name[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="font-medium truncate">{v.name}</div>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{v.commission}%</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-40">
                        <Progress value={v.uptime} className="h-2 bg-muted/40" />
                      </div>
                      <div className="text-xs text-muted-foreground">{v.uptime.toFixed(2)}%</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                      {v.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{formatNumber(v.votingPower)} ATOM</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="staking">Delegate</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        {filteredValidators.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No validators match your search.</p>
          </div>
        )}
      </div>
    </div>
  );
}