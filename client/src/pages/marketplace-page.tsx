import { useState } from "react";
import { ProductCard, Product } from "@/components/ProductCard";
import { PurchaseDialog } from "@/components/PurchaseDialog";
import { TokenBalance } from "@/components/TokenBalance";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Search, Filter, ShoppingBag, Loader2 } from "lucide-react";

interface ApiProduct {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
  imageUrl: string | null;
  providerId: string;
  communityId: string | null;
  isAvailable: number;
  providerName?: string;
}

export function MarketplacePage() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Tutti");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const { data: apiProducts = [], isLoading } = useQuery<ApiProduct[]>({
    queryKey: ["/api/products"],
    enabled: !!user?.id,
  });

  const purchaseMutation = useMutation({
    mutationFn: async ({ productId, productName }: { productId: string; productName: string }) => {
      await apiRequest("POST", "/api/purchase", { productId });
      return productName;
    },
    onSuccess: (productName) => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      refreshUser();
      setSelectedProduct(null);
      toast({
        title: "Acquisto completato!",
        description: `Hai acquistato ${productName}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Errore",
        description: error.message || "Impossibile completare l'acquisto",
        variant: "destructive",
      });
    },
  });

  if (!user) return null;

  const products: Product[] = apiProducts.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description || "",
    price: p.price,
    category: p.category,
    imageUrl: p.imageUrl || undefined,
    providerId: p.providerId,
    providerName: p.providerName || "Provider",
    available: p.isAvailable === 1,
  }));

  const categories = ["Tutti", ...Array.from(new Set(products.map((p) => p.category)))];

  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === "Tutti" || p.category === selectedCategory;
    return matchesSearch && matchesCategory && p.available;
  });

  const handlePurchase = async (product: Product) => {
    purchaseMutation.mutate({ productId: product.id, productName: product.name });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold">Marketplace</h1>
          <p className="text-muted-foreground">
            Acquista prodotti e servizi con i tuoi token
          </p>
        </div>
        <div className="lg:w-80">
          <TokenBalance
            balance={user.tokenBalance}
            label="Il Tuo Saldo"
            showTrend={false}
            size="md"
          />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cerca prodotti..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search-marketplace"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {categories.map((cat) => (
            <Button
              key={cat}
              variant={selectedCategory === cat ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(cat)}
              data-testid={`filter-${cat.toLowerCase()}`}
            >
              {cat}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Filter className="h-4 w-4" />
        <span>{filteredProducts.length} prodotti trovati</span>
        {selectedCategory !== "Tutti" && (
          <Badge variant="secondary">{selectedCategory}</Badge>
        )}
      </div>

      {filteredProducts.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <ShoppingBag className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">Nessun prodotto disponibile</p>
          <p className="text-sm">I prodotti appariranno qui quando i provider li aggiungeranno</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              mode="marketplace"
              userBalance={user.tokenBalance}
              onBuy={setSelectedProduct}
            />
          ))}
        </div>
      )}

      <PurchaseDialog
        open={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        product={selectedProduct}
        userBalance={user.tokenBalance}
        onConfirm={handlePurchase}
      />
    </div>
  );
}
