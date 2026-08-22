import fs from 'fs';
import path from 'path';
import initSqlJs, { Database, SqlValue } from 'sql.js';

let dbInstance: Database | null = null;
let isInitializing = false;
let initPromise: Promise<Database> | null = null;

const dbDir = path.join(process.cwd(), 'data');
const dbFilePath = process.env.DATABASE_PATH 
  ? path.resolve(process.cwd(), process.env.DATABASE_PATH)
  : path.join(dbDir, 'family_hub.db');

export function saveDatabase() {
  if (!dbInstance) return;
  try {
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    const data = dbInstance.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbFilePath, buffer);
  } catch (err) {
    console.error('[DB] Failed to save database to disk:', err);
  }
}

export async function getDb(): Promise<Database> {
  if (dbInstance) return dbInstance;

  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const wasmBinaryPath = path.join(process.cwd(), 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm');
      let SQL;
      if (fs.existsSync(wasmBinaryPath)) {
        const fileBuf = fs.readFileSync(wasmBinaryPath);
        const wasmBinary = new Uint8Array(fileBuf).buffer;
        SQL = await initSqlJs({ wasmBinary });
      } else {
        SQL = await initSqlJs();
      }

      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      if (fs.existsSync(dbFilePath)) {
        const fileBuffer = fs.readFileSync(dbFilePath);
        dbInstance = new SQL.Database(fileBuffer);
      } else {
        dbInstance = new SQL.Database();
      }

      // Initialize Schema
      initSchema(dbInstance);
      saveDatabase();
      return dbInstance;
    } catch (err) {
      console.error('[DB] Initialization error:', err);
      throw err;
    } finally {
      initPromise = null;
    }
  })();

  return initPromise;
}

function initSchema(db: Database) {
  db.run('PRAGMA foreign_keys = ON;');

  const schema = `
    -- Users Table
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL,
      avatar_url TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Families Table
    CREATE TABLE IF NOT EXISTS families (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      owner_id TEXT NOT NULL,
      currency TEXT DEFAULT 'THB',
      monthly_budget REAL DEFAULT 0,
      rewards_enabled INTEGER DEFAULT 1,
      avatar_icon TEXT DEFAULT 'home',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Family Members Table
    CREATE TABLE IF NOT EXISTS family_members (
      id TEXT PRIMARY KEY,
      family_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('ADMIN', 'ADULT', 'CHILD')),
      nickname TEXT NOT NULL,
      member_color TEXT NOT NULL DEFAULT '#3b82f6',
      points_balance INTEGER NOT NULL DEFAULT 0,
      joined_at TEXT NOT NULL,
      UNIQUE(family_id, user_id),
      FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Family Invites Table
    CREATE TABLE IF NOT EXISTS family_invites (
      id TEXT PRIMARY KEY,
      family_id TEXT NOT NULL,
      invite_code TEXT UNIQUE NOT NULL,
      role TEXT NOT NULL DEFAULT 'ADULT' CHECK(role IN ('ADMIN', 'ADULT', 'CHILD')),
      expires_at TEXT,
      revoked INTEGER DEFAULT 0,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE
    );

    -- Calendar Events Table
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      family_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      event_date TEXT NOT NULL,
      start_time TEXT,
      end_time TEXT,
      all_day INTEGER DEFAULT 0,
      location TEXT,
      category TEXT NOT NULL DEFAULT 'Family',
      recurrence_rule TEXT DEFAULT 'NONE',
      reminder_minutes INTEGER DEFAULT 0,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE
    );

    -- Event Attendees Mapping Table
    CREATE TABLE IF NOT EXISTS event_members (
      event_id TEXT NOT NULL,
      family_member_id TEXT NOT NULL,
      PRIMARY KEY (event_id, family_member_id),
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
      FOREIGN KEY (family_member_id) REFERENCES family_members(id) ON DELETE CASCADE
    );

    -- Household Tasks Table
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      family_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      assigned_to TEXT,
      due_date TEXT,
      due_time TEXT,
      priority TEXT NOT NULL DEFAULT 'NORMAL' CHECK(priority IN ('LOW', 'NORMAL', 'HIGH')),
      status TEXT NOT NULL DEFAULT 'TODO' CHECK(status IN ('TODO', 'IN_PROGRESS', 'COMPLETED')),
      recurrence_rule TEXT DEFAULT 'NONE',
      points INTEGER DEFAULT 0,
      created_by TEXT NOT NULL,
      completed_by TEXT,
      completed_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
      FOREIGN KEY (assigned_to) REFERENCES family_members(id) ON DELETE SET NULL,
      FOREIGN KEY (completed_by) REFERENCES family_members(id) ON DELETE SET NULL
    );

    -- Shopping Items Table
    CREATE TABLE IF NOT EXISTS shopping_items (
      id TEXT PRIMARY KEY,
      family_id TEXT NOT NULL,
      name TEXT NOT NULL,
      quantity REAL DEFAULT 1,
      unit TEXT,
      category TEXT NOT NULL DEFAULT 'Grocery',
      note TEXT,
      added_by TEXT NOT NULL,
      purchased INTEGER DEFAULT 0,
      purchased_by TEXT,
      purchased_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
      FOREIGN KEY (added_by) REFERENCES family_members(id) ON DELETE CASCADE,
      FOREIGN KEY (purchased_by) REFERENCES family_members(id) ON DELETE SET NULL
    );

    -- Expenses Table
    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      family_id TEXT NOT NULL,
      amount REAL NOT NULL CHECK(amount > 0),
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      paid_by TEXT NOT NULL,
      expense_date TEXT NOT NULL,
      note TEXT,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
      FOREIGN KEY (paid_by) REFERENCES family_members(id) ON DELETE CASCADE
    );

    -- Bills Table
    CREATE TABLE IF NOT EXISTS bills (
      id TEXT PRIMARY KEY,
      family_id TEXT NOT NULL,
      name TEXT NOT NULL,
      amount REAL NOT NULL CHECK(amount > 0),
      category TEXT NOT NULL,
      due_date TEXT NOT NULL,
      recurrence_rule TEXT DEFAULT 'MONTHLY',
      status TEXT NOT NULL DEFAULT 'UNPAID' CHECK(status IN ('UNPAID', 'PAID', 'OVERDUE')),
      notes TEXT,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE
    );

    -- Bill Payments History Table
    CREATE TABLE IF NOT EXISTS bill_payments (
      id TEXT PRIMARY KEY,
      bill_id TEXT NOT NULL,
      family_id TEXT NOT NULL,
      amount REAL NOT NULL,
      paid_date TEXT NOT NULL,
      paid_by TEXT NOT NULL,
      note TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE,
      FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
      FOREIGN KEY (paid_by) REFERENCES family_members(id) ON DELETE CASCADE
    );

    -- Rewards Catalog Table
    CREATE TABLE IF NOT EXISTS rewards (
      id TEXT PRIMARY KEY,
      family_id TEXT NOT NULL,
      name TEXT NOT NULL,
      required_points INTEGER NOT NULL CHECK(required_points > 0),
      active INTEGER DEFAULT 1,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE
    );

    -- Points Ledger Table
    CREATE TABLE IF NOT EXISTS points_transactions (
      id TEXT PRIMARY KEY,
      family_id TEXT NOT NULL,
      family_member_id TEXT NOT NULL,
      points INTEGER NOT NULL,
      source_type TEXT NOT NULL,
      source_id TEXT,
      description TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
      FOREIGN KEY (family_member_id) REFERENCES family_members(id) ON DELETE CASCADE
    );

    -- Household Info Table
    CREATE TABLE IF NOT EXISTS household_info (
      id TEXT PRIMARY KEY,
      family_id TEXT NOT NULL,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      value TEXT NOT NULL,
      contact_phone TEXT,
      notes TEXT,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE
    );

    -- Notifications Table
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      family_id TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      read INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE
    );

    -- Indexes for High Performance & Query Isolation
    CREATE INDEX IF NOT EXISTS idx_members_family ON family_members(family_id);
    CREATE INDEX IF NOT EXISTS idx_members_user ON family_members(user_id);
    CREATE INDEX IF NOT EXISTS idx_events_family_date ON events(family_id, event_date);
    CREATE INDEX IF NOT EXISTS idx_tasks_family_due ON tasks(family_id, due_date);
    CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_to);
    CREATE INDEX IF NOT EXISTS idx_shopping_family ON shopping_items(family_id, purchased);
    CREATE INDEX IF NOT EXISTS idx_expenses_family_date ON expenses(family_id, expense_date);
    CREATE INDEX IF NOT EXISTS idx_bills_family_due ON bills(family_id, due_date);
    CREATE INDEX IF NOT EXISTS idx_invites_code ON family_invites(invite_code);
  `;

  db.exec(schema);
}

// Database helper functions
export async function query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const db = await getDb();
  const cleanParams = params.map((p) => (p === undefined ? null : p));
  const stmt = db.prepare(sql);
  stmt.bind(cleanParams);
  const results: T[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject() as unknown as T);
  }
  stmt.free();
  return results;
}

export async function queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

export async function execute(sql: string, params: any[] = []): Promise<void> {
  const db = await getDb();
  const cleanParams = params.map((p) => (p === undefined ? null : p));
  db.run(sql, cleanParams);
  saveDatabase();
}

export async function transaction<T>(callback: () => Promise<T> | T): Promise<T> {
  const result = await callback();
  saveDatabase();
  return result;
}
