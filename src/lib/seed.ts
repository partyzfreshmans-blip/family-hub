import { queryOne, execute } from './db';
import { hashPassword } from './auth';
import { getTodayDateString } from './utils';

export async function seedDatabase() {
  try {
    // Check if already seeded
    const existing = await queryOne('SELECT id FROM families WHERE name = ?', ['ครอบครัวสุขใจ']);
    if (existing) {
      return;
    }

    console.log('[SEED] Seeding initial family data...');

    const passwordHash = await hashPassword('password123');
    const now = new Date().toISOString();
    const today = getTodayDateString();

    // 1. Create Users
    const users = [
      { id: 'usr_dad', email: 'dad@familyhub.local', name: 'พ่อ' },
      { id: 'usr_mom', email: 'mom@familyhub.local', name: 'แม่' },
      { id: 'usr_ton', email: 'ton@familyhub.local', name: 'น้องต้น' },
      { id: 'usr_may', email: 'may@familyhub.local', name: 'น้องเมย์' },
    ];

    for (const u of users) {
      await execute(
        `INSERT OR REPLACE INTO users (id, email, password_hash, display_name, avatar_url, created_at, updated_at)
         VALUES (?, ?, ?, ?, NULL, ?, ?)`,
        [u.id, u.email, passwordHash, u.name, now, now]
      );
    }

    // 2. Create Family
    const familyId = 'fam_sukjai';
    await execute(
      `INSERT OR REPLACE INTO families (id, name, owner_id, currency, monthly_budget, rewards_enabled, avatar_icon, created_at, updated_at)
       VALUES (?, ?, ?, 'THB', 25000, 1, 'home', ?, ?)`,
      [familyId, 'ครอบครัวสุขใจ', 'usr_dad', now, now]
    );

    // 3. Create Family Members
    const members = [
      { id: 'mem_dad', userId: 'usr_dad', role: 'ADMIN', nick: 'พ่อ', color: '#0284c7', pts: 50 },
      { id: 'mem_mom', userId: 'usr_mom', role: 'ADULT', nick: 'แม่', color: '#ec4899', pts: 40 },
      { id: 'mem_ton', userId: 'usr_ton', role: 'CHILD', nick: 'น้องต้น', color: '#10b981', pts: 120 },
      { id: 'mem_may', userId: 'usr_may', role: 'CHILD', nick: 'น้องเมย์', color: '#8b5cf6', pts: 85 },
    ];

    for (const m of members) {
      await execute(
        `INSERT OR REPLACE INTO family_members (id, family_id, user_id, role, nickname, member_color, points_balance, joined_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [m.id, familyId, m.userId, m.role, m.nick, m.color, m.pts, now]
      );
    }

    // 4. Create Invite Code
    await execute(
      `INSERT OR REPLACE INTO family_invites (id, family_id, invite_code, role, expires_at, revoked, created_by, created_at)
       VALUES ('inv_demo', ?, 'FAM-7KX92', 'ADULT', NULL, 0, 'mem_dad', ?)`,
      [familyId, now]
    );

    // 5. Events
    const events = [
      { id: 'evt_1', title: 'นัดหมอตรวจสุขภาพ', time: '09:00', end: '10:30', cat: 'Health', loc: 'โรงพยาบาลกรุงเทพ', mem: 'mem_dad' },
      { id: 'evt_2', title: 'รับลูกที่โรงเรียน', time: '16:30', end: '17:15', cat: 'School', loc: 'โรงเรียนสาธิต', mem: 'mem_mom' },
      { id: 'evt_3', title: 'Family Dinner', time: '19:00', end: '20:30', cat: 'Family', loc: 'ร้านอาหารบ้านสวน', mem: 'mem_dad' },
    ];

    for (const e of events) {
      await execute(
        `INSERT OR REPLACE INTO events (id, family_id, title, description, event_date, start_time, end_time, all_day, location, category, recurrence_rule, reminder_minutes, created_by, created_at, updated_at)
         VALUES (?, ?, ?, 'กิจกรรมครอบครัวสุขใจ', ?, ?, ?, 0, ?, ?, 'NONE', 30, 'mem_dad', ?, ?)`,
        [e.id, familyId, e.title, today, e.time, e.end, e.loc, e.cat, now, now]
      );
      await execute(`INSERT OR REPLACE INTO event_members (event_id, family_member_id) VALUES (?, ?)`, [e.id, e.mem]);
    }

    // 6. Tasks
    const tasks = [
      { id: 'tsk_1', title: 'ทิ้งขยะหน้าบ้าน', assign: 'mem_dad', time: '08:00', prio: 'NORMAL', status: 'COMPLETED', pts: 5 },
      { id: 'tsk_2', title: 'ซื้ออาหารแมว', assign: 'mem_mom', time: '15:00', prio: 'NORMAL', status: 'TODO', pts: 10 },
      { id: 'tsk_3', title: 'ทำการบ้านวิชาคณิตศาสตร์', assign: 'mem_ton', time: '18:00', prio: 'HIGH', status: 'IN_PROGRESS', pts: 20 },
      { id: 'tsk_4', title: 'จัดโต๊ะอาหารเย็น', assign: 'mem_may', time: '18:45', prio: 'LOW', status: 'TODO', pts: 10 },
    ];

    for (const t of tasks) {
      await execute(
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
      await execute(
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
      await execute(
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
      await execute(
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
      await execute(
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
      await execute(
        `INSERT OR REPLACE INTO household_info (id, family_id, category, title, value, contact_phone, notes, created_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, '', 'mem_dad', ?)`,
        [info.id, familyId, info.cat, info.title, info.val, info.phone, now]
      );
    }

    // 12. Saved Places
    const savedPlaces = [
      { id: 'place_home', name: 'บ้านสุขใจ 🏡', lat: 19.9072, lon: 99.8325, rad: 100, cat: 'HOME', icon: 'Home' },
      { id: 'place_school', name: 'โรงเรียนสาธิตฯ 🏫', lat: 19.9150, lon: 99.8400, rad: 150, cat: 'SCHOOL', icon: 'GraduationCap' },
      { id: 'place_mall', name: 'Central Chiang Rai 🛍️', lat: 19.8962, lon: 99.8327, rad: 200, cat: 'OTHER', icon: 'ShoppingBag' },
      { id: 'place_work', name: 'ที่ทำงาน / สำนักงาน 🏢', lat: 19.9200, lon: 99.8250, rad: 150, cat: 'WORK', icon: 'Briefcase' },
    ];

    for (const p of savedPlaces) {
      await execute(
        `INSERT OR REPLACE INTO family_saved_places (id, family_id, name, latitude, longitude, radius_meters, category, icon, active, created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 'mem_dad', ?, ?)`,
        [p.id, familyId, p.name, p.lat, p.lon, p.rad, p.cat, p.icon, now, now]
      );
    }

    // 13. Location settings & current locations
    const memberLocs = [
      { memberId: 'mem_dad', lat: 19.9072, lon: 99.8325, acc: 12, mode: 'APP_ACTIVE', place: 'บ้านสุขใจ' },
      { memberId: 'mem_mom', lat: 19.8962, lon: 99.8326, acc: 18, mode: 'APP_ACTIVE', place: 'Central Chiang Rai' },
      { memberId: 'mem_ton', lat: 19.9150, lon: 99.8400, acc: 15, mode: 'APP_ACTIVE', place: 'โรงเรียนสาธิตฯ' },
      { memberId: 'mem_may', lat: 19.9072, lon: 99.8325, acc: 14, mode: 'APP_ACTIVE', place: 'บ้านสุขใจ' },
    ];

    for (const m of memberLocs) {
      await execute(
        `INSERT OR REPLACE INTO member_location_settings (id, family_id, family_member_id, sharing_mode, sharing_enabled, history_enabled, retention_days, updated_at)
         VALUES (?, ?, ?, ?, 1, 1, 7, ?)`,
        [`locset_${m.memberId}`, familyId, m.memberId, m.mode, now]
      );
      await execute(
        `INSERT OR REPLACE INTO member_current_locations (id, family_id, family_member_id, latitude, longitude, accuracy, recorded_at, updated_at, source)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'foreground')`,
        [`curloc_${m.memberId}`, familyId, m.memberId, m.lat, m.lon, m.acc, now, now]
      );
      await execute(
        `INSERT OR REPLACE INTO member_location_history (id, family_id, family_member_id, latitude, longitude, accuracy, recorded_at, source, created_at, place_name)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'foreground', ?, ?)`,
        [`hist_${m.memberId}_1`, familyId, m.memberId, m.lat, m.lon, m.acc, now, now, m.place]
      );
    }
  } catch (err) {
    console.error('[SEED] Seeding error:', err);
  }
}
