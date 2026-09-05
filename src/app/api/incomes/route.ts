import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserContext } from '@/lib/session';
import { query, queryOne, execute } from '@/lib/db';
import { generateId, getCurrentMonthRange } from '@/lib/utils';
import { Income } from '@/types';

export const dynamic = 'force-dynamic';

function normalizeDate(d: string): string {
  if (!d) return d;
  const parts = d.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    if (year > 2400) {
      return `${year - 543}-${parts[1]}-${parts[2]}`;
    }
  }
  return d;
}

const noCacheHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
};

// GET: List incomes for family (optional month filter or 'ALL')
export async function GET(req: NextRequest) {
  try {
    const ctx = await getCurrentUserContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: noCacheHeaders });
    }

    if (ctx.member.role === 'CHILD') {
      return NextResponse.json({ error: 'เด็กไม่มีสิทธิ์เข้าถึงข้อมูลรายรับ' }, { status: 403, headers: noCacheHeaders });
    }

    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month');
    const sourceType = searchParams.get('sourceType');

    let sql = `
      SELECT i.*, m.nickname as receiver_nick, m.member_color as receiver_color
      FROM incomes i
      LEFT JOIN family_members m ON i.received_by = m.id
      WHERE i.family_id = ?
    `;
    const params: any[] = [ctx.family.id];

    let startDate = '';
    let endDate = '';

    if (month && month !== 'ALL') {
      const [y, m] = month.split('-');
      const lastDay = new Date(parseInt(y), parseInt(m), 0).getDate();
      startDate = `${month}-01`;
      endDate = `${month}-${String(lastDay).padStart(2, '0')}`;
      sql += ' AND i.received_date >= ? AND i.received_date <= ?';
      params.push(startDate, endDate);
    } else if (!month) {
      const range = getCurrentMonthRange();
      startDate = range.start;
      endDate = range.end;
      sql += ' AND i.received_date >= ? AND i.received_date <= ?';
      params.push(startDate, endDate);
    }

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
    }, { headers: noCacheHeaders });
  } catch (error) {
    console.error('Fetch incomes error:', error);
    return NextResponse.json({ error: 'Failed to fetch incomes' }, { status: 500, headers: noCacheHeaders });
  }
}

// POST: Add income
export async function POST(req: NextRequest) {
  try {
    const ctx = await getCurrentUserContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: noCacheHeaders });
    }

    if (ctx.member.role === 'CHILD') {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403, headers: noCacheHeaders });
    }

    const body = await req.json();
    let { amount, sourceType, sourceName, receivedDate, receivedBy, assetId, note, attachmentUrl } = body;

    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json({ error: 'จำนวนเงินต้องมากกว่า 0 บาท' }, { status: 400, headers: noCacheHeaders });
    }

    if (!sourceName || !sourceName.trim() || !receivedDate) {
      return NextResponse.json({ error: 'กรุณากรอกชื่อแหล่งรายได้และวันที่รับเงิน' }, { status: 400, headers: noCacheHeaders });
    }

    receivedDate = normalizeDate(receivedDate.trim());
    const targetReceivedBy = (receivedBy && typeof receivedBy === 'string' && receivedBy.trim()) ? receivedBy.trim() : ctx.member.id;

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
        targetReceivedBy,
        assetId || null,
        note?.trim() || null,
        attachmentUrl || null,
        now,
        now,
      ]
    );

    const createdIncome: Income & { receiver_nick?: string; receiver_color?: string } = {
      id: incomeId,
      family_id: ctx.family.id,
      amount: numAmount,
      source_type: sourceType || 'SALARY',
      source_name: sourceName.trim(),
      received_date: receivedDate,
      received_by: targetReceivedBy,
      asset_id: assetId || null,
      note: note?.trim() || null,
      attachment_url: attachmentUrl || null,
      created_at: now,
      updated_at: now,
      receiver_nick: ctx.member.nickname,
      receiver_color: ctx.member.member_color,
    };

    return NextResponse.json({
      success: true,
      incomeId,
      income: createdIncome,
    }, { headers: noCacheHeaders });
  } catch (error) {
    console.error('Add income error:', error);
    return NextResponse.json({ error: 'Failed to save income' }, { status: 500, headers: noCacheHeaders });
  }
}

// PUT: Edit income
export async function PUT(req: NextRequest) {
  try {
    const ctx = await getCurrentUserContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: noCacheHeaders });
    }

    if (ctx.member.role === 'CHILD') {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403, headers: noCacheHeaders });
    }

    const body = await req.json();
    let { id, amount, sourceType, sourceName, receivedDate, receivedBy, assetId, note, attachmentUrl } = body;

    if (!id) {
      return NextResponse.json({ error: 'Income ID required' }, { status: 400, headers: noCacheHeaders });
    }

    const existing = await queryOne<Income>('SELECT * FROM incomes WHERE id = ? AND family_id = ?', [id, ctx.family.id]);
    if (!existing) {
      return NextResponse.json({ error: 'Income not found' }, { status: 404, headers: noCacheHeaders });
    }

    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json({ error: 'จำนวนเงินต้องมากกว่า 0 บาท' }, { status: 400, headers: noCacheHeaders });
    }

    if (receivedDate) {
      receivedDate = normalizeDate(receivedDate.trim());
    }

    const targetReceivedBy = (receivedBy && typeof receivedBy === 'string' && receivedBy.trim()) ? receivedBy.trim() : existing.received_by;
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
        targetReceivedBy,
        assetId !== undefined ? assetId : existing.asset_id,
        note !== undefined ? (note?.trim() || null) : existing.note,
        attachmentUrl !== undefined ? attachmentUrl : existing.attachment_url,
        now,
        id,
        ctx.family.id,
      ]
    );

    return NextResponse.json({ success: true }, { headers: noCacheHeaders });
  } catch (error) {
    console.error('Update income error:', error);
    return NextResponse.json({ error: 'Failed to update income' }, { status: 500, headers: noCacheHeaders });
  }
}

// DELETE: Delete income
export async function DELETE(req: NextRequest) {
  try {
    const ctx = await getCurrentUserContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: noCacheHeaders });
    }

    if (ctx.member.role === 'CHILD') {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403, headers: noCacheHeaders });
    }

    const { searchParams } = new URL(req.url);
    const incomeId = searchParams.get('id');

    if (!incomeId) {
      return NextResponse.json({ error: 'Income ID required' }, { status: 400, headers: noCacheHeaders });
    }

    await execute('DELETE FROM incomes WHERE id = ? AND family_id = ?', [incomeId, ctx.family.id]);
    return NextResponse.json({ success: true }, { headers: noCacheHeaders });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete income' }, { status: 500, headers: noCacheHeaders });
  }
}
