import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserContext } from '@/lib/session';
import { query, queryOne, execute } from '@/lib/db';
import { generateId, getCurrentMonthRange } from '@/lib/utils';
import { Expense } from '@/types';

// GET: list expenses and monthly summary
export async function GET(req: NextRequest) {
  try {
    const ctx = await getCurrentUserContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (ctx.member.role === 'CHILD') {
      return NextResponse.json({ error: 'เด็กไม่มีสิทธิ์เข้าถึงข้อมูลการเงินครอบครัว' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month'); // YYYY-MM
    let startDate: string;
    let endDate: string;

    if (month) {
      const [y, m] = month.split('-');
      const lastDay = new Date(parseInt(y), parseInt(m), 0).getDate();
      startDate = `${month}-01`;
      endDate = `${month}-${String(lastDay).padStart(2, '0')}`;
    } else {
      const range = getCurrentMonthRange();
      startDate = range.start;
      endDate = range.end;
    }

    const expenses = await query<Expense & { payer_nick?: string; payer_color?: string }>(
      `SELECT e.*, m.nickname as payer_nick, m.member_color as payer_color
       FROM expenses e
       LEFT JOIN family_members m ON e.paid_by = m.id
       WHERE e.family_id = ? AND e.expense_date >= ? AND e.expense_date <= ?
       ORDER BY e.expense_date DESC, e.created_at DESC`,
      [ctx.family.id, startDate, endDate]
    );

    // Sum total
    const totalSpent = expenses.reduce((acc, curr) => acc + (curr.amount || 0), 0);

    // Category breakdown
    const categoryTotals: Record<string, number> = {};
    for (const exp of expenses) {
      categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount;
    }

    return NextResponse.json({
      expenses,
      summary: {
        totalSpent,
        budget: ctx.family.monthly_budget,
        remaining: Math.max(0, ctx.family.monthly_budget - totalSpent),
        categoryTotals,
        startDate,
        endDate,
      },
    });
  } catch (error) {
    console.error('Fetch expenses error:', error);
    return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 });
  }
}

// POST: Add expense
export async function POST(req: NextRequest) {
  try {
    const ctx = await getCurrentUserContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (ctx.member.role === 'CHILD') {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const body = await req.json();
    const { amount, category, description, paidBy, expenseDate, note, location, imageUrl } = body;

    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json({ error: 'จำนวนเงินต้องมากกว่า 0 บาท' }, { status: 400 });
    }

    if (!description || !description.trim() || !category || !expenseDate) {
      return NextResponse.json({ error: 'กรุณากรอกข้อมูลให้ครบถ้วน' }, { status: 400 });
    }

    const expenseId = generateId('exp');
    const now = new Date().toISOString();

    await execute(
      `INSERT INTO expenses (
        id, family_id, amount, category, description, paid_by,
        expense_date, note, location, image_url, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        expenseId,
        ctx.family.id,
        numAmount,
        category,
        description.trim(),
        paidBy || ctx.member.id,
        expenseDate,
        note?.trim() || null,
        location?.trim() || null,
        imageUrl || body.image_url || null,
        ctx.member.id,
        now,
        now,
      ]
    );

    return NextResponse.json({ success: true, expenseId });
  } catch (error) {
    console.error('Add expense error:', error);
    return NextResponse.json({ error: 'Failed to save expense' }, { status: 500 });
  }
}

// PUT: Edit expense
export async function PUT(req: NextRequest) {
  try {
    const ctx = await getCurrentUserContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (ctx.member.role === 'CHILD') {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const body = await req.json();
    const { id, amount, category, description, paidBy, expenseDate, note, location, imageUrl } = body;

    if (!id) {
      return NextResponse.json({ error: 'Expense ID required' }, { status: 400 });
    }

    const expense = await queryOne<Expense>('SELECT * FROM expenses WHERE id = ? AND family_id = ?', [id, ctx.family.id]);
    if (!expense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json({ error: 'จำนวนเงินต้องมากกว่า 0 บาท' }, { status: 400 });
    }

    const now = new Date().toISOString();

    await execute(
      `UPDATE expenses SET
        amount = ?, category = ?, description = ?, paid_by = ?,
        expense_date = ?, note = ?, location = ?, image_url = ?, updated_at = ?
       WHERE id = ? AND family_id = ?`,
      [
        numAmount,
        category || expense.category,
        description !== undefined ? description.trim() : expense.description,
        paidBy || expense.paid_by,
        expenseDate || expense.expense_date,
        note !== undefined ? (note?.trim() || null) : expense.note,
        location !== undefined ? (location?.trim() || null) : expense.location,
        imageUrl !== undefined ? imageUrl : (body.image_url !== undefined ? body.image_url : expense.image_url),
        now,
        id,
        ctx.family.id,
      ]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update expense error:', error);
    return NextResponse.json({ error: 'Failed to update expense' }, { status: 500 });
  }
}

// DELETE: Delete expense
export async function DELETE(req: NextRequest) {
  try {
    const ctx = await getCurrentUserContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (ctx.member.role === 'CHILD') {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const expenseId = searchParams.get('id');

    if (!expenseId) {
      return NextResponse.json({ error: 'Expense ID required' }, { status: 400 });
    }

    await execute('DELETE FROM expenses WHERE id = ? AND family_id = ?', [expenseId, ctx.family.id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete expense' }, { status: 500 });
  }
}
