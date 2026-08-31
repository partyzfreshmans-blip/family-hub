import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserContext } from '@/lib/session';
import { query, queryOne, execute } from '@/lib/db';
import { generateId } from '@/lib/utils';
import { Debt, DebtPayment } from '@/types';

export const dynamic = 'force-dynamic';

// GET: List all debts / loans for the family
export async function GET() {
  try {
    const ctx = await getCurrentUserContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (ctx.member.role === 'CHILD') {
      return NextResponse.json({ error: 'เด็กไม่มีสิทธิ์เข้าถึงข้อมูลหนี้สิน' }, { status: 403 });
    }

    const debts = await query<Debt>(
      `SELECT * FROM debts WHERE family_id = ? ORDER BY status ASC, is_rental_asset DESC, monthly_payment DESC`,
      [ctx.family.id]
    );

    const payments = await query<DebtPayment & { payer_nick?: string; debt_name?: string }>(
      `SELECT dp.*, m.nickname as payer_nick, d.name as debt_name
       FROM debt_payments dp
       LEFT JOIN family_members m ON dp.paid_by = m.id
       LEFT JOIN debts d ON dp.debt_id = d.id
       WHERE dp.family_id = ?
       ORDER BY dp.paid_date DESC LIMIT 50`,
      [ctx.family.id]
    );

    const enrichedDebts = debts.map((d) => ({
      ...d,
      net_rental_cashflow: (d.expected_rental_income || 0) - (d.monthly_payment || 0),
      progress_percent: d.total_amount > 0 ? Math.round(((d.total_amount - d.remaining_balance) / d.total_amount) * 100) : 0,
    }));

    return NextResponse.json({ debts: enrichedDebts, payments });
  } catch (error) {
    console.error('Fetch debts error:', error);
    return NextResponse.json({ error: 'Failed to fetch debts' }, { status: 500 });
  }
}

// POST: Add new debt / rental loan
export async function POST(req: NextRequest) {
  try {
    const ctx = await getCurrentUserContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (ctx.member.role !== 'ADMIN' && ctx.member.role !== 'ADULT') {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const body = await req.json();
    const {
      name,
      debtType,
      totalAmount,
      remainingBalance,
      monthlyPayment,
      interestRate,
      totalInstallments,
      paidInstallments,
      dueDayOfMonth,
      lenderName,
      isRentalAsset,
      expectedRentalIncome,
      tenantName,
      notes,
    } = body;

    if (!name || !name.trim() || !debtType) {
      return NextResponse.json({ error: 'กรุณากรอกชื่อหนี้สิน/สินเชื่อ และเลือกประเภท' }, { status: 400 });
    }

    const numTotal = parseFloat(totalAmount) || 0;
    const numRemaining = remainingBalance !== undefined && remainingBalance !== '' ? parseFloat(remainingBalance) : numTotal;
    const numMonthly = parseFloat(monthlyPayment) || 0;

    const debtId = generateId('dbt');
    const now = new Date().toISOString();

    await execute(
      `INSERT INTO debts (
        id, family_id, name, debt_type, total_amount, remaining_balance, monthly_payment,
        interest_rate, total_installments, paid_installments, due_day_of_month, lender_name,
        is_rental_asset, expected_rental_income, tenant_name, notes, status,
        created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?)`,
      [
        debtId,
        ctx.family.id,
        name.trim(),
        debtType,
        numTotal,
        numRemaining,
        numMonthly,
        interestRate ? parseFloat(interestRate) : null,
        totalInstallments ? parseInt(totalInstallments) : null,
        paidInstallments ? parseInt(paidInstallments) : 0,
        dueDayOfMonth ? parseInt(dueDayOfMonth) : null,
        lenderName?.trim() || null,
        isRentalAsset ? 1 : 0,
        expectedRentalIncome ? parseFloat(expectedRentalIncome) : 0,
        tenantName?.trim() || null,
        notes?.trim() || null,
        ctx.member.id,
        now,
        now,
      ]
    );

    return NextResponse.json({ success: true, debtId });
  } catch (error) {
    console.error('Add debt error:', error);
    return NextResponse.json({ error: 'Failed to add debt' }, { status: 500 });
  }
}

// PUT: Edit debt / rental asset
export async function PUT(req: NextRequest) {
  try {
    const ctx = await getCurrentUserContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (ctx.member.role !== 'ADMIN' && ctx.member.role !== 'ADULT') {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const body = await req.json();
    const {
      id,
      name,
      debtType,
      totalAmount,
      remainingBalance,
      monthlyPayment,
      interestRate,
      totalInstallments,
      paidInstallments,
      dueDayOfMonth,
      lenderName,
      isRentalAsset,
      expectedRentalIncome,
      tenantName,
      notes,
      status,
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'Debt ID required' }, { status: 400 });
    }

    const existing = await queryOne<Debt>('SELECT * FROM debts WHERE id = ? AND family_id = ?', [id, ctx.family.id]);
    if (!existing) {
      return NextResponse.json({ error: 'Debt not found' }, { status: 404 });
    }

    const now = new Date().toISOString();

    await execute(
      `UPDATE debts SET
        name = ?, debt_type = ?, total_amount = ?, remaining_balance = ?, monthly_payment = ?,
        interest_rate = ?, total_installments = ?, paid_installments = ?, due_day_of_month = ?,
        lender_name = ?, is_rental_asset = ?, expected_rental_income = ?, tenant_name = ?,
        notes = ?, status = ?, updated_at = ?
       WHERE id = ? AND family_id = ?`,
      [
        name !== undefined ? name.trim() : existing.name,
        debtType || existing.debt_type,
        totalAmount !== undefined ? parseFloat(totalAmount) : existing.total_amount,
        remainingBalance !== undefined ? parseFloat(remainingBalance) : existing.remaining_balance,
        monthlyPayment !== undefined ? parseFloat(monthlyPayment) : existing.monthly_payment,
        interestRate !== undefined ? (interestRate ? parseFloat(interestRate) : null) : existing.interest_rate,
        totalInstallments !== undefined ? (totalInstallments ? parseInt(totalInstallments) : null) : existing.total_installments,
        paidInstallments !== undefined ? parseInt(paidInstallments) : existing.paid_installments,
        dueDayOfMonth !== undefined ? (dueDayOfMonth ? parseInt(dueDayOfMonth) : null) : existing.due_day_of_month,
        lenderName !== undefined ? (lenderName?.trim() || null) : existing.lender_name,
        isRentalAsset !== undefined ? (isRentalAsset ? 1 : 0) : existing.is_rental_asset,
        expectedRentalIncome !== undefined ? (expectedRentalIncome ? parseFloat(expectedRentalIncome) : 0) : existing.expected_rental_income,
        tenantName !== undefined ? (tenantName?.trim() || null) : existing.tenant_name,
        notes !== undefined ? (notes?.trim() || null) : existing.notes,
        status || existing.status,
        now,
        id,
        ctx.family.id,
      ]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update debt error:', error);
    return NextResponse.json({ error: 'Failed to update debt' }, { status: 500 });
  }
}

// PATCH: Pay installment / record debt payment (Updates balance, records payment, creates expense)
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
    const { debtId, amount, principalAmount, interestAmount, paidDate, paidBy, slipUrl, note, recordExpense } = body;

    if (!debtId || !amount) {
      return NextResponse.json({ error: 'Debt ID and amount required' }, { status: 400 });
    }

    const debt = await queryOne<Debt>('SELECT * FROM debts WHERE id = ? AND family_id = ?', [debtId, ctx.family.id]);
    if (!debt) {
      return NextResponse.json({ error: 'Debt not found' }, { status: 404 });
    }

    const numAmount = parseFloat(amount);
    const numPrincipal = principalAmount ? parseFloat(principalAmount) : numAmount;
    const numInterest = interestAmount ? parseFloat(interestAmount) : 0;
    const newRemaining = Math.max(0, debt.remaining_balance - numPrincipal);
    const newPaidInstallments = (debt.paid_installments || 0) + 1;
    const newStatus = newRemaining <= 0 ? 'PAID_OFF' : debt.status;

    const paymentId = generateId('dp');
    const now = new Date().toISOString();
    const payDate = paidDate || now.substring(0, 10);

    // 1. Record debt payment
    await execute(
      `INSERT INTO debt_payments (
        id, debt_id, family_id, amount, principal_amount, interest_amount,
        paid_date, paid_by, installment_number, slip_url, note, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        paymentId,
        debtId,
        ctx.family.id,
        numAmount,
        numPrincipal,
        numInterest,
        payDate,
        paidBy || ctx.member.id,
        newPaidInstallments,
        slipUrl || null,
        note?.trim() || `ชำระค่างวด: ${debt.name}`,
        now,
      ]
    );

    // 2. Update debt balance
    await execute(
      `UPDATE debts SET
        remaining_balance = ?, paid_installments = ?, status = ?, updated_at = ?
       WHERE id = ? AND family_id = ?`,
      [newRemaining, newPaidInstallments, newStatus, now, debtId, ctx.family.id]
    );

    // 3. Optionally record in expenses
    if (recordExpense !== false) {
      const expId = generateId('exp');
      await execute(
        `INSERT INTO expenses (
          id, family_id, amount, category, description, paid_by, expense_date, note, image_url, created_by, created_at, updated_at
        ) VALUES (?, ?, ?, 'House', ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          expId,
          ctx.family.id,
          numAmount,
          `ชำระค่างวด: ${debt.name}`,
          paidBy || ctx.member.id,
          payDate,
          `ตัดเงินต้น ฿${numPrincipal.toLocaleString()} ดอกเบี้ย ฿${numInterest.toLocaleString()}`,
          slipUrl || null,
          ctx.member.id,
          now,
          now,
        ]
      );
    }

    return NextResponse.json({ success: true, paymentId, remainingBalance: newRemaining, status: newStatus });
  } catch (error) {
    console.error('Pay debt error:', error);
    return NextResponse.json({ error: 'Failed to record debt payment' }, { status: 500 });
  }
}

// DELETE: Delete debt or delete specific payment record (Admin only)
export async function DELETE(req: NextRequest) {
  try {
    const ctx = await getCurrentUserContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (ctx.member.role !== 'ADMIN') {
      return NextResponse.json({ error: 'เฉพาะแอดมินเท่านั้นที่มีสิทธิ์ลบข้อมูลหนี้สิน' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const debtId = searchParams.get('id');
    const paymentId = searchParams.get('paymentId');

    if (paymentId) {
      await execute('DELETE FROM debt_payments WHERE id = ? AND family_id = ?', [paymentId, ctx.family.id]);
      return NextResponse.json({ success: true });
    }

    if (!debtId) {
      return NextResponse.json({ error: 'Debt ID required' }, { status: 400 });
    }

    await execute('DELETE FROM debts WHERE id = ? AND family_id = ?', [debtId, ctx.family.id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete debt' }, { status: 500 });
  }
}
