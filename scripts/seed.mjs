import fs from 'fs';
import path from 'path';
import initSqlJs from 'sql.js';
import bcrypt from 'bcryptjs';

async function main() {
  console.log('[SEED-CLI] Initializing database...');
  const SQL = await initSqlJs();
  const dbDir = path.join(process.cwd(), 'data');
  const dbFilePath = path.join(dbDir, 'family_hub.db');

  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  let db;
  if (fs.existsSync(dbFilePath)) {
    const fileBuffer = fs.readFileSync(dbFilePath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  db.run('PRAGMA foreign_keys = ON;');

  // Schema creation
  const schema = `
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
      role TEXT NOT NULL DEFAULT 'ADULT',
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
      priority TEXT NOT NULL DEFAULT 'NORMAL',
      status TEXT NOT NULL DEFAULT 'TODO',
      recurrence_rule TEXT DEFAULT 'NONE',
      points INTEGER DEFAULT 0,
      created_by TEXT NOT NULL,
      completed_by TEXT,
      completed_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE
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
      FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE
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
      FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS bills (
      id TEXT PRIMARY KEY,
      family_id TEXT NOT NULL,
      name TEXT NOT NULL,
      amount REAL NOT NULL CHECK(amount > 0),
      category TEXT NOT NULL,
      due_date TEXT NOT NULL,
      recurrence_rule TEXT DEFAULT 'MONTHLY',
      status TEXT NOT NULL DEFAULT 'UNPAID',
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
      FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE
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
      FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE
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
  `;
  db.exec(schema);

  const passwordHash = await bcrypt.hash('password123', 10);
  const now = new Date().toISOString();
  const d = new Date();
  const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  // 1. Users
  const users = [
    { id: 'usr_dad', email: 'dad@familyhub.local', name: 'พ่อ (สมศักดิ์)' },
    { id: 'usr_mom', email: 'mom@familyhub.local', name: 'แม่ (สุดา)' },
    { id: 'usr_ton', email: 'ton@familyhub.local', name: 'น้องต้น' },
    { id: 'usr_may', email: 'may@familyhub.local', name: 'น้องเมย์' },
  ];

  for (const u of users) {
    db.run(
      `INSERT OR REPLACE INTO users (id, email, password_hash, display_name, avatar_url, created_at, updated_at)
       VALUES (?, ?, ?, ?, NULL, ?, ?)`,
      [u.id, u.email, passwordHash, u.name, now, now]
    );
  }

  // 2. Family
  const familyId = 'fam_sukjai';
  db.run(
    `INSERT OR REPLACE INTO families (id, name, owner_id, currency, monthly_budget, rewards_enabled, avatar_icon, created_at, updated_at)
     VALUES (?, ?, ?, 'THB', 25000, 1, 'home', ?, ?)`,
    [familyId, 'ครอบครัวสุขใจ', 'usr_dad', now, now]
  );

  // 3. Members
  const members = [
    { id: 'mem_dad', userId: 'usr_dad', role: 'ADMIN', nick: 'พ่อ', color: '#0284c7', pts: 50 },
    { id: 'mem_mom', userId: 'usr_mom', role: 'ADULT', nick: 'แม่', color: '#ec4899', pts: 40 },
    { id: 'mem_ton', userId: 'usr_ton', role: 'CHILD', nick: 'น้องต้น', color: '#10b981', pts: 120 },
    { id: 'mem_may', userId: 'usr_may', role: 'CHILD', nick: 'น้องเมย์', color: '#8b5cf6', pts: 85 },
  ];

  for (const m of members) {
    db.run(
      `INSERT OR REPLACE INTO family_members (id, family_id, user_id, role, nickname, member_color, points_balance, joined_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [m.id, familyId, m.userId, m.role, m.nick, m.color, m.pts, now]
    );
  }

  // 4. Invites
  db.run(
    `INSERT OR REPLACE INTO family_invites (id, family_id, invite_code, role, expires_at, revoked, created_by, created_at)
     VALUES ('inv_demo', ?, 'FAM-7KX92', 'ADULT', NULL, 0, 'mem_dad', ?)`,
    [familyId, now]
  );

  // 5. Events
  const events = [
    { id: 'evt_1', title: '09:00 นัดหมอตรวจสุขภาพ', time: '09:00', end: '10:30', cat: 'Health', loc: 'โรงพยาบาลกรุงเทพ', mem: 'mem_dad' },
    { id: 'evt_2', title: '16:30 รับลูกที่โรงเรียน', time: '16:30', end: '17:15', cat: 'School', loc: 'โรงเรียนสาธิต', mem: 'mem_mom' },
    { id: 'evt_3', title: '19:00 Family Dinner', time: '19:00', end: '20:30', cat: 'Family', loc: 'ร้านอาหารบ้านสวน', mem: 'mem_dad' },
  ];
  for (const e of events) {
    db.run(
      `INSERT OR REPLACE INTO events (id, family_id, title, description, event_date, start_time, end_time, all_day, location, category, recurrence_rule, reminder_minutes, created_by, created_at, updated_at)
       VALUES (?, ?, ?, 'กิจกรรมครอบครัวสุขใจ', ?, ?, ?, 0, ?, ?, 'NONE', 30, 'mem_dad', ?, ?)`,
      [e.id, familyId, e.title, today, e.time, e.end, e.loc, e.cat, now, now]
    );
    db.run(`INSERT OR REPLACE INTO event_members (event_id, family_member_id) VALUES (?, ?)`, [e.id, e.mem]);
  }

  // 6. Tasks
  const tasks = [
    { id: 'tsk_1', title: 'ทิ้งขยะหน้าบ้าน', assign: 'mem_dad', time: '08:00', prio: 'NORMAL', status: 'COMPLETED', pts: 5 },
    { id: 'tsk_2', title: 'ซื้ออาหารแมว', assign: 'mem_mom', time: '15:00', prio: 'NORMAL', status: 'TODO', pts: 10 },
    { id: 'tsk_3', title: 'ทำการบ้านวิชาคณิตศาสตร์', assign: 'mem_ton', time: '18:00', prio: 'HIGH', status: 'IN_PROGRESS', pts: 20 },
    { id: 'tsk_4', title: 'จัดโต๊ะอาหารเย็น', assign: 'mem_may', time: '18:45', prio: 'LOW', status: 'TODO', pts: 10 },
  ];
  for (const t of tasks) {
    db.run(
      `INSERT OR REPLACE INTO tasks (id, family_id, title, description, assigned_to, due_date, due_time, priority, status, recurrence_rule, points, created_by, completed_by, completed_at, created_at, updated_at)
       VALUES (?, ?, ?, 'งานบ้านประจำวัน', ?, ?, ?, ?, ?, 'DAILY', ?, 'mem_dad', ?, ?, ?, ?)`,
      [t.id, familyId, t.title, t.assign, today, t.time, t.prio, t.status, t.pts, t.status === 'COMPLETED' ? t.assign : null, t.status === 'COMPLETED' ? now : null, now, now]
    );
  }

  // 7. Shopping Items
  const shopping = [
    { id: 'shp_1', name: 'นมสดเมจิ', qty: 2, unit: 'ขวด', cat: 'Grocery', done: 0 },
    { id: 'shp_2', name: 'ไข่ไก่เบอร์ 1', qty: 1, unit: 'แผง', cat: 'Grocery', done: 0 },
    { id: 'shp_3', name: 'ข้าวหอมมะลิ 5 กก.', qty: 1, unit: 'ถุง', cat: 'Grocery', done: 0 },
    { id: 'shp_4', name: 'น้ำดื่มแพ็ค 6 ขวด', qty: 2, unit: 'แพ็ค', cat: 'Grocery', done: 0 },
    { id: 'shp_5', name: 'แชมพูสระผม', qty: 1, unit: 'ขวด', cat: 'Personal', done: 1 },
    { id: 'shp_6', name: 'กระดาษชำระ', qty: 1, unit: 'แพ็ค', cat: 'Household', done: 1 },
  ];
  for (const s of shopping) {
    db.run(
      `INSERT OR REPLACE INTO shopping_items (id, family_id, name, quantity, unit, category, note, added_by, purchased, purchased_by, purchased_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, '', 'mem_mom', ?, ?, ?, ?, ?)`,
      [s.id, familyId, s.name, s.qty, s.unit, s.cat, s.done, s.done ? 'mem_dad' : null, s.done ? now : null, now, now]
    );
  }

  // 8. Expenses
  const expenses = [
    { id: 'exp_1', amount: 1250, cat: 'Shopping', desc: 'ซื้อของ Lotus ซุปเปอร์มาร์เก็ต', paidBy: 'mem_dad' },
    { id: 'exp_2', amount: 1850, cat: 'Utilities', desc: 'ค่าไฟประจำเดือน', paidBy: 'mem_mom' },
    { id: 'exp_3', amount: 1000, cat: 'Transport', desc: 'เติมน้ำมันรถยนต์', paidBy: 'mem_dad' },
    { id: 'exp_4', amount: 450, cat: 'Food', desc: 'มื้อกลางวันครอบครัว', paidBy: 'mem_mom' },
  ];
  for (const exp of expenses) {
    db.run(
      `INSERT OR REPLACE INTO expenses (id, family_id, amount, category, description, paid_by, expense_date, note, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'ค่าใช้จ่ายครอบครัว', 'mem_dad', ?, ?)`,
      [exp.id, familyId, exp.amount, exp.cat, exp.desc, exp.paidBy, today, now, now]
    );
  }

  // 9. Bills
  const bills = [
    { id: 'bil_1', name: 'ค่าไฟ (การไฟฟ้านครหลวง)', amount: 1850, cat: 'Utilities', due: today, repeat: 'MONTHLY', status: 'UNPAID' },
    { id: 'bil_2', name: 'อินเทอร์เน็ตบ้าน Fiber 1000/1000', amount: 699, cat: 'Utilities', due: today, repeat: 'MONTHLY', status: 'UNPAID' },
    { id: 'bil_3', name: 'ค่าน้ำประปา', amount: 280, cat: 'Utilities', due: today, repeat: 'MONTHLY', status: 'PAID' },
  ];
  for (const b of bills) {
    db.run(
      `INSERT OR REPLACE INTO bills (id, family_id, name, amount, category, due_date, recurrence_rule, status, notes, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ตัดผ่านบัญชี/สแกนจ่าย', 'mem_dad', ?, ?)`,
      [b.id, familyId, b.name, b.amount, b.cat, b.due, b.repeat, b.status, now, now]
    );
  }

  // 10. Rewards
  const rewards = [
    { id: 'rew_1', name: 'เลือกหนังดูด้วยกันคืนนี้ 🎬', pts: 100 },
    { id: 'rew_2', name: 'เวลาเล่นเกมเพิ่ม 1 ชั่วโมง 🎮', pts: 200 },
    { id: 'rew_3', name: 'ทริปเที่ยวสวนน้ำครอบครัว 🌊', pts: 500 },
  ];
  for (const r of rewards) {
    db.run(
      `INSERT OR REPLACE INTO rewards (id, family_id, name, required_points, active, created_by, created_at)
       VALUES (?, ?, ?, ?, 1, 'mem_dad', ?)`,
      [r.id, familyId, r.name, r.pts, now]
    );
  }

  // 11. Household Info
  const infos = [
    { id: 'inf_1', cat: 'EMERGENCY', title: 'เบอร์นิติบุคคลหมู่บ้าน', val: '02-123-4567', phone: '021234567' },
    { id: 'inf_2', cat: 'UTILITY', title: 'รหัส Wi-Fi ประจำบ้าน', val: 'HomeHappy2026! (5GHz/2.4GHz)', phone: '' },
    { id: 'inf_3', cat: 'DEVICE', title: 'ช่างล้างแอร์ประจำ (ช่างสมชาย)', val: 'แอร์ห้องนั่งเล่น + ห้องนอนใหญ่', phone: '0899998888' },
  ];
  for (const info of infos) {
    db.run(
      `INSERT OR REPLACE INTO household_info (id, family_id, category, title, value, contact_phone, notes, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, '', 'mem_dad', ?)`,
      [info.id, familyId, info.cat, info.title, info.val, info.phone, now]
    );
  }

  const exported = db.export();
  fs.writeFileSync(dbFilePath, Buffer.from(exported));
  console.log('[SEED-CLI] Successfully seeded database into:', dbFilePath);
}

main().catch(console.error);
