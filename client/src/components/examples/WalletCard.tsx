import { WalletCard } from "../WalletCard";

export default function WalletCardExample() {
  return (
    <div className="w-80">
      <WalletCard
        address="0x742d35Cc6634C0532925a3b844Bc9e7595f12B00"
        balance={12500}
        onViewExplorer={() => console.log("View explorer")}
      />
    </div>
  );
}
