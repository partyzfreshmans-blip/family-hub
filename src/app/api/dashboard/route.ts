import { NextResponse } from 'next/server';
import { getCurrentUserContext } from '@/lib/session';
import { query, queryOne } from '@/lib/db';
import { getTodayDateString, getCurrentMonthRange } from '@/lib/utils';
import { CalendarEvent, Task, ShoppingItem, Bill } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const ctx = await getCurrentUserContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = ctx.family.id;
    const today = getTodayDateString();
    const { start: monthStart, end: monthEnd } = getCurrentMonthRange();

    // 1. Today's Events (up to 5 items)
    const todayEvents = await query<CalendarEvent>(
      `SELECT e.*, GROUP_CONCAT(em.family_member_id) as member_ids_str
       FROM events e
       LEFT JOIN event_members em ON e.id = em.event_id
       WHERE e.family_id = ? AND (e.event_date = ? OR e.recurrence_rule != 'NONE')
       GROUP BY e.id
       ORDER BY e.start_time ASC
       LIMIT 5`,
      [familyId, today]
    );

    // 2. Tasks for Today (due today or overdue or assigned to member)
    const tasks = await query<Task & { assignee_nick?: string; assignee_color?: string }>(
      `SELECT t.*, m.nickname as assignee_nick, m.member_color as assignee_color
       FROM tasks t
       LEFT JOIN family_members m ON t.assigned_to = m.id
       WHERE t.family_id = ? AND (
         t.due_date = ? 
         OR (t.due_date < ? AND t.status != 'COMPLETED')
         OR t.assigned_to = ?
       )
       ORDER BY 
         CASE t.status WHEN 'COMPLETED' THEN 2 ELSE 1 END,
         CASE t.priority WHEN 'HIGH' THEN 1 WHEN 'NORMAL' THEN 2 ELSE 3 END,
         t.due_date ASC
       LIMIT 6`,
      [familyId, today, today, ctx.member.id]
    );

    // 3. Shopping List Summary
    const pendingShoppingCount = await queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM shopping_items WHERE family_id = ? AND purchased = 0',
      [familyId]
    );

    const pendingShoppingItems = await query<ShoppingItem>(
      'SELECT * FROM shopping_items WHERE family_id = ? AND purchased = 0 ORDER BY created_at DESC LIMIT 4',
      [familyId]
    );

    // 4. Monthly Expense Calculation
    let expenseSum = 0;
    // Child does not see family expenses unless allowed
    if (ctx.member.role !== 'CHILD') {
      const expRes = await queryOne<{ total: number }>(
        'SELECT SUM(amount) as total FROM expenses WHERE family_id = ? AND expense_date >= ? AND expense_date <= ?',
        [familyId, monthStart, monthEnd]
      );
      expenseSum = expRes?.total || 0;
    }

    // 5. Upcoming Bills
    let upcomingBills: Bill[] = [];
    if (ctx.member.role !== 'CHILD') {
      upcomingBills = await query<Bill>(
        `SELECT * FROM bills 
         WHERE family_id = ? AND status != 'PAID'
         ORDER BY due_date ASC LIMIT 3`,
        [familyId]
      );
    }

    return NextResponse.json({
      family: ctx.family,
      member: ctx.member,
      today,
      events: todayEvents,
      tasks,
      shopping: {
        totalPending: pendingShoppingCount?.count || 0,
        items: pendingShoppingItems,
      },
      expenses: {
        spent: expenseSum,
        budget: ctx.family.monthly_budget,
        remaining: Math.max(0, ctx.family.monthly_budget - expenseSum),
        isOverBudget: expenseSum > ctx.family.monthly_budget && ctx.family.monthly_budget > 0,
        showFinancials: ctx.member.role !== 'CHILD',
      },
      bills: upcomingBills,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return NextResponse.json({ error: 'Failed to load dashboard data' }, { status: 500 });
  }
}
