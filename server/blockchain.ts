import { ethers } from "ethers";
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

const {
  RPC_URL,
  PRIVATE_KEY,
  FACTORY_ADDRESS,
  TOKEN_ADDRESS,
  CHAIN_ID,
  WALLET_ENCRYPTION_KEY,
} = process.env;

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const SALT_LENGTH = 32;
const KEY_LENGTH = 32;

export interface ChainConfig {
  rpcUrl: string;
  chainId: number;
  factoryAddress: string;
  explorerUrl: string;
  adminPrivateKey: string;
}

const providerCache = new Map<string, ethers.JsonRpcProvider>();

export function getProviderForChain(rpcUrl: string): ethers.JsonRpcProvider {
  if (!providerCache.has(rpcUrl)) {
    providerCache.set(rpcUrl, new ethers.JsonRpcProvider(rpcUrl));
  }
  return providerCache.get(rpcUrl)!;
}

export function getAdminWalletForChain(config: ChainConfig): ethers.Wallet {
  const provider = getProviderForChain(config.rpcUrl);
  return new ethers.Wallet(config.adminPrivateKey, provider);
}

export function getWalletForChain(privateKey: string, rpcUrl: string): ethers.Wallet {
  const provider = getProviderForChain(rpcUrl);
  return new ethers.Wallet(privateKey, provider);
}

export function getEncryptionKey(): Buffer {
  if (!WALLET_ENCRYPTION_KEY) {
    throw new Error("WALLET_ENCRYPTION_KEY not configured");
  }
  const salt = scryptSync(WALLET_ENCRYPTION_KEY, "rete-wallet-salt", SALT_LENGTH);
  return scryptSync(WALLET_ENCRYPTION_KEY, salt, KEY_LENGTH);
}

export function encryptPrivateKey(privateKey: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(privateKey, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag();
  
  return iv.toString("hex") + ":" + authTag.toString("hex") + ":" + encrypted;
}

export function decryptPrivateKey(encryptedData: string): string {
  const key = getEncryptionKey();
  const parts = encryptedData.split(":");
  
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted data format");
  }
  
  const iv = Buffer.from(parts[0], "hex");
  const authTag = Buffer.from(parts[1], "hex");
  const encrypted = parts[2];
  
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  
  return decrypted;
}

export function getProvider(): ethers.JsonRpcProvider {
  if (!RPC_URL) {
    throw new Error("RPC_URL not configured");
  }
  return new ethers.JsonRpcProvider(RPC_URL);
}

export function getAdminWallet(): ethers.Wallet {
  if (!PRIVATE_KEY) {
    throw new Error("PRIVATE_KEY not configured");
  }
  return new ethers.Wallet(PRIVATE_KEY, getProvider());
}

export function getWalletFromPrivateKey(privateKey: string): ethers.Wallet {
  return new ethers.Wallet(privateKey, getProvider());
}

export function generateNewWallet(): { address: string; privateKey: string } {
  const wallet = ethers.Wallet.createRandom();
  return {
    address: wallet.address,
    privateKey: wallet.privateKey,
  };
}

export function getChainId(): number {
  return parseInt(CHAIN_ID || "11155111", 10);
}

export function getFactoryAddress(): string {
  if (!FACTORY_ADDRESS) {
    throw new Error("FACTORY_ADDRESS not configured");
  }
  return FACTORY_ADDRESS;
}

export function getTokenAddress(): string {
  if (!TOKEN_ADDRESS) {
    throw new Error("TOKEN_ADDRESS not configured");
  }
  return TOKEN_ADDRESS;
}

const reteTokenAbi = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function owner() view returns (address)",
  "function adminSpender() view returns (address)",
  "function mintPaused() view returns (bool)",
  "function nonces(address) view returns (uint256)",
  "function permit(address owner,address spender,uint256 value,uint256 deadline,uint8 v,bytes32 r,bytes32 s)",
  "function allowance(address,address) view returns (uint256)",
  "function approve(address,uint256) returns (bool)",
  "function transfer(address to, uint256 value) returns (bool)",
  "function transferFrom(address from,address to,uint256 value) returns (bool)",
  "function mint(address to, uint256 amount)",
  "function setMintPaused(bool paused)",
  "function burnFrom(address account,uint256 amount)",
  "function mintNonces(address) view returns (uint256)",
  "function mintWithSig(address signer,address to,uint256 amount,uint256 deadline,uint8 v,bytes32 r,bytes32 s)",
  "function burnNonces(address) view returns (uint256)",
  "function burnWithSig(address signer,address from,uint256 amount,uint256 deadline,uint8 v,bytes32 r,bytes32 s)",
  "function adminBurnEnabled() view returns (bool)",
  "function toggleAdminBurn(bool enabled)",
  "function adminBurn(address from, uint256 amount)",
  "function adminBatchBurn(address[] holders, uint256[] amounts)"
];

const factoryAbi = [
  "event ReteTokenCreated(address indexed token, address indexed coordinator, address indexed adminSpender, string name, string symbol)",
  "function createReteToken(string name_, string symbol_, address coordinatorOwner, address adminSpender_) returns (address)",
  "function getAllTokens() view returns (address[])",
  "function getCoordinatorTokens(address coordinator) view returns (address[])"
];

export function getTokenContractForChain(tokenAddress: string, config: ChainConfig): ethers.Contract {
  const wallet = getAdminWalletForChain(config);
  return new ethers.Contract(tokenAddress, reteTokenAbi, wallet);
}

export function getTokenContractReadonlyForChain(tokenAddress: string, rpcUrl: string): ethers.Contract {
  const provider = getProviderForChain(rpcUrl);
  return new ethers.Contract(tokenAddress, reteTokenAbi, provider);
}

export function getFactoryContractForChain(config: ChainConfig): ethers.Contract {
  const wallet = getAdminWalletForChain(config);
  return new ethers.Contract(config.factoryAddress, factoryAbi, wallet);
}

export async function getTokenConfigForChain(tokenAddress: string, rpcUrl: string, chainId: number) {
  const token = getTokenContractReadonlyForChain(tokenAddress, rpcUrl);
  
  const [name, symbol, decimals, totalSupply, owner, adminSpender, mintPaused] = await Promise.all([
    token.name(),
    token.symbol(),
    token.decimals(),
    token.totalSupply(),
    token.owner(),
    token.adminSpender(),
    token.mintPaused(),
  ]);
  
  let adminBurnEnabled = false;
  try {
    adminBurnEnabled = await token.adminBurnEnabled();
  } catch (e) {}
  
  return {
    token: tokenAddress,
    name,
    symbol,
    decimals: Number(decimals),
    totalSupply: totalSupply.toString(),
    owner,
    adminSpender,
    mintPaused: Boolean(mintPaused),
    adminBurnEnabled: Boolean(adminBurnEnabled),
    chainId,
  };
}

export async function createReteTokenForChain(
  name: string,
  symbol: string,
  coordinatorOwner: string,
  adminSpender: string,
  config: ChainConfig
) {
  const factory = getFactoryContractForChain(config);
  
  const tx = await factory.createReteToken(name, symbol, coordinatorOwner, adminSpender);
  const receipt = await tx.wait();
  
  let tokenCreated: string | null = null;
  for (const log of receipt.logs) {
    try {
      const parsed = factory.interface.parseLog(log);
      if (parsed?.name === "ReteTokenCreated") {
        tokenCreated = parsed.args.token;
        break;
      }
    } catch {}
  }
  
  return {
    tx: tx.hash,
    token: tokenCreated,
  };
}

export async function mintWithSignatureForChain(
  signer: string,
  to: string,
  amountHuman: string | number,
  deadline: number,
  v: number,
  r: string,
  s: string,
  tokenAddress: string,
  config: ChainConfig
) {
  const token = getTokenContractForChain(tokenAddress, config);
  const decimals = Number(await token.decimals());
  const amount = parseAmount(amountHuman, decimals);
  
  const tx = await token.mintWithSig(signer, to, amount, deadline, v, r, s);
  const receipt = await tx.wait();
  
  return {
    tx: tx.hash,
    block: receipt.blockNumber,
    to,
    amount: amount.toString(),
    signer,
    deadline,
  };
}

export async function burnWithSignatureForChain(
  signer: string,
  from: string,
  amountHuman: string | number,
  deadline: number,
  v: number,
  r: string,
  s: string,
  tokenAddress: string,
  config: ChainConfig
) {
  const token = getTokenContractForChain(tokenAddress, config);
  const decimals = Number(await token.decimals());
  const amount = parseAmount(amountHuman, decimals);
  
  const tx = await token.burnWithSig(signer, from, amount, deadline, v, r, s);
  const receipt = await tx.wait();
  
  return {
    action: "burn-with-sig",
    tx: tx.hash,
    block: receipt.blockNumber,
    signer,
    from,
    amount: amount.toString(),
    deadline,
  };
}

export async function permitTransferForChain(
  owner: string,
  spender: string,
  value: string,
  deadline: number,
  v: number,
  r: string,
  s: string,
  recipient: string,
  tokenAddress: string,
  config: ChainConfig
) {
  const token = getTokenContractForChain(tokenAddress, config);
  const wallet = getAdminWalletForChain(config);
  
  if (spender.toLowerCase() !== wallet.address.toLowerCase()) {
    throw new Error("Spender must be admin wallet");
  }
  
  const txPermit = await token.permit(owner, spender, value, deadline, v, r, s);
  const receiptPermit = await txPermit.wait();
  
  const allowance = await token.allowance(owner, wallet.address);
  if (allowance === BigInt(0)) {
    throw new Error("No allowance after permit");
  }
  
  const requested = BigInt(value);
  const sendAmount = requested <= allowance ? requested : allowance;
  
  const tx = await token.transferFrom(owner, recipient, sendAmount);
  const receipt = await tx.wait();
  const leftover = await token.allowance(owner, wallet.address);
  
  return {
    action: "permit-transfer",
    sent: sendAmount.toString(),
    allowanceAfter: leftover.toString(),
    permitTx: txPermit.hash,
    permitBlock: receiptPermit.blockNumber,
    transferTx: tx.hash,
    transferBlock: receipt.blockNumber,
  };
}

export async function getBalanceForChain(address: string, tokenAddress: string, rpcUrl: string): Promise<string> {
  const token = getTokenContractReadonlyForChain(tokenAddress, rpcUrl);
  const balance = await token.balanceOf(address);
  return balance.toString();
}

export async function signMintAuthorizationForChain(
  wallet: ethers.Wallet,
  to: string,
  amountWei: bigint,
  deadline: number,
  tokenAddress: string,
  rpcUrl: string,
  chainId: number
) {
  const token = getTokenContractReadonlyForChain(tokenAddress, rpcUrl);
  const config = await getTokenConfigForChain(tokenAddress, rpcUrl, chainId);
  const nonce = await token.mintNonces(wallet.address);
  
  const domain = {
    name: config.name,
    version: "1",
    chainId,
    verifyingContract: tokenAddress,
  };
  
  const types = {
    MintAuthorization: [
      { name: "signer", type: "address" },
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "nonce", type: "uint256" },
      { name: "deadline", type: "uint256" },
    ],
  };
  
  const message = {
    signer: wallet.address,
    to,
    amount: amountWei,
    nonce,
    deadline: BigInt(deadline),
  };
  
  const signature = await wallet.signTypedData(domain, types, message);
  const sig = ethers.Signature.from(signature);
  
  return {
    v: sig.v,
    r: sig.r,
    s: sig.s,
    nonce: nonce.toString(),
    deadline: String(deadline),
  };
}

export async function signBurnAuthorizationForChain(
  wallet: ethers.Wallet,
  from: string,
  amountWei: bigint,
  deadline: number,
  tokenAddress: string,
  rpcUrl: string,
  chainId: number
) {
  const token = getTokenContractReadonlyForChain(tokenAddress, rpcUrl);
  const config = await getTokenConfigForChain(tokenAddress, rpcUrl, chainId);
  const nonce = await token.burnNonces(wallet.address);
  
  const domain = {
    name: config.name,
    version: "1",
    chainId,
    verifyingContract: tokenAddress,
  };
  
  const types = {
    BurnAuthorization: [
      { name: "signer", type: "address" },
      { name: "from", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "nonce", type: "uint256" },
      { name: "deadline", type: "uint256" },
    ],
  };
  
  const message = {
    signer: wallet.address,
    from,
    amount: amountWei,
    nonce,
    deadline: BigInt(deadline),
  };
  
  const signature = await wallet.signTypedData(domain, types, message);
  const sig = ethers.Signature.from(signature);
  
  return {
    v: sig.v,
    r: sig.r,
    s: sig.s,
    nonce: nonce.toString(),
    deadline: String(deadline),
  };
}

export async function signPermitForChain(
  wallet: ethers.Wallet,
  spender: string,
  amountWei: bigint,
  deadline: number,
  tokenAddress: string,
  rpcUrl: string,
  chainId: number
) {
  const token = getTokenContractReadonlyForChain(tokenAddress, rpcUrl);
  const config = await getTokenConfigForChain(tokenAddress, rpcUrl, chainId);
  const nonce = await token.nonces(wallet.address);
  
  const domain = {
    name: config.name,
    version: "1",
    chainId,
    verifyingContract: tokenAddress,
  };
  
  const types = {
    Permit: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
      { name: "value", type: "uint256" },
      { name: "nonce", type: "uint256" },
      { name: "deadline", type: "uint256" },
    ],
  };
  
  const message = {
    owner: wallet.address,
    spender,
    value: amountWei,
    nonce,
    deadline: BigInt(deadline),
  };
  
  const signature = await wallet.signTypedData(domain, types, message);
  const sig = ethers.Signature.from(signature);
  
  return {
    v: sig.v,
    r: sig.r,
    s: sig.s,
    owner: wallet.address,
    spender,
    value: amountWei.toString(),
    nonce: nonce.toString(),
    deadline,
  };
}

export function getTokenContract(tokenAddress?: string): ethers.Contract {
  const address = tokenAddress || getTokenAddress();
  const wallet = getAdminWallet();
  return new ethers.Contract(address, reteTokenAbi, wallet);
}

export function getFactoryContract(factoryAddress?: string): ethers.Contract {
  const address = factoryAddress || getFactoryAddress();
  const wallet = getAdminWallet();
  return new ethers.Contract(address, factoryAbi, wallet);
}

export function getTokenContractReadonly(tokenAddress?: string): ethers.Contract {
  const address = tokenAddress || getTokenAddress();
  const provider = getProvider();
  return new ethers.Contract(address, reteTokenAbi, provider);
}

export function parseAmount(humanAmount: string | number, decimals: number): bigint {
  return ethers.parseUnits(String(humanAmount), decimals);
}

export function formatAmount(weiAmount: bigint, decimals: number): string {
  return ethers.formatUnits(weiAmount, decimals);
}

export async function getTokenConfig(tokenAddress?: string) {
  const token = getTokenContractReadonly(tokenAddress);
  const provider = getProvider();
  const network = await provider.getNetwork();
  
  const [name, symbol, decimals, totalSupply, owner, adminSpender, mintPaused] = await Promise.all([
    token.name(),
    token.symbol(),
    token.decimals(),
    token.totalSupply(),
    token.owner(),
    token.adminSpender(),
    token.mintPaused(),
  ]);
  
  let adminBurnEnabled = false;
  try {
    adminBurnEnabled = await token.adminBurnEnabled();
  } catch (e) {
  }
  
  return {
    token: tokenAddress || getTokenAddress(),
    name,
    symbol,
    decimals: Number(decimals),
    totalSupply: totalSupply.toString(),
    owner,
    adminSpender,
    mintPaused: Boolean(mintPaused),
    adminBurnEnabled: Boolean(adminBurnEnabled),
    chainId: Number(network.chainId),
  };
}

export async function getBalance(address: string, tokenAddress?: string): Promise<string> {
  const token = getTokenContractReadonly(tokenAddress);
  const balance = await token.balanceOf(address);
  return balance.toString();
}

export async function mintTokens(to: string, amountHuman: string | number, tokenAddress?: string) {
  const token = getTokenContract(tokenAddress);
  const decimals = Number(await token.decimals());
  const amount = parseAmount(amountHuman, decimals);
  
  const tx = await token.mint(to, amount);
  const receipt = await tx.wait();
  
  return {
    tx: tx.hash,
    block: receipt.blockNumber,
    to,
    amount: amount.toString(),
  };
}

export async function mintWithSignature(
  signer: string,
  to: string,
  amountHuman: string | number,
  deadline: number,
  v: number,
  r: string,
  s: string,
  tokenAddress?: string
) {
  const token = getTokenContract(tokenAddress);
  const decimals = Number(await token.decimals());
  const amount = parseAmount(amountHuman, decimals);
  
  const tx = await token.mintWithSig(signer, to, amount, deadline, v, r, s);
  const receipt = await tx.wait();
  
  return {
    tx: tx.hash,
    block: receipt.blockNumber,
    to,
    amount: amount.toString(),
    signer,
    deadline,
  };
}

export async function burnWithSignature(
  signer: string,
  from: string,
  amountHuman: string | number,
  deadline: number,
  v: number,
  r: string,
  s: string,
  tokenAddress?: string
) {
  const token = getTokenContract(tokenAddress);
  const decimals = Number(await token.decimals());
  const amount = parseAmount(amountHuman, decimals);
  
  const tx = await token.burnWithSig(signer, from, amount, deadline, v, r, s);
  const receipt = await tx.wait();
  
  return {
    action: "burn-with-sig",
    tx: tx.hash,
    block: receipt.blockNumber,
    signer,
    from,
    amount: amount.toString(),
    deadline,
  };
}

export async function createReteToken(
  name: string,
  symbol: string,
  coordinatorOwner: string,
  adminSpender: string,
  factoryAddress?: string
) {
  const factory = getFactoryContract(factoryAddress);
  
  const tx = await factory.createReteToken(name, symbol, coordinatorOwner, adminSpender);
  const receipt = await tx.wait();
  
  let tokenCreated: string | null = null;
  for (const log of receipt.logs) {
    try {
      const parsed = factory.interface.parseLog(log);
      if (parsed?.name === "ReteTokenCreated") {
        tokenCreated = parsed.args.token;
        break;
      }
    } catch {}
  }
  
  return {
    tx: tx.hash,
    token: tokenCreated,
  };
}

export async function getAllTokens(factoryAddress?: string): Promise<string[]> {
  const factory = getFactoryContract(factoryAddress);
  return await factory.getAllTokens();
}

export async function getCoordinatorTokens(coordinatorAddress: string, factoryAddress?: string): Promise<string[]> {
  const factory = getFactoryContract(factoryAddress);
  return await factory.getCoordinatorTokens(coordinatorAddress);
}

export async function getMintNonce(signerAddress: string, tokenAddress?: string): Promise<bigint> {
  const token = getTokenContractReadonly(tokenAddress);
  return await token.mintNonces(signerAddress);
}

export async function getBurnNonce(signerAddress: string, tokenAddress?: string): Promise<bigint> {
  const token = getTokenContractReadonly(tokenAddress);
  return await token.burnNonces(signerAddress);
}

export async function getPermitNonce(ownerAddress: string, tokenAddress?: string): Promise<bigint> {
  const token = getTokenContractReadonly(tokenAddress);
  return await token.nonces(ownerAddress);
}

export async function signPermit(
  wallet: ethers.Wallet,
  spender: string,
  amountWei: bigint,
  deadline: number,
  tokenAddress?: string
) {
  const config = await getTokenConfig(tokenAddress);
  const nonce = await getPermitNonce(wallet.address, tokenAddress);
  
  const domain = {
    name: config.name,
    version: "1",
    chainId: config.chainId,
    verifyingContract: config.token,
  };
  
  const types = {
    Permit: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
      { name: "value", type: "uint256" },
      { name: "nonce", type: "uint256" },
      { name: "deadline", type: "uint256" },
    ],
  };
  
  const message = {
    owner: wallet.address,
    spender,
    value: amountWei,
    nonce,
    deadline: BigInt(deadline),
  };
  
  const signature = await wallet.signTypedData(domain, types, message);
  const sig = ethers.Signature.from(signature);
  
  return {
    v: sig.v,
    r: sig.r,
    s: sig.s,
    owner: wallet.address,
    spender,
    value: amountWei.toString(),
    nonce: nonce.toString(),
    deadline,
  };
}

export async function signMintAuthorization(
  wallet: ethers.Wallet,
  to: string,
  amountWei: bigint,
  deadline: number,
  tokenAddress?: string
) {
  const token = getTokenContractReadonly(tokenAddress);
  const config = await getTokenConfig(tokenAddress);
  const nonce = await getMintNonce(wallet.address, tokenAddress);
  
  const domain = {
    name: config.name,
    version: "1",
    chainId: config.chainId,
    verifyingContract: config.token,
  };
  
  const types = {
    MintAuthorization: [
      { name: "signer", type: "address" },
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "nonce", type: "uint256" },
      { name: "deadline", type: "uint256" },
    ],
  };
  
  const message = {
    signer: wallet.address,
    to,
    amount: amountWei,
    nonce,
    deadline: BigInt(deadline),
  };
  
  const signature = await wallet.signTypedData(domain, types, message);
  const sig = ethers.Signature.from(signature);
  
  return {
    v: sig.v,
    r: sig.r,
    s: sig.s,
    nonce: nonce.toString(),
    deadline: String(deadline),
  };
}

export async function signBurnAuthorization(
  wallet: ethers.Wallet,
  from: string,
  amountWei: bigint,
  deadline: number,
  tokenAddress?: string
) {
  const config = await getTokenConfig(tokenAddress);
  const nonce = await getBurnNonce(wallet.address, tokenAddress);
  
  const domain = {
    name: config.name,
    version: "1",
    chainId: config.chainId,
    verifyingContract: config.token,
  };
  
  const types = {
    BurnAuthorization: [
      { name: "signer", type: "address" },
      { name: "from", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "nonce", type: "uint256" },
      { name: "deadline", type: "uint256" },
    ],
  };
  
  const message = {
    signer: wallet.address,
    from,
    amount: amountWei,
    nonce,
    deadline: BigInt(deadline),
  };
  
  const signature = await wallet.signTypedData(domain, types, message);
  const sig = ethers.Signature.from(signature);
  
  return {
    v: sig.v,
    r: sig.r,
    s: sig.s,
    nonce: nonce.toString(),
    deadline: String(deadline),
  };
}

export async function setMintPaused(paused: boolean, tokenAddress?: string) {
  const token = getTokenContract(tokenAddress);
  const tx = await token.setMintPaused(paused);
  const receipt = await tx.wait();
  
  return {
    tx: tx.hash,
    block: receipt.blockNumber,
    paused,
  };
}

export async function toggleAdminBurn(enabled: boolean, tokenAddress?: string) {
  const token = getTokenContract(tokenAddress);
  const tx = await token.toggleAdminBurn(enabled);
  const receipt = await tx.wait();
  
  return {
    tx: tx.hash,
    block: receipt.blockNumber,
    enabled,
  };
}

export async function adminBurn(from: string, amountHuman: string | number, tokenAddress?: string) {
  const token = getTokenContract(tokenAddress);
  const decimals = Number(await token.decimals());
  const amount = parseAmount(amountHuman, decimals);
  
  const tx = await token.adminBurn(from, amount);
  const receipt = await tx.wait();
  
  return {
    tx: tx.hash,
    block: receipt.blockNumber,
    from,
    amount: amount.toString(),
  };
}

export async function adminBatchBurn(
  holders: string[],
  amountsHuman: (string | number)[],
  tokenAddress?: string
) {
  const token = getTokenContract(tokenAddress);
  const decimals = Number(await token.decimals());
  const amounts = amountsHuman.map(a => parseAmount(a, decimals));
  
  const tx = await token.adminBatchBurn(holders, amounts);
  const receipt = await tx.wait();
  
  return {
    tx: tx.hash,
    block: receipt.blockNumber,
    holders,
    amounts: amounts.map(a => a.toString()),
  };
}

export async function permitTransfer(
  owner: string,
  spender: string,
  value: string,
  deadline: number,
  v: number,
  r: string,
  s: string,
  recipient: string,
  tokenAddress?: string
) {
  const token = getTokenContract(tokenAddress);
  const wallet = getAdminWallet();
  
  if (spender.toLowerCase() !== wallet.address.toLowerCase()) {
    throw new Error("Spender must be server wallet");
  }
  
  const txPermit = await token.permit(owner, spender, value, deadline, v, r, s);
  const receiptPermit = await txPermit.wait();
  
  const allowance = await token.allowance(owner, wallet.address);
  if (allowance === BigInt(0)) {
    throw new Error("No allowance after permit");
  }
  
  const requested = BigInt(value);
  const sendAmount = requested <= allowance ? requested : allowance;
  
  const tx = await token.transferFrom(owner, recipient, sendAmount);
  const receipt = await tx.wait();
  const leftover = await token.allowance(owner, wallet.address);
  
  return {
    action: "permit-transfer",
    sent: sendAmount.toString(),
    allowanceAfter: leftover.toString(),
    permitTx: txPermit.hash,
    permitBlock: receiptPermit.blockNumber,
    transferTx: tx.hash,
    transferBlock: receipt.blockNumber,
  };
}

export async function permitBurn(
  owner: string,
  spender: string,
  value: string,
  deadline: number,
  v: number,
  r: string,
  s: string,
  tokenAddress?: string
) {
  const token = getTokenContract(tokenAddress);
  const wallet = getAdminWallet();
  
  if (spender.toLowerCase() !== wallet.address.toLowerCase()) {
    throw new Error("Spender must be server wallet");
  }
  
  const txPermit = await token.permit(owner, spender, value, deadline, v, r, s);
  const receiptPermit = await txPermit.wait();
  
  const allowance = await token.allowance(owner, wallet.address);
  if (allowance === BigInt(0)) {
    throw new Error("No allowance after permit");
  }
  
  const requested = BigInt(value);
  const burnAmount = requested <= allowance ? requested : allowance;
  
  const tx = await token.burnFrom(owner, burnAmount);
  const receipt = await tx.wait();
  const leftover = await token.allowance(owner, wallet.address);
  
  return {
    action: "permit-burn",
    burned: burnAmount.toString(),
    allowanceAfter: leftover.toString(),
    permitTx: txPermit.hash,
    permitBlock: receiptPermit.blockNumber,
    burnTx: tx.hash,
    burnBlock: receipt.blockNumber,
  };
}
