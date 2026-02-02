import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Coins } from "lucide-react";

interface TokenBalanceProps {
  balance: number;
  trend?: number;
  label?: string;
  showTrend?: boolean;
  size?: "sm" | "md" | "lg";
}

export function TokenBalance({
  balance,
  trend = 0,
  label = "Saldo Token",
  showTrend = true,
  size = "lg",
}: TokenBalanceProps) {
  const isPositive = trend >= 0;
  
  const sizeClasses = {
    sm: "text-xl",
    md: "text-2xl",
    lg: "text-4xl",
  };

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
      <CardContent className="p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
              {label}
            </p>
            <div className="flex items-baseline gap-2">
              <span
                className={`${sizeClasses[size]} font-bold text-foreground`}
                data-testid="text-token-balance"
              >
                {balance.toLocaleString("it-IT")}
              </span>
              <span className="text-lg font-medium text-accent">ECT</span>
            </div>
            {showTrend && trend !== 0 && (
              <div
                className={`flex items-center gap-1 mt-2 text-sm ${
                  isPositive ? "text-success" : "text-destructive"
                }`}
              >
                {isPositive ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                <span data-testid="text-token-trend">
                  {isPositive ? "+" : ""}
                  {trend}% questo mese
                </span>
              </div>
            )}
          </div>
          <div className="p-4 rounded-full bg-accent/20">
            <Coins className="h-8 w-8 text-accent" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
