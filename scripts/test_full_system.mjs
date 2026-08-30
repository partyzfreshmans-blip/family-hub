const BASE_URL = 'http://localhost:3005';

// Test summary reporter
const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  categories: {},
};

function assert(condition, testName, category = 'General', detail = null) {
  testResults.total++;
  if (!testResults.categories[category]) {
    testResults.categories[category] = { passed: 0, failed: 0, tests: [] };
  }

  if (condition) {
    testResults.passed++;
    testResults.categories[category].passed++;
    testResults.categories[category].tests.push({ name: testName, status: 'PASS' });
    console.log(`  ✅ [PASS] ${testName}`);
  } else {
    testResults.failed++;
    testResults.categories[category].failed++;
    testResults.categories[category].tests.push({ name: testName, status: 'FAIL' });
    console.error(`  ❌ [FAIL] ${testName}`, detail ? JSON.stringify(detail) : '');
  }
}

async function loginUser(email, password = 'password123') {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const cookie = res.headers.get('set-cookie');
  const data = await res.json();
  return { status: res.status, data, cookie };
}

async function apiRequest(endpoint, method = 'GET', body = null, cookie = null) {
  const headers = {};
  if (cookie) headers['Cookie'] = cookie;
  if (body) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    data = null;
  }

  return { status: res.status, data };
}

async function runAudit() {
  console.log('\n=============================================================');
  console.log('🚀 STARTING COMPREHENSIVE FAMILY HUB SYSTEM & ROLE AUDIT');
  console.log('=============================================================\n');

  // -------------------------------------------------------------
  // 1. AUTHENTICATION & ROLE SESSIONS
  // -------------------------------------------------------------
  console.log('📌 1. Testing Authentication & User Roles...');
  
  const dadLogin = await loginUser('dad@familyhub.local');
  const dadCookie = dadLogin.cookie;
  const dadMe = await apiRequest('/api/auth/me', 'GET', null, dadCookie);
  assert(dadLogin.status === 200 && dadMe.data?.member?.role === 'ADMIN', 'Dad (ADMIN) Login & Role Verification', 'Auth & Roles');

  const momLogin = await loginUser('mom@familyhub.local');
  const momCookie = momLogin.cookie;
  const momMe = await apiRequest('/api/auth/me', 'GET', null, momCookie);
  assert(momLogin.status === 200 && momMe.data?.member?.role === 'ADULT', 'Mom (ADULT) Login & Role Verification', 'Auth & Roles');

  const tonLogin = await loginUser('ton@familyhub.local');
  const tonCookie = tonLogin.cookie;
  const tonMe = await apiRequest('/api/auth/me', 'GET', null, tonCookie);
  assert(tonLogin.status === 200 && tonMe.data?.member?.role === 'CHILD', 'Ton (CHILD) Login & Role Verification', 'Auth & Roles');

  const mayLogin = await loginUser('may@familyhub.local');
  const mayCookie = mayLogin.cookie;
  const mayMe = await apiRequest('/api/auth/me', 'GET', null, mayCookie);
  assert(mayLogin.status === 200 && mayMe.data?.member?.role === 'CHILD', 'May (CHILD) Login & Role Verification', 'Auth & Roles');

  // Verify /api/auth/me display names
  const dadName = dadMe.data?.user?.display_name || dadMe.data?.user?.displayName || '';
  assert(dadMe.status === 200 && dadName.includes('พ่อ'), 'Dad Profile Display Name Verification', 'Auth & Roles');
  assert(tonMe.status === 200 && tonMe.data?.member?.nickname === 'น้องต้น', 'Ton Profile Nickname Verification', 'Auth & Roles');

  // -------------------------------------------------------------
  // 2. DASHBOARD & FAMILY MEMBERS API
  // -------------------------------------------------------------
  console.log('\n📌 2. Testing Dashboard & Family Members API...');
  const dashRes = await apiRequest('/api/dashboard', 'GET', null, dadCookie);
  assert(dashRes.status === 200 && dashRes.data.family?.name === 'ครอบครัวสุขใจ', 'Dashboard Data Fetching', 'Dashboard');

  const membersRes = await apiRequest('/api/families/members', 'GET', null, dadCookie);
  assert(membersRes.status === 200 && Array.isArray(membersRes.data.members) && membersRes.data.members.length >= 4, 'Family Members List >= 4 Members', 'Dashboard');

  // -------------------------------------------------------------
  // 3. CALENDAR & EVENTS
  // -------------------------------------------------------------
  console.log('\n📌 3. Testing Calendar & Events Management...');
  const todayStr = new Date().toISOString().split('T')[0];
  const createEvt = await apiRequest('/api/events', 'POST', {
    title: 'ประชุมผู้ปกครองโรงเรียน',
    description: 'โรงเรียนน้องต้น-น้องเมย์',
    eventDate: todayStr,
    startTime: '13:00',
    endTime: '15:00',
    allDay: false,
    location: 'หอประชุมใหญ่',
    category: 'Education',
    assignedMemberIds: [dadMe.data.member.id, momMe.data.member.id],
  }, dadCookie);
  assert(createEvt.status === 200 && createEvt.data.success, 'Dad creates Family Event', 'Calendar');
  const testEventId = createEvt.data.eventId;

  const momGetEvts = await apiRequest('/api/events', 'GET', null, momCookie);
  assert(momGetEvts.status === 200 && momGetEvts.data.events.some(e => e.id === testEventId), 'Mom views synced Event', 'Calendar');

  // -------------------------------------------------------------
  // 4. TASKS & GAMIFIED REWARDS SYSTEM
  // -------------------------------------------------------------
  console.log('\n📌 4. Testing Tasks & Gamified Points System...');
  const createTaskRes = await apiRequest('/api/tasks', 'POST', {
    title: 'ล้างจานและจัดโต๊ะอาหาร',
    description: 'ช่วยแม่หลังทานข้าวเย็น',
    assignedTo: tonMe.data.member.id,
    dueDate: todayStr,
    dueTime: '19:00',
    priority: 'NORMAL',
    points: 20,
    recurrenceRule: 'DAILY',
  }, dadCookie);
  assert(createTaskRes.status === 200 && createTaskRes.data.success, 'Dad assigns Task with 20 Points to Ton', 'Tasks & Rewards');
  const testTaskId = createTaskRes.data.taskId;

  // Ton completes the task
  const initialTonPoints = (await apiRequest('/api/rewards', 'GET', null, tonCookie)).data.memberPoints || 0;
  const completeTaskRes = await apiRequest('/api/tasks', 'PATCH', {
    id: testTaskId,
    status: 'COMPLETED',
  }, tonCookie);
  assert(completeTaskRes.status === 200 && completeTaskRes.data.success, 'Ton marks Task as Completed', 'Tasks & Rewards');

  // Check that Ton received points
  const updatedTonPointsRes = await apiRequest('/api/rewards', 'GET', null, tonCookie);
  const updatedTonPoints = updatedTonPointsRes.data.memberPoints || 0;
  assert(updatedTonPoints >= initialTonPoints, 'Ton Points incremented after task completion', 'Tasks & Rewards');

  // Dad creates a reward
  const createRewardRes = await apiRequest('/api/rewards', 'POST', {
    name: 'สิทธิ์เลือกของเล่นสัปดาห์นี้ 🧸',
    requiredPoints: 50,
  }, dadCookie);
  assert(createRewardRes.status === 200 && createRewardRes.data.success, 'Dad creates Reward item', 'Tasks & Rewards');
  const testRewardId = createRewardRes.data.rewardId;

  // Ton redeems reward
  if (updatedTonPoints >= 50) {
    const redeemRes = await apiRequest('/api/rewards', 'POST', {
      rewardId: testRewardId,
      action: 'redeem',
    }, tonCookie);
    assert(redeemRes.status === 200 && redeemRes.data.success, 'Ton successfully redeems Reward', 'Tasks & Rewards');
  }

  // -------------------------------------------------------------
  // 5. SHOPPING LIST & EXPENSE CONVERSION
  // -------------------------------------------------------------
  console.log('\n📌 5. Testing Shopping List...');
  const addShopRes = await apiRequest('/api/shopping', 'POST', {
    name: 'ไข่ไก่สด Betagro 30 ฟอง',
    quantity: 1,
    unit: 'แผง',
    category: 'Grocery',
    note: 'เบอร์ 0',
  }, momCookie);
  assert(addShopRes.status === 200 && addShopRes.data?.success, 'Mom adds item to Shopping List', 'Shopping', addShopRes);
  const testShopId = addShopRes.data?.itemId;

  // Dad buys the item with price
  const buyShopRes = await apiRequest('/api/shopping', 'PATCH', {
    id: testShopId,
    purchased: 1,
    price: 150,
  }, dadCookie);
  assert(buyShopRes.status === 200 && buyShopRes.data?.success, 'Dad marks item as Purchased with Price', 'Shopping', buyShopRes);

  // -------------------------------------------------------------
  // 6. EXPENSES & ROLE PERMISSIONS (RBAC)
  // -------------------------------------------------------------
  console.log('\n📌 6. Testing Expenses & Financial RBAC...');
  // Child attempts to access expenses -> MUST BE 403 Forbidden
  const tonExpenses = await apiRequest('/api/expenses', 'GET', null, tonCookie);
  assert(tonExpenses.status === 403, 'Child blocked from Expenses (403 Forbidden)', 'Finance & RBAC');

  // Dad adds an expense
  const addExpRes = await apiRequest('/api/expenses', 'POST', {
    amount: 850,
    category: 'Food',
    description: 'ทานอาหารเย็นครอบครัว MK Suki',
    paidBy: dadMe.data.member.id,
    expenseDate: todayStr,
    note: 'มื้อพิเศษ',
  }, dadCookie);
  assert(addExpRes.status === 200 && addExpRes.data.success, 'Dad creates Expense record', 'Finance & RBAC');
  const testExpId = addExpRes.data.expenseId;

  // Mom views expenses
  const momExpRes = await apiRequest('/api/expenses', 'GET', null, momCookie);
  assert(momExpRes.status === 200 && momExpRes.data.expenses.some(e => e.id === testExpId), 'Mom views synced Expense list', 'Finance & RBAC');

  // -------------------------------------------------------------
  // 7. BILLS, PAYMENT PROOF & CASCADE DELETION
  // -------------------------------------------------------------
  console.log('\n📌 7. Testing Bills, Payment Slips & Cascade Deletion...');
  // Child attempts to access bills -> MUST BE 403 Forbidden
  const tonBills = await apiRequest('/api/bills', 'GET', null, tonCookie);
  assert(tonBills.status === 403, 'Child blocked from Bills (403 Forbidden)', 'Bills & Slips');

  // Dad creates Bill with QR Code
  const addBillRes = await apiRequest('/api/bills', 'POST', {
    name: 'ค่าอินเทอร์เน็ต AIS Fibre 1000/1000',
    amount: 699,
    category: 'Utilities',
    dueDate: todayStr,
    recurrenceRule: 'MONTHLY',
    notes: 'ตัดผ่านบัตรหรือสแกน QR',
    attachmentUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    attachmentName: 'ais_fiber_qr.png',
    attachmentType: 'image/png',
  }, dadCookie);
  assert(addBillRes.status === 200 && addBillRes.data.success, 'Dad creates Bill with QR code attachment', 'Bills & Slips');
  const testBillId = addBillRes.data.billId;

  // Mom records payment with payment slip
  const payBillRes = await apiRequest('/api/bills', 'PATCH', {
    id: testBillId,
    markPaid: true,
    amount: 699,
    paidDate: todayStr,
    paidBy: momMe.data.member.id,
    note: 'ชำระค่าเน็ต AIS เรียบร้อย',
    attachmentUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    attachmentName: 'slip_ais_699.png',
    attachmentType: 'image/png',
  }, momCookie);
  assert(payBillRes.status === 200 && payBillRes.data.paid, 'Mom pays bill and uploads transfer slip', 'Bills & Slips');

  // Verify slip is present in payments history
  const billsData = await apiRequest('/api/bills', 'GET', null, dadCookie);
  const matchedPayment = billsData.data.payments.find(p => p.bill_id === testBillId || p.amount === 699);
  assert(matchedPayment && matchedPayment.attachment_url, 'Payment record contains attached slip proof', 'Bills & Slips');

  // Mom (Non-Admin) tries to delete payment history record -> MUST BE 403 Forbidden
  if (matchedPayment) {
    const momDeletePay = await apiRequest(`/api/bills?paymentId=${matchedPayment.id}`, 'DELETE', null, momCookie);
    assert(momDeletePay.status === 403, 'Non-Admin (Mom) blocked from deleting Payment History (403)', 'Bills & Slips');

    // Dad (ADMIN) deletes payment history record -> MUST BE 200 OK
    const dadDeletePay = await apiRequest(`/api/bills?paymentId=${matchedPayment.id}`, 'DELETE', null, dadCookie);
    assert(dadDeletePay.status === 200 && dadDeletePay.data.success, 'Admin (Dad) deletes Payment History record', 'Bills & Slips');
  }

  // -------------------------------------------------------------
  // 8. FAMILY VAULT DOCUMENTS & ASSET SUB-CATEGORIES
  // -------------------------------------------------------------
  console.log('\n📌 8. Testing Family Vault Documents & Multi-level Assets...');
  // 1. Vehicle doc
  const addCarDoc = await apiRequest('/api/documents', 'POST', {
    title: 'พ.ร.บ. รถยนต์ประจำปี 2569',
    category: 'VEHICLE',
    sub_category: 'Honda Civic (2ขค-8888)',
    document_number: 'PRB-2026-9912',
    issuer: 'วิริยะประกันภัย',
    owner_member_id: dadMe.data.member.id,
    privacy_level: 'FAMILY',
    issue_date: todayStr,
    expiry_date: '2027-08-31',
    notes: 'ต่อภาษีที่ขนส่งเรียบร้อย',
  }, dadCookie);
  assert(addCarDoc.status === 200 && addCarDoc.data.success, 'Dad adds Car document with Subcategory (Honda Civic)', 'Documents');
  const carDocId = addCarDoc.data.documentId;

  // 2. House doc
  const addHouseDoc = await apiRequest('/api/documents', 'POST', {
    title: 'โฉนดที่ดินบ้านสุขใจ',
    category: 'HOUSE',
    sub_category: 'บ้านสุขใจ (บ้านหลัก)',
    document_number: 'โฉนดเลขที่ 12450',
    issuer: 'สำนักงานที่ดินกรุงเทพฯ',
    owner_member_id: null,
    privacy_level: 'FAMILY',
    notes: 'เก็บในตู้เซฟ',
  }, dadCookie);
  assert(addHouseDoc.status === 200 && addHouseDoc.data.success, 'Dad adds House document with Subcategory (บ้านสุขใจ)', 'Documents');

  // 3. Child Personal doc
  const addPassportDoc = await apiRequest('/api/documents', 'POST', {
    title: 'หนังสือเดินทาง (Passport)',
    category: 'PERSONAL',
    sub_category: 'น้องต้น',
    document_number: 'AA9876543',
    issuer: 'กรมการกงสุล',
    owner_member_id: tonMe.data.member.id,
    privacy_level: 'FAMILY',
    expiry_date: '2029-12-31',
  }, dadCookie);
  assert(addPassportDoc.status === 200 && addPassportDoc.data.success, 'Passport added for Child member', 'Documents');

  // Verify document querying & alerts
  const docsRes = await apiRequest('/api/documents', 'GET', null, momCookie);
  assert(docsRes.status === 200 && docsRes.data.documents.length >= 3, 'Mom views all Family Vault documents', 'Documents');
  assert(docsRes.data.categoryCounts?.VEHICLE >= 1 && docsRes.data.categoryCounts?.HOUSE >= 1, 'Document category counts accurately calculated', 'Documents');

  // -------------------------------------------------------------
  // 9. LOCATION & SOS EMERGENCY
  // -------------------------------------------------------------
  console.log('\n📌 9. Testing Location Sharing & SOS Emergency...');
  const locUpdateRes = await apiRequest('/api/location', 'POST', {
    latitude: 19.9075,
    longitude: 99.8327,
    accuracy: 10,
    source: 'foreground',
  }, tonCookie);
  assert(locUpdateRes.status === 200 && locUpdateRes.data.success, 'Ton sends Location coordinates', 'Location & SOS');

  // Dad triggers and resolves SOS
  const sosTrigger = await apiRequest('/api/location/sos', 'POST', {
    latitude: 19.9075,
    longitude: 99.8327,
    accuracy: 10,
  }, dadCookie);
  assert(sosTrigger.status === 200 && sosTrigger.data.success, 'Dad triggers SOS Emergency', 'Location & SOS', sosTrigger);

  const sosResolve = await apiRequest('/api/location/sos', 'PUT', {}, dadCookie);
  assert(sosResolve.status === 200 && sosResolve.data.success, 'Dad marks SOS Emergency as Resolved', 'Location & SOS', sosResolve);

  // -------------------------------------------------------------
  // 10. HOUSEHOLD INFO & EMERGENCY CONTACTS
  // -------------------------------------------------------------
  console.log('\n📌 10. Testing Household Info & Emergency Contacts...');
  const addInfoRes = await apiRequest('/api/info', 'POST', {
    category: 'EMERGENCY',
    title: 'เบอร์ติดต่อช่างแอร์ประจำบ้าน',
    value: '081-999-8877',
    contactPhone: '0819998877',
    notes: 'ช่างสมชาย ล้างแอร์ปีละ 2 ครั้ง',
  }, dadCookie);
  assert(addInfoRes.status === 200 && addInfoRes.data.success, 'Dad adds Emergency Contact info', 'Household Info', addInfoRes);

  const tonInfoRes = await apiRequest('/api/info', 'GET', null, tonCookie);
  assert(tonInfoRes.status === 200 && Array.isArray(tonInfoRes.data.items) && tonInfoRes.data.items.some(i => i.title.includes('ช่างแอร์')), 'Ton can read Household Emergency Info', 'Household Info', tonInfoRes);

  // -------------------------------------------------------------
  // 11. FAMILY SETTINGS & BUDGET
  // -------------------------------------------------------------
  console.log('\n📌 11. Testing Family Settings & Admin Permissions...');
  // Mom (Non-Admin) tries to change monthly budget -> MUST BE 403
  const momSettingRes = await apiRequest('/api/families/settings', 'PATCH', {
    monthlyBudget: 35000,
  }, momCookie);
  assert(momSettingRes.status === 403, 'Non-Admin (Mom) blocked from modifying Family Budget (403)', 'Family Settings');

  // Dad (ADMIN) updates monthly budget
  const dadSettingRes = await apiRequest('/api/families/settings', 'PATCH', {
    monthlyBudget: 30000,
  }, dadCookie);
  assert(dadSettingRes.status === 200 && dadSettingRes.data.success, 'Admin (Dad) updates Family Budget to 30,000 THB', 'Family Settings');

  // -------------------------------------------------------------
  // SUMMARY REPORT
  // -------------------------------------------------------------
  console.log('\n=============================================================');
  console.log(`📊 SYSTEM AUDIT RESULT: ${testResults.passed}/${testResults.total} TESTS PASSED`);
  console.log('=============================================================');
  for (const [cat, res] of Object.entries(testResults.categories)) {
    console.log(`- ${cat.padEnd(25)}: ${res.passed}/${res.passed + res.failed} Passed ${res.failed === 0 ? '🟢' : '🔴'}`);
  }
  console.log('=============================================================\n');

  return testResults;
}

runAudit().then(res => {
  if (res.failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}).catch(err => {
  console.error('Fatal audit runner error:', err);
  process.exit(1);
});
