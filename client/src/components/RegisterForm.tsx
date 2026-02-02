import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Zap, Loader2, CheckCircle2, XCircle, Info } from "lucide-react";
import { useAuth, UserRole } from "@/lib/auth-context";
import { Alert, AlertDescription } from "@/components/ui/alert";

const registerSchema = z
  .object({
    name: z.string().min(2, "Nome minimo 2 caratteri"),
    email: z.string().email("Email non valida"),
    password: z.string().min(6, "Password minimo 6 caratteri"),
    confirmPassword: z.string(),
    role: z.enum(["coordinator", "provider", "user"]),
    communityName: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Le password non coincidono",
    path: ["confirmPassword"],
  })
  .refine((data) => data.role !== "coordinator" || (data.communityName && data.communityName.length >= 3), {
    message: "Nome comunità richiesto (min 3 caratteri)",
    path: ["communityName"],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

interface InviteStatus {
  checking: boolean;
  hasInvite: boolean | null;
  communityName?: string;
}

interface RegisterFormProps {
  onSuccess?: () => void;
  onLoginClick?: () => void;
}

export function RegisterForm({ onSuccess, onLoginClick }: RegisterFormProps) {
  const { register } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteStatus, setInviteStatus] = useState<InviteStatus>({
    checking: false,
    hasInvite: null,
  });

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    mode: "onChange",
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      role: "coordinator",
      communityName: "",
    },
  });

  const selectedRole = form.watch("role");
  const email = form.watch("email");

  useEffect(() => {
    if (selectedRole === "user" && email && email.includes("@")) {
      const timeoutId = setTimeout(async () => {
        setInviteStatus({ checking: true, hasInvite: null });
        try {
          const response = await fetch(`/api/invites/check?email=${encodeURIComponent(email)}`);
          const data = await response.json();
          setInviteStatus({
            checking: false,
            hasInvite: data.hasInvite,
            communityName: data.communityName,
          });
        } catch {
          setInviteStatus({ checking: false, hasInvite: null });
        }
      }, 500);
      return () => clearTimeout(timeoutId);
    } else {
      setInviteStatus({ checking: false, hasInvite: null });
    }
  }, [email, selectedRole]);

  const onSubmit = async (data: RegisterFormData) => {
    if (data.role === "user" && !inviteStatus.hasInvite) {
      setError("Non hai un invito valido per registrarti come utente");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await register(
        data.email, 
        data.password, 
        data.name, 
        data.role as UserRole,
        data.role === "coordinator" ? data.communityName : undefined
      );
      onSuccess?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore durante la registrazione");
    } finally {
      setIsLoading(false);
    }
  };

  const canSubmit = () => {
    if (selectedRole === "user") {
      return inviteStatus.hasInvite === true;
    }
    return true;
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto mb-4 p-3 rounded-full bg-primary/10 w-fit">
          <Zap className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-2xl">Crea il tuo account</CardTitle>
        <CardDescription>
          Unisciti alla comunità energetica
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo di account</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-role">
                        <SelectValue placeholder="Seleziona ruolo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="coordinator">Coordinatore CER</SelectItem>
                      <SelectItem value="provider">Service Provider</SelectItem>
                      <SelectItem value="user">Utente (richiede invito)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedRole === "user" && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Per registrarti come utente devi essere stato invitato da un coordinatore della comunità.
                </AlertDescription>
              </Alert>
            )}

            {selectedRole === "provider" && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  I Service Provider possono operare in più comunità energetiche e offrire prodotti/servizi.
                </AlertDescription>
              </Alert>
            )}

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome completo</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Mario Rossi"
                      data-testid="input-name"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type="email"
                        placeholder="email@esempio.it"
                        data-testid="input-email"
                        {...field}
                      />
                      {selectedRole === "user" && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          {inviteStatus.checking && (
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          )}
                          {!inviteStatus.checking && inviteStatus.hasInvite === true && (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          )}
                          {!inviteStatus.checking && inviteStatus.hasInvite === false && (
                            <XCircle className="h-4 w-4 text-destructive" />
                          )}
                        </div>
                      )}
                    </div>
                  </FormControl>
                  {selectedRole === "user" && inviteStatus.hasInvite === true && (
                    <FormDescription className="text-green-600">
                      Invito trovato per: {inviteStatus.communityName}
                    </FormDescription>
                  )}
                  {selectedRole === "user" && inviteStatus.hasInvite === false && (
                    <FormDescription className="text-destructive">
                      Nessun invito trovato per questa email
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedRole === "coordinator" && (
              <FormField
                control={form.control}
                name="communityName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome della Comunità</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Es: Comunità Energia Milano Nord"
                        data-testid="input-community-name"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      data-testid="input-password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Conferma Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      data-testid="input-confirm-password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || !canSubmit()}
              data-testid="button-register"
            >
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Registrati
            </Button>
          </form>
        </Form>
        <div className="mt-6 text-center text-sm">
          <span className="text-muted-foreground">Hai già un account? </span>
          <button
            onClick={onLoginClick}
            className="text-primary font-medium hover:underline"
            data-testid="link-login"
          >
            Accedi
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
