import { StatCard } from "@/components/StatCard";
import { TokenBalance } from "@/components/TokenBalance";
import { TransactionLog, Transaction } from "@/components/TransactionLog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";
import { useQuery } from "@tanstack/react-query";
import { Users, Store, Coins, Flame, Zap } from "lucide-react";

export function CoordinatorDashboard() {
  const { user } = useAuth();

  const { data: community } = useQuery<{ id: string; name: string; description?: string }>({
    queryKey: ["/api/communities", user?.communityId],
    enabled: !!user?.communityId,
  });

  const { data: communityUsers } = useQuery<{ id: string; name: string; role: string }[]>({
    queryKey: ["/api/communities", user?.communityId, "users"],
    enabled: !!user?.communityId,
  });

  const { data: transactions } = useQuery<{ id: string; type: string; amount: number; description?: string; createdAt: string; fromUserName?: string; toUserName?: string; txHash?: string }[]>({
    queryKey: ["/api/transactions"],
    enabled: !!user?.communityId,
  });

  if (!user) return null;

  const totalUsers = communityUsers?.length || 0;
  const providers = communityUsers?.filter((u: any) => u.role === "provider").length || 0;
  const transactionsList = (transactions || []).map((t: any) => ({
    id: t.id,
    type: t.type,
    amount: t.amount,
    description: t.description || "Transazione",
    timestamp: new Date(t.createdAt).toLocaleDateString("it-IT"),
    fromUserName: t.fromUserName,
    toUserName: t.toUserName,
    status: "completed" as const,
    txHash: t.txHash,
  }));

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/20">
                <Zap className="h-8 w-8 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold">{community?.name || "Comunità"}</h1>
                  <Badge className="bg-success/20 text-success border-0">Attiva</Badge>
                </div>
                <p className="text-muted-foreground">
                  Benvenuto, {user.name}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Utenti Totali"
          value={totalUsers}
          icon={Users}
          iconColor="text-secondary"
        />
        <StatCard
          title="Provider Attivi"
          value={providers}
          icon={Store}
          iconColor="text-primary"
        />
        <StatCard
          title="Token Distribuiti"
          value={user.tokenBalance}
          icon={Coins}
          iconColor="text-accent"
        />
        <StatCard
          title="Transazioni"
          value={transactionsList.length}
          icon={Flame}
          iconColor="text-destructive"
        />
      </div>

      <TokenBalance
        balance={user.tokenBalance}
        label="Saldo Coordinatore"
      />

      {transactionsList.length > 0 && (
        <TransactionLog
          transactions={transactionsList}
          title="Ultime Transazioni"
        />
      )}
    </div>
  );
}
