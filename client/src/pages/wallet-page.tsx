import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { 
  ExternalLink, 
  Copy, 
  QrCode, 
  Shield, 
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Zap,
  CheckCircle,
  Clock,
  Coins,
  ShoppingBag,
  Flame
} from "lucide-react";
import { useState } from "react";

interface Transaction {
  id: string;
  type: "send" | "receive" | "purchase" | "burn";
  amount: number;
  description: string | null;
  fromUserId: string | null;
  toUserId: string | null;
  createdAt: string;
  status: "completed" | "pending";
}

const typeConfig = {
  send: { icon: ArrowUpRight, label: "Inviato", color: "text-destructive" },
  receive: { icon: ArrowDownLeft, label: "Ricevuto", color: "text-success" },
  burn: { icon: Flame, label: "Burn", color: "text-accent" },
  purchase: { icon: ShoppingBag, label: "Acquisto", color: "text-secondary" },
};

export function WalletPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showQR, setShowQR] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data: transactions = [] } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
    enabled: !!user?.id,
  });

  if (!user) return null;

  const shortAddress = `${user.ethAddress.slice(0, 6)}...${user.ethAddress.slice(-4)}`;
  
  const stats = {
    received: transactions
      .filter(tx => tx.toUserId === user.id && (tx.type === "receive" || tx.type === "purchase"))
      .reduce((sum, tx) => sum + tx.amount, 0),
    spent: transactions
      .filter(tx => tx.fromUserId === user.id && (tx.type === "send" || tx.type === "purchase" || tx.type === "burn"))
      .reduce((sum, tx) => sum + tx.amount, 0),
    pending: transactions
      .filter(tx => tx.status === "pending")
      .reduce((sum, tx) => sum + tx.amount, 0),
  };
  
  const spentPercentage = stats.received > 0 ? (stats.spent / stats.received) * 100 : 0;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(user.ethAddress);
    setCopied(true);
    toast({
      title: "Indirizzo copiato",
      description: "L'indirizzo completo è stato copiato negli appunti",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const recentTransactions = transactions.slice(0, 5);

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white border-0 overflow-hidden">
        <CardContent className="p-0">
          <div className="p-6 pb-4">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-white/10">
                  <Wallet className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="font-bold text-lg">Il Mio Wallet</h1>
                  <p className="text-sm text-white/60">RETE Energy Token</p>
                </div>
              </div>
              <Badge className="bg-success/20 text-success border-0">
                <CheckCircle className="h-3 w-3 mr-1" />
                Attivo
              </Badge>
            </div>

            <div className="text-center py-6">
              <p className="text-sm text-white/60 mb-2">Saldo Disponibile</p>
              <div className="flex items-baseline justify-center gap-2">
                <span className="text-5xl font-bold" data-testid="text-wallet-balance">
                  {user.tokenBalance.toLocaleString("it-IT")}
                </span>
                <span className="text-2xl text-accent font-medium">TOKEN</span>
              </div>
            </div>

            <div className="bg-white/5 rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/20">
                    <Zap className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-white/50 mb-0.5">Indirizzo Wallet</p>
                    <code className="text-sm font-mono" data-testid="text-wallet-address">
                      {showQR ? user.ethAddress : shortAddress}
                    </code>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10"
                    onClick={handleCopy}
                    data-testid="button-copy-address"
                  >
                    {copied ? (
                      <CheckCircle className="h-4 w-4 text-success" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-8 w-8 hover:bg-white/10 ${showQR ? 'text-primary' : 'text-white/70 hover:text-white'}`}
                    onClick={() => setShowQR(!showQR)}
                    data-testid="button-toggle-qr"
                  >
                    <QrCode className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10"
                    data-testid="button-view-explorer"
                    asChild
                  >
                    <a
                      href={`https://sepolia.etherscan.io/address/${user.ethAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </div>
            </div>

            {showQR && (
              <div className="flex justify-center py-4">
                <div className="bg-white p-4 rounded-xl">
                  <div className="w-32 h-32 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMjgiIGhlaWdodD0iMTI4IiB2aWV3Qm94PSIwIDAgMTI4IDEyOCI+PHJlY3Qgd2lkdGg9IjEyOCIgaGVpZ2h0PSIxMjgiIGZpbGw9IiNmZmYiLz48ZyBmaWxsPSIjMDAwIj48cmVjdCB4PSIxNiIgeT0iMTYiIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIvPjxyZWN0IHg9IjgwIiB5PSIxNiIgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIi8+PHJlY3QgeD0iMTYiIHk9IjgwIiB3aWR0aD0iMzIiIGhlaWdodD0iMzIiLz48cmVjdCB4PSI1NiIgeT0iNTYiIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIvPjxyZWN0IHg9IjI0IiB5PSIyNCIgd2lkdGg9IjE2IiBoZWlnaHQ9IjE2IiBmaWxsPSIjZmZmIi8+PHJlY3QgeD0iODgiIHk9IjI0IiB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIGZpbGw9IiNmZmYiLz48cmVjdCB4PSIyNCIgeT0iODgiIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgZmlsbD0iI2ZmZiIvPjwvZz48L3N2Zz4=')] bg-contain" />
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 border-t border-white/10">
            <div className="p-4 text-center border-r border-white/10">
              <div className="flex items-center justify-center gap-1 text-success mb-1">
                <ArrowDownLeft className="h-4 w-4" />
                <span className="text-xs">Ricevuti</span>
              </div>
              <p className="font-bold">{stats.received.toLocaleString()}</p>
            </div>
            <div className="p-4 text-center border-r border-white/10">
              <div className="flex items-center justify-center gap-1 text-destructive mb-1">
                <ArrowUpRight className="h-4 w-4" />
                <span className="text-xs">Spesi</span>
              </div>
              <p className="font-bold">{stats.spent.toLocaleString()}</p>
            </div>
            <div className="p-4 text-center">
              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                <Clock className="h-4 w-4" />
                <span className="text-xs">In Attesa</span>
              </div>
              <p className="font-bold">{stats.pending}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Coins className="h-5 w-5 text-accent" />
              Riepilogo Token
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {stats.received > 0 ? (
              <>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Token spesi su ricevuti</span>
                    <span className="font-medium">{spentPercentage.toFixed(0)}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${Math.min(spentPercentage, 100)}%` }}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-success/10">
                    <div className="flex items-center gap-2 mb-2">
                      <ArrowDownLeft className="h-4 w-4 text-success" />
                      <span className="text-sm font-medium">Entrate</span>
                    </div>
                    <p className="text-2xl font-bold text-success">+{stats.received.toLocaleString()}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-destructive/10">
                    <div className="flex items-center gap-2 mb-2">
                      <ArrowUpRight className="h-4 w-4 text-destructive" />
                      <span className="text-sm font-medium">Uscite</span>
                    </div>
                    <p className="text-2xl font-bold text-destructive">-{stats.spent.toLocaleString()}</p>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <Coins className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Nessuna transazione ancora</p>
                <p className="text-sm">Riceverai token dal tuo coordinatore</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5 text-success" />
              Sicurezza e Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-success/10 mt-0.5">
                  <Shield className="h-4 w-4 text-success" />
                </div>
                <div>
                  <p className="font-medium mb-1">Wallet Protetto</p>
                  <p className="text-sm text-muted-foreground">
                    La tua chiave privata è gestita in modo sicuro dalla piattaforma RETE con crittografia avanzata.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-muted/50">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-secondary/10 mt-0.5">
                  <Zap className="h-4 w-4 text-secondary" />
                </div>
                <div>
                  <p className="font-medium mb-1">Token RETE</p>
                  <p className="text-sm text-muted-foreground">
                    I tuoi token sono crediti interni che simulano token Ethereum. In futuro migreranno su blockchain reale.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-muted/50">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-accent/10 mt-0.5">
                  <ExternalLink className="h-4 w-4 text-accent" />
                </div>
                <div>
                  <p className="font-medium mb-1">Comunità Energetica</p>
                  <p className="text-sm text-muted-foreground">
                    I token ricevuti possono essere spesi nel marketplace per prodotti e servizi.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Ultime Transazioni</CardTitle>
        </CardHeader>
        <CardContent>
          {recentTransactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Nessuna transazione ancora</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentTransactions.map((tx) => {
                const config = typeConfig[tx.type];
                const Icon = config.icon;
                const isPositive = tx.toUserId === user.id;

                return (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    data-testid={`tx-row-${tx.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg bg-background ${config.color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{tx.description || config.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(tx.createdAt).toLocaleDateString("it-IT")}
                        </p>
                      </div>
                    </div>
                    <span className={`font-semibold ${isPositive ? "text-success" : "text-destructive"}`}>
                      {isPositive ? "+" : "-"}{tx.amount.toLocaleString("it-IT")} ECT
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
