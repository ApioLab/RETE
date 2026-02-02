import { useState } from "react";
import { SendTokensDialog } from "../SendTokensDialog";
import { Button } from "@/components/ui/button";

export default function SendTokensDialogExample() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>Apri Dialog Invio Token</Button>
      <SendTokensDialog
        open={open}
        onClose={() => setOpen(false)}
        recipientName="Anna Bianchi"
        recipientEmail="anna@esempio.it"
        maxAmount={5000}
        onSend={async (amount, note) => {
          console.log("Sending:", amount, note);
          await new Promise((r) => setTimeout(r, 500));
        }}
      />
    </>
  );
}
