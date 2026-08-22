'use client';

import React, { useState } from 'react';
import { Calendar, CheckSquare, ShoppingCart, DollarSign, Receipt, ArrowLeft, Plus } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { useLanguage } from '@/components/LanguageContext';
import { useAuth } from '@/components/AuthContext';
import { getTodayDateString } from '@/lib/utils';

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  defaultType?: 'event' | 'task' | 'shopping' | 'expense' | 'bill' | null;
}

type AddType = 'select' | 'event' | 'task' | 'shopping' | 'expense' | 'bill';

export function QuickAddModal({ isOpen, onClose, onSuccess, defaultType = null }: QuickAddModalProps) {
  const { t } = useLanguage();
  const { member, family } = useAuth();
  const [activeType, setActiveType] = useState<AddType>(defaultType || 'select');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const today = getTodayDateString();

  // Event form
  const [eventTitle, setEventTitle] = useState('');
  const [eventDate, setEventDate] = useState(today);
  const [eventStartTime, setEventStartTime] = useState('09:00');
  const [eventCategory, setEventCategory] = useState<'Family' | 'School' | 'Work' | 'Appointment' | 'Birthday' | 'Travel' | 'Health' | 'Other'>('Family');
  const [eventRecurrence, setEventRecurrence] = useState('NONE');

  // Task form
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDueDate, setTaskDueDate] = useState(today);
  const [taskPriority, setTaskPriority] = useState<'LOW' | 'NORMAL' | 'HIGH'>('NORMAL');
  const [taskPoints, setTaskPoints] = useState('10');
  const [taskRecurrence, setTaskRecurrence] = useState('NONE');

  // Shopping form
  const [shopName, setShopName] = useState('');
  const [shopQty, setShopQty] = useState('1');
  const [shopUnit, setShopUnit] = useState('');
  const [shopCat, setShopCat] = useState<'Grocery' | 'Household' | 'Pharmacy' | 'Personal' | 'Pets' | 'Other'>('Grocery');

  // Expense form
  const [expAmount, setExpAmount] = useState('');
  const [expDesc, setExpDesc] = useState('');
  const [expCat, setExpCat] = useState('Food');

  // Bill form
  const [billName, setBillName] = useState('');
  const [billAmount, setBillAmount] = useState('');
  const [billDueDate, setBillDueDate] = useState(today);
  const [billRecurrence, setBillRecurrence] = useState('MONTHLY');

  const resetForms = () => {
    setActiveType('select');
    setError(null);
    setEventTitle('');
    setTaskTitle('');
    setShopName('');
    setExpAmount('');
    setExpDesc('');
    setBillName('');
    setBillAmount('');
  };

  const handleClose = () => {
    resetForms();
    onClose();
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      if (activeType === 'event') {
        const res = await fetch('/api/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: eventTitle,
            eventDate,
            startTime: eventStartTime,
            category: eventCategory,
            recurrenceRule: eventRecurrence,
          }),
        });
        if (!res.ok) throw new Error((await res.json()).error);
      } else if (activeType === 'task') {
        const res = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: taskTitle,
            dueDate: taskDueDate,
            priority: taskPriority,
            points: taskPoints,
            recurrenceRule: taskRecurrence,
            assignedTo: member?.id,
          }),
        });
        if (!res.ok) throw new Error((await res.json()).error);
      } else if (activeType === 'shopping') {
        const res = await fetch('/api/shopping', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: shopName,
            quantity: shopQty,
            unit: shopUnit,
            category: shopCat,
          }),
        });
        if (!res.ok) throw new Error((await res.json()).error);
      } else if (activeType === 'expense') {
        const res = await fetch('/api/expenses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: expAmount,
            description: expDesc,
            category: expCat,
            expenseDate: today,
            paidBy: member?.id,
          }),
        });
        if (!res.ok) throw new Error((await res.json()).error);
      } else if (activeType === 'bill') {
        const res = await fetch('/api/bills', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: billName,
            amount: billAmount,
            dueDate: billDueDate,
            recurrenceRule: billRecurrence,
            category: 'Utilities',
          }),
        });
        if (!res.ok) throw new Error((await res.json()).error);
      }

      handleClose();
      if (onSuccess) onSuccess();
      else window.location.reload();
    } catch (err: any) {
      setError(err.message || t.common.errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isChild = member?.role === 'CHILD';

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={activeType === 'select' ? t.quickAdd.title : `เพิ่ม${
        activeType === 'event' ? t.quickAdd.event :
        activeType === 'task' ? t.quickAdd.task :
        activeType === 'shopping' ? t.quickAdd.shopping :
        activeType === 'expense' ? t.quickAdd.expense : t.quickAdd.bill
      }`}
    >
      {error && (
        <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs">
          {error}
        </div>
      )}

      {activeType === 'select' ? (
        <div className="grid grid-cols-1 gap-2.5">
          <button
            onClick={() => setActiveType('event')}
            className="flex items-center gap-3.5 p-3.5 rounded-2xl border border-border bg-card hover:bg-muted/60 transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm text-foreground">{t.quickAdd.event}</div>
              <div className="text-xs text-muted-foreground">{t.quickAdd.eventDesc}</div>
            </div>
          </button>

          <button
            onClick={() => setActiveType('task')}
            className="flex items-center gap-3.5 p-3.5 rounded-2xl border border-border bg-card hover:bg-muted/60 transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm text-foreground">{t.quickAdd.task}</div>
              <div className="text-xs text-muted-foreground">{t.quickAdd.taskDesc}</div>
            </div>
          </button>

          <button
            onClick={() => setActiveType('shopping')}
            className="flex items-center gap-3.5 p-3.5 rounded-2xl border border-border bg-card hover:bg-muted/60 transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm text-foreground">{t.quickAdd.shopping}</div>
              <div className="text-xs text-muted-foreground">{t.quickAdd.shoppingDesc}</div>
            </div>
          </button>

          {!isChild && (
            <button
              onClick={() => setActiveType('expense')}
              className="flex items-center gap-3.5 p-3.5 rounded-2xl border border-border bg-card hover:bg-muted/60 transition-all text-left group"
            >
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-sm text-foreground">{t.quickAdd.expense}</div>
                <div className="text-xs text-muted-foreground">{t.quickAdd.expenseDesc}</div>
              </div>
            </button>
          )}

          {!isChild && (
            <button
              onClick={() => setActiveType('bill')}
              className="flex items-center gap-3.5 p-3.5 rounded-2xl border border-border bg-card hover:bg-muted/60 transition-all text-left group"
            >
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-sm text-foreground">{t.quickAdd.bill}</div>
                <div className="text-xs text-muted-foreground">{t.quickAdd.billDesc}</div>
              </div>
            </button>
          )}
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-4">
          <button
            type="button"
            onClick={() => setActiveType('select')}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-semibold"
          >
            <ArrowLeft className="w-4 h-4" /> {t.common.back}
          </button>

          {/* Form Content By Type */}
          {activeType === 'event' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">{t.calendar.eventTitle}</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น ทานข้าวนอกบ้าน, นัดหมอ"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">{t.calendar.eventDate}</label>
                  <input
                    type="date"
                    required
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">{t.calendar.startTime}</label>
                  <input
                    type="time"
                    value={eventStartTime}
                    onChange={(e) => setEventStartTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">{t.calendar.recurrence}</label>
                <select
                  value={eventRecurrence}
                  onChange={(e) => setEventRecurrence(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {(Object.entries(t.calendar.recurrenceOptions) as [string, string][]).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {activeType === 'task' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">{t.tasks.taskTitle}</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น ล้างจาน, ทิ้งขยะ, ทำการบ้าน"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">{t.tasks.dueDate}</label>
                  <input
                    type="date"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">{t.tasks.priority}</label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="LOW">{t.tasks.priorities.LOW}</option>
                    <option value="NORMAL">{t.tasks.priorities.NORMAL}</option>
                    <option value="HIGH">{t.tasks.priorities.HIGH}</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">{t.tasks.recurrence}</label>
                <select
                  value={taskRecurrence}
                  onChange={(e) => setTaskRecurrence(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {(Object.entries(t.tasks.recurrenceOptions) as [string, string][]).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              {family?.rewards_enabled === 1 && (
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">{t.tasks.rewardPoints} (+แต้ม)</label>
                  <input
                    type="number"
                    value={taskPoints}
                    onChange={(e) => setTaskPoints(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              )}
            </div>
          )}

          {activeType === 'shopping' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">ชื่อสินค้า</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น นมสด, ไข่ไก่, ขนมปัง"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">{t.shopping.quantity}</label>
                  <input
                    type="number"
                    min="1"
                    value={shopQty}
                    onChange={(e) => setShopQty(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">{t.shopping.unit}</label>
                  <input
                    type="text"
                    placeholder="กล่อง, แพ็ค, ถุง"
                    value={shopUnit}
                    onChange={(e) => setShopUnit(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            </div>
          )}

          {activeType === 'expense' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">{t.expenses.amount}</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={expAmount}
                  onChange={(e) => setExpAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary font-bold text-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">{t.expenses.description}</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น ซื้อของสด Big C, กาแฟ"
                  value={expDesc}
                  onChange={(e) => setExpDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          )}

          {activeType === 'bill' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">{t.bills.billName}</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น ค่าไฟ, เน็ตบ้าน, ค่าน้ำ"
                  value={billName}
                  onChange={(e) => setBillName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">{t.bills.amount}</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={billAmount}
                    onChange={(e) => setBillAmount(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">{t.bills.dueDate}</label>
                  <input
                    type="date"
                    required
                    value={billDueDate}
                    onChange={(e) => setBillDueDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">{t.bills.recurrence}</label>
                <select
                  value={billRecurrence}
                  onChange={(e) => setBillRecurrence(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {(Object.entries(t.bills.recurrenceOptions) as [string, string][]).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2.5 rounded-xl border border-border text-xs font-semibold hover:bg-muted"
            >
              {t.common.cancel}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-600 active:scale-95 transition-all shadow-sm flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              {isSubmitting ? t.common.saving : t.common.save}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
