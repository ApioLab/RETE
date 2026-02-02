import { useState } from "react";
import { UserTable, CommunityUser } from "@/components/UserTable";
import { SendTokensDialog } from "@/components/SendTokensDialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { UserPlus } from "lucide-react";

export function UsersPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedUser, setSelectedUser] = useState<CommunityUser | null>(null);
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newUserData, setNewUserData] = useState({ name: "", email: "", role: "user" });

  const { data: communityUsers = [] } = useQuery<CommunityUser[]>({
    queryKey: ["/api/communities", user?.communityId, "users"],
    enabled: !!user?.communityId,
  });

  if (!user) return null;

  const handleSendTokens = (u: CommunityUser) => {
    setSelectedUser(u);
    setShowSendDialog(true);
  };

  const handleSend = async (amount: number, note?: string) => {
    if (!selectedUser) return;
    
    try {
      const response = await fetch("/api/tokens/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ 
          recipientId: selectedUser.id, 
          amount, 
          note 
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || "Errore nel trasferimento");
      }

      toast({
        title: "Token inviati",
        description: result.txHash 
          ? `${amount} ECT inviati a ${selectedUser.name}. Transazione confermata su blockchain.`
          : `${amount} ECT inviati a ${selectedUser.name}`,
      });
    } catch (error) {
      toast({
        title: "Errore",
        description: error instanceof Error ? error.message : "Errore nel trasferimento",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleAddUser = async () => {
    try {
      const response = await fetch("/api/users/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newUserData.email }),
      });
      
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Errore nell'invito");
      }

      toast({
        title: "Invito inviato",
        description: `Invito inviato a ${newUserData.email}`,
      });
      setShowAddDialog(false);
      setNewUserData({ name: "", email: "", role: "user" });
    } catch (error) {
      toast({
        title: "Errore",
        description: error instanceof Error ? error.message : "Errore nell'invio dell'invito",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Gestione Utenti</h1>
        <p className="text-muted-foreground">
          Gestisci gli utenti e i provider della tua comunità
        </p>
      </div>

      <UserTable
        users={communityUsers}
        onSendTokens={handleSendTokens}
        onRemoveUser={(u) => {
          toast({
            title: "Utente rimosso",
            description: `${u.name} rimosso dalla comunità`,
            variant: "destructive",
          });
        }}
        onAddUser={() => setShowAddDialog(true)}
      />

      {selectedUser && (
        <SendTokensDialog
          open={showSendDialog}
          onClose={() => {
            setShowSendDialog(false);
            setSelectedUser(null);
          }}
          recipientName={selectedUser.name}
          recipientEmail={selectedUser.email}
          maxAmount={user.tokenBalance}
          onSend={handleSend}
        />
      )}

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Nuovo Utente
            </DialogTitle>
            <DialogDescription>
              Aggiungi un nuovo membro alla comunità
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={newUserData.name}
                onChange={(e) => setNewUserData({ ...newUserData, name: e.target.value })}
                placeholder="Nome completo"
                data-testid="input-new-user-name"
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={newUserData.email}
                onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                placeholder="email@esempio.it"
                data-testid="input-new-user-email"
              />
            </div>
            <div>
              <Label htmlFor="role">Ruolo</Label>
              <Select
                value={newUserData.role}
                onValueChange={(v) => setNewUserData({ ...newUserData, role: v })}
              >
                <SelectTrigger data-testid="select-new-user-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Utente</SelectItem>
                  <SelectItem value="provider">Service Provider</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setShowAddDialog(false)}>
              Annulla
            </Button>
            <Button className="flex-1" onClick={handleAddUser} data-testid="button-confirm-add-user">
              Crea Utente
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
