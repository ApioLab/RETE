import { LoginForm } from "../LoginForm";
import { AuthProvider } from "@/lib/auth-context";

export default function LoginFormExample() {
  return (
    <AuthProvider>
      <LoginForm
        onSuccess={() => console.log("Login success")}
        onRegisterClick={() => console.log("Register clicked")}
      />
    </AuthProvider>
  );
}
