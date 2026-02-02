import { StatCard } from "../StatCard";
import { Users } from "lucide-react";

export default function StatCardExample() {
  return (
    <StatCard
      title="Utenti Attivi"
      value={1250}
      trend={12}
      icon={Users}
      iconColor="text-secondary"
    />
  );
}
