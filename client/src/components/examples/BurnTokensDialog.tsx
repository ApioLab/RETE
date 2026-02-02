import { useState } from "react";
import { BurnTokensDialog } from "../BurnTokensDialog";
import { Button } from "@/components/ui/button";

export default function BurnTokensDialogExample() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="destructive" onClick={() => setOpen(true)}>
        Apri Dialog Burn Token
      </Button>
      <BurnTokensDialog
        open={open}
        onClose={() => setOpen(false)}
        currentBalance={50000}
        onBurn={async (amount, reason) => {
          console.log("Burning:", amount, reason);
          await new Promise((r) => setTimeout(r, 500));
        }}
      />
    </>
  );
}
