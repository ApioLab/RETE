import { TransactionLog, Transaction } from "@/components/TransactionLog";
import { useAuth } from "@/lib/auth-context";
import { useQuery } from "@tanstack/react-query";
import { 
  ShoppingBag, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Wallet,
  Zap,
  Copy,
  ExternalLink,
  Sparkles,
  ChevronRight
} from "lucide-react";

interface ApiTransaction {
  id: string;
  type: "send" | "receive" | "purchase" | "burn";
  amount: number;
  description: string | null;
  fromUserId: string | null;
  toUserId: string | null;
  createdAt: string;
  status: "completed" | "pending";
  txHash?: string | null;
}

interface ApiCommunity {
  id: string;
  name: string;
  description: string | null;
}

interface ApiProduct {
  id: string;
  name: string;
  price: number;
  category: string;
}
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

export function UserDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: community } = useQuery<ApiCommunity>({
    queryKey: ["/api/communities", user?.communityId],
    enabled: !!user?.communityId,
  });

  const { data: transactions = [] } = useQuery<ApiTransaction[]>({
    queryKey: ["/api/transactions"],
    enabled: !!user?.id,
  });

  const { data: products = [] } = useQuery<ApiProduct[]>({
    queryKey: ["/api/products"],
    enabled: !!user?.communityId,
  });

  if (!user) return null;

  const copyAddress = () => {
    navigator.clipboard.writeText(user.ethAddress);
    toast({
      title: "Indirizzo copiato",
      description: "L'indirizzo del wallet è stato copiato negli appunti",
    });
  };

  const shortAddress = `${user.ethAddress.slice(0, 6)}...${user.ethAddress.slice(-4)}`;
  const received = transactions.filter(t => t.type === "receive").reduce((acc, t) => acc + t.amount, 0);
  const spent = transactions.filter(t => t.type === "purchase").reduce((acc, t) => acc + t.amount, 0);
  const purchases = transactions.filter(t => t.type === "purchase").length;

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-primary via-primary to-secondary overflow-hidden">
        <CardContent className="p-6 text-primary-foreground">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge className="bg-white/20 text-white border-0 hover:bg-white/30">
                  <Zap className="h-3 w-3 mr-1" />
                  {community?.name || "Comunità"}
                </Badge>
              </div>
              <div>
                <p className="text-primary-foreground/70 text-sm mb-1">Il tuo saldo</p>
                <div className="flex items-baseline gap-3">
                  <span className="text-4xl font-bold">{user.tokenBalance.toLocaleString()}</span>
                  <span className="text-xl text-primary-foreground/80">TOKEN</span>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2">
                  <Wallet className="h-4 w-4" />
                  <code className="text-sm font-mono">{shortAddress}</code>
                  <button 
                    onClick={copyAddress}
                    className="hover:bg-white/10 p-1 rounded transition-colors"
                    data-testid="button-copy-address"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="text-primary-foreground hover:bg-white/10"
                  data-testid="button-view-explorer"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/wallet">
                <Button 
                  variant="secondary" 
                  className="w-full sm:w-auto bg-white/20 border-0 text-white hover:bg-white/30"
                  data-testid="button-wallet"
                >
                  <Wallet className="h-4 w-4 mr-2" />
                  Wallet
                </Button>
              </Link>
              <Link href="/marketplace">
                <Button 
                  className="w-full sm:w-auto bg-white text-primary hover:bg-white/90"
                  data-testid="button-go-marketplace"
                >
                  <ShoppingBag className="h-4 w-4 mr-2" />
                  Marketplace
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="hover-elevate cursor-pointer">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-success/10">
                <ArrowDownLeft className="h-5 w-5 text-success" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Ricevuti</p>
                <p className="text-xl font-bold">{received.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="hover-elevate cursor-pointer">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-destructive/10">
                <ArrowUpRight className="h-5 w-5 text-destructive" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Spesi</p>
                <p className="text-xl font-bold">{spent.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="hover-elevate cursor-pointer">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-secondary/10">
                <ShoppingBag className="h-5 w-5 text-secondary" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Acquisti</p>
                <p className="text-xl font-bold">{purchases}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-accent" />
              Prodotti Disponibili
            </CardTitle>
            <Link href="/marketplace">
              <Button variant="ghost" size="sm" data-testid="link-view-all-products">
                Vedi tutti
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {(products || []).slice(0, 3).map((product: any) => (
              <div 
                key={product.id} 
                className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 hover-elevate cursor-pointer"
                data-testid={`card-product-${product.id}`}
              >
                <div className="p-2 rounded-lg bg-primary/10">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{product.name}</p>
                  <p className="text-sm text-muted-foreground">{product.category}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-primary">{product.price}</p>
                  <p className="text-xs text-muted-foreground">TOKEN</p>
                </div>
              </div>
            ))}
            {(!products || products.length === 0) && (
              <p className="text-muted-foreground text-center py-4">Nessun prodotto disponibile</p>
            )}
          </CardContent>
        </Card>

        {(transactions || []).length > 0 && (
          <TransactionLog
            transactions={(transactions || []).map((t: any) => ({
              id: t.id,
              type: t.type,
              amount: t.amount,
              description: t.description || "Transazione",
              timestamp: new Date(t.createdAt).toLocaleDateString("it-IT"),
              fromUserName: t.fromUserName,
              toUserName: t.toUserName,
              status: "completed" as const,
              txHash: t.txHash,
            }))}
            title="Ultime Transazioni"
          />
        )}
      </div>
    </div>
  );
}
