import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { WebSocketProvider } from "@/lib/websocket-context";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AppSidebar } from "@/components/AppSidebar";
import { AuthPage } from "@/pages/auth-page";
import { CoordinatorDashboard } from "@/pages/coordinator-dashboard";
import { ProviderDashboard } from "@/pages/provider-dashboard";
import { UserDashboard } from "@/pages/user-dashboard";
import { UsersPage } from "@/pages/users-page";
import { UploadPage } from "@/pages/upload-page";
import { BurnPage } from "@/pages/burn-page";
import { TransactionsPage } from "@/pages/transactions-page";
import { ProductsPage } from "@/pages/products-page";
import { MarketplacePage } from "@/pages/marketplace-page";
import { WalletPage } from "@/pages/wallet-page";
import { SettingsPage } from "@/pages/settings-page";
import NotFound from "@/pages/not-found";

function DashboardRouter() {
  const { user } = useAuth();

  if (!user) return <Redirect to="/" />;

  switch (user.role) {
    case "coordinator":
      return <CoordinatorDashboard />;
    case "provider":
      return <ProviderDashboard />;
    case "user":
      return <UserDashboard />;
    default:
      return <ProviderDashboard />;
  }
}

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { user } = useAuth();

  if (!user) return <Redirect to="/" />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Redirect to="/" />;
  }

  return <>{children}</>;
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="p-4 rounded-full bg-primary/10 w-fit mx-auto mb-4 animate-pulse">
          <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        </div>
        <p className="text-muted-foreground">Caricamento...</p>
      </div>
    </div>
  );
}

function AppContent() {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <AuthPage onSuccess={() => {}} />;
  }

  const sidebarStyle = {
    "--sidebar-width": "18rem",
    "--sidebar-width-icon": "3.5rem",
  };

  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex flex-col flex-1 overflow-hidden">
          <header className="flex h-14 items-center justify-between gap-4 border-b px-4 shrink-0">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-auto p-6">
            <div className="max-w-7xl mx-auto">
              <Switch>
                <Route path="/" component={DashboardRouter} />
                
                <Route path="/users">
                  <ProtectedRoute allowedRoles={["coordinator"]}>
                    <UsersPage />
                  </ProtectedRoute>
                </Route>
                
                <Route path="/upload">
                  <ProtectedRoute allowedRoles={["coordinator"]}>
                    <UploadPage />
                  </ProtectedRoute>
                </Route>
                
                <Route path="/burn">
                  <ProtectedRoute allowedRoles={["coordinator"]}>
                    <BurnPage />
                  </ProtectedRoute>
                </Route>
                
                <Route path="/products">
                  <ProtectedRoute allowedRoles={["provider"]}>
                    <ProductsPage />
                  </ProtectedRoute>
                </Route>
                
                <Route path="/marketplace">
                  <ProtectedRoute allowedRoles={["user"]}>
                    <MarketplacePage />
                  </ProtectedRoute>
                </Route>
                
                <Route path="/wallet">
                  <ProtectedRoute allowedRoles={["user"]}>
                    <WalletPage />
                  </ProtectedRoute>
                </Route>
                
                <Route path="/transactions" component={TransactionsPage} />
                
                <Route path="/settings">
                  <ProtectedRoute>
                    <SettingsPage />
                  </ProtectedRoute>
                </Route>
                
                <Route component={NotFound} />
              </Switch>
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WebSocketProvider>
            <AppContent />
          </WebSocketProvider>
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
