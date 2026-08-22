'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  CheckSquare,
  Plus,
  Circle,
  CheckCircle2,
  Clock,
  User,
  Sparkles,
  AlertCircle,
  Trash2,
  Edit2,
  Filter,
} from 'lucide-react';
import { useLanguage } from '@/components/LanguageContext';
import { useAuth } from '@/components/AuthContext';
import { formatThaiDate, getTodayDateString } from '@/lib/utils';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Badge } from '@/components/ui/Badge';
import { EmptyState, LoadingSkeleton } from '@/components/ui/EmptyState';
import { MemberAvatar } from '@/components/ui/MemberAvatar';
import { Task, FamilyMember } from '@/types';

export default function TasksPage() {
  const { t } = useLanguage();
  const { member, family, refreshUser } = useAuth();

  const [filter, setFilter] = useState<'all' | 'today' | 'in_progress' | 'completed'>('today');
  const [selectedMemberFilter, setSelectedMemberFilter] = useState<string>('all');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form State
  const today = getTodayDateString();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState<string>('');
  const [dueDate, setDueDate] = useState(today);
  const [dueTime, setDueTime] = useState('18:00');
  const [priority, setPriority] = useState<'LOW' | 'NORMAL' | 'HIGH'>('NORMAL');
  const [recurrenceRule, setRecurrenceRule] = useState<string>('NONE');
  const [points, setPoints] = useState<string>('10');
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    try {
      let url = `/api/tasks?filter=${filter}&today=${today}`;
      if (selectedMemberFilter !== 'all') {
        url += `&memberId=${selectedMemberFilter}`;
      }

      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setTasks(json.tasks || []);
      }

      const memRes = await fetch('/api/families/members');
      if (memRes.ok) {
        const memJson = await memRes.json();
        setFamilyMembers(memJson.members || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [filter, selectedMemberFilter, today]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const openAddModal = () => {
    setEditingTask(null);
    setTitle('');
    setDescription('');
    setAssignedTo(member?.id || '');
    setDueDate(today);
    setDueTime('18:00');
    setPriority('NORMAL');
    setRecurrenceRule('NONE');
    setPoints('10');
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (tsk: Task) => {
    setEditingTask(tsk);
    setTitle(tsk.title);
    setDescription(tsk.description || '');
    setAssignedTo(tsk.assigned_to || '');
    setDueDate(tsk.due_date || today);
    setDueTime(tsk.due_time || '');
    setPriority(tsk.priority);
    setRecurrenceRule(tsk.recurrence_rule);
    setPoints(String(tsk.points || 0));
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (task: Task) => {
    const nextStatus = task.status === 'COMPLETED' ? 'TODO' : 'COMPLETED';
    try {
      const res = await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: task.id, status: nextStatus }),
      });
      if (res.ok) {
        fetchTasks();
        refreshUser();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFormError(null);

    try {
      const payload = {
        id: editingTask?.id,
        title,
        description,
        assignedTo,
        dueDate,
        dueTime,
        priority,
        recurrenceRule,
        points: parseInt(points, 10) || 0,
      };

      const res = await fetch('/api/tasks', {
        method: editingTask ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t.common.errorMessage);
      }

      setIsModalOpen(false);
      fetchTasks();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      const res = await fetch(`/api/tasks?id=${deletingId}`, { method: 'DELETE' });
      if (res.ok) {
        setDeletingId(null);
        fetchTasks();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const isChild = member?.role === 'CHILD';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">{t.tasks.title}</h1>
          <p className="text-xs text-muted-foreground">จัดการภารกิจและงานบ้านสำหรับสมาชิกทุกคน</p>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-primary hover:bg-primary-600 active:scale-95 text-white text-xs font-bold shadow-md transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>{t.tasks.addTask}</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="space-y-3">
        {/* Status Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            onClick={() => setFilter('today')}
            className={`px-3.5 py-1.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all ${
              filter === 'today'
                ? 'bg-primary text-white shadow-sm'
                : 'bg-card border border-border text-muted-foreground hover:bg-muted'
            }`}
          >
            {t.tasks.filters.today}
          </button>
          <button
            onClick={() => setFilter('in_progress')}
            className={`px-3.5 py-1.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all ${
              filter === 'in_progress'
                ? 'bg-primary text-white shadow-sm'
                : 'bg-card border border-border text-muted-foreground hover:bg-muted'
            }`}
          >
            {t.tasks.filters.inProgress}
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-3.5 py-1.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all ${
              filter === 'completed'
                ? 'bg-primary text-white shadow-sm'
                : 'bg-card border border-border text-muted-foreground hover:bg-muted'
            }`}
          >
            {t.tasks.filters.completed}
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-3.5 py-1.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all ${
              filter === 'all'
                ? 'bg-primary text-white shadow-sm'
                : 'bg-card border border-border text-muted-foreground hover:bg-muted'
            }`}
          >
            {t.tasks.filters.all}
          </button>
        </div>

        {/* Member Selector Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1 pl-1">
            <Filter className="w-3 h-3" /> ผู้รับผิดชอบ:
          </span>
          <button
            onClick={() => setSelectedMemberFilter('all')}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all ${
              selectedMemberFilter === 'all' ? 'bg-foreground text-background' : 'bg-muted/60 text-muted-foreground hover:bg-muted'
            }`}
          >
            ทุกคน
          </button>
          {familyMembers.map((m) => (
            <button
              key={m.id}
              onClick={() => setSelectedMemberFilter(m.id)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all ${
                selectedMemberFilter === m.id
                  ? 'bg-foreground text-background'
                  : 'bg-muted/60 text-muted-foreground hover:bg-muted'
              }`}
            >
              <MemberAvatar name={m.nickname} color={m.member_color} size="sm" className="w-4 h-4 text-[9px]" />
              <span>{m.nickname}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Task List */}
      {isLoading ? (
        <LoadingSkeleton count={4} height="h-20" />
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="ไม่มีงานในหมวดนี้"
          description="แตะที่ปุ่มเพิ่มงานเพื่อสร้างงานบ้านหรือภารกิจใหม่"
          actionText={t.tasks.addTask}
          onAction={openAddModal}
        />
      ) : (
        <div className="space-y-3">
          {tasks.map((task: any) => {
            const isDone = task.status === 'COMPLETED';
            const isHigh = task.priority === 'HIGH';
            const isOverdue = task.due_date && task.due_date < today && !isDone;

            const assignee = familyMembers.find((m) => m.id === task.assigned_to);

            return (
              <div
                key={task.id}
                className={`p-4 rounded-3xl bg-card border shadow-soft flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                  isDone ? 'opacity-70 border-border/40' : 'border-border hover:border-primary/40'
                }`}
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <button
                    onClick={() => handleToggleStatus(task)}
                    className="mt-0.5 text-muted-foreground hover:text-emerald-500 transition-colors flex-shrink-0"
                    title={isDone ? 'ทำอีกครั้ง' : 'เสร็จแล้ว'}
                  >
                    {isDone ? (
                      <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                    ) : (
                      <Circle className="w-6 h-6 hover:text-primary" />
                    )}
                  </button>

                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3
                        className={`font-bold text-sm truncate ${
                          isDone ? 'line-through text-muted-foreground' : 'text-foreground'
                        }`}
                      >
                        {task.title}
                      </h3>

                      {isHigh && (
                        <Badge variant="danger" size="sm">
                          ด่วน
                        </Badge>
                      )}

                      {isOverdue && (
                        <Badge variant="warning" size="sm">
                          เกินกำหนด
                        </Badge>
                      )}

                      {task.points > 0 && family?.rewards_enabled === 1 && (
                        <Badge variant="purple" size="sm">
                          +{task.points} แต้ม
                        </Badge>
                      )}
                    </div>

                    {task.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1">{task.description}</p>
                    )}

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground pt-0.5">
                      {assignee && (
                        <div className="flex items-center gap-1 font-semibold text-foreground/80">
                          <MemberAvatar name={assignee.nickname} color={assignee.member_color} size="sm" className="w-4 h-4 text-[9px]" />
                          <span>{assignee.nickname}</span>
                        </div>
                      )}

                      {task.due_date && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-muted-foreground" />
                          {task.due_date === today ? 'วันนี้' : formatThaiDate(task.due_date, { shortMonth: true })}
                          {task.due_time && ` ${task.due_time}`}
                        </span>
                      )}

                      {task.recurrence_rule !== 'NONE' && (
                        <span className="text-sky-600 dark:text-sky-400 font-semibold">
                          (ทำซ้ำ: {task.recurrence_rule === 'DAILY' ? 'ทุกวัน' : 'รายสัปดาห์'})
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 self-end sm:self-auto">
                  {!isChild && (
                    <>
                      <button
                        onClick={() => openEditModal(task)}
                        className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        title={t.common.edit}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeletingId(task.id)}
                        className="p-2 rounded-xl text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                        title={t.common.delete}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Task Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTask ? t.tasks.editTask : t.tasks.addTask}
      >
        <form onSubmit={handleSave} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold mb-1">{t.tasks.taskTitle} *</label>
            <input
              type="text"
              required
              placeholder="เช่น ทิ้งขยะ, ล้างห้องน้ำ, รดน้ำต้นไม้, ทำการบ้าน"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold mb-1">{t.tasks.assignee}</label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">{t.tasks.unassigned}</option>
                {familyMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nickname} ({m.role})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">{t.tasks.priority}</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="LOW">{t.tasks.priorities.LOW}</option>
                <option value="NORMAL">{t.tasks.priorities.NORMAL}</option>
                <option value="HIGH">{t.tasks.priorities.HIGH}</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold mb-1">{t.tasks.dueDate}</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">{t.tasks.dueTime}</label>
              <input
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold mb-1">{t.tasks.recurrence}</label>
              <select
                value={recurrenceRule}
                onChange={(e) => setRecurrenceRule(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="NONE">ไม่ทำซ้ำ</option>
                <option value="DAILY">ทุกวัน</option>
                <option value="WEEKLY">ทุกสัปดาห์</option>
                <option value="MONTHLY">ทุกเดือน</option>
              </select>
            </div>
            {family?.rewards_enabled === 1 && (
              <div>
                <label className="block text-xs font-bold mb-1">{t.tasks.rewardPoints} (+แต้ม)</label>
                <input
                  type="number"
                  min="0"
                  value={points}
                  onChange={(e) => setPoints(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold mb-1">รายละเอียดเพิ่มเติม</label>
            <textarea
              rows={2}
              placeholder="หมายเหตุหรือคำแนะนำในการทำงาน..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2.5 rounded-xl border border-border text-xs font-bold hover:bg-muted"
            >
              {t.common.cancel}
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-600 active:scale-95 text-white text-xs font-bold shadow-md transition-all"
            >
              {isSaving ? t.common.saving : t.common.save}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
