import { TransactionLog, Transaction } from "../TransactionLog";

// todo: remove mock functionality
const mockTransactions: Transaction[] = [
  {
    id: "1",
    type: "receive",
    amount: 500,
    description: "Distribuzione mensile",
    timestamp: "Oggi, 14:30",
    status: "completed",
  },
  {
    id: "2",
    type: "purchase",
    amount: 120,
    description: "Pannello solare portatile",
    timestamp: "Ieri, 10:15",
    status: "completed",
  },
  {
    id: "3",
    type: "send",
    amount: 50,
    description: "Trasferimento a Mario Verdi",
    timestamp: "22 Nov, 16:45",
    status: "pending",
  },
  {
    id: "4",
    type: "burn",
    amount: 200,
    description: "Fee coordinatore",
    timestamp: "20 Nov, 09:00",
    status: "completed",
  },
];

export default function TransactionLogExample() {
  return <TransactionLog transactions={mockTransactions} />;
}
