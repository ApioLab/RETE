import { CSVUpload } from "@/components/CSVUpload";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { FileText, Send, Loader2, ExternalLink } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState } from "react";

interface DistributeResult {
  distributed: { email: string; amount: number; userName: string; txHash?: string }[];
  errors: { email: string; error: string }[];
}

export function UploadPage() {
  const { toast } = useToast();
  const [uploadKey, setUploadKey] = useState(0);
  const [singleEmail, setSingleEmail] = useState("");
  const [singleAmount, setSingleAmount] = useState("");
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);

  const distributeMutation = useMutation({
    mutationFn: async (data: { email: string; amount: number }[]) => {
      const response = await apiRequest("POST", "/api/tokens/distribute", {
        distributions: data,
      });
      return response.json() as Promise<DistributeResult>;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/session"] });
      
      setUploadKey(prev => prev + 1);
      setSingleEmail("");
      setSingleAmount("");
      
      // Track txHash from first successful distribution
      if (result.distributed.length > 0 && result.distributed[0].txHash) {
        setLastTxHash(result.distributed[0].txHash);
      }
      
      const totalAmount = result.distributed.reduce((sum, row) => sum + row.amount, 0);
      
      if (result.errors.length > 0) {
        toast({
          title: "Distribuzione parziale",
          description: `${result.distributed.length} utenti hanno ricevuto ${totalAmount.toLocaleString("it-IT")} ECT. ${result.errors.length} errori.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Distribuzione completata su blockchain",
          description: `${result.distributed.length} utenti hanno ricevuto ${totalAmount.toLocaleString("it-IT")} ECT`,
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Errore",
        description: error.message || "Errore durante la distribuzione",
        variant: "destructive",
      });
    },
  });

  const handleUpload = async (data: { email: string; amount: number }[]) => {
    setLastTxHash(null);
    distributeMutation.mutate(data);
  };

  const handleSingleDistribute = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseInt(singleAmount, 10);
    if (!singleEmail || !amount || amount <= 0) {
      toast({
        title: "Errore",
        description: "Inserisci email e importo validi",
        variant: "destructive",
      });
      return;
    }
    setLastTxHash(null);
    distributeMutation.mutate([{ email: singleEmail, amount }]);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Distribuisci Token</h1>
        <p className="text-muted-foreground">
          Distribuisci token agli utenti della comunità (mint su blockchain)
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            Distribuzione Singola
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSingleDistribute} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">Email destinatario</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="utente@esempio.it"
                  value={singleEmail}
                  onChange={(e) => setSingleEmail(e.target.value)}
                  data-testid="input-distribute-email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Importo (ECT)</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="100"
                  min="1"
                  value={singleAmount}
                  onChange={(e) => setSingleAmount(e.target.value)}
                  data-testid="input-distribute-amount"
                />
              </div>
            </div>
            <Button 
              type="submit" 
              disabled={distributeMutation.isPending}
              data-testid="button-distribute-submit"
            >
              {distributeMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Invio su blockchain...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Distribuisci Token
                </>
              )}
            </Button>
            {lastTxHash && (
              <div className="mt-4 p-3 bg-success/10 rounded-lg border border-success/20">
                <p className="text-sm font-medium text-success mb-1">Transazione confermata!</p>
                <a
                  href={`https://sepolia.etherscan.io/tx/${lastTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  data-testid="link-distribution-etherscan"
                >
                  <ExternalLink className="h-3 w-3" />
                  Vedi su Etherscan
                </a>
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <CSVUpload key={uploadKey} onUpload={handleUpload} />

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Formato CSV
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Il file CSV deve contenere due colonne: email e importo in token.
            </p>
            <div className="bg-muted p-4 rounded-lg font-mono text-sm">
              <p className="text-muted-foreground mb-2">email,amount</p>
              <p>anna@esempio.it,500</p>
              <p>luigi@esempio.it,350</p>
              <p>maria@esempio.it,200</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
