import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Flame, Download, Users, Loader2 } from "lucide-react";

interface BalanceRecord {
  id: string;
  name: string;
  email: string;
  role: string;
  tokenBalance: number;
}

export function BurnPage() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const { data: balances = [], isLoading } = useQuery<BalanceRecord[]>({
    queryKey: ["/api/community/balances"],
    enabled: !!user?.id && user.role === "coordinator",
  });

  const burnAllMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/tokens/burn-all", {});
      return response.json() as Promise<{ totalBurned: number; usersAffected: number }>;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/community/balances"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      refreshUser();
      setShowConfirmDialog(false);
      toast({
        title: "Burn completato",
        description: `${result.totalBurned.toLocaleString("it-IT")} ECT bruciati da ${result.usersAffected} utenti`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Errore",
        description: error.message || "Errore durante il burn",
        variant: "destructive",
      });
    },
  });

  if (!user) return null;

  const totalBalance = balances.reduce((sum, r) => sum + r.tokenBalance, 0);
  const usersCount = balances.filter(b => b.role === "user").length;
  const providersCount = balances.filter(b => b.role === "provider").length;

  const downloadExcel = () => {
    const headers = ["Nome", "Email", "Ruolo", "Saldo ECT"];
    const rows = balances.map(b => [
      b.name,
      b.email,
      b.role === "user" ? "Utente" : b.role === "provider" ? "Provider" : b.role,
      b.tokenBalance.toString(),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(r => r.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `saldi_comunita_${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "user":
        return <Badge variant="secondary">Utente</Badge>;
      case "provider":
        return <Badge className="bg-primary/20 text-primary border-0">Provider</Badge>;
      case "coordinator":
        return <Badge className="bg-accent/20 text-accent border-0">Coordinatore</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
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
      <div>
        <h1 className="text-2xl font-bold">Burn Token</h1>
        <p className="text-muted-foreground">
          Visualizza i saldi della comunità e brucia tutti i token
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-primary/10">
                <Flame className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Token Totali in Circolo</p>
                <p className="text-2xl font-bold" data-testid="text-total-balance">
                  {totalBalance.toLocaleString("it-IT")} <span className="text-primary text-sm">ECT</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-secondary/50">
                <Users className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Utenti con Saldo</p>
                <p className="text-2xl font-bold" data-testid="text-users-count">
                  {usersCount} <span className="text-muted-foreground text-sm">utenti</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-accent/10">
                <Users className="h-6 w-6 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Provider con Saldo</p>
                <p className="text-2xl font-bold" data-testid="text-providers-count">
                  {providersCount} <span className="text-muted-foreground text-sm">provider</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between gap-4 flex-wrap">
          <CardTitle className="text-lg font-semibold">
            Saldi Comunità
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={downloadExcel}
              disabled={balances.length === 0}
              data-testid="button-download-excel"
            >
              <Download className="h-4 w-4 mr-2" />
              Scarica CSV
            </Button>
            <Button
              variant="destructive"
              onClick={() => setShowConfirmDialog(true)}
              disabled={balances.length === 0 || burnAllMutation.isPending}
              data-testid="button-burn-all"
            >
              {burnAllMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Flame className="h-4 w-4 mr-2" />
              )}
              Brucia Tutto
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {balances.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Ruolo</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {balances.map((balance) => (
                    <TableRow key={balance.id} data-testid={`balance-row-${balance.id}`}>
                      <TableCell className="font-medium">{balance.name}</TableCell>
                      <TableCell className="text-muted-foreground">{balance.email}</TableCell>
                      <TableCell>{getRoleBadge(balance.role)}</TableCell>
                      <TableCell className="text-right font-bold">
                        {balance.tokenBalance.toLocaleString("it-IT")} ECT
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              Nessun saldo attivo nella comunità
            </p>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma Burn Totale</AlertDialogTitle>
            <AlertDialogDescription>
              Stai per bruciare <strong>{totalBalance.toLocaleString("it-IT")} ECT</strong> da{" "}
              <strong>{balances.length} account</strong>. Questa azione è irreversibile e tutti i
              saldi verranno azzerati.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-burn">Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => burnAllMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-burn"
            >
              <Flame className="h-4 w-4 mr-2" />
              Conferma Burn
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
