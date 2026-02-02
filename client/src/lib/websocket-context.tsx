import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "./auth-context";
import { queryClient } from "./queryClient";
import type { Transaction } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface TransactionEvent {
  transaction: Transaction & { fromUserName?: string; toUserName?: string };
  type: "created" | "updated" | "completed" | "failed";
}

interface WebSocketContextValue {
  isConnected: boolean;
  pendingTransactions: Transaction[];
  pendingCount: number;
}

const WebSocketContext = createContext<WebSocketContextValue>({
  isConnected: false,
  pendingTransactions: [],
  pendingCount: 0,
});

export function useWebSocket() {
  return useContext(WebSocketContext);
}

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [pendingTransactions, setPendingTransactions] = useState<Transaction[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<(Transaction & { fromUserName?: string; toUserName?: string })[]>([]);
  
  const lastNotifiedRef = useRef<string | null>(null);

  const fetchPendingTransactions = useCallback(async () => {
    if (!user) return;
    
    try {
      const response = await fetch("/api/transactions");
      if (response.ok) {
        const transactions = await response.json();
        const pending = transactions.filter((t: Transaction) => t.status === "pending");
        setPendingTransactions(pending);
      }
    } catch (error) {
      console.error("[websocket] Error fetching pending transactions:", error);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    const newSocket = io(window.location.origin, {
      path: "/socket.io",
      transports: ["websocket", "polling"],
    });

    newSocket.on("connect", () => {
      console.log("[websocket] Connected:", newSocket.id);
      setIsConnected(true);
      
      newSocket.emit("authenticate", {
        userId: user.id,
        communityId: user.communityId,
      });
      
      fetchPendingTransactions();
    });
    
    newSocket.on("authenticated", () => {
      console.log("[websocket] Authenticated successfully");
    });

    newSocket.on("disconnect", () => {
      console.log("[websocket] Disconnected");
      setIsConnected(false);
    });

    newSocket.on("transaction-update", (event: TransactionEvent) => {
      console.log("[websocket] Transaction update:", event);
      
      // Filter: only show transactions from user's own community or where user is directly involved
      const isOwnCommunity = event.transaction.communityId === user?.communityId;
      const isInvolved = event.transaction.fromUserId === user?.id || event.transaction.toUserId === user?.id;
      
      if (!isOwnCommunity && !isInvolved) {
        console.log("[websocket] Ignoring transaction from different community");
        return;
      }
      
      if (event.type === "created" && event.transaction.status === "pending") {
        setPendingTransactions((prev) => {
          const exists = prev.some((t) => t.id === event.transaction.id);
          if (exists) return prev;
          return [...prev, event.transaction];
        });
      } else if (event.type === "completed" || event.type === "failed") {
        setPendingTransactions((prev) =>
          prev.filter((t) => t.id !== event.transaction.id)
        );
        
        if (event.transaction.id !== lastNotifiedRef.current) {
          lastNotifiedRef.current = event.transaction.id;
          
          const isReceiver = event.transaction.toUserId === user?.id;
          const isSender = event.transaction.fromUserId === user?.id;
          
          if (isReceiver && event.transaction.type === "receive") {
            toast({
              title: "Token Ricevuti",
              description: `Hai ricevuto ${event.transaction.amount} ECT da ${event.transaction.fromUserName || "Coordinatore"}`,
            });
          } else if (isReceiver && event.transaction.type === "send") {
            toast({
              title: "Token Ricevuti",
              description: `Hai ricevuto ${event.transaction.amount} ECT da ${event.transaction.fromUserName}`,
            });
          }
        }
        
        setRecentTransactions((prev) => {
          const exists = prev.some((t) => t.id === event.transaction.id);
          if (exists) return prev;
          return [event.transaction, ...prev].slice(0, 5);
        });
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions/community"] });
      
      refreshUser();
    });

    newSocket.on("balance-update", (data: { balance: number }) => {
      console.log("[websocket] Balance update:", data);
      
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/community/balances"] });
      
      refreshUser();
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [user, fetchPendingTransactions]);

  return (
    <WebSocketContext.Provider
      value={{
        isConnected,
        pendingTransactions,
        pendingCount: pendingTransactions.length,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
}
