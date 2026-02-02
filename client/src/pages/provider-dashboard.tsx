import { useState } from "react";
import { StatCard } from "@/components/StatCard";
import { ProductCard, Product } from "@/components/ProductCard";
import { ProductForm } from "@/components/ProductForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth-context";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Package, ShoppingBag, Coins, TrendingUp, Plus, Building2, Wallet } from "lucide-react";

interface CommunityBalance {
  communityId: string;
  communityName: string;
  balance: number;
  salesCount: number;
}

export function ProviderDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showNewProduct, setShowNewProduct] = useState(false);

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products/mine"],
    enabled: !!user?.id,
  });

  const { data: communityBalances = [] } = useQuery<CommunityBalance[]>({
    queryKey: ["/api/provider/balances"],
    enabled: !!user?.id && user.role === "provider",
  });

  const createProductMutation = useMutation({
    mutationFn: async (data: { name: string; description: string; price: number; category: string; available: boolean }) => {
      const response = await apiRequest("POST", "/api/products", data);
      return response.json();
    },
    onSuccess: (newProduct) => {
      queryClient.invalidateQueries({ queryKey: ["/api/products/mine"] });
      toast({
        title: "Prodotto creato",
        description: `${newProduct.name} è stato aggiunto`,
      });
      setShowNewProduct(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const { data: transactions = [] } = useQuery<any[]>({
    queryKey: ["/api/transactions"],
    enabled: !!user?.id,
  });

  if (!user) return null;

  const totalBalance = communityBalances.reduce((sum, cb) => sum + cb.balance, 0);
  const totalSales = communityBalances.reduce((sum, cb) => sum + cb.salesCount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard Provider</h1>
          <p className="text-muted-foreground">
            Gestisci i tuoi prodotti e monitora le vendite
          </p>
        </div>
        <Button onClick={() => setShowNewProduct(true)} data-testid="button-new-product">
          <Plus className="h-4 w-4 mr-2" />
          Nuovo Prodotto
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Prodotti Attivi"
          value={products.filter((p) => p.available).length}
          icon={Package}
          iconColor="text-primary"
        />
        <StatCard
          title="Vendite Totali"
          value={totalSales}
          icon={ShoppingBag}
          iconColor="text-secondary"
        />
        <StatCard
          title="Ricavi Totali"
          value={totalBalance}
          icon={Coins}
          iconColor="text-accent"
        />
        <StatCard
          title="Comunità Servite"
          value={communityBalances.length}
          icon={Building2}
          iconColor="text-success"
        />
      </div>

      {communityBalances.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Wallet className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-lg font-semibold">Saldi per Comunità</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {communityBalances.map((cb) => (
                <div
                  key={cb.communityId}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card"
                  data-testid={`balance-community-${cb.communityId}`}
                >
                  <div className="space-y-1">
                    <p className="font-medium">{cb.communityName}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {cb.salesCount} vendite
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary">{cb.balance.toLocaleString("it-IT")}</p>
                    <p className="text-xs text-muted-foreground">ECT</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {communityBalances.length === 0 && (
        <Card>
          <CardContent className="py-8">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="p-4 rounded-full bg-muted mb-4">
                <Wallet className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-1">Nessun saldo ancora</h3>
              <p className="text-muted-foreground">
                I tuoi guadagni per comunità appariranno qui dopo le prime vendite
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div>
        <h2 className="text-lg font-semibold mb-4">I Miei Prodotti</h2>
        {products.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                mode="manage"
                onEdit={(p) => console.log("Edit:", p.name)}
              />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-8">Nessun prodotto ancora. Crea il tuo primo prodotto!</p>
        )}
      </div>

      <Dialog open={showNewProduct} onOpenChange={setShowNewProduct}>
        <DialogContent className="sm:max-w-lg p-0 border-0 bg-transparent shadow-none">
          <ProductForm
            onSubmit={async (data) => {
              createProductMutation.mutate(data);
            }}
            onCancel={() => setShowNewProduct(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
