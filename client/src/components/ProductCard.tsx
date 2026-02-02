import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Coins, Edit2, ShoppingCart } from "lucide-react";

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl?: string;
  providerId: string;
  providerName: string;
  available: boolean;
}

interface ProductCardProps {
  product: Product;
  mode: "marketplace" | "manage";
  onBuy?: (product: Product) => void;
  onEdit?: (product: Product) => void;
  userBalance?: number;
}

export function ProductCard({
  product,
  mode,
  onBuy,
  onEdit,
  userBalance = 0,
}: ProductCardProps) {
  const canAfford = userBalance >= product.price;

  return (
    <Card className="overflow-hidden flex flex-col">
      <div className="aspect-video bg-muted flex items-center justify-center">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="text-muted-foreground text-sm">Immagine prodotto</div>
        )}
      </div>
      <CardContent className="p-4 flex-1">
        <div className="flex items-start justify-between gap-2 mb-2">
          <Badge variant="secondary" className="text-xs">
            {product.category}
          </Badge>
          {!product.available && (
            <Badge variant="outline" className="text-xs text-muted-foreground">
              Non disponibile
            </Badge>
          )}
        </div>
        <h3
          className="font-semibold text-base mb-1 line-clamp-1"
          data-testid={`text-product-name-${product.id}`}
        >
          {product.name}
        </h3>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
          {product.description}
        </p>
        <div className="flex items-center gap-1.5">
          <Coins className="h-4 w-4 text-accent" />
          <span
            className="text-lg font-bold text-accent"
            data-testid={`text-product-price-${product.id}`}
          >
            {product.price.toLocaleString("it-IT")}
          </span>
          <span className="text-sm text-muted-foreground">ECT</span>
        </div>
        {mode === "marketplace" && (
          <p className="text-xs text-muted-foreground mt-1">
            Venduto da {product.providerName}
          </p>
        )}
      </CardContent>
      <CardFooter className="p-4 pt-0">
        {mode === "marketplace" ? (
          <Button
            className="w-full"
            onClick={() => onBuy?.(product)}
            disabled={!product.available || !canAfford}
            data-testid={`button-buy-${product.id}`}
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            {!canAfford ? "Saldo insufficiente" : "Acquista con Token"}
          </Button>
        ) : (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => onEdit?.(product)}
            data-testid={`button-edit-${product.id}`}
          >
            <Edit2 className="h-4 w-4 mr-2" />
            Modifica
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
