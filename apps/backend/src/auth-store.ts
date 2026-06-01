import { randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import mysql from "mysql2/promise";
import type { AuthSession, User } from "@ace/shared";
import { config } from "./config.js";
import { users as seedUsers } from "./data/seed.js";

const scrypt = promisify(scryptCallback);

let pool: mysql.Pool | undefined;

export async function initAuthStore() {
  pool = mysql.createPool({
    host: config.mysql.host,
    port: config.mysql.port,
    database: config.mysql.database,
    user: config.mysql.user,
    password: config.mysql.password,
    waitForConnections: true,
    connectionLimit: 5,
    namedPlaceholders: true
  });

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS ace_users (
      id VARCHAR(64) PRIMARY KEY,
      username VARCHAR(190) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      display_name VARCHAR(120) NOT NULL,
      role ENUM('admin', 'member') NOT NULL DEFAULT 'member',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS ace_sessions (
      token VARCHAR(64) PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      expires_at TIMESTAMP NOT NULL,
      INDEX idx_ace_sessions_user_id (user_id),
      CONSTRAINT fk_ace_sessions_user_id FOREIGN KEY (user_id) REFERENCES ace_users(id) ON DELETE CASCADE
    )
  `);

  for (const seedUser of seedUsers) {
    const existing = await findUserByUsername(seedUser.username);
    if (!existing) {
      await createUser({
        username: seedUser.username,
        password: seedUser.password,
        displayName: seedUser.displayName,
        role: seedUser.role
      });
    }
  }
}

export async function login(username: string, password: string): Promise<AuthSession | undefined> {
  const row = await getUserRow(username);
  if (!row) return undefined;
  const ok = await verifyPassword(password, row.password_hash);
  if (!ok) return undefined;
  return createSession(toUser(row));
}

export async function register(input: { username: string; password: string; displayName: string }): Promise<AuthSession> {
  const existing = await findUserByUsername(input.username);
  if (existing) throw new Error("User already exists");
  const user = await createUser({ ...input, role: "member" });
  return createSession(user);
}

export async function getSession(token: string): Promise<User | undefined> {
  const [rows] = await getPool().execute<mysql.RowDataPacket[]>(
    `SELECT u.id, u.username, u.display_name, u.role
     FROM ace_sessions s
     JOIN ace_users u ON u.id = s.user_id
     WHERE s.token = ? AND s.expires_at > NOW()`,
    [token]
  );
  const row = rows[0];
  if (!row) return undefined;
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    role: row.role
  };
}

export async function findUserByUsername(username: string): Promise<User | undefined> {
  const row = await getUserRow(username);
  return row ? toUser(row) : undefined;
}

async function createUser(input: { username: string; password: string; displayName: string; role: User["role"] }): Promise<User> {
  const user: User = {
    id: randomUUID(),
    username: input.username,
    displayName: input.displayName,
    role: input.role
  };
  await getPool().execute(
    "INSERT INTO ace_users (id, username, password_hash, display_name, role) VALUES (?, ?, ?, ?, ?)",
    [user.id, user.username, await hashPassword(input.password), user.displayName, user.role]
  );
  return user;
}

async function createSession(user: User): Promise<AuthSession> {
  const token = randomUUID();
  await getPool().execute(
    "INSERT INTO ace_sessions (token, user_id, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 30 DAY))",
    [token, user.id]
  );
  return { token, user };
}

async function getUserRow(username: string) {
  const [rows] = await getPool().execute<mysql.RowDataPacket[]>(
    "SELECT id, username, password_hash, display_name, role FROM ace_users WHERE username = ?",
    [username]
  );
  return rows[0];
}

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt:${salt}:${derived.toString("hex")}`;
}

async function verifyPassword(password: string, encoded: string) {
  const [_algorithm, salt, expectedHex] = encoded.split(":");
  if (!salt || !expectedHex) return false;
  const actual = (await scrypt(password, salt, 64)) as Buffer;
  const expected = Buffer.from(expectedHex, "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function toUser(row: mysql.RowDataPacket): User {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    role: row.role
  };
}

function getPool() {
  if (!pool) throw new Error("Auth store is not initialized");
  return pool;
}
