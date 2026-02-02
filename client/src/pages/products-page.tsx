import { useState } from "react";
import { ProductCard, Product } from "@/components/ProductCard";
import { ProductForm } from "@/components/ProductForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth-context";
import { Plus, Search, Package, Loader2 } from "lucide-react";

type ProductWithCommunities = Product & { communityIds?: string[] };

export function ProductsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductWithCommunities | null>(null);

  const { data: products = [], isLoading } = useQuery<ProductWithCommunities[]>({
    queryKey: ["/api/products/mine"],
    enabled: !!user?.id,
  });

  const createProductMutation = useMutation({
    mutationFn: async (data: { name: string; description: string; price: number; category: string; available: boolean; imageUrl?: string; communityIds: string[] }) => {
      const response = await apiRequest("POST", "/api/products", data);
      return response.json();
    },
    onSuccess: (newProduct) => {
      queryClient.invalidateQueries({ queryKey: ["/api/products/mine"] });
      toast({
        title: "Prodotto creato",
        description: `${newProduct.name} è stato aggiunto alla vetrina`,
      });
      setShowForm(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { name: string; description: string; price: number; category: string; available: boolean; imageUrl?: string; communityIds: string[] } }) => {
      const response = await apiRequest("PUT", `/api/products/${id}`, data);
      return response.json();
    },
    onSuccess: (updatedProduct) => {
      queryClient.invalidateQueries({ queryKey: ["/api/products/mine"] });
      toast({
        title: "Prodotto aggiornato",
        description: `${updatedProduct.name} è stato modificato`,
      });
      setShowForm(false);
      setEditingProduct(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = async (data: { name: string; description: string; price: number; category: string; available: boolean; imageUrl?: string; communityIds: string[] }) => {
    if (editingProduct) {
      updateProductMutation.mutate({ id: editingProduct.id, data });
    } else {
      createProductMutation.mutate(data);
    }
  };

  const handleEdit = (product: ProductWithCommunities) => {
    setEditingProduct(product);
    setShowForm(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">I Miei Prodotti</h1>
          <p className="text-muted-foreground">
            Gestisci la tua vetrina prodotti
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} data-testid="button-add-product">
          <Plus className="h-4 w-4 mr-2" />
          Nuovo Prodotto
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cerca prodotti..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
          data-testid="input-search-products"
        />
      </div>

      {filteredProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="p-4 rounded-full bg-muted mb-4">
            <Package className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-1">Nessun prodotto trovato</h3>
          <p className="text-muted-foreground mb-4">
            {search ? "Prova con altri termini di ricerca" : "Inizia aggiungendo il tuo primo prodotto"}
          </p>
          {!search && (
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Aggiungi Prodotto
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              mode="manage"
              onEdit={handleEdit}
            />
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={(o) => { if (!o) { setShowForm(false); setEditingProduct(null); } }}>
        <DialogContent className="sm:max-w-lg p-0 border-0 bg-transparent shadow-none max-h-[90vh] overflow-y-auto">
          <ProductForm
            product={editingProduct ?? undefined}
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowForm(false);
              setEditingProduct(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
