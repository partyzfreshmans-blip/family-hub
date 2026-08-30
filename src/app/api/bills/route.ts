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
      "SELECT * FROM bills WHERE family_id = ? ORDER BY CASE status WHEN 'UNPAID' THEN 1 WHEN 'OVERDUE' THEN 2 ELSE 3 END, due_date ASC",
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
    const { name, amount, category, dueDate, recurrenceRule, notes, attachmentUrl, attachmentName, attachmentType, imageUrl } = body;

    const numAmount = parseFloat(amount);
    if (!name || !name.trim() || !amount || isNaN(numAmount) || numAmount <= 0 || !dueDate) {
      return NextResponse.json({ error: 'กรุณากรอกข้อมูลบิลให้ถูกต้อง' }, { status: 400 });
    }

    const billId = generateId('bil');
    const now = new Date().toISOString();
    const finalAttachmentUrl = attachmentUrl || body.attachment_url || imageUrl || body.image_url || null;
    const finalAttachmentName = attachmentName || body.attachment_name || null;
    const finalAttachmentType = attachmentType || body.attachment_type || null;

    await execute(
      `INSERT INTO bills (
        id, family_id, name, amount, category, due_date,
        recurrence_rule, status, notes, attachment_url, attachment_name, attachment_type, image_url, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'UNPAID', ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        billId,
        ctx.family.id,
        name.trim(),
        numAmount,
        category || 'Utilities',
        dueDate,
        recurrenceRule || 'MONTHLY',
        notes?.trim() || null,
        finalAttachmentUrl,
        finalAttachmentName,
        finalAttachmentType,
        finalAttachmentUrl,
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

// Helper: compute next due date
function computeNextDueDate(currentDueDateStr: string, recurrenceRule: string): string {
  const date = new Date(currentDueDateStr);
  if (isNaN(date.getTime())) return currentDueDateStr;

  switch (recurrenceRule) {
    case 'WEEKLY':
      date.setDate(date.getDate() + 7);
      break;
    case 'BIWEEKLY':
      date.setDate(date.getDate() + 14);
      break;
    case 'MONTHLY':
      date.setMonth(date.getMonth() + 1);
      break;
    case 'BIMONTHLY':
      date.setMonth(date.getMonth() + 2);
      break;
    case 'QUARTERLY':
      date.setMonth(date.getMonth() + 3);
      break;
    case 'SEMIANNUALLY':
      date.setMonth(date.getMonth() + 6);
      break;
    case 'YEARLY':
      date.setFullYear(date.getFullYear() + 1);
      break;
    default:
      return currentDueDateStr;
  }

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// PATCH: Mark bill as paid or edit
export async function PATCH(req: Request) {
  try {
    const ctx = await getCurrentUserContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (ctx.member.role === 'CHILD') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { id, markPaid, paidBy, amount, paidDate, note, name, dueDate, recurrenceRule, status, notes, attachmentUrl, attachmentName, attachmentType, imageUrl } = body;

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
      const finalPayAttachmentUrl = attachmentUrl || body.attachment_url || imageUrl || body.image_url || null;
      const finalPayAttachmentName = attachmentName || body.attachment_name || null;
      const finalPayAttachmentType = attachmentType || body.attachment_type || null;

      await transaction(async () => {
        // 1. Insert payment record with payment slip
        await execute(
          `INSERT INTO bill_payments (id, bill_id, family_id, amount, paid_date, paid_by, note, attachment_url, attachment_name, attachment_type, image_url, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            generateId('pay'),
            bill.id,
            ctx.family.id,
            paymentAmount,
            paymentDate,
            payer,
            note || 'ชำระตามกำหนด',
            finalPayAttachmentUrl,
            finalPayAttachmentName,
            finalPayAttachmentType,
            finalPayAttachmentUrl,
            now,
          ]
        );

        // 2. Record as expense with receipt slip
        await execute(
          `INSERT INTO expenses (id, family_id, amount, category, description, paid_by, expense_date, note, image_url, created_by, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            generateId('exp'),
            ctx.family.id,
            paymentAmount,
            bill.category,
            `ชำระบิล: ${bill.name}`,
            payer,
            paymentDate,
            note || '',
            finalPayAttachmentUrl,
            ctx.member.id,
            now,
            now,
          ]
        );

        // 3. Update bill status & advance due date if recurring
        if (bill.recurrence_rule && bill.recurrence_rule !== 'NONE') {
          const nextDueDate = computeNextDueDate(bill.due_date, bill.recurrence_rule);
          await execute(
            "UPDATE bills SET status = 'UNPAID', due_date = ?, updated_at = ? WHERE id = ? AND family_id = ?",
            [nextDueDate, now, bill.id, ctx.family.id]
          );
        } else {
          await execute(
            "UPDATE bills SET status = 'PAID', updated_at = ? WHERE id = ? AND family_id = ?",
            [now, bill.id, ctx.family.id]
          );
        }
      });

      return NextResponse.json({ success: true, paid: true });
    }

    const finalAttachmentUrl = attachmentUrl !== undefined ? attachmentUrl : (body.attachment_url !== undefined ? body.attachment_url : (imageUrl !== undefined ? imageUrl : bill.attachment_url));
    const finalAttachmentName = attachmentName !== undefined ? attachmentName : (body.attachment_name !== undefined ? body.attachment_name : bill.attachment_name);
    const finalAttachmentType = attachmentType !== undefined ? attachmentType : (body.attachment_type !== undefined ? body.attachment_type : bill.attachment_type);

    // General update
    await execute(
      `UPDATE bills SET
        name = ?, amount = ?, category = ?, due_date = ?,
        recurrence_rule = ?, status = ?, notes = ?, attachment_url = ?, attachment_name = ?, attachment_type = ?, image_url = ?, updated_at = ?
       WHERE id = ? AND family_id = ?`,
      [
        name !== undefined ? name.trim() : bill.name,
        amount !== undefined ? parseFloat(amount) : bill.amount,
        body.category || bill.category,
        dueDate || bill.due_date,
        recurrenceRule || bill.recurrence_rule,
        status || bill.status,
        notes !== undefined ? (notes?.trim() || null) : bill.notes,
        finalAttachmentUrl,
        finalAttachmentName,
        finalAttachmentType,
        finalAttachmentUrl,
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

// DELETE bill or bill payment record (Admin only)
export async function DELETE(req: NextRequest) {
  try {
    const ctx = await getCurrentUserContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (ctx.member.role !== 'ADMIN') {
      return NextResponse.json({ error: 'เฉพาะแอดมินเท่านั้นที่มีสิทธิ์ลบข้อมูลบิลหรือประวัติการชำระเงิน' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const billId = searchParams.get('id');
    const paymentId = searchParams.get('paymentId');

    if (paymentId) {
      const payment = await queryOne<BillPayment>(
        'SELECT * FROM bill_payments WHERE id = ? AND family_id = ?',
        [paymentId, ctx.family.id]
      );
      if (!payment) {
        return NextResponse.json({ error: 'Payment record not found' }, { status: 404 });
      }

      // Delete payment history record
      await execute('DELETE FROM bill_payments WHERE id = ? AND family_id = ?', [paymentId, ctx.family.id]);

      // Also clean up any associated expense if exists
      await execute(
        'DELETE FROM expenses WHERE family_id = ? AND amount = ? AND expense_date = ? AND description LIKE ?',
        [ctx.family.id, payment.amount, payment.paid_date, '%ชำระบิล%']
      );

      return NextResponse.json({ success: true, deletedPaymentId: paymentId });
    }

    if (!billId) {
      return NextResponse.json({ error: 'Bill ID or Payment ID required' }, { status: 400 });
    }

    await execute('DELETE FROM bills WHERE id = ? AND family_id = ?', [billId, ctx.family.id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
