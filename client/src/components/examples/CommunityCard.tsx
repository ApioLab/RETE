import { CommunityCard, Community } from "../CommunityCard";

// todo: remove mock functionality
const mockCommunity: Community = {
  id: "1",
  name: "Comunità Energia Milano Nord",
  description: "Comunità energetica del quartiere Bicocca e zone limitrofe",
  totalUsers: 156,
  totalProviders: 12,
  tokenCirculation: 125000,
  status: "active",
};

export default function CommunityCardExample() {
  return (
    <div className="w-96">
      <CommunityCard
        community={mockCommunity}
        onManage={(c) => console.log("Manage:", c.name)}
      />
    </div>
  );
}
