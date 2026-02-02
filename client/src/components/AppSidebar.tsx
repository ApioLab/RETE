import { useLocation, Link } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Zap,
  LayoutDashboard,
  Users,
  Upload,
  Flame,
  Store,
  Package,
  Wallet,
  ShoppingBag,
  History,
  LogOut,
  ChevronUp,
  Coins,
  Settings,
  Loader2,
  Clock,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useAuth, UserRole } from "@/lib/auth-context";
import { useWebSocket } from "@/lib/websocket-context";

interface NavItem {
  title: string;
  url: string;
  icon: typeof LayoutDashboard;
}

const navItemsByRole: Record<UserRole, NavItem[]> = {
  coordinator: [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    { title: "Utenti", url: "/users", icon: Users },
    { title: "Carica Fondi", url: "/upload", icon: Upload },
    { title: "Burn Token", url: "/burn", icon: Flame },
    { title: "Transazioni", url: "/transactions", icon: History },
    { title: "Impostazioni", url: "/settings", icon: Settings },
  ],
  provider: [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    { title: "I Miei Prodotti", url: "/products", icon: Package },
    { title: "Transazioni", url: "/transactions", icon: History },
    { title: "Impostazioni", url: "/settings", icon: Settings },
  ],
  user: [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    { title: "Marketplace", url: "/marketplace", icon: ShoppingBag },
    { title: "Il Mio Wallet", url: "/wallet", icon: Wallet },
    { title: "Transazioni", url: "/transactions", icon: History },
    { title: "Impostazioni", url: "/settings", icon: Settings },
  ],
};

const roleLabels: Record<UserRole, string> = {
  coordinator: "Coordinatore",
  provider: "Service Provider",
  user: "Utente",
};

export function AppSidebar() {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const { isConnected, pendingCount, pendingTransactions } = useWebSocket();

  if (!user) return null;

  const navItems = navItemsByRole[user.role];

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <Link href="/" className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-sidebar-primary/20">
            <Zap className="h-6 w-6 text-sidebar-primary" />
          </div>
          <div>
            <h1 className="font-bold text-lg">RETE</h1>
            <p className="text-xs text-sidebar-foreground/70">Comunità Energetica</p>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/60">
            Navigazione
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    data-testid={`nav-${item.title.toLowerCase().replace(/\s/g, "-")}`}
                  >
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {pendingCount > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/60 flex items-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin" />
              Transazioni in Corso
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <div 
                className="mx-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20"
                data-testid="pending-transactions-indicator"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-amber-500" />
                  <span className="font-medium text-sm">
                    {pendingCount} {pendingCount === 1 ? "transazione" : "transazioni"} pending
                  </span>
                </div>
                <div className="space-y-1.5">
                  {pendingTransactions.slice(0, 3).map((tx) => (
                    <div
                      key={tx.id}
                      className="text-xs text-sidebar-foreground/70 flex items-center gap-1.5"
                      data-testid={`pending-tx-${tx.id}`}
                    >
                      <Loader2 className="h-3 w-3 animate-spin text-amber-500" />
                      <span className="truncate">
                        {tx.type === "send" ? "Invio" : tx.type === "receive" ? "Ricezione" : tx.type === "purchase" ? "Acquisto" : "Burn"}: {tx.amount} ECT
                      </span>
                    </div>
                  ))}
                  {pendingCount > 3 && (
                    <div className="text-xs text-sidebar-foreground/50">
                      +{pendingCount - 3} altre...
                    </div>
                  )}
                </div>
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

      </SidebarContent>

      <SidebarFooter className="p-4">
        <div className="flex items-center gap-2 mb-2 px-1">
          <div 
            className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}
            data-testid="websocket-status-indicator"
          />
          <span className="text-xs text-sidebar-foreground/60">
            {isConnected ? 'Connesso in tempo reale' : 'Disconnesso'}
          </span>
          {isConnected ? (
            <Wifi className="h-3 w-3 text-green-500" />
          ) : (
            <WifiOff className="h-3 w-3 text-red-500" />
          )}
        </div>

        <div className="p-3 rounded-lg bg-sidebar-accent/50 mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-sidebar-foreground/70">Saldo Token</span>
            <Coins className="h-3 w-3 text-accent" />
          </div>
          <p className="text-lg font-bold" data-testid="text-sidebar-balance">
            {user.tokenBalance.toLocaleString("it-IT")} <span className="text-accent text-sm">ECT</span>
          </p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 h-auto py-3 px-3"
              data-testid="button-user-menu"
            >
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-sidebar-primary/20 text-sidebar-primary text-sm">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-left">
                <p className="font-medium text-sm truncate">{user.name}</p>
                <Badge variant="secondary" className="text-xs mt-0.5">
                  {roleLabels[user.role]}
                </Badge>
              </div>
              <ChevronUp className="h-4 w-4 text-sidebar-foreground/50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">{user.name}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={logout}
              className="text-destructive"
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Esci
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
