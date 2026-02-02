import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, ShoppingBag, Coins, CheckCircle } from "lucide-react";
import { Product } from "./ProductCard";

interface PurchaseDialogProps {
  open: boolean;
  onClose: () => void;
  product: Product | null;
  userBalance: number;
  onConfirm: (product: Product) => Promise<void>;
}

export function PurchaseDialog({
  open,
  onClose,
  product,
  userBalance,
  onConfirm,
}: PurchaseDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!product) return null;

  const canAfford = userBalance >= product.price;
  const newBalance = userBalance - product.price;

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm(product);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1500);
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center py-8">
            <div className="p-4 rounded-full bg-success/20 mb-4">
              <CheckCircle className="h-12 w-12 text-success" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Acquisto completato!</h3>
            <p className="text-muted-foreground text-center">
              Hai acquistato {product.name}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-primary" />
            Conferma Acquisto
          </DialogTitle>
          <DialogDescription>
            Stai per acquistare questo prodotto con i tuoi token
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex items-start gap-3">
              <div className="w-16 h-16 rounded-lg bg-background flex items-center justify-center">
                <ShoppingBag className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium">{product.name}</h4>
                <Badge variant="secondary" className="mt-1">
                  {product.category}
                </Badge>
                <p className="text-sm text-muted-foreground mt-1">
                  Venduto da {product.providerName}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Prezzo</span>
              <span className="font-medium flex items-center gap-1">
                <Coins className="h-3 w-3 text-accent" />
                {product.price.toLocaleString("it-IT")} ECT
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Saldo attuale</span>
              <span>{userBalance.toLocaleString("it-IT")} ECT</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="font-medium">Saldo dopo acquisto</span>
              <span
                className={`font-bold ${
                  canAfford ? "text-success" : "text-destructive"
                }`}
              >
                {newBalance.toLocaleString("it-IT")} ECT
              </span>
            </div>
          </div>

          {!canAfford && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive text-center">
                Saldo insufficiente per completare l'acquisto
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={onClose}
              data-testid="button-cancel-purchase"
            >
              Annulla
            </Button>
            <Button
              className="flex-1"
              disabled={isLoading || !canAfford}
              onClick={handleConfirm}
              data-testid="button-confirm-purchase"
            >
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Conferma Acquisto
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
