import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, MoreVertical, Send, Trash2, UserPlus, Coins } from "lucide-react";

export interface CommunityUser {
  id: string;
  name: string;
  email: string;
  role: "coordinator" | "provider" | "user";
  ethAddress: string;
  tokenBalance: number;
  status: "active" | "inactive";
}

interface UserTableProps {
  users: CommunityUser[];
  onSendTokens?: (user: CommunityUser) => void;
  onRemoveUser?: (user: CommunityUser) => void;
  onAddUser?: () => void;
}

export function UserTable({
  users,
  onSendTokens,
  onRemoveUser,
  onAddUser,
}: UserTableProps) {
  const [search, setSearch] = useState("");

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="text-lg font-semibold">
            Utenti Comunità
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cerca utenti..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                data-testid="input-search-users"
              />
            </div>
            <Button onClick={onAddUser} data-testid="button-add-user">
              <UserPlus className="h-4 w-4 mr-2" />
              Aggiungi
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Utente</TableHead>
                <TableHead>Ruolo</TableHead>
                <TableHead>Wallet</TableHead>
                <TableHead className="text-right">Saldo Token</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id} data-testid={`user-row-${user.id}`}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {getInitials(user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">{user.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={user.role === "coordinator" ? "outline" : user.role === "provider" ? "default" : "secondary"}
                      className={user.role === "coordinator" ? "border-primary text-primary" : ""}
                    >
                      {user.role === "coordinator" ? "Coordinatore" : user.role === "provider" ? "Provider" : "Utente"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-2 py-1 rounded">
                      {user.ethAddress.slice(0, 6)}...{user.ethAddress.slice(-4)}
                    </code>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Coins className="h-3 w-3 text-accent" />
                      <span className="font-medium">
                        {user.tokenBalance.toLocaleString("it-IT")}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        user.status === "active"
                          ? "border-success text-success"
                          : "border-muted-foreground text-muted-foreground"
                      }
                    >
                      {user.status === "active" ? "Attivo" : "Inattivo"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          data-testid={`button-menu-${user.id}`}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => onSendTokens?.(user)}
                          data-testid={`menu-send-tokens-${user.id}`}
                        >
                          <Send className="h-4 w-4 mr-2" />
                          Invia Token
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onRemoveUser?.(user)}
                          className="text-destructive"
                          data-testid={`menu-remove-${user.id}`}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Rimuovi
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
