import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertProductSchema, insertCommunitySchema } from "@shared/schema";
import { z } from "zod";
import bcrypt from "bcryptjs";
import * as blockchain from "./blockchain";
import { ethers } from "ethers";
import { emitTransactionUpdate, emitTransactionToCommunity, emitBalanceUpdate } from "./websocket";

declare module "express-session" {
  interface SessionData {
    userId?: string;
  }
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const registerSchema = insertUserSchema.extend({
  password: z.string().min(6),
  communityName: z.string().optional(),
  communityId: z.string().optional(),
});

const distributeTokensSchema = z.object({
  distributions: z.array(z.object({
    email: z.string().email(),
    amount: z.number().positive(),
  })),
});

const purchaseSchema = z.object({
  productId: z.string(),
});

function requireAuth(req: Request, res: Response, next: Function) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Non autenticato" });
  }
  next();
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.post("/api/auth/register", async (req, res) => {
    try {
      const data = registerSchema.parse(req.body);
      
      const existingUser = await storage.getUserByEmail(data.email);
      if (existingUser) {
        return res.status(400).json({ error: "Email già registrata" });
      }

      // Pre-validate invite for users BEFORE any modifications
      let inviteCommunityId: string | null = null;
      if (data.role === "user") {
        const invite = await storage.getInviteByEmail(data.email);
        if (!invite) {
          return res.status(403).json({ error: "Per registrarti come utente devi essere invitato da un coordinatore" });
        }
        inviteCommunityId = invite.communityId;
      }

      // Generate wallet and encrypt BEFORE any database modifications
      // This ensures wallet generation errors don't leave orphaned data
      const { address: walletAddress, privateKey } = blockchain.generateNewWallet();
      const encryptedPrivateKey = blockchain.encryptPrivateKey(privateKey);
      const walletType = data.role === "coordinator" ? "coordinator" : "user";
      const hashedPassword = await bcrypt.hash(data.password, 10);
      
      // Now proceed with database operations (wallet is already ready)
      let communityId: string | null = null;
      
      if (data.role === "coordinator" && data.communityName) {
        const community = await storage.createCommunity({
          name: data.communityName,
          description: `Comunità gestita da ${data.name}`,
        });
        communityId = community.id;
      } else if (data.role === "user" && inviteCommunityId) {
        communityId = inviteCommunityId;
        await storage.deleteUserInvite(data.email, inviteCommunityId);
      } else if (data.role === "provider") {
        communityId = null;
      }

      // Create user with the real wallet address
      const user = await storage.createUser({
        email: data.email,
        password: hashedPassword,
        name: data.name,
        role: data.role,
        communityId,
      }, walletAddress);

      // Store the wallet record - if this fails, delete the user to maintain atomicity
      try {
        await storage.createWallet({
          userId: user.id,
          label: "Wallet Principale",
          address: walletAddress,
          encryptedPrivateKey,
          walletType,
          isDefault: 1,
        });
      } catch (walletError) {
        // Rollback: delete the user if wallet creation fails
        await storage.deleteUser(user.id);
        throw walletError;
      }

      req.session.userId = user.id;
      
      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Register error:", error);
      res.status(500).json({ error: "Errore durante la registrazione" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = loginSchema.parse(req.body);
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: "Credenziali non valide" });
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: "Credenziali non valide" });
      }

      req.session.userId = user.id;
      
      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Login error:", error);
      res.status(500).json({ error: "Errore durante il login" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Errore durante il logout" });
      }
      res.json({ success: true });
    });
  });

  app.get("/api/invites/check", async (req, res) => {
    try {
      const email = req.query.email as string;
      if (!email) {
        return res.status(400).json({ error: "Email richiesta" });
      }

      const invite = await storage.getInviteByEmail(email);
      if (!invite) {
        return res.json({ hasInvite: false });
      }

      const community = await storage.getCommunity(invite.communityId);
      res.json({
        hasInvite: true,
        communityId: invite.communityId,
        communityName: community?.name || "Comunità",
      });
    } catch (error) {
      console.error("Check invite error:", error);
      res.status(500).json({ error: "Errore nel controllo invito" });
    }
  });

  app.get("/api/auth/me", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ error: "Utente non trovato" });
      }
      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ error: "Errore nel recupero utente" });
    }
  });

  app.get("/api/community/stats", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user?.communityId) {
        return res.status(400).json({ error: "Nessuna comunità associata" });
      }
      const stats = await storage.getCommunityStats(user.communityId);
      res.json(stats);
    } catch (error) {
      console.error("Get stats error:", error);
      res.status(500).json({ error: "Errore nel recupero statistiche" });
    }
  });

  app.get("/api/community/users", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user?.communityId || user.role !== "coordinator") {
        return res.status(403).json({ error: "Non autorizzato" });
      }
      const users = await storage.getUsersByCommunity(user.communityId);
      const usersWithoutPasswords = users.map(({ password: _, ...u }) => u);
      res.json(usersWithoutPasswords);
    } catch (error) {
      console.error("Get users error:", error);
      res.status(500).json({ error: "Errore nel recupero utenti" });
    }
  });

  // Get community by ID
  app.get("/api/communities/:id", requireAuth, async (req, res) => {
    try {
      const community = await storage.getCommunity(req.params.id);
      if (!community) {
        return res.status(404).json({ error: "Comunità non trovata" });
      }
      res.json(community);
    } catch (error) {
      console.error("Get community error:", error);
      res.status(500).json({ error: "Errore nel recupero comunità" });
    }
  });

  // Get users by community ID
  app.get("/api/communities/:id/users", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user?.communityId || user.communityId !== req.params.id) {
        return res.status(403).json({ error: "Non autorizzato" });
      }
      const users = await storage.getUsersByCommunity(req.params.id);
      const usersWithoutPasswords = users.map(({ password: _, ...u }) => u);
      res.json(usersWithoutPasswords);
    } catch (error) {
      console.error("Get community users error:", error);
      res.status(500).json({ error: "Errore nel recupero utenti" });
    }
  });

  app.post("/api/tokens/distribute", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== "coordinator") {
        return res.status(403).json({ error: "Solo i coordinatori possono distribuire token" });
      }

      // Check if community has a token deployed
      if (!user.communityId) {
        return res.status(400).json({ error: "Nessuna comunità associata" });
      }
      const community = await storage.getCommunity(user.communityId);
      if (!community?.tokenAddress) {
        return res.status(400).json({ error: "La comunità non ha ancora un token. Crealo prima nelle Impostazioni." });
      }

      // Get the coordinator's custodial wallet to sign mint operations
      const coordinatorWallet = await storage.getDefaultWallet(user.id);
      if (!coordinatorWallet) {
        return res.status(400).json({ error: "Wallet del coordinatore non trovato" });
      }

      // Decrypt the coordinator's private key to sign mint operations
      const privateKey = blockchain.decryptPrivateKey(coordinatorWallet.encryptedPrivateKey);
      const signerWallet = new ethers.Wallet(privateKey);

      const { distributions } = distributeTokensSchema.parse(req.body);
      
      const results = [];
      const errors = [];
      
      for (const dist of distributions) {
        const targetUser = await storage.getUserByEmail(dist.email);
        if (!targetUser) {
          errors.push({ email: dist.email, error: "Utente non trovato" });
          continue;
        }
        if (targetUser.communityId !== user.communityId) {
          errors.push({ email: dist.email, error: "Utente non appartiene alla comunità" });
          continue;
        }

        try {
          // Create pending transaction first
          const pendingTransaction = await storage.createTransaction({
            type: "receive",
            amount: dist.amount,
            description: `Distribuzione da ${user.name}`,
            status: "pending",
            fromUserId: user.id,
            toUserId: targetUser.id,
            communityId: user.communityId,
          });
          
          // Emit WebSocket notification for pending transaction
          emitTransactionUpdate(targetUser.id, {
            transaction: { ...pendingTransaction, fromUserName: user.name },
            type: "created",
          });
          if (user.communityId) {
            emitTransactionToCommunity(user.communityId, {
              transaction: { ...pendingTransaction, fromUserName: user.name, toUserName: targetUser.name },
              type: "created",
            });
          }

          // Get token decimals for proper amount conversion
          const tokenConfig = await blockchain.getTokenConfig(community.tokenAddress);
          const amountWei = blockchain.parseAmount(dist.amount, tokenConfig.decimals);
          
          // Set deadline to 1 hour from now
          const deadline = Math.floor(Date.now() / 1000) + 3600;
          
          // Sign the mint authorization using coordinator's custodial wallet
          const signature = await blockchain.signMintAuthorization(
            signerWallet,
            targetUser.ethAddress,
            amountWei,
            deadline,
            community.tokenAddress
          );

          // Execute mintWithSig using the platform admin wallet
          const mintResult = await blockchain.mintWithSignature(
            signerWallet.address,
            targetUser.ethAddress,
            dist.amount,
            deadline,
            signature.v,
            signature.r,
            signature.s,
            community.tokenAddress
          );

          // Update local balance and update transaction status to completed
          await storage.updateUserBalance(targetUser.id, dist.amount);
          const completedTransaction = await storage.updateTransactionStatus(
            pendingTransaction.id, 
            "completed", 
            mintResult.tx
          );
          
          // Emit WebSocket notifications for completed transaction
          emitTransactionUpdate(targetUser.id, {
            transaction: { ...completedTransaction!, fromUserName: user.name },
            type: "completed",
          });
          emitBalanceUpdate(targetUser.id, (await storage.getUser(targetUser.id))?.tokenBalance || 0);
          if (user.communityId) {
            emitTransactionToCommunity(user.communityId, {
              transaction: { ...completedTransaction!, fromUserName: user.name, toUserName: targetUser.name },
              type: "completed",
            });
          }
          
          results.push({ 
            email: dist.email, 
            amount: dist.amount, 
            userName: targetUser.name,
            txHash: mintResult.tx 
          });
        } catch (mintError: any) {
          console.error(`Mint error for ${dist.email}:`, mintError);
          errors.push({ 
            email: dist.email, 
            error: `Errore blockchain: ${mintError.message || 'Mint fallito'}` 
          });
        }
      }

      res.json({ distributed: results, errors });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Distribute error:", error);
      res.status(500).json({ error: "Errore nella distribuzione" });
    }
  });

  app.post("/api/tokens/burn", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== "coordinator") {
        return res.status(403).json({ error: "Solo i coordinatori possono bruciare token" });
      }

      const { amount, description, targetUserId } = req.body;
      if (!amount || amount <= 0) {
        return res.status(400).json({ error: "Importo non valido" });
      }

      // Check if community has a token deployed
      if (!user.communityId) {
        return res.status(400).json({ error: "Nessuna comunità associata" });
      }
      const community = await storage.getCommunity(user.communityId);
      if (!community?.tokenAddress) {
        return res.status(400).json({ error: "La comunità non ha ancora un token. Crealo prima nelle Impostazioni." });
      }

      // Get coordinator's custodial wallet to sign burn operations
      const coordinatorWallet = await storage.getDefaultWallet(user.id);
      if (!coordinatorWallet) {
        return res.status(400).json({ error: "Wallet del coordinatore non trovato" });
      }

      // Determine whose tokens to burn (coordinator's own or a target user's)
      let burnFromUser = user;
      if (targetUserId) {
        const targetUser = await storage.getUser(targetUserId);
        if (!targetUser || targetUser.communityId !== user.communityId) {
          return res.status(400).json({ error: "Utente non trovato o non appartiene alla comunità" });
        }
        burnFromUser = targetUser;
      }

      // Decrypt the coordinator's private key to sign burn operations
      const privateKey = blockchain.decryptPrivateKey(coordinatorWallet.encryptedPrivateKey);
      const signerWallet = new ethers.Wallet(privateKey);

      // Create pending transaction first
      const pendingTransaction = await storage.createTransaction({
        type: "burn",
        amount,
        description: description || "Burn token",
        status: "pending",
        fromUserId: burnFromUser.id,
        communityId: user.communityId,
      });
      
      // Emit WebSocket notification for pending transaction
      emitTransactionUpdate(burnFromUser.id, {
        transaction: { ...pendingTransaction, fromUserName: burnFromUser.name },
        type: "created",
      });
      if (user.communityId) {
        emitTransactionToCommunity(user.communityId, {
          transaction: { ...pendingTransaction, fromUserName: burnFromUser.name },
          type: "created",
        });
      }

      // Get token decimals for proper amount conversion
      const tokenConfig = await blockchain.getTokenConfig(community.tokenAddress);
      const amountWei = blockchain.parseAmount(amount, tokenConfig.decimals);

      // Set deadline to 1 hour from now
      const deadline = Math.floor(Date.now() / 1000) + 3600;

      // Sign the burn authorization using coordinator's custodial wallet
      const signature = await blockchain.signBurnAuthorization(
        signerWallet,
        burnFromUser.ethAddress,
        amountWei,
        deadline,
        community.tokenAddress
      );

      // Execute burnWithSig using the platform admin wallet
      const burnResult = await blockchain.burnWithSignature(
        signerWallet.address,
        burnFromUser.ethAddress,
        amount,
        deadline,
        signature.v,
        signature.r,
        signature.s,
        community.tokenAddress
      );

      // Update local balance and update transaction status to completed
      await storage.updateUserBalance(burnFromUser.id, -amount);
      const completedTransaction = await storage.updateTransactionStatus(
        pendingTransaction.id,
        "completed",
        burnResult.tx
      );
      
      // Emit WebSocket notifications for completed transaction
      emitTransactionUpdate(burnFromUser.id, {
        transaction: { ...completedTransaction!, fromUserName: burnFromUser.name },
        type: "completed",
      });
      emitBalanceUpdate(burnFromUser.id, (await storage.getUser(burnFromUser.id))?.tokenBalance || 0);
      if (user.communityId) {
        emitTransactionToCommunity(user.communityId, {
          transaction: { ...completedTransaction!, fromUserName: burnFromUser.name },
          type: "completed",
        });
      }

      res.json({ success: true, burned: amount, txHash: burnResult.tx });
    } catch (error: any) {
      console.error("Burn error:", error);
      res.status(500).json({ error: `Errore nel burn: ${error.message || 'Operazione fallita'}` });
    }
  });

  // Transfer tokens between users (uses permit + transferFrom)
  app.post("/api/tokens/transfer", requireAuth, async (req, res) => {
    try {
      const sender = await storage.getUser(req.session.userId!);
      if (!sender) {
        return res.status(401).json({ error: "Non autenticato" });
      }

      const { recipientId, amount, note } = req.body;
      if (!recipientId || !amount || amount <= 0) {
        return res.status(400).json({ error: "Dati non validi" });
      }

      // Check sender has enough balance
      if (sender.tokenBalance < amount) {
        return res.status(400).json({ error: "Saldo insufficiente" });
      }

      // Get recipient
      const recipient = await storage.getUser(recipientId);
      if (!recipient) {
        return res.status(400).json({ error: "Destinatario non trovato" });
      }

      // For now, only allow transfers within the same community
      if (sender.communityId && recipient.communityId && sender.communityId !== recipient.communityId) {
        return res.status(400).json({ error: "Trasferimento tra comunità diverse non permesso" });
      }

      // Get community token address
      const communityId = sender.communityId || recipient.communityId;
      if (!communityId) {
        return res.status(400).json({ error: "Nessuna comunità associata" });
      }
      const community = await storage.getCommunity(communityId);
      if (!community?.tokenAddress) {
        return res.status(400).json({ error: "La comunità non ha ancora un token" });
      }

      // Get sender's custodial wallet
      const senderWallet = await storage.getDefaultWallet(sender.id);
      if (!senderWallet) {
        return res.status(400).json({ error: "Wallet del mittente non trovato" });
      }

      // Decrypt sender's private key to sign the permit
      const privateKey = blockchain.decryptPrivateKey(senderWallet.encryptedPrivateKey);
      const signerWallet = new ethers.Wallet(privateKey);

      // Get admin wallet address for the spender
      const adminAddress = blockchain.getAdminWallet().address;

      // Get token decimals for proper amount conversion
      const tokenConfig = await blockchain.getTokenConfig(community.tokenAddress);
      const amountWei = blockchain.parseAmount(amount, tokenConfig.decimals);

      // Set deadline to 1 hour from now
      const deadline = Math.floor(Date.now() / 1000) + 3600;

      // Sign permit for the admin wallet to spend sender's tokens
      const permitSig = await blockchain.signPermit(
        signerWallet,
        adminAddress,
        amountWei,
        deadline,
        community.tokenAddress
      );

      // Execute permitTransfer using platform admin wallet
      const transferResult = await blockchain.permitTransfer(
        signerWallet.address,
        adminAddress,
        amountWei.toString(),
        deadline,
        permitSig.v,
        permitSig.r,
        permitSig.s,
        recipient.ethAddress,
        community.tokenAddress
      );

      // Update local balances
      await storage.updateUserBalance(sender.id, -amount);
      await storage.updateUserBalance(recipient.id, amount);

      // Create transaction record with blockchain tx hash
      const transaction = await storage.createTransaction({
        type: "send",
        amount,
        description: note || `Trasferimento a ${recipient.name}`,
        status: "completed",
        fromUserId: sender.id,
        toUserId: recipient.id,
        communityId,
        txHash: transferResult.transferTx,
      });
      
      // Emit WebSocket notifications to both sender and recipient
      emitTransactionUpdate(sender.id, {
        transaction: { ...transaction, fromUserName: sender.name, toUserName: recipient.name },
        type: "completed",
      });
      emitTransactionUpdate(recipient.id, {
        transaction: { ...transaction, fromUserName: sender.name, toUserName: recipient.name },
        type: "completed",
      });
      emitBalanceUpdate(sender.id, (await storage.getUser(sender.id))?.tokenBalance || 0);
      emitBalanceUpdate(recipient.id, (await storage.getUser(recipient.id))?.tokenBalance || 0);
      if (communityId) {
        emitTransactionToCommunity(communityId, {
          transaction: { ...transaction, fromUserName: sender.name, toUserName: recipient.name },
          type: "completed",
        });
      }

      res.json({ 
        success: true, 
        transferred: amount, 
        txHash: transferResult.transferTx,
        to: recipient.name
      });
    } catch (error: any) {
      console.error("Transfer error:", error);
      res.status(500).json({ error: `Errore nel trasferimento: ${error.message || 'Operazione fallita'}` });
    }
  });

  app.get("/api/community/balances", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      console.log("[DEBUG] /api/community/balances - user:", user?.id, user?.role, user?.communityId);
      if (!user || user.role !== "coordinator") {
        return res.status(403).json({ error: "Solo i coordinatori possono vedere i saldi" });
      }
      if (!user.communityId) {
        return res.status(400).json({ error: "Nessuna comunità associata" });
      }

      const balances = await storage.getCommunityBalances(user.communityId);
      console.log("[DEBUG] /api/community/balances - balances count:", balances.length, balances);
      res.json(balances);
    } catch (error) {
      console.error("Get balances error:", error);
      res.status(500).json({ error: "Errore nel recupero saldi" });
    }
  });

  app.post("/api/tokens/burn-all", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== "coordinator") {
        return res.status(403).json({ error: "Solo i coordinatori possono eseguire il burn" });
      }
      if (!user.communityId) {
        return res.status(400).json({ error: "Nessuna comunità associata" });
      }

      const community = await storage.getCommunity(user.communityId);
      if (!community?.tokenAddress) {
        return res.status(400).json({ error: "La comunità non ha ancora un token. Crealo prima nelle Impostazioni." });
      }

      const coordinatorWallet = await storage.getDefaultWallet(user.id);
      if (!coordinatorWallet) {
        return res.status(400).json({ error: "Wallet del coordinatore non trovato" });
      }

      const privateKey = blockchain.decryptPrivateKey(coordinatorWallet.encryptedPrivateKey);
      const signerWallet = new ethers.Wallet(privateKey);
      const tokenConfig = await blockchain.getTokenConfig(community.tokenAddress);

      const balances = await storage.getCommunityBalances(user.communityId);
      let totalBurned = 0;
      let usersAffected = 0;
      const results: { name: string; amount: number; txHash: string }[] = [];
      const errors: { name: string; error: string }[] = [];

      for (const balance of balances) {
        if (balance.tokenBalance > 0) {
          try {
            // Create pending transaction first
            const pendingTransaction = await storage.createTransaction({
              type: "burn",
              amount: balance.tokenBalance,
              fromUserId: balance.id,
              toUserId: user.id,
              communityId: user.communityId,
              status: "pending",
              description: `Burn completo - ${balance.name}`,
            });
            
            // Emit WebSocket notification for pending transaction
            emitTransactionUpdate(balance.id, {
              transaction: { ...pendingTransaction, fromUserName: balance.name },
              type: "created",
            });
            if (user.communityId) {
              emitTransactionToCommunity(user.communityId, {
                transaction: { ...pendingTransaction, fromUserName: balance.name },
                type: "created",
              });
            }

            const amountWei = blockchain.parseAmount(balance.tokenBalance, tokenConfig.decimals);
            const deadline = Math.floor(Date.now() / 1000) + 3600;

            const signature = await blockchain.signBurnAuthorization(
              signerWallet,
              balance.ethAddress,
              amountWei,
              deadline,
              community.tokenAddress
            );

            const burnResult = await blockchain.burnWithSignature(
              signerWallet.address,
              balance.ethAddress,
              balance.tokenBalance,
              deadline,
              signature.v,
              signature.r,
              signature.s,
              community.tokenAddress
            );

            if (balance.role !== "provider") {
              await storage.updateUserBalance(balance.id, -balance.tokenBalance);
            }

            // Update transaction status to completed
            const completedTransaction = await storage.updateTransactionStatus(
              pendingTransaction.id,
              "completed",
              burnResult.tx
            );
            
            // Emit WebSocket notifications for completed transaction
            emitTransactionUpdate(balance.id, {
              transaction: { ...completedTransaction!, fromUserName: balance.name },
              type: "completed",
            });
            emitBalanceUpdate(balance.id, (await storage.getUser(balance.id))?.tokenBalance || 0);
            if (user.communityId) {
              emitTransactionToCommunity(user.communityId, {
                transaction: { ...completedTransaction!, fromUserName: balance.name },
                type: "completed",
              });
            }

            results.push({ name: balance.name, amount: balance.tokenBalance, txHash: burnResult.tx });
            totalBurned += balance.tokenBalance;
            usersAffected++;
          } catch (burnError: any) {
            console.error(`Burn error for ${balance.name}:`, burnError);
            errors.push({ name: balance.name, error: burnError.message || 'Burn fallito' });
          }
        }
      }

      res.json({ totalBurned, usersAffected, results, errors });
    } catch (error) {
      console.error("Burn all error:", error);
      res.status(500).json({ error: "Errore nel burn totale" });
    }
  });

  app.post("/api/users/invite", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== "coordinator") {
        return res.status(403).json({ error: "Solo i coordinatori possono invitare utenti" });
      }
      if (!user.communityId) {
        return res.status(400).json({ error: "Nessuna comunità associata" });
      }

      const { email } = req.body;
      if (!email || typeof email !== "string") {
        return res.status(400).json({ error: "Email non valida" });
      }

      await storage.createUserInvite(email, user.communityId);
      res.json({ success: true, message: `Invito inviato a ${email}` });
    } catch (error) {
      console.error("Invite error:", error);
      res.status(500).json({ error: "Errore nell'invio dell'invito" });
    }
  });

  app.get("/api/provider/balances", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== "provider") {
        return res.status(403).json({ error: "Solo i provider possono accedere a questa risorsa" });
      }
      const balances = await storage.getProviderBalancesByCommunity(user.id);
      res.json(balances);
    } catch (error) {
      console.error("Get provider balances error:", error);
      res.status(500).json({ error: "Errore nel recupero saldi" });
    }
  });

  app.get("/api/communities", requireAuth, async (req, res) => {
    try {
      const communities = await storage.getAllCommunities();
      res.json(communities);
    } catch (error) {
      console.error("Get communities error:", error);
      res.status(500).json({ error: "Errore nel recupero comunità" });
    }
  });

  app.get("/api/products", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(401).json({ error: "Utente non trovato" });
      }
      
      if (!user.communityId) {
        return res.json([]);
      }
      
      const products = await storage.getProductsForCommunity(user.communityId);
      res.json(products);
    } catch (error) {
      console.error("Get products error:", error);
      res.status(500).json({ error: "Errore nel recupero prodotti" });
    }
  });

  app.get("/api/products/mine", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== "provider") {
        return res.status(403).json({ error: "Solo i provider possono vedere i propri prodotti" });
      }
      const products = await storage.getProductsByProvider(user.id);
      
      const mappedProducts = await Promise.all(products.map(async p => {
        const communities = await storage.getProductCommunities(p.id);
        return {
          ...p,
          available: p.isAvailable === 1,
          providerName: user.name,
          communityIds: communities.map(c => c.communityId),
        };
      }));
      
      res.json(mappedProducts);
    } catch (error) {
      console.error("Get my products error:", error);
      res.status(500).json({ error: "Errore nel recupero prodotti" });
    }
  });

  app.post("/api/products", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== "provider") {
        return res.status(403).json({ error: "Solo i provider possono creare prodotti" });
      }

      const communityIds: string[] = req.body.communityIds || [];
      if (communityIds.length === 0) {
        return res.status(400).json({ error: "Seleziona almeno una comunità per il prodotto" });
      }
      
      const productData = insertProductSchema.parse({
        name: req.body.name,
        description: req.body.description,
        price: req.body.price,
        category: req.body.category,
        imageUrl: req.body.imageUrl || null,
        providerId: user.id,
        communityId: communityIds[0] || null,
        isAvailable: req.body.available === true || req.body.available === 1 ? 1 : 0,
      });

      const product = await storage.createProduct(productData);
      
      if (communityIds.length > 0) {
        await storage.setProductCommunities(product.id, communityIds);
      }
      
      const communities = await storage.getProductCommunities(product.id);
      res.json({ ...product, communityIds: communities.map(c => c.communityId) });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Create product error:", error);
      res.status(500).json({ error: "Errore nella creazione prodotto" });
    }
  });

  app.put("/api/products/:id", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      const product = await storage.getProduct(req.params.id);
      
      if (!product) {
        return res.status(404).json({ error: "Prodotto non trovato" });
      }
      if (!user || product.providerId !== user.id) {
        return res.status(403).json({ error: "Non autorizzato" });
      }

      const communityIds: string[] = req.body.communityIds || [];
      if (communityIds.length === 0) {
        return res.status(400).json({ error: "Seleziona almeno una comunità per il prodotto" });
      }

      const updateData = {
        name: req.body.name,
        description: req.body.description,
        price: req.body.price,
        category: req.body.category,
        imageUrl: req.body.imageUrl || null,
        communityId: communityIds[0] || null,
        isAvailable: req.body.available === true || req.body.available === 1 ? 1 : 0,
      };

      const updatedProduct = await storage.updateProduct(req.params.id, updateData);
      
      await storage.setProductCommunities(req.params.id, communityIds);
      const communities = await storage.getProductCommunities(req.params.id);
      
      res.json({
        ...updatedProduct,
        available: updatedProduct.isAvailable === 1,
        providerName: user.name,
        communityIds: communities.map(c => c.communityId),
      });
    } catch (error) {
      console.error("Update product error:", error);
      res.status(500).json({ error: "Errore nella modifica prodotto" });
    }
  });

  app.delete("/api/products/:id", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      const product = await storage.getProduct(req.params.id);
      
      if (!product) {
        return res.status(404).json({ error: "Prodotto non trovato" });
      }
      if (!user || product.providerId !== user.id) {
        return res.status(403).json({ error: "Non autorizzato" });
      }

      await storage.deleteProduct(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete product error:", error);
      res.status(500).json({ error: "Errore nell'eliminazione prodotto" });
    }
  });

  app.post("/api/purchase", requireAuth, async (req, res) => {
    try {
      const buyer = await storage.getUser(req.session.userId!);
      if (!buyer) {
        return res.status(404).json({ error: "Utente non trovato" });
      }

      const { productId } = purchaseSchema.parse(req.body);
      const product = await storage.getProduct(productId);
      
      if (!product) {
        return res.status(404).json({ error: "Prodotto non trovato" });
      }
      if (buyer.tokenBalance < product.price) {
        return res.status(400).json({ error: "Saldo insufficiente" });
      }

      // Get provider (seller)
      const provider = await storage.getUser(product.providerId);
      if (!provider) {
        return res.status(400).json({ error: "Provider non trovato" });
      }

      // Validate buyer has a community
      if (!buyer.communityId) {
        return res.status(400).json({ error: "Utente non associato a una comunità" });
      }
      
      // Check if product is available in buyer's community (using product_communities join table)
      const isAvailableInCommunity = await storage.isProductAvailableInCommunity(product.id, buyer.communityId);
      if (!isAvailableInCommunity) {
        return res.status(400).json({ error: "Questo prodotto non è disponibile nella tua comunità" });
      }

      // Get community token address (use buyer's community since product is available there)
      const communityId = buyer.communityId;
      const community = await storage.getCommunity(communityId);
      if (!community?.tokenAddress) {
        return res.status(400).json({ error: "La comunità non ha ancora un token" });
      }

      // Get buyer's custodial wallet
      const buyerWallet = await storage.getDefaultWallet(buyer.id);
      if (!buyerWallet) {
        return res.status(400).json({ error: "Wallet dell'acquirente non trovato" });
      }

      // Get provider's wallet to receive tokens
      const providerWallet = await storage.getDefaultWallet(provider.id);
      if (!providerWallet) {
        return res.status(400).json({ error: "Wallet del venditore non trovato" });
      }

      // Decrypt buyer's private key to sign the permit
      const privateKey = blockchain.decryptPrivateKey(buyerWallet.encryptedPrivateKey);
      const signerWallet = new ethers.Wallet(privateKey);

      // Get admin wallet address for the spender
      const adminAddress = blockchain.getAdminWallet().address;

      // Create pending transaction first
      const pendingTransaction = await storage.createTransaction({
        type: "purchase",
        amount: product.price,
        description: `Acquisto: ${product.name}`,
        status: "pending",
        fromUserId: buyer.id,
        toUserId: product.providerId,
        productId: product.id,
        communityId,
      });
      
      // Emit WebSocket notification for pending transaction
      emitTransactionUpdate(buyer.id, {
        transaction: { ...pendingTransaction, fromUserName: buyer.name, toUserName: provider.name },
        type: "created",
      });
      emitTransactionUpdate(provider.id, {
        transaction: { ...pendingTransaction, fromUserName: buyer.name, toUserName: provider.name },
        type: "created",
      });
      if (communityId) {
        emitTransactionToCommunity(communityId, {
          transaction: { ...pendingTransaction, fromUserName: buyer.name, toUserName: provider.name },
          type: "created",
        });
      }

      // Get token decimals for proper amount conversion
      const tokenConfig = await blockchain.getTokenConfig(community.tokenAddress);
      const amountWei = blockchain.parseAmount(product.price, tokenConfig.decimals);

      // Set deadline to 1 hour from now
      const deadline = Math.floor(Date.now() / 1000) + 3600;

      // Sign permit for the admin wallet to spend buyer's tokens
      const permitSig = await blockchain.signPermit(
        signerWallet,
        adminAddress,
        amountWei,
        deadline,
        community.tokenAddress
      );

      // Execute permitTransfer using platform admin wallet
      const transferResult = await blockchain.permitTransfer(
        signerWallet.address,
        adminAddress,
        amountWei.toString(),
        deadline,
        permitSig.v,
        permitSig.r,
        permitSig.s,
        providerWallet.address, // Transfer to provider's wallet
        community.tokenAddress
      );

      // Update local balances
      await storage.updateUserBalance(buyer.id, -product.price);
      await storage.updateUserBalance(provider.id, product.price);

      // Update transaction status to completed
      const completedTransaction = await storage.updateTransactionStatus(
        pendingTransaction.id,
        "completed",
        transferResult.transferTx
      );
      
      // Emit WebSocket notifications for completed transaction
      emitTransactionUpdate(buyer.id, {
        transaction: { ...completedTransaction!, fromUserName: buyer.name, toUserName: provider.name },
        type: "completed",
      });
      emitTransactionUpdate(provider.id, {
        transaction: { ...completedTransaction!, fromUserName: buyer.name, toUserName: provider.name },
        type: "completed",
      });
      emitBalanceUpdate(buyer.id, (await storage.getUser(buyer.id))?.tokenBalance || 0);
      emitBalanceUpdate(provider.id, (await storage.getUser(provider.id))?.tokenBalance || 0);
      if (communityId) {
        emitTransactionToCommunity(communityId, {
          transaction: { ...completedTransaction!, fromUserName: buyer.name, toUserName: provider.name },
          type: "completed",
        });
      }

      const updatedUser = await storage.getUser(buyer.id);
      res.json({ 
        success: true, 
        newBalance: updatedUser?.tokenBalance,
        product: product.name,
        txHash: transferResult.transferTx
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Purchase error:", error);
      res.status(500).json({ error: `Errore nell'acquisto: ${error.message || 'Operazione fallita'}` });
    }
  });

  app.get("/api/transactions", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ error: "Utente non trovato" });
      }
      const transactions = await storage.getTransactionsByUserWithNames(user.id);
      res.json(transactions);
    } catch (error) {
      console.error("Get transactions error:", error);
      res.status(500).json({ error: "Errore nel recupero transazioni" });
    }
  });

  app.get("/api/transactions/community", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user?.communityId || user.role !== "coordinator") {
        return res.status(403).json({ error: "Non autorizzato" });
      }
      const transactions = await storage.getTransactionsByCommunity(user.communityId);
      res.json(transactions);
    } catch (error) {
      console.error("Get community transactions error:", error);
      res.status(500).json({ error: "Errore nel recupero transazioni" });
    }
  });

  app.get("/api/wallets", requireAuth, async (req, res) => {
    try {
      // Get default wallet first, fall back to any wallet
      let wallet = await storage.getDefaultWallet(req.session.userId!);
      if (!wallet) {
        const allWallets = await storage.getWalletsByUser(req.session.userId!);
        wallet = allWallets[0];
      }
      
      if (!wallet) {
        return res.json([]);
      }
      
      // Return single wallet as array for backward compatibility
      res.json([{
        id: wallet.id,
        label: wallet.label,
        address: wallet.address,
        walletType: wallet.walletType,
        isDefault: wallet.isDefault === 1,
        createdAt: wallet.createdAt,
      }]);
    } catch (error) {
      console.error("Get wallets error:", error);
      res.status(500).json({ error: "Errore nel recupero wallet" });
    }
  });

  app.post("/api/wallets/generate", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(401).json({ error: "Utente non trovato" });
      }

      const { label, walletType } = req.body;
      if (!label) {
        return res.status(400).json({ error: "Label richiesta" });
      }

      const allowedTypes: Record<string, string[]> = {
        coordinator: ["coordinator", "user"],
        provider: ["user"],
        user: ["user"],
      };
      const validType = allowedTypes[user.role]?.includes(walletType) ? walletType : "user";

      const { address, privateKey } = blockchain.generateNewWallet();
      const encryptedPrivateKey = blockchain.encryptPrivateKey(privateKey);

      const wallet = await storage.createWallet({
        userId: req.session.userId!,
        label,
        address,
        encryptedPrivateKey,
        walletType: validType,
        isDefault: 0,
      });

      res.json({
        id: wallet.id,
        label: wallet.label,
        address: wallet.address,
        walletType: wallet.walletType,
        isDefault: wallet.isDefault === 1,
        createdAt: wallet.createdAt,
      });
    } catch (error) {
      console.error("Generate wallet error:", error);
      res.status(500).json({ error: "Errore nella generazione wallet" });
    }
  });

  app.post("/api/wallets/import", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(401).json({ error: "Utente non trovato" });
      }

      const { label, privateKey, walletType } = req.body;
      if (!label || !privateKey) {
        return res.status(400).json({ error: "Label e chiave privata richieste" });
      }

      const allowedTypes: Record<string, string[]> = {
        coordinator: ["coordinator", "user"],
        provider: ["user"],
        user: ["user"],
      };
      const validType = allowedTypes[user.role]?.includes(walletType) ? walletType : "user";

      const walletInstance = blockchain.getWalletFromPrivateKey(privateKey);
      const address = walletInstance.address;
      const encryptedPrivateKey = blockchain.encryptPrivateKey(privateKey);

      const wallet = await storage.createWallet({
        userId: req.session.userId!,
        label,
        address,
        encryptedPrivateKey,
        walletType: validType,
        isDefault: 0,
      });

      res.json({
        id: wallet.id,
        label: wallet.label,
        address: wallet.address,
        walletType: wallet.walletType,
        isDefault: wallet.isDefault === 1,
        createdAt: wallet.createdAt,
      });
    } catch (error) {
      console.error("Import wallet error:", error);
      res.status(500).json({ error: "Errore nell'importazione wallet" });
    }
  });

  app.post("/api/wallets/:id/set-default", requireAuth, async (req, res) => {
    try {
      const wallet = await storage.getWallet(req.params.id);
      if (!wallet || wallet.userId !== req.session.userId) {
        return res.status(404).json({ error: "Wallet non trovato" });
      }

      await storage.setDefaultWallet(req.session.userId!, req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Set default wallet error:", error);
      res.status(500).json({ error: "Errore nell'impostazione wallet predefinito" });
    }
  });

  app.post("/api/wallets/:id/export-keystore", requireAuth, async (req, res) => {
    try {
      const wallet = await storage.getWallet(req.params.id);
      if (!wallet || wallet.userId !== req.session.userId) {
        return res.status(404).json({ error: "Wallet non trovato" });
      }

      const { password, keystorePassword } = req.body;
      if (!password || !keystorePassword) {
        return res.status(400).json({ error: "Password account e password keystore richieste" });
      }

      if (keystorePassword.length < 8) {
        return res.status(400).json({ error: "La password del keystore deve essere almeno 8 caratteri" });
      }

      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(401).json({ error: "Utente non trovato" });
      }

      const bcrypt = await import("bcryptjs");
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: "Password account non valida" });
      }

      const privateKey = blockchain.decryptPrivateKey(wallet.encryptedPrivateKey);
      const walletInstance = blockchain.getWalletFromPrivateKey(privateKey);
      
      const keystore = await walletInstance.encrypt(keystorePassword);
      
      res.json({ 
        keystore: JSON.parse(keystore),
        address: wallet.address,
        label: wallet.label 
      });
    } catch (error) {
      console.error("Export keystore error:", error);
      res.status(500).json({ error: "Errore nell'esportazione del keystore" });
    }
  });

  app.delete("/api/wallets/:id", requireAuth, async (req, res) => {
    try {
      const wallet = await storage.getWallet(req.params.id);
      if (!wallet || wallet.userId !== req.session.userId) {
        return res.status(404).json({ error: "Wallet non trovato" });
      }

      await storage.deleteWallet(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete wallet error:", error);
      res.status(500).json({ error: "Errore nell'eliminazione wallet" });
    }
  });

  app.get("/api/blockchain/config", requireAuth, async (req, res) => {
    try {
      const tokenAddress = req.query.token as string | undefined;
      const config = await blockchain.getTokenConfig(tokenAddress);
      res.json(config);
    } catch (error) {
      console.error("Get token config error:", error);
      res.status(500).json({ error: "Errore nel recupero configurazione token" });
    }
  });

  app.get("/api/blockchain/balance/:address", requireAuth, async (req, res) => {
    try {
      const tokenAddress = req.query.token as string | undefined;
      const balance = await blockchain.getBalance(req.params.address, tokenAddress);
      res.json({ address: req.params.address, balance });
    } catch (error) {
      console.error("Get balance error:", error);
      res.status(500).json({ error: "Errore nel recupero saldo" });
    }
  });

  app.get("/api/blockchain/admin-wallet", requireAuth, async (req, res) => {
    try {
      const wallet = blockchain.getAdminWallet();
      res.json({ address: wallet.address });
    } catch (error) {
      console.error("Get admin wallet error:", error);
      res.status(500).json({ error: "Errore nel recupero wallet admin" });
    }
  });

  app.post("/api/blockchain/mint", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== "coordinator") {
        return res.status(403).json({ error: "Solo i coordinatori possono mintare token" });
      }

      const { to, amount, tokenAddress } = req.body;
      if (!to || !amount) {
        return res.status(400).json({ error: "Indirizzo e importo richiesti" });
      }

      const result = await blockchain.mintTokens(to, amount, tokenAddress);
      res.json(result);
    } catch (error) {
      console.error("Mint error:", error);
      res.status(500).json({ error: "Errore nel minting" });
    }
  });

  app.post("/api/blockchain/mint-with-sig", requireAuth, async (req, res) => {
    try {
      const { signer, to, amount, deadline, v, r, s, tokenAddress } = req.body;
      if (!signer || !to || !amount || !deadline || v === undefined || !r || !s) {
        return res.status(400).json({ error: "Parametri mancanti" });
      }

      const deadlineNum = Number(deadline);
      const now = Math.floor(Date.now() / 1000);
      if (deadlineNum <= now) {
        return res.status(400).json({ error: "La firma è scaduta" });
      }
      if (deadlineNum > now + 3600) {
        return res.status(400).json({ error: "Deadline troppo lontana (max 1 ora)" });
      }

      const result = await blockchain.mintWithSignature(signer, to, amount, deadlineNum, v, r, s, tokenAddress);
      res.json(result);
    } catch (error) {
      console.error("Mint with sig error:", error);
      res.status(500).json({ error: "Errore nel minting con firma" });
    }
  });

  app.post("/api/blockchain/burn-with-sig", requireAuth, async (req, res) => {
    try {
      const { signer, from, amount, deadline, v, r, s, tokenAddress } = req.body;
      if (!signer || !from || !amount || !deadline || v === undefined || !r || !s) {
        return res.status(400).json({ error: "Parametri mancanti" });
      }

      const deadlineNum = Number(deadline);
      const now = Math.floor(Date.now() / 1000);
      if (deadlineNum <= now) {
        return res.status(400).json({ error: "La firma è scaduta" });
      }
      if (deadlineNum > now + 3600) {
        return res.status(400).json({ error: "Deadline troppo lontana (max 1 ora)" });
      }

      const result = await blockchain.burnWithSignature(signer, from, amount, deadlineNum, v, r, s, tokenAddress);
      res.json(result);
    } catch (error) {
      console.error("Burn with sig error:", error);
      res.status(500).json({ error: "Errore nel burn con firma" });
    }
  });

  app.post("/api/blockchain/sign-mint", requireAuth, async (req, res) => {
    try {
      const { walletId, to, amount, deadlineMinutes, tokenAddress } = req.body;
      if (!walletId || !to || !amount) {
        return res.status(400).json({ error: "Parametri mancanti" });
      }

      const walletData = await storage.getWallet(walletId);
      if (!walletData || walletData.userId !== req.session.userId) {
        return res.status(404).json({ error: "Wallet non trovato" });
      }

      const privateKey = blockchain.decryptPrivateKey(walletData.encryptedPrivateKey);
      const wallet = blockchain.getWalletFromPrivateKey(privateKey);
      
      const config = await blockchain.getTokenConfig(tokenAddress);
      const amountWei = blockchain.parseAmount(amount, config.decimals);
      const deadline = Math.floor(Date.now() / 1000) + ((deadlineMinutes || 30) * 60);

      const signature = await blockchain.signMintAuthorization(wallet, to, amountWei, deadline, tokenAddress);
      res.json({
        signer: wallet.address,
        to,
        amount,
        ...signature,
      });
    } catch (error) {
      console.error("Sign mint error:", error);
      res.status(500).json({ error: "Errore nella firma mint" });
    }
  });

  app.post("/api/blockchain/sign-burn", requireAuth, async (req, res) => {
    try {
      const { walletId, from, amount, deadlineMinutes, tokenAddress } = req.body;
      if (!walletId || !from || !amount) {
        return res.status(400).json({ error: "Parametri mancanti" });
      }

      const walletData = await storage.getWallet(walletId);
      if (!walletData || walletData.userId !== req.session.userId) {
        return res.status(404).json({ error: "Wallet non trovato" });
      }

      const privateKey = blockchain.decryptPrivateKey(walletData.encryptedPrivateKey);
      const wallet = blockchain.getWalletFromPrivateKey(privateKey);
      
      const config = await blockchain.getTokenConfig(tokenAddress);
      const amountWei = blockchain.parseAmount(amount, config.decimals);
      const deadline = Math.floor(Date.now() / 1000) + ((deadlineMinutes || 30) * 60);

      const signature = await blockchain.signBurnAuthorization(wallet, from, amountWei, deadline, tokenAddress);
      res.json({
        signer: wallet.address,
        from,
        amount,
        ...signature,
      });
    } catch (error) {
      console.error("Sign burn error:", error);
      res.status(500).json({ error: "Errore nella firma burn" });
    }
  });

  app.post("/api/blockchain/factory/create-token", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== "coordinator") {
        return res.status(403).json({ error: "Solo i coordinatori possono creare token" });
      }

      if (!user.communityId) {
        return res.status(400).json({ error: "Nessuna community associata" });
      }

      // Check if community already has a token
      const community = await storage.getCommunity(user.communityId);
      if (!community) {
        return res.status(404).json({ error: "Community non trovata" });
      }
      if (community.tokenAddress) {
        return res.status(400).json({ error: "La community ha già un token configurato" });
      }

      // Get the coordinator's wallet server-side for security
      const userWallets = await storage.getWalletsByUser(user.id);
      if (!userWallets || userWallets.length === 0) {
        return res.status(400).json({ error: "Nessun wallet associato al coordinatore" });
      }
      const coordinatorWallet = userWallets[0];

      // Get admin wallet server-side for security
      const adminWallet = blockchain.getAdminWallet();

      // Use community name as token name, ECT as symbol
      const result = await blockchain.createReteToken(
        community.name,
        "ECT",
        coordinatorWallet.address,
        adminWallet.address
      );
      
      // Save the token address to the community
      if (result.token) {
        await storage.updateCommunityTokenAddress(user.communityId, result.token);
      }

      res.json(result);
    } catch (error) {
      console.error("Create token error:", error);
      res.status(500).json({ error: "Errore nella creazione token" });
    }
  });

  app.get("/api/blockchain/factory/tokens", requireAuth, async (req, res) => {
    try {
      const factoryAddress = req.query.factoryAddress as string | undefined;
      const tokens = await blockchain.getAllTokens(factoryAddress);
      res.json({ tokens });
    } catch (error) {
      console.error("Get all tokens error:", error);
      res.status(500).json({ error: "Errore nel recupero token" });
    }
  });

  app.get("/api/blockchain/factory/tokens/:coordinator", requireAuth, async (req, res) => {
    try {
      const factoryAddress = req.query.factoryAddress as string | undefined;
      const tokens = await blockchain.getCoordinatorTokens(req.params.coordinator, factoryAddress);
      res.json({ coordinator: req.params.coordinator, tokens });
    } catch (error) {
      console.error("Get coordinator tokens error:", error);
      res.status(500).json({ error: "Errore nel recupero token coordinatore" });
    }
  });

  // Chain profile management endpoints
  app.get("/api/chain-profiles", requireAuth, async (req, res) => {
    try {
      const profiles = await storage.getActiveChainProfiles();
      // Return profiles without exposing encrypted admin keys
      const safeProfiles = profiles.map(p => ({
        id: p.id,
        name: p.name,
        chainId: p.chainId,
        rpcUrl: p.rpcUrl,
        explorerUrl: p.explorerUrl,
        factoryAddress: p.factoryAddress,
        isActive: p.isActive,
        createdAt: p.createdAt,
      }));
      res.json(safeProfiles);
    } catch (error) {
      console.error("Get chain profiles error:", error);
      res.status(500).json({ error: "Errore nel recupero chain profiles" });
    }
  });

  app.get("/api/chain-profiles/:id", requireAuth, async (req, res) => {
    try {
      const profile = await storage.getChainProfile(req.params.id);
      if (!profile) {
        return res.status(404).json({ error: "Chain profile non trovato" });
      }
      // Return profile without exposing encrypted admin key
      res.json({
        id: profile.id,
        name: profile.name,
        chainId: profile.chainId,
        rpcUrl: profile.rpcUrl,
        explorerUrl: profile.explorerUrl,
        factoryAddress: profile.factoryAddress,
        isActive: profile.isActive,
        createdAt: profile.createdAt,
      });
    } catch (error) {
      console.error("Get chain profile error:", error);
      res.status(500).json({ error: "Errore nel recupero chain profile" });
    }
  });

  // Switch community chain profile (coordinator only)
  app.post("/api/community/chain-profile", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== "coordinator") {
        return res.status(403).json({ error: "Solo i coordinatori possono cambiare chain" });
      }
      if (!user.communityId) {
        return res.status(400).json({ error: "Nessuna comunità associata" });
      }

      const { chainProfileId } = req.body;
      if (!chainProfileId) {
        return res.status(400).json({ error: "chainProfileId richiesto" });
      }

      const chainProfile = await storage.getChainProfile(chainProfileId);
      if (!chainProfile || !chainProfile.isActive) {
        return res.status(400).json({ error: "Chain profile non valido o non attivo" });
      }

      // Switch chain resets the token (user needs to create new token on new chain)
      const updated = await storage.setCommunityChainProfile(user.communityId, chainProfileId);
      if (!updated) {
        return res.status(500).json({ error: "Errore nell'aggiornamento community" });
      }

      res.json({ 
        success: true, 
        message: "Chain aggiornata. Ora puoi creare un nuovo token su questa chain.",
        community: updated,
        chainProfile: {
          id: chainProfile.id,
          name: chainProfile.name,
          chainId: chainProfile.chainId,
          explorerUrl: chainProfile.explorerUrl,
        }
      });
    } catch (error) {
      console.error("Switch chain error:", error);
      res.status(500).json({ error: "Errore nel cambio chain" });
    }
  });

  // Reset community token (coordinator only)
  app.post("/api/community/reset-token", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== "coordinator") {
        return res.status(403).json({ error: "Solo i coordinatori possono resettare il token" });
      }
      if (!user.communityId) {
        return res.status(400).json({ error: "Nessuna comunità associata" });
      }

      const community = await storage.getCommunity(user.communityId);
      if (!community?.tokenAddress) {
        return res.status(400).json({ error: "La comunità non ha un token da resettare" });
      }

      const updated = await storage.resetCommunityToken(user.communityId);
      if (!updated) {
        return res.status(500).json({ error: "Errore nel reset del token" });
      }

      res.json({ 
        success: true, 
        message: "Token resettato. Ora puoi creare un nuovo token.",
        community: updated
      });
    } catch (error) {
      console.error("Reset token error:", error);
      res.status(500).json({ error: "Errore nel reset del token" });
    }
  });

  // Get community chain info (for frontend)
  app.get("/api/community/chain-info", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== "coordinator") {
        return res.status(403).json({ error: "Solo i coordinatori" });
      }
      if (!user.communityId) {
        return res.status(400).json({ error: "Nessuna comunità associata" });
      }

      const community = await storage.getCommunity(user.communityId);
      if (!community) {
        return res.status(404).json({ error: "Comunità non trovata" });
      }

      let chainProfile = null;
      if (community.chainProfileId) {
        const profile = await storage.getChainProfile(community.chainProfileId);
        if (profile) {
          chainProfile = {
            id: profile.id,
            name: profile.name,
            chainId: profile.chainId,
            explorerUrl: profile.explorerUrl,
            factoryAddress: profile.factoryAddress,
          };
        }
      }

      res.json({
        communityId: community.id,
        communityName: community.name,
        tokenAddress: community.tokenAddress,
        chainProfile,
      });
    } catch (error) {
      console.error("Get chain info error:", error);
      res.status(500).json({ error: "Errore nel recupero info chain" });
    }
  });

  return httpServer;
}
