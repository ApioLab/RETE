import { Server as HttpServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import type { Transaction } from "@shared/schema";
import type { RequestHandler } from "express";
import { storage } from "./storage";

let io: SocketIOServer | null = null;

declare module "express-session" {
  interface SessionData {
    userId?: string;
  }
}

export function initializeWebSocket(httpServer: HttpServer, sessionMiddleware: RequestHandler): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
    path: "/socket.io",
  });

  io.engine.use(sessionMiddleware);

  io.on("connection", async (socket) => {
    console.log(`[websocket] Client connected: ${socket.id}`);

    const session = (socket.request as any).session;
    const sessionUserId = session?.userId;

    if (!sessionUserId) {
      console.log(`[websocket] Unauthenticated connection rejected: ${socket.id}`);
      socket.emit("auth-required");
      socket.disconnect(true);
      return;
    }

    socket.on("authenticate", async (data: { userId: string; communityId?: string | null }) => {
      if (!sessionUserId) {
        console.warn(`[websocket] No session for socket: ${socket.id}`);
        socket.emit("error", { message: "Sessione non valida" });
        socket.disconnect(true);
        return;
      }

      if (data.userId !== sessionUserId) {
        console.warn(`[websocket] User ID mismatch: ${socket.id} claimed ${data.userId} but session has ${sessionUserId}`);
        socket.emit("error", { message: "ID utente non corrisponde alla sessione" });
        socket.disconnect(true);
        return;
      }

      const user = await storage.getUser(sessionUserId);
      if (!user) {
        console.warn(`[websocket] User not found in database: ${sessionUserId}`);
        socket.emit("error", { message: "Utente non trovato" });
        socket.disconnect(true);
        return;
      }

      if (data.communityId && data.communityId !== user.communityId) {
        console.warn(`[websocket] Community ID mismatch: ${socket.id} claimed ${data.communityId} but user has ${user.communityId}`);
        socket.emit("error", { message: "Community ID non corrisponde" });
        socket.disconnect(true);
        return;
      }
      
      socket.join(`user:${sessionUserId}`);
      console.log(`[websocket] User ${sessionUserId} authenticated and joined room`);
      
      if (user.communityId) {
        socket.join(`community:${user.communityId}`);
        console.log(`[websocket] User ${sessionUserId} joined community room: ${user.communityId}`);
      }
      
      socket.emit("authenticated", { success: true });
    });

    socket.on("disconnect", () => {
      console.log(`[websocket] Client disconnected: ${socket.id}`);
    });
  });

  console.log("[websocket] Socket.IO server initialized");
  return io;
}

export function getIO(): SocketIOServer | null {
  return io;
}

export interface TransactionEvent {
  transaction: Transaction & { fromUserName?: string; toUserName?: string };
  type: "created" | "updated" | "completed" | "failed";
}

export function emitTransactionUpdate(
  userId: string,
  event: TransactionEvent
): void {
  if (!io) {
    console.warn("[websocket] Socket.IO not initialized");
    return;
  }

  io.to(`user:${userId}`).emit("transaction-update", event);
  console.log(`[websocket] Emitted transaction-update to user:${userId}`, event.type);
}

export function emitTransactionToCommunity(
  communityId: string,
  event: TransactionEvent
): void {
  if (!io) {
    console.warn("[websocket] Socket.IO not initialized");
    return;
  }

  io.to(`community:${communityId}`).emit("transaction-update", event);
  console.log(`[websocket] Emitted transaction-update to community:${communityId}`, event.type);
}

export function emitBalanceUpdate(
  userId: string,
  newBalance: number
): void {
  if (!io) {
    console.warn("[websocket] Socket.IO not initialized");
    return;
  }

  io.to(`user:${userId}`).emit("balance-update", { balance: newBalance });
  console.log(`[websocket] Emitted balance-update to user:${userId}`, newBalance);
}
