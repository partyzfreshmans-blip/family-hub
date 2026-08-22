import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserContext } from '@/lib/session';
import { query, queryOne, execute, transaction } from '@/lib/db';
import { generateId } from '@/lib/utils';
import { Reward, PointsTransaction, FamilyMember } from '@/types';

// GET: list rewards catalog and member's points history
export async function GET() {
  try {
    const ctx = await getCurrentUserContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rewards = await query<Reward>(
      'SELECT * FROM rewards WHERE family_id = ? AND active = 1 ORDER BY required_points ASC',
      [ctx.family.id]
    );

    const history = await query<PointsTransaction & { member_nick?: string }>(
      `SELECT t.*, m.nickname as member_nick, m.member_color as member_color
       FROM points_transactions t
       JOIN family_members m ON t.family_member_id = m.id
       WHERE t.family_id = ?
       ORDER BY t.created_at DESC LIMIT 30`,
      [ctx.family.id]
    );

    const freshMember = await queryOne<FamilyMember>(
      'SELECT points_balance FROM family_members WHERE id = ?',
      [ctx.member.id]
    );

    return NextResponse.json({
      rewardsEnabled: ctx.family.rewards_enabled === 1,
      currentPoints: freshMember?.points_balance || 0,
      rewards,
      history,
    });
  } catch (error) {
    console.error('Fetch rewards error:', error);
    return NextResponse.json({ error: 'Failed to fetch rewards' }, { status: 500 });
  }
}

// POST: Add new reward (Admin only) or redeem reward (All members)
export async function POST(req: NextRequest) {
  try {
    const ctx = await getCurrentUserContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action, rewardId, name, requiredPoints } = body;

    // Action 1: Redeem reward
    if (action === 'redeem') {
      if (!rewardId) {
        return NextResponse.json({ error: 'Reward ID required' }, { status: 400 });
      }

      const reward = await queryOne<Reward>('SELECT * FROM rewards WHERE id = ? AND family_id = ?', [rewardId, ctx.family.id]);
      if (!reward) {
        return NextResponse.json({ error: 'Reward not found' }, { status: 404 });
      }

      const member = await queryOne<FamilyMember>('SELECT points_balance FROM family_members WHERE id = ?', [ctx.member.id]);
      if (!member || member.points_balance < reward.required_points) {
        return NextResponse.json({ error: 'แต้มสะสมของคุณไม่เพียงพอสำหรับการแลกรางวัลนี้' }, { status: 400 });
      }

      const now = new Date().toISOString();

      await transaction(async () => {
        // Debit points
        await execute(
          'UPDATE family_members SET points_balance = points_balance - ? WHERE id = ? AND family_id = ?',
          [reward.required_points, ctx.member.id, ctx.family.id]
        );

        // Record transaction
        await execute(
          `INSERT INTO points_transactions (id, family_id, family_member_id, points, source_type, source_id, description, created_at)
           VALUES (?, ?, ?, ?, 'REWARD_REDEEM', ?, ?, ?)`,
          [
            generateId('txn'),
            ctx.family.id,
            ctx.member.id,
            -reward.required_points,
            reward.id,
            `แลกของรางวัล: ${reward.name}`,
            now,
          ]
        );
      });

      return NextResponse.json({ success: true, message: 'แลกรางวัลสำเร็จ!' });
    }

    // Action 2: Create new reward (Admin only)
    if (ctx.member.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only Admin can create rewards' }, { status: 403 });
    }

    const pointsNum = parseInt(requiredPoints, 10);
    if (!name || !name.trim() || isNaN(pointsNum) || pointsNum <= 0) {
      return NextResponse.json({ error: 'กรุณาระบุชื่อรางวัลและจำนวนแต้มที่ถูกต้อง' }, { status: 400 });
    }

    const newRewardId = generateId('rew');
    const now = new Date().toISOString();

    await execute(
      `INSERT INTO rewards (id, family_id, name, required_points, active, created_by, created_at)
       VALUES (?, ?, ?, ?, 1, ?, ?)`,
      [newRewardId, ctx.family.id, name.trim(), pointsNum, ctx.member.id, now]
    );

    return NextResponse.json({ success: true, rewardId: newRewardId });
  } catch (error) {
    console.error('Reward action error:', error);
    return NextResponse.json({ error: 'Failed to process reward request' }, { status: 500 });
  }
}

// DELETE: Delete reward (Admin only)
export async function DELETE(req: NextRequest) {
  try {
    const ctx = await getCurrentUserContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (ctx.member.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const rewardId = searchParams.get('id');

    if (!rewardId) {
      return NextResponse.json({ error: 'Reward ID required' }, { status: 400 });
    }

    await execute('DELETE FROM rewards WHERE id = ? AND family_id = ?', [rewardId, ctx.family.id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete reward' }, { status: 500 });
  }
}
