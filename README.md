# 🏡 Family Hub (ฮับครอบครัว)

> **One home, one place for everything.**  
> *บ้านหนึ่งหลัง พื้นที่เดียวสำหรับทุกเรื่อง*

Family Hub คือเว็บแอปพลิเคชันสำหรับจัดการกิจกรรม งานบ้าน รายการซื้อของ ค่าใช้จ่าย บิล และข้อมูลสำคัญภายในครอบครัวแบบครบวงจร ออกแบบเพื่อการใช้งานจริงในครอบครัว รองรับมือถือ (Mobile-First), รองรับการติดตั้งแบบ PWA (Progressive Web App), เมนูและภาษาไทยเต็มรูปแบบ, โหมดสว่าง/โหมดมืด (Dark/Light Mode) พร้อมการแยกข้อมูลความปลอดภัยระหว่างครอบครัวอย่างสมบูรณ์

---

## ✨ ฟีเจอร์หลัก (Features)

1. **📊 หน้าหลัก (Home Dashboard)**
   - สรุปภาพรวมกิจกรรมวันนี้ (Today's Events)
   - งานบ้านและภารกิจที่ต้องทำ (Today's Tasks) พร้อมระบบติ๊กสำเร็จใน 1 แตะ
   - รายการของที่ต้องซื้อเข้าบ้าน (Shopping List Summary)
   - สรุปค่าใช้จ่ายเดือนนี้เทียบกับงบประมาณ (Monthly Expense vs Budget Bar)
   - บิลที่ใกล้ถึงกำหนดชำระ (Upcoming Bills)
   - แต้มสะสมของสมาชิก

2. **📅 ปฏิทินครอบครัว (Family Calendar)**
   - มุมมองรายเดือน (Month) และรายวัน (Day)
   - จัดหมวดหมู่กิจกรรม: ครอบครัว, โรงเรียน, งาน, นัดหมาย, วันเกิด, ท่องเที่ยว, สุขภาพ, อื่นๆ
   - ระบุผู้เข้าร่วมกิจกรรมด้วยสีประจำตัวสมาชิก
   - รองรับกิจกรรมทั้งวันและการทำซ้ำ (Daily, Weekly, Monthly, Yearly)

3. **📋 งานบ้านและภารกิจ (Household Tasks)**
   - จัดการงานบ้าน แบ่งสถานะ: ต้องทำ (To Do), กำลังทำ (In Progress), เสร็จแล้ว (Completed)
   - กำหนดผู้รับผิดชอบ, วัน-เวลาที่ต้องส่ง, และระดับความสำคัญ (ด่วน / ปกติ / ต่ำ)
   - กรองงานตามสมาชิก (งานของพ่อ, งานของแม่, งานของลูก)
   - **ระบบแต้มรางวัล (+Points)**: เมื่อทำงานสำเร็จ สมาชิกจะได้รับแต้มสะสมเข้าบัญชีทันที

4. **🛒 รายการซื้อของร่วมกัน (Shared Shopping List)**
   - ช่องเพิ่มของด่วน (Quick Add) พิมพ์แล้วกด Enter ได้ทันที
   - **ปุ่มแตะด่วน (Frequent Items)**: แตะครั้งเดียวเพิ่ม นม, ไข่, ข้าว, น้ำดื่ม, ขนมปัง, กระดาษชำระ
   - แยกหมวดหมู่: ของกิน, ของใช้ในบ้าน, ยา, ของใช้ส่วนตัว, สัตว์เลี้ยง
   - ติ๊กซื้อแล้วพร้อมปุ่มกู้คืน (Restore / Undo)

5. **💰 บันทึกค่าใช้จ่าย (Family Expenses)**
   - ติดตามรายจ่ายของบ้าน ระบุผู้จ่ายและหมวดหมู่
   - แสดงยอดรวมประจำเดือนเทียบกับงบประมาณ (Monthly Budget)
   - สรุปยอดตามหมวดหมู่
   - *จำกัดสิทธิ์ความปลอดภัย*: สมาชิกเด็ก (Child) จะไม่เห็นข้อมูลทางการเงิน

6. **🧾 จัดการบิลและค่าใช้จ่ายประจำ (Household Bills)**
   - ติดตามบิลค่าไฟ ค่าน้ำ อินเทอร์เน็ต ค่าเช่า ประกัน ฯลฯ
   - แจ้งเตือนสถานะ: ยังไม่จ่าย (Unpaid), เกินกำหนด (Overdue), จ่ายแล้ว (Paid)
   - ปุ่มบันทึกการชำระเงิน (Mark as Paid) พร้อมเก็บประวัติการจ่ายเงินย้อนหลัง (Payment History)

7. **👥 สมาชิกและสิทธิ์การใช้งาน (Family Members & RBAC)**
   - **Admin**: จัดการตั้งค่าบ้าน, งบประมาณ, สมาชิก, เปลี่ยนบทบาท, ระบบรางวัล
   - **Adult**: เพิ่มกิจกรรม, งานบ้าน, ซื้อของ, บันทึกค่าใช้จ่าย
   - **Child**: ดูกิจกรรม, ทำงานที่ได้รับมอบหมาย, สะสมแต้มและแลกของรางวัล
   - **รหัสเชิญ (Invite Code)**: รหัสเชิญเฉพาะครอบครัว เช่น `FAM-7KX92`

8. **🎁 ระบบรางวัลและแต้มสะสม (Reward Points)**
   - ผู้ดูแลสามารถสร้างของรางวัล (เช่น เลือกหนังดูคืนนี้ 100 แต้ม, เล่นเกมเพิ่ม 1 ชม. 200 แต้ม)
   - สมาชิกสามารถกดแลกรางวัลด้วยแต้มสะสม พร้อมระบบหักแต้มและบันทึกประวัติ

9. **📞 ข้อมูลสำคัญของบ้าน (Household Info Directory)**
   - รวมเบอร์โทรฉุกเฉิน นิติบุคคล ช่างล้างแอร์ ช่างไฟ รหัส Wi-Fi บ้าน ข้อมูลเครื่องใช้ไฟฟ้า
   - ปลอดภัย: มีคำเตือนป้องกันการบันทึกรหัสผ่านหรือข้อมูลการเงิน

10. **⚡ PWA & Responsive Mobile Design**
    - ติดตั้งบนหน้าจอมือถือ (Add to Home Screen) ทั้ง iOS และ Android
    - เมนูแถบล่าง (Bottom Navigation) ใช้งานง่ายด้วยมือเดียว
    - รองรับโหมดสว่าง (Light), โหมดมืด (Dark), และตามระบบ (System)

---

## 🛠️ เทคโนโลยีที่ใช้ (Tech Stack)

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Lucide React
- **Backend**: Next.js Server Components & Route Handlers
- **Database**: SQLite (SQL.js WebAssembly / Portable Relational Database) พร้อม schema constraints, foreign keys, และ indexes
- **Authentication**: JWT Cookie Session (`jose`) + Password Hashing (`bcryptjs`)
- **PWA**: Web Manifest (`manifest.json`), Service Worker (`sw.js`), Responsive Meta Tags

---

## 🚀 การติดตั้งและรันในเครื่อง (Local Development)

### 1. ติดตั้ง Dependencies
```bash
npm install
```

### 2. ตั้งค่าตัวแปรสภาพแวดล้อม (Environment Variables)
คัดลอกไฟล์ `.env.example` เป็น `.env.local`:
```bash
cp .env.example .env.local
```

### 3. รัน Seed ข้อมูลตัวอย่างครอบครัวสุขใจ
```bash
npm run seed
```

### 4. รันเซิร์ฟเวอร์สำหรับพัฒนา (Development Server)
```bash
npm run dev
```
เปิดเบราว์เซอร์ไปที่: [http://localhost:3000](http://localhost:3000)

---

## 🔑 ข้อมูลบัญชีตัวอย่างสำหรับทดสอบ (Demo Accounts)

ทุกบัญชีใช้รหัสผ่าน: `password123`

| ชื่อสมาชิก | บทบาท (Role) | อีเมล (Email) | สิทธิ์การใช้งาน |
| :--- | :--- | :--- | :--- |
| **พ่อ (สมศักดิ์)** | `ADMIN` | `dad@familyhub.local` | ผู้ดูแลครอบครัว จัดการการเงิน งบประมาณ สมาชิก |
| **แม่ (สุดา)** | `ADULT` | `mom@familyhub.local` | สร้างกิจกรรม งานบ้าน ซื้อของ บันทึกรายจ่าย |
| **น้องต้น** | `CHILD` | `ton@familyhub.local` | ทำงานบ้าน สะสมแต้ม แลกของรางวัล |
| **น้องเมย์** | `CHILD` | `may@familyhub.local` | ทำงานบ้าน สะสมแต้ม แลกของรางวัล |

*รหัสเชิญสำหรับเข้าร่วมครอบครัวสุขใจ:* **`FAM-7KX92`**

---

## 🔒 สถาปัตยกรรมความปลอดภัยและการแยกข้อมูล (Multi-Tenant Isolation)

- ข้อมูลทุกแถว (ตาราง `events`, `tasks`, `shopping_items`, `expenses`, `bills`, `rewards`, `household_info`) มี `family_id` กำกับ
- ทุก API Endpoint ตรวจสอบความถูกต้องของ JWT Token, ความเป็นสมาชิกในครอบครัว, และ Role-Based Access Control (RBAC) ทางฝั่ง Server-Side
- สมาชิกไม่สามารถเข้าถึงหรือแก้ไขข้อมูลของครอบครัวอื่นได้โดยเด็ดขาด

---

## 📱 การติดตั้งแบบ PWA บนมือถือ (Progressive Web App)

1. เปิดเว็บไซต์บนมือถือ (Safari บน iOS หรือ Chrome บน Android)
2. กดปุ่ม **แชร์ (Share)** บน Safari หรือ เมนู 3 จุด บน Chrome
3. เลือก **"เพิ่มไปยังหน้าจอโฮม" (Add to Home Screen)**
4. Family Hub จะเปิดใช้งานเสมือนแอปพลิเคชันมือถือเต็มหน้าจอ รองรับ Offline Shell

---

## 🌐 การ Deploy สู่ Production

สามารถ Deploy บนแพลตฟอร์มยอดนิยมได้ฟรีหรือต้นทุนต่ำมาก:
- **Vercel / Netlify / Render / Railway**: เชื่อมต่อ Git Repository และตั้งค่า Environment Variable `JWT_SECRET`
- **Docker**: รัน `npm run build && npm run start` บน Cloud VPS (เช่น DigitalOcean, Hetzner, AWS Lightsail)

---

## 📄 ใบอนุญาต (License)
MIT License — สำหรับการใช้งานส่วนตัวภายในครอบครัว
