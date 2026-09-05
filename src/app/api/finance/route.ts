import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserContext } from '@/lib/session';
import { query, queryOne } from '@/lib/db';
import { getCurrentMonthRange } from '@/lib/utils';
import { Income, Debt, DebtPayment, CashflowSummary } from '@/types';

export const dynamic = 'force-dynamic';

const noCacheHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
};

export async function GET(req: NextRequest) {
  try {
    const ctx = await getCurrentUserContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: noCacheHeaders });
    }

    if (ctx.member.role === 'CHILD') {
      return NextResponse.json({ error: 'เด็กไม่มีสิทธิ์เข้าถึงข้อมูลการเงินครอบครัว' }, { status: 403, headers: noCacheHeaders });
    }

    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month'); // YYYY-MM or 'ALL'
    let startDate: string;
    let endDate: string;
    let selectedMonth: string;
    const isAllMonths = month === 'ALL';

    if (month && !isAllMonths) {
      selectedMonth = month;
      const [y, m] = month.split('-');
      const lastDay = new Date(parseInt(y, 10), parseInt(m, 10), 0).getDate();
      startDate = `${month}-01`;
      endDate = `${month}-${String(lastDay).padStart(2, '0')}`;
    } else if (isAllMonths) {
      selectedMonth = 'ALL';
      startDate = '1970-01-01';
      endDate = '2099-12-31';
    } else {
      const range = getCurrentMonthRange();
      startDate = range.start;
      endDate = range.end;
      selectedMonth = startDate.substring(0, 7);
    }

    const familyId = ctx.family.id;

    // 1. Incomes for the period
    let incomesSql = `
      SELECT i.*, m.nickname as receiver_nick, m.member_color as receiver_color
      FROM incomes i
      LEFT JOIN family_members m ON i.received_by = m.id
      WHERE i.family_id = ?
    `;
    const incomesParams: any[] = [familyId];

    if (!isAllMonths) {
      incomesSql += ' AND i.received_date >= ? AND i.received_date <= ?';
      incomesParams.push(startDate, endDate);
    }
    incomesSql += ' ORDER BY i.received_date DESC, i.created_at DESC';

    const incomes = await query<Income & { receiver_nick?: string; receiver_color?: string }>(
      incomesSql,
      incomesParams
    );

    // 2. Active Debts & Rental Assets
    const debts = await query<Debt>(
      `SELECT * FROM debts WHERE family_id = ? ORDER BY is_rental_asset DESC, monthly_payment DESC`,
      [familyId]
    );

    // 3. Expenses for the period
    let expSql = `SELECT SUM(amount) as total FROM expenses WHERE family_id = ?`;
    const expParams: any[] = [familyId];
    if (!isAllMonths) {
      expSql += ' AND expense_date >= ? AND expense_date <= ?';
      expParams.push(startDate, endDate);
    }
    const expRow = await queryOne<{ total: number }>(expSql, expParams);
    const totalExpense = expRow?.total || 0;

    // 4. Debt payments made in this period
    let dpSql = `
      SELECT dp.*, m.nickname as payer_nick, d.name as debt_name
      FROM debt_payments dp
      LEFT JOIN family_members m ON dp.paid_by = m.id
      LEFT JOIN debts d ON dp.debt_id = d.id
      WHERE dp.family_id = ?
    `;
    const dpParams: any[] = [familyId];
    if (!isAllMonths) {
      dpSql += ' AND dp.paid_date >= ? AND dp.paid_date <= ?';
      dpParams.push(startDate, endDate);
    }
    dpSql += ' ORDER BY dp.paid_date DESC';

    const debtPayments = await query<DebtPayment & { payer_nick?: string; debt_name?: string }>(
      dpSql,
      dpParams
    );

    const totalDebtPaymentPaidThisMonth = debtPayments.reduce((acc, curr) => acc + (curr.amount || 0), 0);

    // 5. Cross-month statistics: Total all-time incomes & distinct months with data
    const allIncomesStats = await queryOne<{ count: number; total: number }>(
      `SELECT COUNT(*) as count, SUM(amount) as total FROM incomes WHERE family_id = ?`,
      [familyId]
    );
    const allTimeIncomesCount = allIncomesStats?.count || 0;
    const allTimeIncomesTotal = allIncomesStats?.total || 0;

    const distinctIncomeMonths = await query<{ month: string; count: number }>(
      `SELECT SUBSTR(received_date, 1, 7) as month, COUNT(*) as count 
       FROM incomes 
       WHERE family_id = ? 
       GROUP BY SUBSTR(received_date, 1, 7) 
       ORDER BY month DESC`,
      [familyId]
    );

    // Compute Income Totals & Breakdown
    let totalIncome = 0;
    const incomeBreakdown = {
      salary: 0,
      sideJob: 0,
      rental: 0,
      other: 0,
    };

    for (const inc of incomes) {
      const amt = inc.amount || 0;
      totalIncome += amt;
      if (inc.source_type === 'SALARY') incomeBreakdown.salary += amt;
      else if (inc.source_type === 'SIDE_JOB') incomeBreakdown.sideJob += amt;
      else if (inc.source_type === 'RENTAL') incomeBreakdown.rental += amt;
      else incomeBreakdown.other += amt;
    }

    // Compute Debts Summary
    let totalRemainingDebt = 0;
    let monthlyDebtCommitment = 0;

    for (const d of debts) {
      if (d.status === 'ACTIVE') {
        totalRemainingDebt += d.remaining_balance || 0;
        monthlyDebtCommitment += d.monthly_payment || 0;
      }
    }

    // Debt Service Ratio (DSR): Total Monthly Debt Commitment / Total Income * 100
    const dsrPercent = totalIncome > 0 ? (monthlyDebtCommitment / totalIncome) * 100 : 0;

    // Rental Assets Net Cashflow Analysis (Rent Received - Loan Payment = Profit)
    const rentalAssets = debts
      .filter((d) => d.is_rental_asset === 1 && d.status === 'ACTIVE')
      .map((d) => {
        const actualRentForAsset = incomes
          .filter((i) => i.asset_id === d.id || (i.source_type === 'RENTAL' && i.source_name.includes(d.name.split(' ')[0])))
          .reduce((sum, curr) => sum + curr.amount, 0);

        const monthlyRent = actualRentForAsset > 0 ? actualRentForAsset : (d.expected_rental_income || 0);
        const monthlyPayment = d.monthly_payment || 0;
        const netCashflow = monthlyRent - monthlyPayment;

        return {
          debt: {
            ...d,
            net_rental_cashflow: netCashflow,
            progress_percent: d.total_amount > 0 ? Math.round(((d.total_amount - d.remaining_balance) / d.total_amount) * 100) : 0,
          },
          monthlyRent,
          monthlyPayment,
          netCashflow,
        };
      });

    const effectiveDebtOutflow = totalDebtPaymentPaidThisMonth > 0 ? totalDebtPaymentPaidThisMonth : monthlyDebtCommitment;
    const netCashflow = totalIncome - (totalExpense + effectiveDebtOutflow);

    const summary: CashflowSummary = {
      month: selectedMonth,
      totalIncome,
      totalExpense,
      totalDebtPayment: effectiveDebtOutflow,
      netCashflow,
      incomeBreakdown,
      debtSummary: {
        totalRemainingDebt,
        monthlyCommitment: monthlyDebtCommitment,
        dsrPercent: Math.round(dsrPercent * 10) / 10,
      },
      rentalAssets,
    };

    return NextResponse.json({
      summary,
      incomes,
      debts: debts.map((d) => ({
        ...d,
        net_rental_cashflow: (d.expected_rental_income || 0) - (d.monthly_payment || 0),
        progress_percent: d.total_amount > 0 ? Math.round(((d.total_amount - d.remaining_balance) / d.total_amount) * 100) : 0,
      })),
      recentDebtPayments: debtPayments,
      allTimeIncomesCount,
      allTimeIncomesTotal,
      distinctIncomeMonths,
    }, { headers: noCacheHeaders });
  } catch (error) {
    console.error('Fetch finance overview error:', error);
    return NextResponse.json({ error: 'Failed to fetch financial overview' }, { status: 500, headers: noCacheHeaders });
  }
}
