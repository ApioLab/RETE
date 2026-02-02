import { UserTable, CommunityUser } from "../UserTable";

// todo: remove mock functionality
const mockUsers: CommunityUser[] = [
  {
    id: "1",
    name: "Anna Bianchi",
    email: "anna@esempio.it",
    role: "user",
    ethAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f12B00",
    tokenBalance: 1250,
    status: "active",
  },
  {
    id: "2",
    name: "Green Energy Store",
    email: "store@energia.it",
    role: "provider",
    ethAddress: "0x8Ba1f109551bD432803012645Ac136ddd64DBA72",
    tokenBalance: 8500,
    status: "active",
  },
  {
    id: "3",
    name: "Luigi Verdi",
    email: "luigi@esempio.it",
    role: "user",
    ethAddress: "0x9fB6991cf8A26c61dcBc8F6E52dC212d53e7A4E1",
    tokenBalance: 320,
    status: "inactive",
  },
];

export default function UserTableExample() {
  return (
    <UserTable
      users={mockUsers}
      onSendTokens={(u) => console.log("Send tokens to:", u.name)}
      onRemoveUser={(u) => console.log("Remove:", u.name)}
      onAddUser={() => console.log("Add user")}
    />
  );
}
