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
  Image as ImageIcon,
  Paperclip,
  Upload,
  Download,
  Maximize2,
  FileText,
  Loader2,
  Check,
  X,
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

function compressImage(file: File, maxDimension = 1280, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export default function TasksPage() {
  const { t } = useLanguage();
  const { member, family, refreshUser } = useAuth();

  const [filter, setFilter] = useState<'all' | 'today' | 'in_progress' | 'completed'>('today');
  const [selectedMemberFilter, setSelectedMemberFilter] = useState<string>('all');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [togglingTaskId, setTogglingTaskId] = useState<string | null>(null);

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
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const [attachmentName, setAttachmentName] = useState<string | null>(null);
  const [attachmentType, setAttachmentType] = useState<string | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
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
    setAttachmentUrl(null);
    setAttachmentName(null);
    setAttachmentType(null);
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
    setAttachmentUrl(tsk.attachment_url || null);
    setAttachmentName(tsk.attachment_name || null);
    setAttachmentType(tsk.attachment_type || null);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('ขนาดไฟล์ต้องไม่เกิน 5 MB');
      return;
    }

    try {
      setIsProcessingFile(true);
      if (file.type.startsWith('image/')) {
        const compressed = await compressImage(file, 1280, 0.82);
        setAttachmentUrl(compressed);
        setAttachmentName(file.name);
        setAttachmentType(file.type || 'image/jpeg');
      } else {
        const reader = new FileReader();
        reader.onload = (ev) => {
          setAttachmentUrl(ev.target?.result as string);
          setAttachmentName(file.name);
          setAttachmentType(file.type || 'application/octet-stream');
        };
        reader.readAsDataURL(file);
      }
    } catch (err) {
      console.error('File upload error:', err);
      alert('ไม่สามารถประมวลผลไฟล์ได้');
    } finally {
      setIsProcessingFile(false);
      e.target.value = '';
    }
  };

  const handleToggleStatus = async (task: Task) => {
    if (togglingTaskId) return;
    setTogglingTaskId(task.id);
    const nextStatus = task.status === "COMPLETED" ? "TODO" : "COMPLETED";
    try {
      const [res] = await Promise.all([
        fetch("/api/tasks", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: task.id, status: nextStatus }),
        }),
        new Promise((resolve) => setTimeout(resolve, 250)),
      ]);
      if (res.ok) {
        await fetchTasks();
        refreshUser();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setTogglingTaskId(null);
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
        attachmentUrl,
        attachmentName,
        attachmentType,
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
            const isToggling = togglingTaskId === task.id;
            const isHigh = task.priority === 'HIGH';
            const isOverdue = task.due_date && task.due_date < today && !isDone;

            const assignee = familyMembers.find((m) => m.id === task.assigned_to);
            const isImageAttachment =
              task.attachment_url &&
              (task.attachment_type?.startsWith('image/') ||
                task.attachment_url.startsWith('data:image/') ||
                /\.(jpg|jpeg|png|webp|gif)$/i.test(task.attachment_name || ''));

            return (
              <div
                key={task.id}
                className={`p-4 rounded-3xl bg-card border shadow-soft flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 transition-all ${
                  isDone ? 'opacity-70 border-border/40' : 'border-border hover:border-primary/40'
                }`}
              >
                <div className="flex items-start gap-3.5 min-w-0 flex-1">
                  <button
                    onClick={() => handleToggleStatus(task)}
                    disabled={isToggling}
                    className="mt-0.5 text-muted-foreground hover:text-emerald-500 transition-all flex-shrink-0 active:scale-90"
                    title={isDone ? "ทำอีกครั้ง" : "เสร็จแล้ว"}
                  >
                    {isToggling ? (
                      <CheckCircle2 className="w-6 h-6 text-emerald-500 animate-check-pop" />
                    ) : isDone ? (
                      <CheckCircle2 className="w-6 h-6 text-emerald-500 hover:scale-105 transition-transform" />
                    ) : (
                      <Circle className="w-6 h-6 hover:text-primary hover:scale-105 transition-transform" />
                    )}
                  </button>

                  {/* Image Attachment Thumbnail (if image) */}
                  {isImageAttachment && (
                    <div
                      onClick={() => setLightboxImage(task.attachment_url)}
                      className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl overflow-hidden border border-border shrink-0 cursor-pointer group relative shadow-xs"
                      title="แตะเพื่อดูรูปภาพเต็ม"
                    >
                      <img
                        src={task.attachment_url}
                        alt={task.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                        <Maximize2 className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  )}

                  <div className="space-y-1 min-w-0 flex-1">
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

                      {/* File / Doc Attachment badge (if non-image file) */}
                      {task.attachment_url && !isImageAttachment && (
                        <a
                          href={task.attachment_url}
                          download={task.attachment_name || 'task-file'}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center gap-1 hover:bg-blue-500/20 transition-colors"
                          title="ดาวน์โหลดไฟล์แนบ"
                        >
                          <Paperclip className="w-3 h-3" />
                          <span className="max-w-[120px] truncate">{task.attachment_name || 'ไฟล์แนบ'}</span>
                          <Download className="w-2.5 h-2.5 opacity-60" />
                        </a>
                      )}
                    </div>

                    {task.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
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
                <div className="flex items-center gap-1 self-end sm:self-auto shrink-0">
                  {task.attachment_url && (
                    <>
                      {isImageAttachment ? (
                        <button
                          onClick={() => setLightboxImage(task.attachment_url)}
                          className="p-2 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                          title="ดูรูปภาพแนบ"
                        >
                          <ImageIcon className="w-4 h-4" />
                        </button>
                      ) : (
                        <a
                          href={task.attachment_url}
                          download={task.attachment_name || 'task-file'}
                          className="p-2 rounded-xl text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10 transition-colors"
                          title="ดาวน์โหลดไฟล์แนบ"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      )}
                    </>
                  )}
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
        maxWidth="lg"
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

          {/* File & Image Attachment Section */}
          <div>
            <label className="block text-xs font-bold mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5 text-primary" />
                <span>ไฟล์แนบ / รูปภาพเกี่ยวกับงาน (รูปการบ้าน, ใบสั่งงาน, รูปก่อน-หลังทำ)</span>
              </span>
              {attachmentUrl && (
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  <Check className="w-3 h-3" /> แนบไฟล์แล้ว
                </span>
              )}
            </label>

            {attachmentUrl ? (
              <div className="relative group rounded-2xl overflow-hidden border border-border bg-muted/30 p-3 flex items-center gap-3">
                {attachmentType?.startsWith('image/') ||
                attachmentUrl.startsWith('data:image/') ||
                /\.(jpg|jpeg|png|webp|gif)$/i.test(attachmentName || '') ? (
                  <img
                    src={attachmentUrl}
                    alt="Task attachment"
                    className="w-16 h-16 object-cover rounded-xl border border-border/80 shadow-xs cursor-pointer hover:opacity-90 transition-opacity shrink-0"
                    onClick={() => setLightboxImage(attachmentUrl)}
                    title="แตะเพื่อขยายดูรูปขนาดเต็ม"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20">
                    <FileText className="w-7 h-7" />
                  </div>
                )}

                <div className="flex-1 min-w-0 space-y-1">
                  <p className="text-xs font-bold text-foreground truncate">
                    {attachmentName || 'ไฟล์แนบสำหรับงานนี้'}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {attachmentType || 'เอกสารประกอบ'}
                  </p>
                  <div className="flex items-center gap-2 pt-0.5">
                    <label className="cursor-pointer px-2.5 py-1 rounded-lg border border-border bg-card hover:bg-muted text-[11px] font-bold text-foreground flex items-center gap-1 transition-colors">
                      <Upload className="w-3 h-3" />
                      <span>เปลี่ยนไฟล์</span>
                      <input
                        type="file"
                        accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setAttachmentUrl(null);
                        setAttachmentName(null);
                        setAttachmentType(null);
                      }}
                      className="px-2.5 py-1 rounded-lg border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-[11px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>ลบไฟล์</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-border hover:border-primary/60 rounded-2xl cursor-pointer bg-muted/20 hover:bg-muted/40 transition-all text-center group">
                {isProcessingFile ? (
                  <div className="flex items-center gap-2 text-xs font-bold text-primary py-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>กำลังประมวลผลไฟล์...</span>
                  </div>
                ) : (
                  <>
                    <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-1 group-hover:scale-105 transition-transform">
                      <Upload className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-foreground">แตะเพื่อเลือกรูปภาพ หรือเอกสารประกอบ</span>
                    <span className="text-[10px] text-muted-foreground mt-0.5">
                      รองรับรูปภาพ (JPG, PNG), PDF, เอกสาร (สูงสุด 5 MB)
                    </span>
                    <input
                      type="file"
                      accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </>
                )}
              </label>
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

      {/* Lightbox Modal for Full Image View */}
      {lightboxImage && (
        <Modal
          isOpen={!!lightboxImage}
          onClose={() => setLightboxImage(null)}
          title="รูปภาพเกี่ยวกับงาน"
          maxWidth="lg"
        >
          <div className="space-y-4">
            <div className="max-h-[70vh] flex items-center justify-center overflow-hidden rounded-2xl bg-black/5 dark:bg-black/40 p-2">
              <img
                src={lightboxImage}
                alt="Task Full View"
                className="max-h-[65vh] w-auto object-contain rounded-xl shadow-md"
              />
            </div>
            <div className="flex items-center justify-between pt-1">
              <a
                href={lightboxImage}
                download="task-photo.jpg"
                className="px-3.5 py-2 rounded-xl border border-border bg-card hover:bg-muted text-xs font-bold flex items-center gap-1.5 text-foreground transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>ดาวน์โหลดรูปภาพ</span>
              </a>
              <button
                type="button"
                onClick={() => setLightboxImage(null)}
                className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-600 active:scale-95 transition-all"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
