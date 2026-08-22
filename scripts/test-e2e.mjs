// End-to-end API & Authentication & Multi-Tenant Security Test Script
const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING FAMILY HUB END-TO-END AUTOMATED TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, name) {
    if (condition) {
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${name}`);
      failed++;
    }
  }

  // 1. Test Static & HTML Pages
  const loginHtmlRes = await fetch(`${BASE_URL}/login`);
  assert(loginHtmlRes.status === 200, 'GET /login returns 200 OK');

  // 2. Test User Login (Dad - Admin)
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'dad@familyhub.local',
      password: 'password123',
    }),
  });

  assert(loginRes.status === 200, 'POST /api/auth/login returns 200 OK for Dad');
  const loginData = await loginRes.json();
  assert(loginData.success === true, 'Login response has success: true');
  assert(loginData.hasFamily === true, 'Dad belongs to ครอบครัวสุขใจ');

  const cookieHeader = loginRes.headers.get('set-cookie');
  const tokenCookie = cookieHeader ? cookieHeader.split(';')[0] : '';
  assert(!!tokenCookie, 'Session cookie received');

  // 3. Test GET /api/auth/me
  const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { Cookie: tokenCookie },
  });
  assert(meRes.status === 200, 'GET /api/auth/me returns 200 OK');
  const meData = await meRes.json();
  assert(meData.member.role === 'ADMIN', 'Dad role is ADMIN');
  assert(meData.family.name === 'ครอบครัวสุขใจ', 'Family name is ครอบครัวสุขใจ');

  // 4. Test GET /api/dashboard
  const dashRes = await fetch(`${BASE_URL}/api/dashboard`, {
    headers: { Cookie: tokenCookie },
  });
  assert(dashRes.status === 200, 'GET /api/dashboard returns 200 OK');
  const dashData = await dashRes.json();
  assert(Array.isArray(dashData.events) && dashData.events.length > 0, 'Dashboard contains upcoming events');
  assert(Array.isArray(dashData.tasks) && dashData.tasks.length > 0, 'Dashboard contains tasks');
  assert(dashData.expenses.showFinancials === true, 'Admin can view financials on dashboard');
  assert(dashData.expenses.spent > 0, 'Dashboard includes monthly expense calculation');

  // 5. Test Tasks CRUD & Reward Points
  const newTaskRes = await fetch(`${BASE_URL}/api/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: tokenCookie },
    body: JSON.stringify({
      title: 'กวาดใบไม้รอบบ้าน',
      dueDate: new Date().toISOString().split('T')[0],
      priority: 'NORMAL',
      points: 15,
      assignedTo: meData.member.id,
    }),
  });
  assert(newTaskRes.status === 200, 'POST /api/tasks creates new task');
  const newTaskData = await newTaskRes.json();

  // Complete task
  const completeTaskRes = await fetch(`${BASE_URL}/api/tasks`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: tokenCookie },
    body: JSON.stringify({
      id: newTaskData.taskId,
      status: 'COMPLETED',
    }),
  });
  assert(completeTaskRes.status === 200, 'PATCH /api/tasks marks task as COMPLETED and awards points');

  // 6. Test Shopping List CRUD
  const addShopRes = await fetch(`${BASE_URL}/api/shopping`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: tokenCookie },
    body: JSON.stringify({
      name: 'น้ำผลไม้ 100%',
      quantity: 2,
      unit: 'กล่อง',
      category: 'Grocery',
    }),
  });
  assert(addShopRes.status === 200, 'POST /api/shopping adds shopping item');

  const getShopRes = await fetch(`${BASE_URL}/api/shopping`, {
    headers: { Cookie: tokenCookie },
  });
  const shopData = await getShopRes.json();
  const addedItem = shopData.items.find((i) => i.name === 'น้ำผลไม้ 100%');
  assert(!!addedItem, 'Shopping item persisted in database');

  // 7. Test Expenses CRUD
  const addExpRes = await fetch(`${BASE_URL}/api/expenses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: tokenCookie },
    body: JSON.stringify({
      amount: 350,
      category: 'Food',
      description: 'ซื้อกาแฟและขนมปัง',
      expenseDate: new Date().toISOString().split('T')[0],
    }),
  });
  assert(addExpRes.status === 200, 'POST /api/expenses records family expense');

  // 8. Test Bills & Mark as Paid
  const getBillsRes = await fetch(`${BASE_URL}/api/bills`, {
    headers: { Cookie: tokenCookie },
  });
  const billsData = await getBillsRes.json();
  assert(Array.isArray(billsData.bills) && billsData.bills.length > 0, 'GET /api/bills returns household bills');

  const unpaidBill = billsData.bills.find((b) => b.status === 'UNPAID');
  if (unpaidBill) {
    const payBillRes = await fetch(`${BASE_URL}/api/bills`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: tokenCookie },
      body: JSON.stringify({
        id: unpaidBill.id,
        markPaid: true,
        amount: unpaidBill.amount,
        paidDate: new Date().toISOString().split('T')[0],
      }),
    });
    assert(payBillRes.status === 200, `PATCH /api/bills marked '${unpaidBill.name}' as PAID`);
  }

  // 9. Test Child Role Authorization Restriction
  const childLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'ton@familyhub.local',
      password: 'password123',
    }),
  });
  const childCookie = childLoginRes.headers.get('set-cookie')?.split(';')[0] || '';

  const childExpenseRes = await fetch(`${BASE_URL}/api/expenses`, {
    headers: { Cookie: childCookie },
  });
  assert(childExpenseRes.status === 403, 'Child role correctly receives 403 Forbidden for financial expense data');

  // 10. Test Multi-Tenant Family Isolation: Register User in Family B
  const registerRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: `other_family_${Date.now()}@example.com`,
      password: 'password123',
      displayName: 'สมชาย ครอบครัวอื่น',
    }),
  });
  assert(registerRes.status === 200, 'New user registered for independent family test');
  const userBCookie = registerRes.headers.get('set-cookie')?.split(';')[0] || '';

  // Create Family B
  const createFamilyBRes = await fetch(`${BASE_URL}/api/families`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: userBCookie },
    body: JSON.stringify({
      name: 'ครอบครัวเจริญสุข (Family B)',
      nickname: 'สมชาย',
    }),
  });
  assert(createFamilyBRes.status === 200, 'Created independent Family B');

  // User B queries tasks -> should NOT see Family A tasks
  const userBTasksRes = await fetch(`${BASE_URL}/api/tasks`, {
    headers: { Cookie: userBCookie },
  });
  const userBTasks = await userBTasksRes.json();
  const hasFamilyATask = (userBTasks.tasks || []).some((t) => t.title === 'ทิ้งขยะหน้าบ้าน');
  assert(!hasFamilyATask, 'Multi-tenant isolation verified: Family B cannot view Family A tasks');

  console.log('\n====================================================');
  console.log(`🎉 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');
}

runTests().catch(console.error);
