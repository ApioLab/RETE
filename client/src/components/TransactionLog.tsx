import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowUpRight,
  ArrowDownLeft,
  Flame,
  ShoppingBag,
  Clock,
  ExternalLink,
} from "lucide-react";

export type TransactionType = "send" | "receive" | "burn" | "purchase";

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  description: string;
  timestamp: string;
  fromUserName?: string | null;
  toUserName?: string | null;
  status: "completed" | "pending";
  txHash?: string | null;
}

interface TransactionLogProps {
  transactions: Transaction[];
  title?: string;
  maxHeight?: string;
}

const typeConfig: Record<
  TransactionType,
  { icon: typeof ArrowUpRight; color: string; label: string }
> = {
  send: { icon: ArrowUpRight, color: "text-destructive", label: "Inviato" },
  receive: { icon: ArrowDownLeft, color: "text-success", label: "Ricevuto" },
  burn: { icon: Flame, color: "text-accent", label: "Burn" },
  purchase: { icon: ShoppingBag, color: "text-secondary", label: "Acquisto" },
};

export function TransactionLog({
  transactions,
  title = "Transazioni Recenti",
  maxHeight = "400px",
}: TransactionLogProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea style={{ maxHeight }} className="px-6 pb-6">
          <div className="space-y-1">
            {transactions.map((tx, index) => {
              const config = typeConfig[tx.type];
              const Icon = config.icon;
              const isNegative = tx.type === "send" || tx.type === "burn" || tx.type === "purchase";

              return (
                <div
                  key={tx.id}
                  className="flex items-center gap-3 py-3 border-b last:border-0"
                  data-testid={`transaction-row-${tx.id}`}
                >
                  <div
                    className={`p-2 rounded-full bg-muted ${config.color}`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">
                        {tx.description}
                      </p>
                      {tx.status === "pending" && (
                        <Badge variant="outline" className="text-xs">
                          <Clock className="h-3 w-3 mr-1" />
                          In attesa
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      {tx.fromUserName && (
                        <span>Da: {tx.fromUserName}</span>
                      )}
                      {tx.fromUserName && tx.toUserName && <span>→</span>}
                      {tx.toUserName && (
                        <span>A: {tx.toUserName}</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {tx.timestamp}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`font-semibold ${
                        isNegative ? "text-destructive" : "text-success"
                      }`}
                    >
                      {isNegative ? "-" : "+"}
                      {tx.amount.toLocaleString("it-IT")} ECT
                    </p>
                    {tx.txHash && (
                      <a
                        href={`https://sepolia.etherscan.io/tx/${tx.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
                        data-testid={`link-etherscan-${tx.id}`}
                      >
                        <ExternalLink className="h-3 w-3" />
                        Vedi su Etherscan
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
