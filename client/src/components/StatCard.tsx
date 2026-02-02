import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  trend?: number;
  icon: LucideIcon;
  iconColor?: string;
}

export function StatCard({
  title,
  value,
  trend,
  icon: Icon,
  iconColor = "text-primary",
}: StatCardProps) {
  const isPositive = trend !== undefined && trend >= 0;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {title}
            </p>
            <p className="text-2xl font-bold mt-1" data-testid={`text-stat-${title.toLowerCase().replace(/\s/g, "-")}`}>
              {typeof value === "number" ? value.toLocaleString("it-IT") : value}
            </p>
            {trend !== undefined && (
              <div
                className={`flex items-center gap-1 mt-2 text-xs ${
                  isPositive ? "text-success" : "text-destructive"
                }`}
              >
                {isPositive ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                <span>
                  {isPositive ? "+" : ""}
                  {trend}%
                </span>
              </div>
            )}
          </div>
          <div className={`p-3 rounded-lg bg-muted ${iconColor}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
