import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserContext } from '@/lib/session';
import { query, queryOne, execute, transaction } from '@/lib/db';
import { generateId } from '@/lib/utils';
import { Bill, BillPayment } from '@/types';

// GET: list bills and their payment history
export async function GET() {
  try {
    const ctx = await getCurrentUserContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (ctx.member.role === 'CHILD') {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const bills = await query<Bill>(
      'SELECT * FROM bills WHERE family_id = ? ORDER BY CASE status WHEN "UNPAID" THEN 1 WHEN "OVERDUE" THEN 2 ELSE 3 END, due_date ASC',
      [ctx.family.id]
    );

    const payments = await query<BillPayment & { payer_nick?: string }>(
      `SELECT p.*, m.nickname as payer_nick 
       FROM bill_payments p 
       LEFT JOIN family_members m ON p.paid_by = m.id
       WHERE p.family_id = ? 
       ORDER BY p.paid_date DESC LIMIT 50`,
      [ctx.family.id]
    );

    return NextResponse.json({ bills, payments });
  } catch (error) {
    console.error('Fetch bills error:', error);
    return NextResponse.json({ error: 'Failed to fetch bills' }, { status: 500 });
  }
}

// POST: Add new bill
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
    const { name, amount, category, dueDate, recurrenceRule, notes } = body;

    const numAmount = parseFloat(amount);
    if (!name || !name.trim() || !amount || isNaN(numAmount) || numAmount <= 0 || !dueDate) {
      return NextResponse.json({ error: 'กรุณากรอกข้อมูลบิลให้ถูกต้อง' }, { status: 400 });
    }

    const billId = generateId('bil');
    const now = new Date().toISOString();

    await execute(
      `INSERT INTO bills (
        id, family_id, name, amount, category, due_date,
        recurrence_rule, status, notes, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'UNPAID', ?, ?, ?, ?)`,
      [
        billId,
        ctx.family.id,
        name.trim(),
        numAmount,
        category || 'Utilities',
        dueDate,
        recurrenceRule || 'MONTHLY',
        notes?.trim() || null,
        ctx.member.id,
        now,
        now,
      ]
    );

    return NextResponse.json({ success: true, billId });
  } catch (error) {
    console.error('Add bill error:', error);
    return NextResponse.json({ error: 'Failed to create bill' }, { status: 500 });
  }
}

// PATCH: Mark bill as paid or edit
export async function PATCH(req: NextRequest) {
  try {
    const ctx = await getCurrentUserContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (ctx.member.role === 'CHILD') {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const body = await req.json();
    const { id, markPaid, paidBy, amount, paidDate, note, name, dueDate, recurrenceRule, status, notes } = body;

    if (!id) {
      return NextResponse.json({ error: 'Bill ID required' }, { status: 400 });
    }

    const bill = await queryOne<Bill>('SELECT * FROM bills WHERE id = ? AND family_id = ?', [id, ctx.family.id]);
    if (!bill) {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
    }

    const now = new Date().toISOString();

    if (markPaid) {
      // Record payment & update status
      const paymentAmount = amount ? parseFloat(amount) : bill.amount;
      const paymentDate = paidDate || new Date().toISOString().split('T')[0];
      const payer = paidBy || ctx.member.id;

      await transaction(async () => {
        // 1. Insert payment record
        await execute(
          `INSERT INTO bill_payments (id, bill_id, family_id, amount, paid_date, paid_by, note, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [generateId('pay'), bill.id, ctx.family.id, paymentAmount, paymentDate, payer, note || 'ชำระตามกำหนด', now]
        );

        // 2. Optionally record as expense if wanted
        await execute(
          `INSERT INTO expenses (id, family_id, amount, category, description, paid_by, expense_date, note, created_by, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [generateId('exp'), ctx.family.id, paymentAmount, bill.category, `ชำระบิล: ${bill.name}`, payer, paymentDate, note || '', ctx.member.id, now, now]
        );

        // 3. Update bill status
        await execute(
          'UPDATE bills SET status = "PAID", updated_at = ? WHERE id = ? AND family_id = ?',
          [now, bill.id, ctx.family.id]
        );
      });

      return NextResponse.json({ success: true, paid: true });
    }

    // General update
    await execute(
      `UPDATE bills SET
        name = ?, amount = ?, category = ?, due_date = ?,
        recurrence_rule = ?, status = ?, notes = ?, updated_at = ?
       WHERE id = ? AND family_id = ?`,
      [
        name !== undefined ? name.trim() : bill.name,
        amount !== undefined ? parseFloat(amount) : bill.amount,
        body.category || bill.category,
        dueDate || bill.due_date,
        recurrenceRule || bill.recurrence_rule,
        status || bill.status,
        notes !== undefined ? (notes?.trim() || null) : bill.notes,
        now,
        id,
        ctx.family.id,
      ]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update bill error:', error);
    return NextResponse.json({ error: 'Failed to update bill' }, { status: 500 });
  }
}

// DELETE bill
export async function DELETE(req: NextRequest) {
  try {
    const ctx = await getCurrentUserContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (ctx.member.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only Admin can delete bills' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const billId = searchParams.get('id');

    if (!billId) {
      return NextResponse.json({ error: 'Bill ID required' }, { status: 400 });
    }

    await execute('DELETE FROM bills WHERE id = ? AND family_id = ?', [billId, ctx.family.id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete bill' }, { status: 500 });
  }
}
