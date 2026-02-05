import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";

export interface UserConfig {
  chatId: number;
  username?: string;
  wallet: {
    address: string;
    privateKey: string; // Encrypted in production
  };
  strategy: {
    enabled: boolean;
    riskLevel: "conservative" | "moderate" | "aggressive";
    maxPositionUsd: number;
    targetDescription?: string;
  };
  createdAt: number;
  lastActive: number;
}

export interface UserDB {
  users: { [chatId: string]: UserConfig };
}

const DB_PATH = process.env.DB_PATH || "./data/users.json";

// Ensure data directory exists
function ensureDataDir() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Load user database
export function loadDB(): UserDB {
  ensureDataDir();
  if (fs.existsSync(DB_PATH)) {
    const data = fs.readFileSync(DB_PATH, "utf-8");
    return JSON.parse(data);
  }
  return { users: {} };
}

// Save user database
export function saveDB(db: UserDB): void {
  ensureDataDir();
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

// Get user by chat ID
export function getUser(chatId: number): UserConfig | null {
  const db = loadDB();
  return db.users[chatId.toString()] || null;
}

// Create new user with generated wallet
export function createUser(chatId: number, username?: string): UserConfig {
  const db = loadDB();

  // Generate new wallet
  const wallet = ethers.Wallet.createRandom();

  const user: UserConfig = {
    chatId,
    username,
    wallet: {
      address: wallet.address,
      privateKey: wallet.privateKey,
    },
    strategy: {
      enabled: false,
      riskLevel: "moderate",
      maxPositionUsd: 100,
    },
    createdAt: Date.now(),
    lastActive: Date.now(),
  };

  db.users[chatId.toString()] = user;
  saveDB(db);

  return user;
}

// Update user strategy
export function updateUserStrategy(
  chatId: number,
  strategy: Partial<UserConfig["strategy"]>
): UserConfig | null {
  const db = loadDB();
  const user = db.users[chatId.toString()];

  if (!user) return null;

  user.strategy = { ...user.strategy, ...strategy };
  user.lastActive = Date.now();

  saveDB(db);
  return user;
}

// Get all active users (with enabled strategies)
export function getActiveUsers(): UserConfig[] {
  const db = loadDB();
  return Object.values(db.users).filter((u) => u.strategy.enabled);
}

// Update user last active timestamp
export function touchUser(chatId: number): void {
  const db = loadDB();
  if (db.users[chatId.toString()]) {
    db.users[chatId.toString()].lastActive = Date.now();
    saveDB(db);
  }
}
