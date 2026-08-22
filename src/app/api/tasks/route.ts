import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserContext } from '@/lib/session';
import { query, queryOne, execute, transaction } from '@/lib/db';
import { generateId } from '@/lib/utils';
import { Task } from '@/types';

// GET: list tasks with filters
export async function GET(req: NextRequest) {
  try {
    const ctx = await getCurrentUserContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const filter = searchParams.get('filter'); // all, today, in_progress, completed
    const memberId = searchParams.get('memberId');
    const today = searchParams.get('today');

    let sql = `
      SELECT t.*, m.nickname as assignee_nick, m.member_color as assignee_color
      FROM tasks t
      LEFT JOIN family_members m ON t.assigned_to = m.id
      WHERE t.family_id = ?
    `;
    const params: any[] = [ctx.family.id];

    if (memberId) {
      sql += ' AND t.assigned_to = ?';
      params.push(memberId);
    }

    if (filter === 'today' && today) {
      sql += ' AND (t.due_date = ? OR (t.due_date < ? AND t.status != "COMPLETED"))';
      params.push(today, today);
    } else if (filter === 'in_progress') {
      sql += ' AND t.status = "IN_PROGRESS"';
    } else if (filter === 'completed') {
      sql += ' AND t.status = "COMPLETED"';
    }

    sql += ` ORDER BY 
      CASE t.status WHEN 'COMPLETED' THEN 2 ELSE 1 END,
      CASE t.priority WHEN 'HIGH' THEN 1 WHEN 'NORMAL' THEN 2 ELSE 3 END,
      t.due_date ASC, t.created_at DESC`;

    const tasks = await query<Task>(sql, params);
    return NextResponse.json({ tasks });
  } catch (error) {
    console.error('Fetch tasks error:', error);
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

// POST: create task
export async function POST(req: NextRequest) {
  try {
    const ctx = await getCurrentUserContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      title,
      description,
      assignedTo,
      dueDate,
      dueTime,
      priority,
      status,
      recurrenceRule,
      points,
    } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'กรุณากรอกชื่องาน' }, { status: 400 });
    }

    const taskId = generateId('tsk');
    const now = new Date().toISOString();

    await execute(
      `INSERT INTO tasks (
        id, family_id, title, description, assigned_to, due_date, due_time,
        priority, status, recurrence_rule, points, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        taskId,
        ctx.family.id,
        title.trim(),
        description?.trim() || null,
        assignedTo || null,
        dueDate || null,
        dueTime || null,
        priority || 'NORMAL',
        status || 'TODO',
        recurrenceRule || 'NONE',
        points ? parseInt(points, 10) : 0,
        ctx.member.id,
        now,
        now,
      ]
    );

    return NextResponse.json({ success: true, taskId });
  } catch (error) {
    console.error('Create task error:', error);
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}

// PATCH: Update task / toggle completion & award reward points
export async function PATCH(req: NextRequest) {
  try {
    const ctx = await getCurrentUserContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { id, status, title, description, assignedTo, dueDate, dueTime, priority, recurrenceRule, points } = body;

    if (!id) {
      return NextResponse.json({ error: 'Task ID required' }, { status: 400 });
    }

    const task = await queryOne<Task>('SELECT * FROM tasks WHERE id = ? AND family_id = ?', [id, ctx.family.id]);
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Role check: Child can update status of own tasks or unassigned tasks
    if (ctx.member.role === 'CHILD') {
      if (task.assigned_to && task.assigned_to !== ctx.member.id) {
        return NextResponse.json({ error: 'You can only complete your own assigned tasks' }, { status: 403 });
      }
    }

    const now = new Date().toISOString();
    const isNowCompleted = status === 'COMPLETED' && task.status !== 'COMPLETED';
    const wasCompleted = task.status === 'COMPLETED' && status !== 'COMPLETED' && status !== undefined;

    await transaction(async () => {
      const newStatus = status || task.status;
      const completedBy = isNowCompleted ? ctx.member.id : (wasCompleted ? null : task.completed_by);
      const completedAt = isNowCompleted ? now : (wasCompleted ? null : task.completed_at);

      await execute(
        `UPDATE tasks SET 
          title = ?, description = ?, assigned_to = ?, due_date = ?, due_time = ?,
          priority = ?, status = ?, recurrence_rule = ?, points = ?,
          completed_by = ?, completed_at = ?, updated_at = ?
         WHERE id = ? AND family_id = ?`,
        [
          title !== undefined ? title.trim() : task.title,
          description !== undefined ? (description?.trim() || null) : task.description,
          assignedTo !== undefined ? (assignedTo || null) : task.assigned_to,
          dueDate !== undefined ? (dueDate || null) : task.due_date,
          dueTime !== undefined ? (dueTime || null) : task.due_time,
          priority || task.priority,
          newStatus,
          recurrenceRule || task.recurrence_rule,
          points !== undefined ? parseInt(points, 10) : task.points,
          completedBy,
          completedAt,
          now,
          id,
          ctx.family.id,
        ]
      );

      // Award points if completed and points enabled
      if (isNowCompleted && task.points > 0 && ctx.family.rewards_enabled) {
        const targetMemberId = task.assigned_to || ctx.member.id;
        await execute(
          'UPDATE family_members SET points_balance = points_balance + ? WHERE id = ? AND family_id = ?',
          [task.points, targetMemberId, ctx.family.id]
        );
        await execute(
          `INSERT INTO points_transactions (id, family_id, family_member_id, points, source_type, source_id, description, created_at)
           VALUES (?, ?, ?, ?, 'TASK', ?, ?, ?)`,
          [generateId('txn'), ctx.family.id, targetMemberId, task.points, task.id, `ทำงานสำเร็จ: ${task.title}`, now]
        );
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update task error:', error);
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}

// DELETE: remove task
export async function DELETE(req: NextRequest) {
  try {
    const ctx = await getCurrentUserContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (ctx.member.role === 'CHILD') {
      return NextResponse.json({ error: 'Children cannot delete tasks' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get('id');

    if (!taskId) {
      return NextResponse.json({ error: 'Task ID required' }, { status: 400 });
    }

    await execute('DELETE FROM tasks WHERE id = ? AND family_id = ?', [taskId, ctx.family.id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
  }
}
