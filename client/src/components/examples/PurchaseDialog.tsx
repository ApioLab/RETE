import { useState } from "react";
import { PurchaseDialog } from "../PurchaseDialog";
import { Button } from "@/components/ui/button";
import { Product } from "../ProductCard";

// todo: remove mock functionality
const mockProduct: Product = {
  id: "1",
  name: "Pannello Solare Portatile 100W",
  description: "Pannello pieghevole ideale per campeggio",
  price: 450,
  category: "Energia",
  providerId: "p1",
  providerName: "Green Energy Store",
  available: true,
};

export default function PurchaseDialogExample() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>Apri Dialog Acquisto</Button>
      <PurchaseDialog
        open={open}
        onClose={() => setOpen(false)}
        product={mockProduct}
        userBalance={1200}
        onConfirm={async (p) => {
          console.log("Purchased:", p.name);
          await new Promise((r) => setTimeout(r, 500));
        }}
      />
    </>
  );
}
