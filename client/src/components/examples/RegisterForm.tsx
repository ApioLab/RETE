import { RegisterForm } from "../RegisterForm";
import { AuthProvider } from "@/lib/auth-context";

export default function RegisterFormExample() {
  return (
    <AuthProvider>
      <RegisterForm
        onSuccess={() => console.log("Register success")}
        onLoginClick={() => console.log("Login clicked")}
      />
    </AuthProvider>
  );
}
