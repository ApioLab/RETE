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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, Send, Coins } from "lucide-react";

const sendSchema = z.object({
  amount: z.number().min(1, "Minimo 1 token"),
  note: z.string().optional(),
});

type SendFormData = z.infer<typeof sendSchema>;

interface SendTokensDialogProps {
  open: boolean;
  onClose: () => void;
  recipientName: string;
  recipientEmail: string;
  maxAmount?: number;
  onSend: (amount: number, note?: string) => Promise<void>;
}

export function SendTokensDialog({
  open,
  onClose,
  recipientName,
  recipientEmail,
  maxAmount = Infinity,
  onSend,
}: SendTokensDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<SendFormData>({
    resolver: zodResolver(
      sendSchema.refine((data) => data.amount <= maxAmount, {
        message: `Massimo ${maxAmount.toLocaleString("it-IT")} token disponibili`,
        path: ["amount"],
      })
    ),
    defaultValues: {
      amount: 0,
      note: "",
    },
  });

  const handleSubmit = async (data: SendFormData) => {
    setIsLoading(true);
    try {
      await onSend(data.amount, data.note);
      onClose();
      form.reset();
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            Invia Token
          </DialogTitle>
          <DialogDescription>
            Trasferisci token ECT a un membro della comunità
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3 p-4 bg-muted rounded-lg mb-4">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-primary/10 text-primary">
              {getInitials(recipientName)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{recipientName}</p>
            <p className="text-sm text-muted-foreground">{recipientEmail}</p>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Importo (ECT)</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Coins className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-accent" />
                      <Input
                        type="number"
                        placeholder="0"
                        className="pl-10"
                        data-testid="input-send-amount"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </div>
                  </FormControl>
                  {maxAmount < Infinity && (
                    <p className="text-xs text-muted-foreground">
                      Disponibili: {maxAmount.toLocaleString("it-IT")} ECT
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nota (opzionale)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Es. Distribuzione mensile"
                      data-testid="input-send-note"
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
                data-testid="button-cancel-send"
              >
                Annulla
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={isLoading}
                data-testid="button-confirm-send"
              >
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Invia Token
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
