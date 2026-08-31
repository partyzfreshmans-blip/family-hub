import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserContext } from '@/lib/session';
import { query, queryOne, execute } from '@/lib/db';
import { generateId, getCurrentMonthRange } from '@/lib/utils';
import { Income } from '@/types';

export const dynamic = 'force-dynamic';

// GET: List incomes for family (optional month filter)
export async function GET(req: NextRequest) {
  try {
    const ctx = await getCurrentUserContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (ctx.member.role === 'CHILD') {
      return NextResponse.json({ error: 'เด็กไม่มีสิทธิ์เข้าถึงข้อมูลรายรับ' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month');
    const sourceType = searchParams.get('sourceType');

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

    let sql = `
      SELECT i.*, m.nickname as receiver_nick, m.member_color as receiver_color
      FROM incomes i
      LEFT JOIN family_members m ON i.received_by = m.id
      WHERE i.family_id = ? AND i.received_date >= ? AND i.received_date <= ?
    `;
    const params: any[] = [ctx.family.id, startDate, endDate];

    if (sourceType && sourceType !== 'ALL') {
      sql += ' AND i.source_type = ?';
      params.push(sourceType);
    }

    sql += ' ORDER BY i.received_date DESC, i.created_at DESC';

    const incomes = await query<Income & { receiver_nick?: string; receiver_color?: string }>(sql, params);
    const totalIncome = incomes.reduce((acc, curr) => acc + (curr.amount || 0), 0);

    return NextResponse.json({
      incomes,
      totalIncome,
      startDate,
      endDate,
    });
  } catch (error) {
    console.error('Fetch incomes error:', error);
    return NextResponse.json({ error: 'Failed to fetch incomes' }, { status: 500 });
  }
}

// POST: Add income
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
    const { amount, sourceType, sourceName, receivedDate, receivedBy, assetId, note, attachmentUrl } = body;

    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json({ error: 'จำนวนเงินต้องมากกว่า 0 บาท' }, { status: 400 });
    }

    if (!sourceName || !sourceName.trim() || !receivedDate) {
      return NextResponse.json({ error: 'กรุณากรอกชื่อแหล่งรายได้และวันที่รับเงิน' }, { status: 400 });
    }

    const incomeId = generateId('inc');
    const now = new Date().toISOString();

    await execute(
      `INSERT INTO incomes (
        id, family_id, amount, source_type, source_name, received_date, received_by,
        asset_id, note, attachment_url, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        incomeId,
        ctx.family.id,
        numAmount,
        sourceType || 'SALARY',
        sourceName.trim(),
        receivedDate,
        receivedBy || ctx.member.id,
        assetId || null,
        note?.trim() || null,
        attachmentUrl || null,
        now,
        now,
      ]
    );

    return NextResponse.json({ success: true, incomeId });
  } catch (error) {
    console.error('Add income error:', error);
    return NextResponse.json({ error: 'Failed to save income' }, { status: 500 });
  }
}

// PUT: Edit income
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
    const { id, amount, sourceType, sourceName, receivedDate, receivedBy, assetId, note, attachmentUrl } = body;

    if (!id) {
      return NextResponse.json({ error: 'Income ID required' }, { status: 400 });
    }

    const existing = await queryOne<Income>('SELECT * FROM incomes WHERE id = ? AND family_id = ?', [id, ctx.family.id]);
    if (!existing) {
      return NextResponse.json({ error: 'Income not found' }, { status: 404 });
    }

    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json({ error: 'จำนวนเงินต้องมากกว่า 0 บาท' }, { status: 400 });
    }

    const now = new Date().toISOString();

    await execute(
      `UPDATE incomes SET
        amount = ?, source_type = ?, source_name = ?, received_date = ?, received_by = ?,
        asset_id = ?, note = ?, attachment_url = ?, updated_at = ?
       WHERE id = ? AND family_id = ?`,
      [
        numAmount,
        sourceType || existing.source_type,
        sourceName !== undefined ? sourceName.trim() : existing.source_name,
        receivedDate || existing.received_date,
        receivedBy || existing.received_by,
        assetId !== undefined ? assetId : existing.asset_id,
        note !== undefined ? (note?.trim() || null) : existing.note,
        attachmentUrl !== undefined ? attachmentUrl : existing.attachment_url,
        now,
        id,
        ctx.family.id,
      ]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update income error:', error);
    return NextResponse.json({ error: 'Failed to update income' }, { status: 500 });
  }
}

// DELETE: Delete income
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
    const incomeId = searchParams.get('id');

    if (!incomeId) {
      return NextResponse.json({ error: 'Income ID required' }, { status: 400 });
    }

    await execute('DELETE FROM incomes WHERE id = ? AND family_id = ?', [incomeId, ctx.family.id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete income' }, { status: 500 });
  }
}
