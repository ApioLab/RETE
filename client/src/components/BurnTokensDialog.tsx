import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Loader2, Flame, AlertTriangle, Coins } from "lucide-react";

const burnSchema = z.object({
  amount: z.number().min(1, "Minimo 1 token"),
  reason: z.string().min(3, "Inserisci un motivo"),
});

type BurnFormData = z.infer<typeof burnSchema>;

interface BurnTokensDialogProps {
  open: boolean;
  onClose: () => void;
  currentBalance: number;
  onBurn: (amount: number, reason: string) => Promise<void>;
}

export function BurnTokensDialog({
  open,
  onClose,
  currentBalance,
  onBurn,
}: BurnTokensDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<BurnFormData>({
    resolver: zodResolver(
      burnSchema.refine((data) => data.amount <= currentBalance, {
        message: `Massimo ${currentBalance.toLocaleString("it-IT")} token disponibili`,
        path: ["amount"],
      })
    ),
    defaultValues: {
      amount: 0,
      reason: "",
    },
  });

  const handleSubmit = async (data: BurnFormData) => {
    setIsLoading(true);
    try {
      await onBurn(data.amount, data.reason);
      onClose();
      form.reset();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-accent" />
            Burn Token
          </DialogTitle>
          <DialogDescription>
            Elimina permanentemente token dalla circolazione
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-lg mb-4">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <p className="text-sm text-destructive">
            Attenzione: questa operazione è irreversibile
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Importo da bruciare (ECT)</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Coins className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-accent" />
                      <Input
                        type="number"
                        placeholder="0"
                        className="pl-10"
                        data-testid="input-burn-amount"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </div>
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Saldo attuale: {currentBalance.toLocaleString("it-IT")} ECT
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Motivo</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Es. Fee servizio mensile"
                      data-testid="input-burn-reason"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={onClose}
                data-testid="button-cancel-burn"
              >
                Annulla
              </Button>
              <Button
                type="submit"
                variant="destructive"
                className="flex-1"
                disabled={isLoading}
                data-testid="button-confirm-burn"
              >
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Flame className="h-4 w-4 mr-2" />
                Brucia Token
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
