import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Coins, Copy, ExternalLink, CheckCircle } from "lucide-react";
import { useState } from "react";

interface WalletCardProps {
  address: string;
  balance: number;
  onViewExplorer?: () => void;
}

export function WalletCard({ address, balance, onViewExplorer }: WalletCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shortAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;

  return (
    <Card className="bg-gradient-to-br from-sidebar to-sidebar/90 text-sidebar-foreground border-0">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <Badge variant="outline" className="border-sidebar-foreground/30 text-sidebar-foreground/80">
            Wallet ETH
          </Badge>
          <div className="p-2 rounded-full bg-accent/20">
            <Coins className="h-5 w-5 text-accent" />
          </div>
        </div>

        <div className="mb-4">
          <p className="text-xs text-sidebar-foreground/60 uppercase tracking-wide mb-1">
            Saldo disponibile
          </p>
          <div className="flex items-baseline gap-2">
            <span
              className="text-3xl font-bold"
              data-testid="text-wallet-balance"
            >
              {balance.toLocaleString("it-IT")}
            </span>
            <span className="text-lg text-accent font-medium">ECT</span>
          </div>
        </div>

        <div className="bg-black/20 rounded-lg p-3 mb-4">
          <p className="text-xs text-sidebar-foreground/60 mb-1">
            Indirizzo Wallet
          </p>
          <div className="flex items-center gap-2">
            <code
              className="text-sm font-mono flex-1"
              data-testid="text-wallet-address"
            >
              {shortAddress}
            </code>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-white/10"
              onClick={handleCopy}
              data-testid="button-copy-address"
            >
              {copied ? (
                <CheckCircle className="h-4 w-4 text-success" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        <Button
          variant="outline"
          className="w-full border-sidebar-foreground/30 text-sidebar-foreground hover:bg-white/10"
          onClick={onViewExplorer}
          data-testid="button-view-explorer"
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          Vedi su Explorer
        </Button>
      </CardContent>
    </Card>
  );
}
