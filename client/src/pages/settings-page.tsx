import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Wallet, Key, Copy, RefreshCw, Settings, ExternalLink, Coins, CheckCircle2, AlertCircle, Link2, Trash2 } from "lucide-react";

interface WalletData {
  id: string;
  label: string;
  address: string;
  walletType: string;
  isDefault: boolean;
  createdAt: string;
}

interface Community {
  id: string;
  name: string;
  description: string | null;
  tokenAddress: string | null;
  createdAt: string;
}

interface TokenConfig {
  token: string;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
  owner: string;
  adminSpender: string;
  mintPaused: boolean;
  adminBurnEnabled: boolean;
  chainId: number;
}

interface ChainProfile {
  id: string;
  name: string;
  chainId: number;
  rpcUrl: string;
  explorerUrl: string;
  factoryAddress: string;
  isActive: number;
  createdAt: string;
}

interface ChainInfo {
  communityId: string;
  communityName: string;
  tokenAddress: string | null;
  chainProfile: {
    id: string;
    name: string;
    chainId: number;
    explorerUrl: string;
    factoryAddress: string;
  } | null;
}

export function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportPassword, setExportPassword] = useState("");
  const [keystorePassword, setKeystorePassword] = useState("");
  const [isCreatingToken, setIsCreatingToken] = useState(false);
  const [selectedChainId, setSelectedChainId] = useState<string>("");
  const [showResetTokenDialog, setShowResetTokenDialog] = useState(false);
  const [showSwitchChainDialog, setShowSwitchChainDialog] = useState(false);

  const { data: wallets, isLoading: walletsLoading } = useQuery<WalletData[]>({
    queryKey: ["/api/wallets"],
  });

  const { data: chainProfiles } = useQuery<ChainProfile[]>({
    queryKey: ["/api/chain-profiles"],
  });

  const { data: chainInfo } = useQuery<ChainInfo>({
    queryKey: ["/api/community/chain-info"],
    enabled: !!user?.communityId && user.role === "coordinator",
  });

  const { data: community, isLoading: communityLoading } = useQuery<Community>({
    queryKey: ["/api/communities", user?.communityId],
    enabled: !!user?.communityId,
  });

  const { data: adminWallet } = useQuery<{ address: string }>({
    queryKey: ["/api/blockchain/admin-wallet"],
  });

  const { data: tokenConfig, isLoading: tokenConfigLoading } = useQuery<TokenConfig>({
    queryKey: ["/api/blockchain/config"],
    queryFn: async () => {
      if (!community?.tokenAddress) {
        throw new Error("No token configured");
      }
      const res = await fetch(`/api/blockchain/config?token=${community.tokenAddress}`);
      if (!res.ok) throw new Error("Failed to fetch token config");
      return res.json();
    },
    enabled: !!community?.tokenAddress,
  });

  const userWallet = wallets?.[0];

  const createTokenMutation = useMutation({
    mutationFn: async () => {
      // All params are now derived server-side for security
      const response = await apiRequest("POST", "/api/blockchain/factory/create-token", {});

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Errore nella creazione del token");
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/communities", user?.communityId] });
      queryClient.invalidateQueries({ queryKey: ["/api/blockchain/config"] });
      toast({ 
        title: "Token creato con successo!",
        description: `Indirizzo: ${data.token?.slice(0, 10)}...${data.token?.slice(-8)}`,
      });
      setIsCreatingToken(false);
    },
    onError: (err: Error) => {
      toast({ title: err.message, variant: "destructive" });
      setIsCreatingToken(false);
    },
  });

  const exportKeystoreMutation = useMutation({
    mutationFn: async (data: { walletId: string; password: string; keystorePassword: string }) => {
      const response = await apiRequest("POST", `/api/wallets/${data.walletId}/export-keystore`, {
        password: data.password,
        keystorePassword: data.keystorePassword,
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Errore nell'esportazione");
      }
      return response.json() as Promise<{ keystore: object; address: string; label: string }>;
    },
    onSuccess: (data) => {
      const blob = new Blob([JSON.stringify(data.keystore, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `keystore-${data.address.slice(0, 8)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setShowExportDialog(false);
      setExportPassword("");
      setKeystorePassword("");
      toast({ title: "Keystore esportato con successo" });
    },
    onError: (err: Error) => {
      toast({ title: err.message, variant: "destructive" });
    },
  });

  const switchChainMutation = useMutation({
    mutationFn: async (chainProfileId: string) => {
      const response = await apiRequest("POST", "/api/community/chain-profile", { chainProfileId });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Errore nel cambio chain");
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/community/chain-info"] });
      queryClient.invalidateQueries({ queryKey: ["/api/communities", user?.communityId] });
      queryClient.invalidateQueries({ queryKey: ["/api/blockchain/config"] });
      setShowSwitchChainDialog(false);
      setSelectedChainId("");
      toast({ 
        title: "Chain aggiornata",
        description: data.message,
      });
    },
    onError: (err: Error) => {
      toast({ title: err.message, variant: "destructive" });
    },
  });

  const resetTokenMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/community/reset-token", {});
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Errore nel reset del token");
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/community/chain-info"] });
      queryClient.invalidateQueries({ queryKey: ["/api/communities", user?.communityId] });
      queryClient.invalidateQueries({ queryKey: ["/api/blockchain/config"] });
      setShowResetTokenDialog(false);
      toast({ 
        title: "Token resettato",
        description: data.message,
      });
    },
    onError: (err: Error) => {
      toast({ title: err.message, variant: "destructive" });
    },
  });

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} copiato negli appunti` });
  };

  const handleCreateToken = () => {
    setIsCreatingToken(true);
    createTokenMutation.mutate();
  };

  if (!user) return null;

  const isCoordinator = user.role === "coordinator";
  const hasToken = !!community?.tokenAddress;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Settings className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Impostazioni</h1>
          <p className="text-muted-foreground">Gestisci il tuo account e il tuo wallet</p>
        </div>
      </div>

      {isCoordinator && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Coins className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>Token della Community</CardTitle>
                <CardDescription>
                  {hasToken 
                    ? "Il token della tua community è attivo" 
                    : "Crea il token per la tua community"}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {communityLoading ? (
              <div className="text-center py-8 text-muted-foreground">Caricamento...</div>
            ) : hasToken ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 rounded-lg border bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <div className="flex-1">
                    <p className="font-medium text-green-800 dark:text-green-200">Token Attivo</p>
                    <p className="text-sm text-green-600 dark:text-green-400">Il token della community è stato creato e configurato</p>
                  </div>
                </div>
                
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label className="text-muted-foreground text-xs">Nome Token</Label>
                    <p className="font-medium">{tokenConfig?.name || community?.name} (ECT)</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Indirizzo Contratto</Label>
                    <div className="flex items-center gap-2">
                      <code className="text-xs font-mono bg-muted px-2 py-1 rounded">
                        {community.tokenAddress?.slice(0, 10)}...{community.tokenAddress?.slice(-8)}
                      </code>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={() => copyToClipboard(community.tokenAddress!, "Indirizzo token")}
                        data-testid="button-copy-community-token"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        asChild
                      >
                        <a
                          href={`${chainInfo?.chainProfile?.explorerUrl || "https://sepolia.etherscan.io"}/address/${community.tokenAddress}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </Button>
                    </div>
                  </div>
                  {tokenConfig && (
                    <>
                      <div>
                        <Label className="text-muted-foreground text-xs">Total Supply</Label>
                        <p className="font-medium">
                          {(Number(tokenConfig.totalSupply) / Math.pow(10, tokenConfig.decimals)).toLocaleString()} ECT
                        </p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground text-xs">Decimali</Label>
                        <p className="font-medium">{tokenConfig.decimals}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 rounded-lg border bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900">
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                  <div className="flex-1">
                    <p className="font-medium text-amber-800 dark:text-amber-200">Token Non Configurato</p>
                    <p className="text-sm text-amber-600 dark:text-amber-400">
                      Devi creare il token della community per abilitare le transazioni
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-lg border bg-card">
                  <h4 className="font-medium mb-3">Dettagli Token</h4>
                  <div className="grid gap-3 md:grid-cols-2 text-sm">
                    <div>
                      <Label className="text-muted-foreground text-xs">Nome</Label>
                      <p className="font-medium">{community?.name || "..."}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Simbolo</Label>
                      <p className="font-medium">ECT</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Indirizzo Coordinatore</Label>
                      <code className="text-xs font-mono">
                        {userWallet?.address ? `${userWallet.address.slice(0, 10)}...${userWallet.address.slice(-8)}` : "..."}
                      </code>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Admin Spender</Label>
                      <code className="text-xs font-mono">
                        {adminWallet?.address ? `${adminWallet.address.slice(0, 10)}...${adminWallet.address.slice(-8)}` : "..."}
                      </code>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleCreateToken}
                  disabled={isCreatingToken}
                  className="w-full gap-2"
                  data-testid="button-create-token"
                >
                  {isCreatingToken ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Creazione in corso...
                    </>
                  ) : (
                    <>
                      <Coins className="h-4 w-4" />
                      Crea Token della Community
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  La creazione del token richiede una transazione sulla blockchain {chainInfo?.chainProfile?.name || "configurata"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {isCoordinator && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Link2 className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>Blockchain</CardTitle>
                <CardDescription>
                  Gestisci la chain e il token della tua community
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label className="text-muted-foreground text-xs">Chain Attuale</Label>
                <p className="font-medium">
                  {chainInfo?.chainProfile?.name || "Non configurata"}
                  {chainInfo?.chainProfile?.chainId && (
                    <Badge variant="outline" className="ml-2 text-xs">
                      Chain ID: {chainInfo.chainProfile.chainId}
                    </Badge>
                  )}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Stato Token</Label>
                <p className="font-medium">
                  {chainInfo?.tokenAddress ? (
                    <span className="text-green-600">Attivo</span>
                  ) : (
                    <span className="text-amber-600">Non creato</span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <Label className="text-muted-foreground text-xs mb-2 block">Cambia Chain</Label>
                <Select value={selectedChainId} onValueChange={setSelectedChainId}>
                  <SelectTrigger data-testid="select-chain">
                    <SelectValue placeholder="Seleziona una chain..." />
                  </SelectTrigger>
                  <SelectContent>
                    {chainProfiles?.map((profile) => (
                      <SelectItem key={profile.id} value={profile.id}>
                        {profile.name} (Chain ID: {profile.chainId})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="outline"
                className="gap-2 self-end"
                disabled={!selectedChainId || switchChainMutation.isPending}
                onClick={() => setShowSwitchChainDialog(true)}
                data-testid="button-switch-chain"
              >
                {switchChainMutation.isPending ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Link2 className="h-4 w-4" />
                )}
                Cambia Chain
              </Button>
            </div>

            {hasToken && (
              <div className="pt-4 border-t">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <p className="font-medium text-sm">Reset Token</p>
                    <p className="text-xs text-muted-foreground">
                      Elimina l'associazione al token attuale per crearne uno nuovo
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="gap-2"
                    onClick={() => setShowResetTokenDialog(true)}
                    disabled={resetTokenMutation.isPending}
                    data-testid="button-reset-token"
                  >
                    {resetTokenMutation.isPending ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    Reset Token
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Wallet className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Il tuo Wallet</CardTitle>
              <CardDescription>Il wallet associato al tuo account per le operazioni blockchain</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {walletsLoading ? (
            <div className="text-center py-8 text-muted-foreground">Caricamento wallet...</div>
          ) : !userWallet ? (
            <div className="text-center py-8">
              <Wallet className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">Nessun wallet associato</p>
              <p className="text-sm text-muted-foreground">Contatta il supporto se hai bisogno di assistenza</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="p-4 rounded-lg border bg-card" data-testid={`wallet-card-${userWallet.id}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="p-3 rounded-lg bg-primary/10">
                      <Wallet className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-lg">{userWallet.label}</span>
                        <Badge variant="outline" className="text-xs capitalize">
                          {userWallet.walletType}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <code className="text-sm text-muted-foreground font-mono bg-muted px-2 py-1 rounded">
                          {userWallet.address}
                        </code>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => copyToClipboard(userWallet.address, "Indirizzo")}
                          data-testid={`button-copy-address-${userWallet.id}`}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowExportDialog(true)}
                  className="gap-2"
                  data-testid="button-export-keystore"
                >
                  <Key className="h-4 w-4" />
                  Esporta Keystore
                </Button>
                <Button
                  variant="outline"
                  asChild
                  className="gap-2"
                >
                  <a
                    href={`${chainInfo?.chainProfile?.explorerUrl || "https://sepolia.etherscan.io"}/address/${userWallet.address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid="link-etherscan"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Visualizza su Explorer
                  </a>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Esporta Keystore</DialogTitle>
            <DialogDescription>
              Esporta il wallet come file keystore JSON cifrato. Conserva questo file in modo sicuro!
            </DialogDescription>
          </DialogHeader>
          {userWallet && (
            <div className="space-y-4">
              <div>
                <Label>Wallet</Label>
                <p className="text-sm font-medium">{userWallet.label}</p>
                <code className="text-xs text-muted-foreground">{userWallet.address}</code>
              </div>
              <div className="space-y-2">
                <Label htmlFor="account-password">Password Account</Label>
                <Input
                  id="account-password"
                  type="password"
                  placeholder="La tua password di accesso"
                  value={exportPassword}
                  onChange={(e) => setExportPassword(e.target.value)}
                  data-testid="input-account-password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="keystore-password">Password Keystore</Label>
                <Input
                  id="keystore-password"
                  type="password"
                  placeholder="Nuova password per cifrare il keystore (min 8 caratteri)"
                  value={keystorePassword}
                  onChange={(e) => setKeystorePassword(e.target.value)}
                  data-testid="input-keystore-password"
                />
                <p className="text-xs text-muted-foreground">
                  Questa password sarà necessaria per importare il keystore in altri wallet
                </p>
              </div>
              <Button
                onClick={() => exportKeystoreMutation.mutate({
                  walletId: userWallet.id,
                  password: exportPassword,
                  keystorePassword: keystorePassword,
                })}
                disabled={exportKeystoreMutation.isPending || !exportPassword || keystorePassword.length < 8}
                className="w-full"
                data-testid="button-confirm-export"
              >
                {exportKeystoreMutation.isPending ? (
                  <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Key className="h-4 w-4 mr-1" />
                )}
                Esporta Keystore
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Key className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Configurazione Blockchain</CardTitle>
              <CardDescription>Informazioni sulla rete configurata</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <div>
                <Label className="text-muted-foreground text-xs">Rete</Label>
                <p className="font-medium">{chainInfo?.chainProfile?.name || "Non configurata"}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Chain ID</Label>
                <p className="font-medium">{chainInfo?.chainProfile?.chainId || "-"}</p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <Label className="text-muted-foreground text-xs">Admin Wallet (Server)</Label>
                <div className="flex items-center gap-2">
                  <code className="text-xs font-mono">
                    {adminWallet?.address ? `${adminWallet.address.slice(0, 10)}...${adminWallet.address.slice(-8)}` : "..."}
                  </code>
                  {adminWallet?.address && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={() => copyToClipboard(adminWallet.address, "Admin wallet")}
                      data-testid="button-copy-admin-address"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showSwitchChainDialog} onOpenChange={setShowSwitchChainDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma cambio chain</AlertDialogTitle>
            <AlertDialogDescription>
              {hasToken ? (
                <>
                  <strong>Attenzione:</strong> Il cambio di chain disconnetterà il token attuale. 
                  Dovrai creare un nuovo token sulla nuova chain. I token esistenti rimarranno 
                  sulla chain precedente ma non saranno più gestiti da questa community.
                </>
              ) : (
                <>
                  Stai per cambiare la chain della tua community. Dopo il cambio, potrai 
                  creare un nuovo token sulla nuova chain selezionata.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-switch-chain">
              Annulla
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => switchChainMutation.mutate(selectedChainId)}
              data-testid="button-confirm-switch-chain"
            >
              Conferma
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showResetTokenDialog} onOpenChange={setShowResetTokenDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Token</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>Attenzione:</strong> Questa azione disconnetterà il token attuale dalla community. 
              Il contratto token rimarrà sulla blockchain ma non sarà più associato a questa community. 
              Potrai creare un nuovo token dopo il reset.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-reset-token">
              Annulla
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => resetTokenMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-reset-token"
            >
              Reset Token
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
