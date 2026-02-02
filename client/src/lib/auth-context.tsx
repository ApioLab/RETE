import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { apiRequest } from "./queryClient";

export type UserRole = "coordinator" | "provider" | "user";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  ethAddress: string;
  tokenBalance: number;
  communityId?: string | null;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, role: UserRole, communityName?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/me", {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    refreshUser().finally(() => setIsLoading(false));
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string) => {
    const response = await apiRequest("POST", "/api/auth/login", { email, password });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Errore durante il login");
    }
    setUser(data.user);
  }, []);

  const register = useCallback(
    async (email: string, password: string, name: string, role: UserRole, communityName?: string) => {
      const response = await apiRequest("POST", "/api/auth/register", {
        email,
        password,
        name,
        role,
        communityName,
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Errore durante la registrazione");
      }
      setUser(data.user);
    },
    []
  );

  const logout = useCallback(async () => {
    await apiRequest("POST", "/api/auth/logout");
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
