import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Coins, Store, Settings, Zap } from "lucide-react";

export interface Community {
  id: string;
  name: string;
  description: string;
  totalUsers: number;
  totalProviders: number;
  tokenCirculation: number;
  status: "active" | "pending";
}

interface CommunityCardProps {
  community: Community;
  onManage?: (community: Community) => void;
  isSelected?: boolean;
}

export function CommunityCard({
  community,
  onManage,
  isSelected = false,
}: CommunityCardProps) {
  return (
    <Card
      className={`transition-all ${
        isSelected ? "ring-2 ring-primary" : ""
      }`}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-primary/10">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3
                className="font-semibold text-lg"
                data-testid={`text-community-name-${community.id}`}
              >
                {community.name}
              </h3>
              <p className="text-sm text-muted-foreground line-clamp-1">
                {community.description}
              </p>
            </div>
          </div>
          <Badge
            variant={community.status === "active" ? "default" : "secondary"}
          >
            {community.status === "active" ? "Attiva" : "In attesa"}
          </Badge>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center p-3 bg-muted rounded-lg">
            <Users className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
            <p className="text-lg font-bold">{community.totalUsers}</p>
            <p className="text-xs text-muted-foreground">Utenti</p>
          </div>
          <div className="text-center p-3 bg-muted rounded-lg">
            <Store className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
            <p className="text-lg font-bold">{community.totalProviders}</p>
            <p className="text-xs text-muted-foreground">Provider</p>
          </div>
          <div className="text-center p-3 bg-muted rounded-lg">
            <Coins className="h-4 w-4 mx-auto text-accent mb-1" />
            <p className="text-lg font-bold">
              {(community.tokenCirculation / 1000).toFixed(0)}K
            </p>
            <p className="text-xs text-muted-foreground">Token</p>
          </div>
        </div>

        <Button
          variant="outline"
          className="w-full"
          onClick={() => onManage?.(community)}
          data-testid={`button-manage-${community.id}`}
        >
          <Settings className="h-4 w-4 mr-2" />
          Gestisci Comunità
        </Button>
      </CardContent>
    </Card>
  );
}
