import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TransactionType } from "@/components/TransactionLog";
import { useAuth } from "@/lib/auth-context";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  ArrowUpRight,
  ArrowDownLeft,
  Flame,
  ShoppingBag,
  Download,
  Filter,
  Building2,
  ExternalLink,
} from "lucide-react";

interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  description: string;
  fromUserId: string | null;
  toUserId: string | null;
  fromUserName: string | null;
  toUserName: string | null;
  communityId: string | null;
  createdAt: string;
  status: "completed" | "pending";
  txHash?: string | null;
}

interface CommunityBalance {
  communityId: string;
  communityName: string;
  balance: number;
  salesCount: number;
}

const typeConfig: Record<TransactionType, { icon: typeof ArrowUpRight; label: string; color: string }> = {
  send: { icon: ArrowUpRight, label: "Inviato", color: "text-destructive" },
  receive: { icon: ArrowDownLeft, label: "Ricevuto", color: "text-success" },
  burn: { icon: Flame, label: "Burn", color: "text-accent" },
  purchase: { icon: ShoppingBag, label: "Acquisto", color: "text-secondary" },
};

export function TransactionsPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [communityFilter, setCommunityFilter] = useState<string>("all");

  const { data: transactions = [] } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
    enabled: !!user?.id,
  });

  const { data: communityBalances = [] } = useQuery<CommunityBalance[]>({
    queryKey: ["/api/provider/balances"],
    enabled: !!user?.id && user.role === "provider",
  });

  if (!user) return null;

  const isProvider = user.role === "provider";

  const uniqueCommunities = communityBalances.map(cb => ({
    id: cb.communityId,
    name: cb.communityName,
  }));

  const filteredTransactions = transactions.filter((tx) => {
    const matchesSearch = tx.description?.toLowerCase().includes(search.toLowerCase()) ?? true;
    const matchesType = typeFilter === "all" || tx.type === typeFilter;
    const matchesCommunity = communityFilter === "all" || tx.communityId === communityFilter;
    return matchesSearch && matchesType && matchesCommunity;
  });

  const getCommunityName = (communityId: string | null) => {
    if (!communityId) return "-";
    const community = uniqueCommunities.find(c => c.id === communityId);
    return community?.name || "Comunità";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Transazioni</h1>
          <p className="text-muted-foreground">
            Storico completo di tutte le transazioni
          </p>
        </div>
        <Button variant="outline" data-testid="button-export">
          <Download className="h-4 w-4 mr-2" />
          Esporta CSV
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cerca transazioni..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                data-testid="input-search-transactions"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-48" data-testid="select-filter-type">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filtra per tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti i tipi</SelectItem>
                <SelectItem value="receive">Ricevuti</SelectItem>
                <SelectItem value="send">Inviati</SelectItem>
                <SelectItem value="purchase">Acquisti</SelectItem>
                <SelectItem value="burn">Burn</SelectItem>
              </SelectContent>
            </Select>
            {isProvider && uniqueCommunities.length > 0 && (
              <Select value={communityFilter} onValueChange={setCommunityFilter}>
                <SelectTrigger className="w-56" data-testid="select-filter-community">
                  <Building2 className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filtra per comunità" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutte le comunità</SelectItem>
                  {uniqueCommunities.map((community) => (
                    <SelectItem key={community.id} value={community.id!}>
                      {community.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Da</TableHead>
                  <TableHead>A</TableHead>
                  <TableHead>Descrizione</TableHead>
                  {isProvider && <TableHead>Comunità</TableHead>}
                  <TableHead className="text-right">Importo</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead>Blockchain</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isProvider ? 9 : 8} className="text-center py-8 text-muted-foreground">
                      Nessuna transazione trovata
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTransactions.map((tx) => {
                    const config = typeConfig[tx.type];
                    const Icon = config.icon;
                    const isNegative = tx.type === "burn" || tx.type === "purchase" || tx.type === "send";

                    return (
                      <TableRow key={tx.id} data-testid={`tx-row-${tx.id}`}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded bg-muted ${config.color}`}>
                              <Icon className="h-3 w-3" />
                            </div>
                            <span className="text-sm">{config.label}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{tx.fromUserName || "-"}</TableCell>
                        <TableCell className="text-sm">{tx.toUserName || "-"}</TableCell>
                        <TableCell className="font-medium">{tx.description || "-"}</TableCell>
                        {isProvider && (
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {getCommunityName(tx.communityId)}
                            </Badge>
                          </TableCell>
                        )}
                        <TableCell className="text-right">
                          <span className={`font-semibold ${isNegative ? "text-destructive" : "text-success"}`}>
                            {isNegative ? "-" : "+"}
                            {tx.amount.toLocaleString("it-IT")} ECT
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(tx.createdAt).toLocaleDateString("it-IT")}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={tx.status === "completed" ? "default" : "outline"}
                            className={tx.status === "completed" ? "bg-success/20 text-success border-0" : ""}
                          >
                            {tx.status === "completed" ? "Completato" : "In attesa"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {tx.txHash ? (
                            <a
                              href={`https://sepolia.etherscan.io/tx/${tx.txHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                              data-testid={`link-etherscan-${tx.id}`}
                            >
                              <ExternalLink className="h-3 w-3" />
                              Etherscan
                            </a>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
