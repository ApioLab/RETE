import { useState } from "react";
import { LoginForm } from "@/components/LoginForm";
import { RegisterForm } from "@/components/RegisterForm";
import { Zap } from "lucide-react";

interface AuthPageProps {
  onSuccess: () => void;
}

export function AuthPage({ onSuccess }: AuthPageProps) {
  const [mode, setMode] = useState<"login" | "register">("login");

  return (
    <div className="min-h-screen bg-background flex">
      <div className="hidden lg:flex lg:w-1/2 bg-primary relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary/80" />
        <div className="relative z-10 flex flex-col justify-center p-12 text-primary-foreground">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 rounded-lg bg-white/20">
              <Zap className="h-8 w-8" />
            </div>
            <h1 className="text-3xl font-bold">RETE</h1>
          </div>
          <h2 className="text-4xl font-bold mb-4">
            Gestisci la tua comunità energetica
          </h2>
          <p className="text-xl text-primary-foreground/80">
            Una piattaforma basata su blockchain per la gestione trasparente delle rendicontazioni, marketplace e transazioni nella tua comunità.
          </p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="p-2 rounded-lg bg-primary/10">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">RETE</h1>
          </div>

          {mode === "login" ? (
            <LoginForm
              onSuccess={onSuccess}
              onRegisterClick={() => setMode("register")}
            />
          ) : (
            <RegisterForm
              onSuccess={onSuccess}
              onLoginClick={() => setMode("login")}
            />
          )}
        </div>
      </div>
    </div>
  );
}
