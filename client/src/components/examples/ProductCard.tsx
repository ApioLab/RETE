import { ProductCard, Product } from "../ProductCard";

// todo: remove mock functionality
const mockProduct: Product = {
  id: "1",
  name: "Pannello Solare Portatile 100W",
  description: "Pannello pieghevole ideale per campeggio e uso domestico di emergenza",
  price: 450,
  category: "Energia",
  providerId: "p1",
  providerName: "Green Energy Store",
  available: true,
};

export default function ProductCardExample() {
  return (
    <div className="w-80">
      <ProductCard
        product={mockProduct}
        mode="marketplace"
        userBalance={1200}
        onBuy={(p) => console.log("Acquisto:", p.name)}
      />
    </div>
  );
}
