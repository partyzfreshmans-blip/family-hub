import fs from 'fs';
import path from 'path';
import initSqlJs, { Database } from 'sql.js';
import { createClient, Client as TursoClient } from '@libsql/client';

// Turso configuration
const tursoUrl = process.env.TURSO_DATABASE_URL || process.env.TURSO_URL;
const tursoAuthToken = process.env.TURSO_AUTH_TOKEN;
const isTursoEnabled = !!tursoUrl;

let tursoClient: TursoClient | null = null;
let tursoInitPromise: Promise<void> | null = null;

if (isTursoEnabled) {
  tursoClient = createClient({
    url: tursoUrl!,
    authToken: tursoAuthToken,
  });
}

// Local SQLite configuration (fallback)
let dbInstance: Database | null = null;
let initPromise: Promise<Database> | null = null;

const isVercel = process.env.VERCEL === '1' || !!process.env.AWS_LAMBDA_FUNCTION_NAME;
const dbDir = isVercel ? '/tmp' : path.join(process.cwd(), 'data');
const dbFilePath = process.env.DATABASE_PATH 
  ? path.resolve(process.cwd(), process.env.DATABASE_PATH)
  : path.join(dbDir, 'family_hub.db');

export function saveDatabase() {
  if (isTursoEnabled) return;
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

const DB_SCHEMA = `
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name TEXT NOT NULL,
    avatar_url TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

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

  CREATE TABLE IF NOT EXISTS event_members (
    event_id TEXT NOT NULL,
    family_member_id TEXT NOT NULL,
    PRIMARY KEY (event_id, family_member_id),
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (family_member_id) REFERENCES family_members(id) ON DELETE CASCADE
  );

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

  CREATE TABLE IF NOT EXISTS member_location_settings (
    id TEXT PRIMARY KEY,
    family_id TEXT NOT NULL,
    family_member_id TEXT UNIQUE NOT NULL,
    sharing_mode TEXT NOT NULL DEFAULT 'APP_ACTIVE' CHECK(sharing_mode IN ('OFF', 'ONCE', 'TIMED', 'APP_ACTIVE')),
    sharing_enabled INTEGER NOT NULL DEFAULT 1,
    sharing_expires_at TEXT,
    history_enabled INTEGER NOT NULL DEFAULT 0,
    retention_days INTEGER NOT NULL DEFAULT 7,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
    FOREIGN KEY (family_member_id) REFERENCES family_members(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS member_current_locations (
    id TEXT PRIMARY KEY,
    family_id TEXT NOT NULL,
    family_member_id TEXT UNIQUE NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    accuracy REAL NOT NULL,
    recorded_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    source TEXT DEFAULT 'foreground',
    FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
    FOREIGN KEY (family_member_id) REFERENCES family_members(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS member_location_history (
    id TEXT PRIMARY KEY,
    family_id TEXT NOT NULL,
    family_member_id TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    accuracy REAL NOT NULL,
    recorded_at TEXT NOT NULL,
    source TEXT DEFAULT 'foreground',
    created_at TEXT NOT NULL,
    place_name TEXT,
    FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
    FOREIGN KEY (family_member_id) REFERENCES family_members(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS family_saved_places (
    id TEXT PRIMARY KEY,
    family_id TEXT NOT NULL,
    name TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    radius_meters REAL NOT NULL DEFAULT 150,
    category TEXT NOT NULL DEFAULT 'OTHER',
    icon TEXT DEFAULT 'MapPin',
    active INTEGER DEFAULT 1,
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS location_requests (
    id TEXT PRIMARY KEY,
    family_id TEXT NOT NULL,
    requester_member_id TEXT NOT NULL,
    target_member_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'APPROVED', 'DECLINED', 'EXPIRED')),
    requested_at TEXT NOT NULL,
    responded_at TEXT,
    expires_at TEXT NOT NULL,
    FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
    FOREIGN KEY (requester_member_id) REFERENCES family_members(id) ON DELETE CASCADE,
    FOREIGN KEY (target_member_id) REFERENCES family_members(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS location_place_alerts (
    id TEXT PRIMARY KEY,
    family_id TEXT NOT NULL,
    viewer_member_id TEXT NOT NULL,
    target_member_id TEXT NOT NULL,
    saved_place_id TEXT NOT NULL,
    notify_on_arrival INTEGER DEFAULT 1,
    notify_on_leave INTEGER DEFAULT 1,
    active INTEGER DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
    FOREIGN KEY (viewer_member_id) REFERENCES family_members(id) ON DELETE CASCADE,
    FOREIGN KEY (target_member_id) REFERENCES family_members(id) ON DELETE CASCADE,
    FOREIGN KEY (saved_place_id) REFERENCES family_saved_places(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS sos_events (
    id TEXT PRIMARY KEY,
    family_id TEXT NOT NULL,
    family_member_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'RESOLVED', 'CANCELLED')),
    started_at TEXT NOT NULL,
    ended_at TEXT,
    initial_latitude REAL NOT NULL,
    initial_longitude REAL NOT NULL,
    initial_accuracy REAL NOT NULL,
    last_latitude REAL NOT NULL,
    last_longitude REAL NOT NULL,
    last_accuracy REAL NOT NULL,
    last_updated_at TEXT NOT NULL,
    FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
    FOREIGN KEY (family_member_id) REFERENCES family_members(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_members_family ON family_members(family_id);
  CREATE INDEX IF NOT EXISTS idx_members_user ON family_members(user_id);
  CREATE INDEX IF NOT EXISTS idx_events_family_date ON events(family_id, event_date);
  CREATE INDEX IF NOT EXISTS idx_tasks_family_due ON tasks(family_id, due_date);
  CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_to);
  CREATE INDEX IF NOT EXISTS idx_shopping_family ON shopping_items(family_id, purchased);
  CREATE INDEX IF NOT EXISTS idx_expenses_family_date ON expenses(family_id, expense_date);
  CREATE INDEX IF NOT EXISTS idx_bills_family_due ON bills(family_id, due_date);
  CREATE INDEX IF NOT EXISTS idx_invites_code ON family_invites(invite_code);
  CREATE INDEX IF NOT EXISTS idx_loc_curr_family ON member_current_locations(family_id);
  CREATE INDEX IF NOT EXISTS idx_loc_hist_family_member ON member_location_history(family_id, family_member_id, recorded_at);
  CREATE INDEX IF NOT EXISTS idx_loc_places_family ON family_saved_places(family_id);
  CREATE INDEX IF NOT EXISTS idx_loc_req_family ON location_requests(family_id, target_member_id, status);
  CREATE INDEX IF NOT EXISTS idx_sos_family ON sos_events(family_id, status);
`;

async function ensureTursoInitialized() {
  if (!tursoClient) return;
  if (tursoInitPromise) return tursoInitPromise;

  tursoInitPromise = (async () => {
    try {
      await tursoClient.executeMultiple(DB_SCHEMA);
      
      const checkRes = await tursoClient.execute('SELECT count(*) as count FROM users');
      const count = (checkRes.rows[0]?.count as number) || 0;
      
      if (count === 0) {
        console.log('[Turso] Seeding initial family data...');
        const defaultPasswordHash = '$2a$10$Nv16P04fzmOtS39pAreGk.eoDYfoVxTaBgEYDtG9ubFAMi682x61u';
        const now = new Date().toISOString();
        const d = new Date();
        const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const familyId = 'fam_sukjai';

        const statements: any[] = [
          { sql: `INSERT OR REPLACE INTO users VALUES ('usr_dad', 'dad@familyhub.local', ?, 'พ่อ (สมศักดิ์)', NULL, ?, ?)`, args: [defaultPasswordHash, now, now] },
          { sql: `INSERT OR REPLACE INTO users VALUES ('usr_mom', 'mom@familyhub.local', ?, 'แม่ (สุดา)', NULL, ?, ?)`, args: [defaultPasswordHash, now, now] },
          { sql: `INSERT OR REPLACE INTO users VALUES ('usr_ton', 'ton@familyhub.local', ?, 'น้องต้น', NULL, ?, ?)`, args: [defaultPasswordHash, now, now] },
          { sql: `INSERT OR REPLACE INTO users VALUES ('usr_may', 'may@familyhub.local', ?, 'น้องเมย์', NULL, ?, ?)`, args: [defaultPasswordHash, now, now] },
          { sql: `INSERT OR REPLACE INTO families VALUES (?, 'ครอบครัวสุขใจ', 'usr_dad', 'THB', 25000, 1, 'home', ?, ?)`, args: [familyId, now, now] },
          { sql: `INSERT OR REPLACE INTO family_members VALUES ('mem_dad', ?, 'usr_dad', 'ADMIN', 'พ่อ', '#0284c7', 50, ?)`, args: [familyId, now] },
          { sql: `INSERT OR REPLACE INTO family_members VALUES ('mem_mom', ?, 'usr_mom', 'ADULT', 'แม่', '#ec4899', 40, ?)`, args: [familyId, now] },
          { sql: `INSERT OR REPLACE INTO family_members VALUES ('mem_ton', ?, 'usr_ton', 'CHILD', 'น้องต้น', '#10b981', 120, ?)`, args: [familyId, now] },
          { sql: `INSERT OR REPLACE INTO family_members VALUES ('mem_may', ?, 'usr_may', 'CHILD', 'น้องเมย์', '#8b5cf6', 85, ?)`, args: [familyId, now] },
          { sql: `INSERT OR REPLACE INTO family_invites VALUES ('inv_demo', ?, 'FAM-7KX92', 'ADULT', NULL, 0, 'mem_dad', ?)`, args: [familyId, now] },
          { sql: `INSERT OR REPLACE INTO events VALUES ('evt_1', ?, 'นัดหมอตรวจสุขภาพ', 'กิจกรรมครอบครัวสุขใจ', ?, '09:00', '10:30', 0, 'โรงพยาบาลกรุงเทพ', 'Health', 'NONE', 30, 'mem_dad', ?, ?)`, args: [familyId, today, now, now] },
          { sql: `INSERT OR REPLACE INTO event_members VALUES ('evt_1', 'mem_dad')`, args: [] },
          { sql: `INSERT OR REPLACE INTO tasks VALUES ('tsk_1', ?, 'ทิ้งขยะหน้าบ้าน', 'งานบ้านประจำวัน', 'mem_dad', ?, '08:00', 'NORMAL', 'COMPLETED', 'DAILY', 5, 'mem_dad', 'mem_dad', ?, ?, ?)`, args: [familyId, today, now, now, now] },
          { sql: `INSERT OR REPLACE INTO shopping_items VALUES ('shp_1', ?, 'นมสดเมจิ', 2, 'ขวด', 'Grocery', '', 'mem_mom', 0, NULL, NULL, ?, ?)`, args: [familyId, now, now] },
          { sql: `INSERT OR REPLACE INTO expenses VALUES ('exp_1', ?, 1250, 'Shopping', 'ซื้อของ Lotus ซุปเปอร์มาร์เก็ต', 'mem_dad', ?, 'ค่าใช้จ่ายครอบครัว', 'mem_dad', ?, ?)`, args: [familyId, today, now, now] },
          { sql: `INSERT OR REPLACE INTO bills VALUES ('bil_1', ?, 'ค่าไฟ (การไฟฟ้านครหลวง)', 1850, 'Utilities', ?, 'MONTHLY', 'UNPAID', 'ตัดผ่านบัญชี/สแกนจ่าย', 'mem_dad', ?, ?)`, args: [familyId, today, now, now] },
          { sql: `INSERT OR REPLACE INTO rewards VALUES ('rew_1', ?, 'เลือกหนังดูด้วยกันคืนนี้ 🎬', 100, 1, 'mem_dad', ?)`, args: [familyId, now] },
          { sql: `INSERT OR REPLACE INTO household_info VALUES ('inf_1', ?, 'EMERGENCY', 'เบอร์นิติบุคคลหมู่บ้าน', '02-123-4567', '021234567', '', 'mem_dad', ?)`, args: [familyId, now] },
          { sql: `INSERT OR REPLACE INTO family_saved_places VALUES ('place_home', ?, 'บ้านสุขใจ 🏡', 19.9072, 99.8325, 100, 'HOME', 'Home', 1, 'mem_dad', ?, ?)`, args: [familyId, now, now] },
          { sql: `INSERT OR REPLACE INTO member_location_settings VALUES ('locset_mem_dad', ?, 'mem_dad', 'APP_ACTIVE', 1, 1, 7, ?)`, args: [familyId, now] },
          { sql: `INSERT OR REPLACE INTO member_current_locations VALUES ('curloc_mem_dad', ?, 'mem_dad', 19.9072, 99.8325, 12, ?, ?, 'foreground')`, args: [familyId, now, now] },
        ];

        await tursoClient.batch(statements, 'write');
        console.log('[Turso] Database seeded successfully.');
      }
    } catch (err) {
      console.error('[Turso] Init error:', err);
    }
  })();

  return tursoInitPromise;
}

// Local Sqlite getDb (fallback)
export async function getDb(): Promise<Database> {
  if (dbInstance) return dbInstance;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const candidates = [
        path.join(process.cwd(), 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm'),
        path.join(process.cwd(), 'public', 'sql-wasm.wasm'),
      ];

      let wasmBinary: ArrayBuffer | undefined;
      for (const p of candidates) {
        if (fs.existsSync(p)) {
          const fileBuf = fs.readFileSync(p);
          wasmBinary = new Uint8Array(fileBuf).buffer;
          break;
        }
      }

      let SQL;
      if (wasmBinary) {
        SQL = await initSqlJs({ wasmBinary });
      } else {
        SQL = await initSqlJs({
          locateFile: () => 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.12.0/sql-wasm.wasm',
        });
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

      dbInstance.run('PRAGMA foreign_keys = ON;');
      dbInstance.exec(DB_SCHEMA);
      initLocalSeedIfEmpty(dbInstance);
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

function initLocalSeedIfEmpty(db: Database) {
  try {
    const checkStmt = db.prepare('SELECT count(*) as count FROM users');
    let userCount = 0;
    if (checkStmt.step()) {
      userCount = (checkStmt.getAsObject().count as number) || 0;
    }
    checkStmt.free();

    if (userCount > 0) return;

    const defaultPasswordHash = '$2a$10$Nv16P04fzmOtS39pAreGk.eoDYfoVxTaBgEYDtG9ubFAMi682x61u';
    const now = new Date().toISOString();
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    const users = [
      { id: 'usr_dad', email: 'dad@familyhub.local', name: 'พ่อ (สมศักดิ์)' },
      { id: 'usr_mom', email: 'mom@familyhub.local', name: 'แม่ (สุดา)' },
      { id: 'usr_ton', email: 'ton@familyhub.local', name: 'น้องต้น' },
      { id: 'usr_may', email: 'may@familyhub.local', name: 'น้องเมย์' },
    ];
    for (const u of users) {
      db.run(
        `INSERT OR REPLACE INTO users VALUES (?, ?, ?, ?, NULL, ?, ?)`,
        [u.id, u.email, defaultPasswordHash, u.name, now, now]
      );
    }

    const familyId = 'fam_sukjai';
    db.run(
      `INSERT OR REPLACE INTO families VALUES (?, 'ครอบครัวสุขใจ', 'usr_dad', 'THB', 25000, 1, 'home', ?, ?)`,
      [familyId, now, now]
    );

    const members = [
      { id: 'mem_dad', userId: 'usr_dad', role: 'ADMIN', nick: 'พ่อ', color: '#0284c7', pts: 50 },
      { id: 'mem_mom', userId: 'usr_mom', role: 'ADULT', nick: 'แม่', color: '#ec4899', pts: 40 },
      { id: 'mem_ton', userId: 'usr_ton', role: 'CHILD', nick: 'น้องต้น', color: '#10b981', pts: 120 },
      { id: 'mem_may', userId: 'usr_may', role: 'CHILD', nick: 'น้องเมย์', color: '#8b5cf6', pts: 85 },
    ];
    for (const m of members) {
      db.run(
        `INSERT OR REPLACE INTO family_members VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [m.id, familyId, m.userId, m.role, m.nick, m.color, m.pts, now]
      );
    }

    db.run(
      `INSERT OR REPLACE INTO family_invites VALUES ('inv_demo', ?, 'FAM-7KX92', 'ADULT', NULL, 0, 'mem_dad', ?)`,
      [familyId, now]
    );
  } catch (err) {
    console.error('[DB] Auto-seed error:', err);
  }
}

// Universal Query helpers
export async function query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const cleanParams = params.map((p) => (p === undefined ? null : p));

  if (isTursoEnabled && tursoClient) {
    await ensureTursoInitialized();
    const res = await tursoClient.execute({ sql, args: cleanParams });
    return res.rows as unknown as T[];
  }

  const db = await getDb();
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
  const cleanParams = params.map((p) => (p === undefined ? null : p));

  if (isTursoEnabled && tursoClient) {
    await ensureTursoInitialized();
    await tursoClient.execute({ sql, args: cleanParams });
    return;
  }

  const db = await getDb();
  db.run(sql, cleanParams);
  saveDatabase();
}

export async function transaction<T>(callback: () => Promise<T> | T): Promise<T> {
  const result = await callback();
  if (!isTursoEnabled) {
    saveDatabase();
  }
  return result;
}
