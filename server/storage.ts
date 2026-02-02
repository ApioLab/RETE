import { eq, desc, and, sql } from "drizzle-orm";
import { db } from "./db";
import {
  users,
  communities,
  products,
  transactions,
  userInvites,
  wallets,
  productCommunities,
  chainProfiles,
  type User,
  type InsertUser,
  type Community,
  type InsertCommunity,
  type Product,
  type InsertProduct,
  type Transaction,
  type InsertTransaction,
  type Wallet,
  type InsertWallet,
  type ProductCommunity,
  type ChainProfile,
  type InsertChainProfile,
} from "@shared/schema";
import { randomBytes } from "crypto";

function generateEthAddress(): string {
  return "0x" + randomBytes(20).toString("hex");
}

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser, ethAddress?: string): Promise<User>;
  deleteUser(id: string): Promise<void>;
  updateUserBalance(userId: string, amount: number): Promise<User | undefined>;
  getUsersByCommunity(communityId: string): Promise<User[]>;
  checkUserInvite(email: string, communityId: string): Promise<boolean>;
  getInviteByEmail(email: string): Promise<{ communityId: string } | null>;
  createUserInvite(email: string, communityId: string): Promise<void>;
  deleteUserInvite(email: string, communityId: string): Promise<void>;
  getCommunityBalances(communityId: string): Promise<{ id: string; name: string; email: string; role: string; tokenBalance: number; ethAddress: string }[]>;
  burnAllCommunityTokens(communityId: string, coordinatorId: string): Promise<{ totalBurned: number; usersAffected: number }>;
  
  getCommunity(id: string): Promise<Community | undefined>;
  getAllCommunities(): Promise<Community[]>;
  createCommunity(community: InsertCommunity): Promise<Community>;
  updateCommunityTokenAddress(communityId: string, tokenAddress: string): Promise<Community | undefined>;
  getCommunityStats(communityId: string): Promise<{
    totalUsers: number;
    totalProviders: number;
    tokenCirculation: number;
    tokensBurned: number;
  }>;
  
  getProduct(id: string): Promise<Product | undefined>;
  getProductsByProvider(providerId: string): Promise<Product[]>;
  getProductsByCommunity(communityId: string): Promise<Product[]>;
  getAllAvailableProducts(userCommunityId: string | null): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, data: Partial<InsertProduct>): Promise<Product>;
  deleteProduct(id: string): Promise<void>;
  
  getTransaction(id: string): Promise<Transaction | undefined>;
  getTransactionsByUser(userId: string): Promise<Transaction[]>;
  getTransactionsByUserWithNames(userId: string): Promise<(Transaction & { fromUserName: string | null; toUserName: string | null })[]>;
  getTransactionsByCommunity(communityId: string): Promise<Transaction[]>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  updateTransactionStatus(id: string, status: "pending" | "completed" | "failed", txHash?: string): Promise<Transaction | undefined>;
  getProviderBalancesByCommunity(providerId: string): Promise<{ communityId: string; communityName: string; balance: number; salesCount: number }[]>;

  getWallet(id: string): Promise<Wallet | undefined>;
  getWalletsByUser(userId: string): Promise<Wallet[]>;
  getDefaultWallet(userId: string): Promise<Wallet | undefined>;
  createWallet(wallet: InsertWallet): Promise<Wallet>;
  setDefaultWallet(userId: string, walletId: string): Promise<void>;
  deleteWallet(id: string): Promise<void>;

  getProductCommunities(productId: string): Promise<ProductCommunity[]>;
  setProductCommunities(productId: string, communityIds: string[]): Promise<void>;
  getProductsForCommunity(communityId: string): Promise<Product[]>;
  isProductAvailableInCommunity(productId: string, communityId: string): Promise<boolean>;

  getChainProfile(id: string): Promise<ChainProfile | undefined>;
  getAllChainProfiles(): Promise<ChainProfile[]>;
  getActiveChainProfiles(): Promise<ChainProfile[]>;
  createChainProfile(profile: InsertChainProfile): Promise<ChainProfile>;
  updateChainProfile(id: string, data: Partial<InsertChainProfile>): Promise<ChainProfile | undefined>;
  deleteChainProfile(id: string): Promise<void>;
  setCommunityChainProfile(communityId: string, chainProfileId: string): Promise<Community | undefined>;
  resetCommunityToken(communityId: string): Promise<Community | undefined>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser, ethAddress?: string): Promise<User> {
    // Use provided real wallet address, or generate a placeholder if not provided
    const address = ethAddress || generateEthAddress();
    const [user] = await db
      .insert(users)
      .values({ ...insertUser, ethAddress: address, tokenBalance: 0 })
      .returning();
    return user;
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async updateUserBalance(userId: string, amount: number): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ tokenBalance: sql`${users.tokenBalance} + ${amount}` })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async getUsersByCommunity(communityId: string): Promise<User[]> {
    return db.select().from(users).where(eq(users.communityId, communityId));
  }

  async checkUserInvite(email: string, communityId: string): Promise<boolean> {
    const [invite] = await db.select().from(userInvites).where(and(eq(userInvites.email, email), eq(userInvites.communityId, communityId)));
    return !!invite;
  }

  async getInviteByEmail(email: string): Promise<{ communityId: string } | null> {
    const [invite] = await db.select().from(userInvites).where(eq(userInvites.email, email));
    return invite ? { communityId: invite.communityId } : null;
  }

  async createUserInvite(email: string, communityId: string): Promise<void> {
    await db.insert(userInvites).values({ email, communityId });
  }

  async deleteUserInvite(email: string, communityId: string): Promise<void> {
    await db.delete(userInvites).where(and(eq(userInvites.email, email), eq(userInvites.communityId, communityId)));
  }

  async getCommunity(id: string): Promise<Community | undefined> {
    const [community] = await db.select().from(communities).where(eq(communities.id, id));
    return community;
  }

  async getAllCommunities(): Promise<Community[]> {
    return db.select().from(communities);
  }

  async createCommunity(insertCommunity: InsertCommunity): Promise<Community> {
    const [community] = await db
      .insert(communities)
      .values(insertCommunity)
      .returning();
    return community;
  }

  async updateCommunityTokenAddress(communityId: string, tokenAddress: string): Promise<Community | undefined> {
    const [community] = await db
      .update(communities)
      .set({ tokenAddress })
      .where(eq(communities.id, communityId))
      .returning();
    return community;
  }

  async getCommunityStats(communityId: string): Promise<{
    totalUsers: number;
    totalProviders: number;
    tokenCirculation: number;
    tokensBurned: number;
  }> {
    const communityUsers = await db
      .select()
      .from(users)
      .where(eq(users.communityId, communityId));
    
    const totalUsers = communityUsers.filter((u: User) => u.role === "user").length;
    const totalProviders = communityUsers.filter((u: User) => u.role === "provider").length;
    const tokenCirculation = communityUsers.reduce((sum: number, u: User) => sum + u.tokenBalance, 0);
    
    const burnTransactions = await db
      .select()
      .from(transactions)
      .where(and(
        eq(transactions.communityId, communityId),
        eq(transactions.type, "burn")
      ));
    const tokensBurned = burnTransactions.reduce((sum: number, t: Transaction) => sum + t.amount, 0);
    
    return { totalUsers, totalProviders, tokenCirculation, tokensBurned };
  }

  async getProduct(id: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product;
  }

  async getProductsByProvider(providerId: string): Promise<Product[]> {
    return db
      .select()
      .from(products)
      .where(eq(products.providerId, providerId))
      .orderBy(desc(products.createdAt));
  }

  async getProductsByCommunity(communityId: string): Promise<Product[]> {
    return db
      .select()
      .from(products)
      .where(eq(products.communityId, communityId))
      .orderBy(desc(products.createdAt));
  }

  async getAllAvailableProducts(userCommunityId: string | null): Promise<Product[]> {
    const result = await db
      .select({
        id: products.id,
        name: products.name,
        description: products.description,
        price: products.price,
        category: products.category,
        imageUrl: products.imageUrl,
        providerId: products.providerId,
        communityId: products.communityId,
        isAvailable: products.isAvailable,
        createdAt: products.createdAt,
        providerName: users.name,
      })
      .from(products)
      .leftJoin(users, eq(products.providerId, users.id))
      .where(
        and(
          eq(products.isAvailable, 1),
          sql`(${products.communityId} IS NULL OR ${products.communityId} = ${userCommunityId})`
        )
      )
      .orderBy(desc(products.createdAt));
    return result;
  }

  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const [product] = await db
      .insert(products)
      .values(insertProduct)
      .returning();
    return product;
  }

  async updateProduct(id: string, data: Partial<InsertProduct>): Promise<Product> {
    const [product] = await db
      .update(products)
      .set(data)
      .where(eq(products.id, id))
      .returning();
    return product;
  }

  async deleteProduct(id: string): Promise<void> {
    await db.delete(products).where(eq(products.id, id));
  }

  async getTransaction(id: string): Promise<Transaction | undefined> {
    const [transaction] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, id));
    return transaction;
  }

  async getTransactionsByUser(userId: string): Promise<Transaction[]> {
    return db
      .select()
      .from(transactions)
      .where(
        sql`${transactions.fromUserId} = ${userId} OR ${transactions.toUserId} = ${userId}`
      )
      .orderBy(desc(transactions.createdAt));
  }

  async getTransactionsByUserWithNames(userId: string): Promise<(Transaction & { fromUserName: string | null; toUserName: string | null })[]> {
    const txs = await db
      .select()
      .from(transactions)
      .where(
        sql`${transactions.fromUserId} = ${userId} OR ${transactions.toUserId} = ${userId}`
      )
      .orderBy(desc(transactions.createdAt));

    const userIds = new Set<string>();
    txs.forEach(tx => {
      if (tx.fromUserId) userIds.add(tx.fromUserId);
      if (tx.toUserId) userIds.add(tx.toUserId);
    });

    const userNames = new Map<string, string>();
    if (userIds.size > 0) {
      const usersData = await db.select({ id: users.id, name: users.name }).from(users);
      usersData.forEach(u => userNames.set(u.id, u.name));
    }

    return txs.map(tx => ({
      ...tx,
      fromUserName: tx.fromUserId ? userNames.get(tx.fromUserId) || null : null,
      toUserName: tx.toUserId ? userNames.get(tx.toUserId) || null : null,
    }));
  }

  async getTransactionsByCommunity(communityId: string): Promise<Transaction[]> {
    return db
      .select()
      .from(transactions)
      .where(eq(transactions.communityId, communityId))
      .orderBy(desc(transactions.createdAt));
  }

  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    const [transaction] = await db
      .insert(transactions)
      .values(insertTransaction)
      .returning();
    return transaction;
  }

  async updateTransactionStatus(id: string, status: "pending" | "completed" | "failed", txHash?: string): Promise<Transaction | undefined> {
    const updateData: { status: "pending" | "completed" | "failed"; txHash?: string } = { status };
    if (txHash !== undefined) {
      updateData.txHash = txHash;
    }
    const [transaction] = await db
      .update(transactions)
      .set(updateData)
      .where(eq(transactions.id, id))
      .returning();
    return transaction;
  }

  async getCommunityBalances(communityId: string): Promise<{ id: string; name: string; email: string; role: string; tokenBalance: number; ethAddress: string }[]> {
    type BalanceRecord = { id: string; name: string; email: string; role: string; tokenBalance: number; ethAddress: string };
    
    const communityUsers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        tokenBalance: users.tokenBalance,
        ethAddress: users.ethAddress,
      })
      .from(users)
      .where(eq(users.communityId, communityId));
    
    const providersWithSales = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        ethAddress: users.ethAddress,
        amount: transactions.amount,
      })
      .from(transactions)
      .innerJoin(products, eq(transactions.productId, products.id))
      .innerJoin(users, eq(products.providerId, users.id))
      .where(
        and(
          eq(transactions.communityId, communityId),
          eq(transactions.type, "purchase")
        )
      );

    const providerBurns = await db
      .select({
        fromUserId: transactions.fromUserId,
        amount: transactions.amount,
      })
      .from(transactions)
      .innerJoin(users, eq(transactions.fromUserId, users.id))
      .where(
        and(
          eq(transactions.communityId, communityId),
          eq(transactions.type, "burn"),
          eq(users.role, "provider")
        )
      );

    const providerBalances = new Map<string, BalanceRecord>();
    for (const p of providersWithSales) {
      const existing = providerBalances.get(p.id);
      if (existing) {
        existing.tokenBalance += p.amount;
      } else {
        providerBalances.set(p.id, {
          id: p.id,
          name: p.name,
          email: p.email,
          role: p.role,
          tokenBalance: p.amount,
          ethAddress: p.ethAddress,
        });
      }
    }

    for (const burn of providerBurns) {
      if (burn.fromUserId) {
        const existing = providerBalances.get(burn.fromUserId);
        if (existing) {
          existing.tokenBalance -= burn.amount;
        }
      }
    }

    const allBalances: BalanceRecord[] = communityUsers.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      tokenBalance: u.tokenBalance,
      ethAddress: u.ethAddress,
    }));
    
    providerBalances.forEach((provider, providerId) => {
      if (!allBalances.find(u => u.id === providerId)) {
        allBalances.push(provider);
      }
    });

    return allBalances.filter(u => u.tokenBalance > 0);
  }

  async burnAllCommunityTokens(communityId: string, coordinatorId: string): Promise<{ totalBurned: number; usersAffected: number }> {
    const balances = await this.getCommunityBalances(communityId);
    let totalBurned = 0;
    let usersAffected = 0;

    for (const balance of balances) {
      if (balance.tokenBalance > 0) {
        if (balance.role !== "provider") {
          await db
            .update(users)
            .set({ tokenBalance: 0 })
            .where(eq(users.id, balance.id));
        }

        await db.insert(transactions).values({
          type: "burn",
          amount: balance.tokenBalance,
          fromUserId: balance.id,
          toUserId: coordinatorId,
          communityId,
          status: "completed",
          description: `Burn completo - ${balance.name}`,
        });

        totalBurned += balance.tokenBalance;
        usersAffected++;
      }
    }

    return { totalBurned, usersAffected };
  }

  async getProviderBalancesByCommunity(providerId: string): Promise<{ communityId: string; communityName: string; balance: number; salesCount: number }[]> {
    const purchaseTransactions = await db
      .select({
        transactionId: transactions.id,
        amount: transactions.amount,
        communityId: transactions.communityId,
        productProviderId: products.providerId,
      })
      .from(transactions)
      .innerJoin(products, eq(transactions.productId, products.id))
      .where(
        and(
          eq(transactions.type, "purchase"),
          eq(products.providerId, providerId)
        )
      );

    const burnTransactions = await db
      .select({
        amount: transactions.amount,
        communityId: transactions.communityId,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.type, "burn"),
          eq(transactions.fromUserId, providerId)
        )
      );

    const allCommunities = await this.getAllCommunities();
    const communityMap = new Map(allCommunities.map(c => [c.id, c.name]));

    const balanceMap = new Map<string, { balance: number; salesCount: number }>();

    for (const tx of purchaseTransactions) {
      if (tx.communityId) {
        const existing = balanceMap.get(tx.communityId) || { balance: 0, salesCount: 0 };
        existing.balance += tx.amount;
        existing.salesCount += 1;
        balanceMap.set(tx.communityId, existing);
      }
    }

    for (const burn of burnTransactions) {
      if (burn.communityId) {
        const existing = balanceMap.get(burn.communityId);
        if (existing) {
          existing.balance -= burn.amount;
        }
      }
    }

    return Array.from(balanceMap.entries())
      .filter(([_, data]) => data.balance > 0)
      .map(([communityId, data]) => ({
        communityId,
        communityName: communityMap.get(communityId) || "Comunità sconosciuta",
        balance: data.balance,
        salesCount: data.salesCount,
      }));
  }

  async getWallet(id: string): Promise<Wallet | undefined> {
    const [wallet] = await db.select().from(wallets).where(eq(wallets.id, id));
    return wallet;
  }

  async getWalletsByUser(userId: string): Promise<Wallet[]> {
    return db
      .select()
      .from(wallets)
      .where(eq(wallets.userId, userId))
      .orderBy(desc(wallets.createdAt));
  }

  async getDefaultWallet(userId: string): Promise<Wallet | undefined> {
    const [wallet] = await db
      .select()
      .from(wallets)
      .where(and(eq(wallets.userId, userId), eq(wallets.isDefault, 1)));
    return wallet;
  }

  async createWallet(insertWallet: InsertWallet): Promise<Wallet> {
    const existingWallets = await this.getWalletsByUser(insertWallet.userId);
    const isDefault = existingWallets.length === 0 ? 1 : (insertWallet.isDefault || 0);
    
    const [wallet] = await db
      .insert(wallets)
      .values({ ...insertWallet, isDefault })
      .returning();
    return wallet;
  }

  async setDefaultWallet(userId: string, walletId: string): Promise<void> {
    await db
      .update(wallets)
      .set({ isDefault: 0 })
      .where(eq(wallets.userId, userId));
    
    await db
      .update(wallets)
      .set({ isDefault: 1 })
      .where(and(eq(wallets.id, walletId), eq(wallets.userId, userId)));
  }

  async deleteWallet(id: string): Promise<void> {
    await db.delete(wallets).where(eq(wallets.id, id));
  }

  async getProductCommunities(productId: string): Promise<ProductCommunity[]> {
    return db
      .select()
      .from(productCommunities)
      .where(eq(productCommunities.productId, productId));
  }

  async setProductCommunities(productId: string, communityIds: string[]): Promise<void> {
    await db.delete(productCommunities).where(eq(productCommunities.productId, productId));
    
    if (communityIds.length > 0) {
      await db.insert(productCommunities).values(
        communityIds.map(communityId => ({
          productId,
          communityId,
        }))
      );
    }
  }

  async getProductsForCommunity(communityId: string): Promise<Product[]> {
    const result = await db
      .select({
        id: products.id,
        name: products.name,
        description: products.description,
        price: products.price,
        category: products.category,
        imageUrl: products.imageUrl,
        providerId: products.providerId,
        communityId: products.communityId,
        isAvailable: products.isAvailable,
        createdAt: products.createdAt,
      })
      .from(products)
      .innerJoin(productCommunities, eq(products.id, productCommunities.productId))
      .where(
        and(
          eq(productCommunities.communityId, communityId),
          eq(products.isAvailable, 1)
        )
      )
      .orderBy(desc(products.createdAt));
    return result;
  }

  async isProductAvailableInCommunity(productId: string, communityId: string): Promise<boolean> {
    const [pc] = await db
      .select()
      .from(productCommunities)
      .where(
        and(
          eq(productCommunities.productId, productId),
          eq(productCommunities.communityId, communityId)
        )
      );
    return !!pc;
  }

  async getChainProfile(id: string): Promise<ChainProfile | undefined> {
    const [profile] = await db.select().from(chainProfiles).where(eq(chainProfiles.id, id));
    return profile;
  }

  async getAllChainProfiles(): Promise<ChainProfile[]> {
    return db.select().from(chainProfiles).orderBy(chainProfiles.name);
  }

  async getActiveChainProfiles(): Promise<ChainProfile[]> {
    return db
      .select()
      .from(chainProfiles)
      .where(eq(chainProfiles.isActive, 1))
      .orderBy(chainProfiles.name);
  }

  async createChainProfile(profile: InsertChainProfile): Promise<ChainProfile> {
    const [created] = await db.insert(chainProfiles).values(profile).returning();
    return created;
  }

  async updateChainProfile(id: string, data: Partial<InsertChainProfile>): Promise<ChainProfile | undefined> {
    const [updated] = await db
      .update(chainProfiles)
      .set(data)
      .where(eq(chainProfiles.id, id))
      .returning();
    return updated;
  }

  async deleteChainProfile(id: string): Promise<void> {
    await db.delete(chainProfiles).where(eq(chainProfiles.id, id));
  }

  async setCommunityChainProfile(communityId: string, chainProfileId: string): Promise<Community | undefined> {
    const [updated] = await db
      .update(communities)
      .set({ chainProfileId, tokenAddress: null })
      .where(eq(communities.id, communityId))
      .returning();
    return updated;
  }

  async resetCommunityToken(communityId: string): Promise<Community | undefined> {
    const [updated] = await db
      .update(communities)
      .set({ tokenAddress: null })
      .where(eq(communities.id, communityId))
      .returning();
    return updated;
  }

  async seedChainProfiles(): Promise<void> {
    const existingProfiles = await this.getActiveChainProfiles();
    if (existingProfiles.length > 0) {
      console.log(`[storage] Chain profiles already exist (${existingProfiles.length}), skipping seed`);
      return;
    }

    const { encryptPrivateKey } = await import("./blockchain");
    const PRIVATE_KEY = process.env.PRIVATE_KEY;
    const RPC_URL = process.env.RPC_URL;
    const FACTORY_ADDRESS = process.env.FACTORY_ADDRESS;
    const CHAIN_ID = process.env.CHAIN_ID;

    if (!PRIVATE_KEY || !RPC_URL || !FACTORY_ADDRESS || !CHAIN_ID) {
      console.warn("[storage] Missing env vars for chain profile seed (PRIVATE_KEY, RPC_URL, FACTORY_ADDRESS, CHAIN_ID)");
      return;
    }

    const encryptedKey = encryptPrivateKey(PRIVATE_KEY);
    const chainId = parseInt(CHAIN_ID, 10);

    const defaultProfiles = [
      {
        name: "Sepolia Testnet",
        chainId: 11155111,
        rpcUrl: "https://sepolia.infura.io/v3/YOUR_KEY",
        explorerUrl: "https://sepolia.etherscan.io",
        factoryAddress: FACTORY_ADDRESS,
        adminEncryptedKey: encryptedKey,
        isActive: 1,
      },
    ];

    if (RPC_URL && chainId) {
      const existingIdx = defaultProfiles.findIndex(p => p.chainId === chainId);
      if (existingIdx >= 0) {
        defaultProfiles[existingIdx].rpcUrl = RPC_URL;
      } else {
        let name = "Custom Chain";
        let explorerUrl = "https://etherscan.io";
        if (chainId === 137) { name = "Polygon Mainnet"; explorerUrl = "https://polygonscan.com"; }
        else if (chainId === 80001) { name = "Polygon Mumbai"; explorerUrl = "https://mumbai.polygonscan.com"; }
        else if (chainId === 42161) { name = "Arbitrum One"; explorerUrl = "https://arbiscan.io"; }
        else if (chainId === 421614) { name = "Arbitrum Sepolia"; explorerUrl = "https://sepolia.arbiscan.io"; }

        defaultProfiles.push({
          name,
          chainId,
          rpcUrl: RPC_URL,
          explorerUrl,
          factoryAddress: FACTORY_ADDRESS,
          adminEncryptedKey: encryptedKey,
          isActive: 1,
        });
      }
    }

    for (const profile of defaultProfiles) {
      await this.createChainProfile(profile);
      console.log(`[storage] Created chain profile: ${profile.name} (chainId: ${profile.chainId})`);
    }
  }
}

export const storage = new DatabaseStorage();
