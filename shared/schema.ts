import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const userRoleEnum = pgEnum("user_role", ["coordinator", "provider", "user"]);
export const transactionTypeEnum = pgEnum("transaction_type", ["send", "receive", "purchase", "burn"]);
export const transactionStatusEnum = pgEnum("transaction_status", ["pending", "completed", "failed"]);
export const walletTypeEnum = pgEnum("wallet_type", ["admin", "coordinator", "user"]);

export const chainProfiles = pgTable("chain_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  chainId: integer("chain_id").notNull(),
  rpcUrl: text("rpc_url").notNull(),
  explorerUrl: text("explorer_url").notNull(),
  factoryAddress: text("factory_address").notNull(),
  adminEncryptedKey: text("admin_encrypted_key").notNull(),
  isActive: integer("is_active").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userInvites = pgTable("user_invites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull(),
  communityId: varchar("community_id").notNull().references(() => communities.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const communities = pgTable("communities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  tokenAddress: text("token_address"),
  chainProfileId: varchar("chain_profile_id").references(() => chainProfiles.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: userRoleEnum("role").notNull().default("user"),
  ethAddress: text("eth_address").notNull(),
  tokenBalance: integer("token_balance").notNull().default(0),
  communityId: varchar("community_id").references(() => communities.id),
});

export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  price: integer("price").notNull(),
  category: text("category").notNull(),
  imageUrl: text("image_url"),
  providerId: varchar("provider_id").references(() => users.id).notNull(),
  communityId: varchar("community_id").references(() => communities.id),
  isAvailable: integer("is_available").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: transactionTypeEnum("type").notNull(),
  amount: integer("amount").notNull(),
  description: text("description"),
  status: transactionStatusEnum("status").notNull().default("completed"),
  fromUserId: varchar("from_user_id").references(() => users.id),
  toUserId: varchar("to_user_id").references(() => users.id),
  productId: varchar("product_id").references(() => products.id),
  communityId: varchar("community_id").references(() => communities.id),
  txHash: text("tx_hash"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const wallets = pgTable("wallets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  label: text("label").notNull(),
  address: text("address").notNull(),
  encryptedPrivateKey: text("encrypted_private_key").notNull(),
  walletType: walletTypeEnum("wallet_type").notNull().default("user"),
  isDefault: integer("is_default").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const productCommunities = pgTable("product_communities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar("product_id").references(() => products.id, { onDelete: "cascade" }).notNull(),
  communityId: varchar("community_id").references(() => communities.id, { onDelete: "cascade" }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ one, many }) => ({
  community: one(communities, {
    fields: [users.communityId],
    references: [communities.id],
  }),
  products: many(products),
  sentTransactions: many(transactions, { relationName: "sender" }),
  receivedTransactions: many(transactions, { relationName: "receiver" }),
}));

export const communitiesRelations = relations(communities, ({ many }) => ({
  users: many(users),
  products: many(products),
  transactions: many(transactions),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  provider: one(users, {
    fields: [products.providerId],
    references: [users.id],
  }),
  community: one(communities, {
    fields: [products.communityId],
    references: [communities.id],
  }),
  productCommunities: many(productCommunities),
}));

export const productCommunitiesRelations = relations(productCommunities, ({ one }) => ({
  product: one(products, {
    fields: [productCommunities.productId],
    references: [products.id],
  }),
  community: one(communities, {
    fields: [productCommunities.communityId],
    references: [communities.id],
  }),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  fromUser: one(users, {
    fields: [transactions.fromUserId],
    references: [users.id],
    relationName: "sender",
  }),
  toUser: one(users, {
    fields: [transactions.toUserId],
    references: [users.id],
    relationName: "receiver",
  }),
  product: one(products, {
    fields: [transactions.productId],
    references: [products.id],
  }),
  community: one(communities, {
    fields: [transactions.communityId],
    references: [communities.id],
  }),
}));

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  ethAddress: true,
  tokenBalance: true,
});
export const insertCommunitySchema = createInsertSchema(communities).omit({
  id: true,
  createdAt: true,
});
export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
});
export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
});
export const insertWalletSchema = createInsertSchema(wallets).omit({
  id: true,
  createdAt: true,
});
export const insertProductCommunitySchema = createInsertSchema(productCommunities).omit({
  id: true,
  createdAt: true,
});
export const insertChainProfileSchema = createInsertSchema(chainProfiles).omit({
  id: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertCommunity = z.infer<typeof insertCommunitySchema>;
export type Community = typeof communities.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;
export type InsertWallet = z.infer<typeof insertWalletSchema>;
export type Wallet = typeof wallets.$inferSelect;
export type InsertProductCommunity = z.infer<typeof insertProductCommunitySchema>;
export type ProductCommunity = typeof productCommunities.$inferSelect;
export type InsertChainProfile = z.infer<typeof insertChainProfileSchema>;
export type ChainProfile = typeof chainProfiles.$inferSelect;
