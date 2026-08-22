'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Receipt,
  Plus,
  CheckCircle,
  Clock,
  Trash2,
  Calendar,
  AlertTriangle,
  History,
  Check,
} from 'lucide-react';
import { useLanguage } from '@/components/LanguageContext';
import { useAuth } from '@/components/AuthContext';
import { formatCurrency, formatThaiDate, getTodayDateString } from '@/lib/utils';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Badge } from '@/components/ui/Badge';
import { EmptyState, LoadingSkeleton } from '@/components/ui/EmptyState';
import { Bill, BillPayment, FamilyMember } from '@/types';

export default function BillsPage() {
  const { t } = useLanguage();
  const { member } = useAuth();

  const [bills, setBills] = useState<Bill[]>([]);
  const [payments, setPayments] = useState<BillPayment[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [payingBill, setPayingBill] = useState<Bill | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form State
  const today = getTodayDateString();
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Utilities');
  const [dueDate, setDueDate] = useState(today);
  const [recurrenceRule, setRecurrenceRule] = useState<any>('MONTHLY');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Pay Modal State
  const [paidBy, setPaidBy] = useState(member?.id || '');
  const [payDate, setPayDate] = useState(today);
  const [payAmount, setPayAmount] = useState('');
  const [payNote, setPayNote] = useState('');

  const fetchBills = useCallback(async () => {
    try {
      const res = await fetch('/api/bills');
      if (res.ok) {
        const json = await res.json();
        setBills(json.bills || []);
        setPayments(json.payments || []);
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
  }, []);

  useEffect(() => {
    fetchBills();
  }, [fetchBills]);

  const openAddModal = () => {
    setName('');
    setAmount('');
    setCategory('Utilities');
    setDueDate(today);
    setRecurrenceRule('MONTHLY');
    setNotes('');
    setFormError(null);
    setIsAddModalOpen(true);
  };

  const openPayModal = (b: Bill) => {
    setPayingBill(b);
    setPayAmount(String(b.amount));
    setPaidBy(member?.id || '');
    setPayDate(today);
    setPayNote('ชำระบิลตามกำหนด');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFormError(null);

    try {
      const res = await fetch('/api/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          amount,
          category,
          dueDate,
          recurrenceRule,
          notes,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t.common.errorMessage);
      }

      setIsAddModalOpen(false);
      fetchBills();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmPay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingBill) return;

    setIsSaving(true);
    try {
      const res = await fetch('/api/bills', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: payingBill.id,
          markPaid: true,
          amount: payAmount,
          paidDate: payDate,
          paidBy,
          note: payNote,
        }),
      });

      if (res.ok) {
        setPayingBill(null);
        fetchBills();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      const res = await fetch(`/api/bills?id=${deletingId}`, { method: 'DELETE' });
      if (res.ok) {
        setDeletingId(null);
        fetchBills();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const isChild = member?.role === 'CHILD';
  if (isChild) {
    return (
      <div className="p-8 text-center bg-card rounded-3xl border border-border shadow-soft">
        <h2 className="text-lg font-bold text-foreground mb-2">เข้าถึงเฉพาะผู้ปกครอง</h2>
        <p className="text-xs text-muted-foreground">ส่วนนี้สำหรับบันทึกบิลค่าใช้จ่ายของครอบครัวเท่านั้น</p>
      </div>
    );
  }

  const unpaidBills = bills.filter((b) => b.status !== 'PAID');
  const paidBills = bills.filter((b) => b.status === 'PAID');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">{t.bills.title}</h1>
          <p className="text-xs text-muted-foreground">จัดการบิล ค่าไฟ ค่าน้ำ อินเทอร์เน็ต และค่าใช้จ่ายประจำ</p>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-primary hover:bg-primary-600 active:scale-95 text-white text-xs font-bold shadow-md transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>{t.bills.addBill}</span>
        </button>
      </div>

      {isLoading ? (
        <LoadingSkeleton count={3} height="h-24" />
      ) : (
        <div className="space-y-6">
          {/* 1. Unpaid Bills Section */}
          <div className="space-y-3">
            <h2 className="font-bold text-base text-foreground px-1 flex items-center gap-2">
              <span>บิลที่ต้องชำระ</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400">
                {unpaidBills.length}
              </span>
            </h2>

            {unpaidBills.length === 0 ? (
              <EmptyState
                icon={Receipt}
                title="ไม่มีบิลค้างชำระในขณะนี้"
                description="แตะที่ปุ่มเพิ่มบิลใหม่เพื่อบันทึกรอบบิลของบ้าน"
                actionText={t.bills.addBill}
                onAction={openAddModal}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {unpaidBills.map((b) => {
                  const isOverdue = b.due_date < today;

                  return (
                    <div
                      key={b.id}
                      className="p-5 rounded-3xl bg-card border border-border shadow-soft flex flex-col justify-between gap-4 hover:border-primary/40 transition-colors"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-bold text-base text-foreground truncate">{b.name}</h3>
                          <Badge variant={isOverdue ? 'danger' : 'warning'} size="sm">
                            {isOverdue ? t.bills.statuses.OVERDUE : t.bills.statuses.UNPAID}
                          </Badge>
                        </div>

                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-extrabold tracking-tight text-foreground">
                            {formatCurrency(b.amount)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            ({t.bills.recurrenceOptions[b.recurrence_rule]})
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>ครบกำหนด: {formatThaiDate(b.due_date)}</span>
                        </div>

                        {b.notes && <p className="text-xs text-muted-foreground">{b.notes}</p>}
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-border/60">
                        <button
                          onClick={() => setDeletingId(b.id)}
                          className="p-2 rounded-xl text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                          title={t.common.delete}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => openPayModal(b)}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-1.5"
                        >
                          <Check className="w-4 h-4" />
                          <span>{t.bills.markAsPaid}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 2. Paid / History Section */}
          {payments.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-border/60">
              <h2 className="font-bold text-base text-foreground px-1 flex items-center gap-2">
                <History className="w-4 h-4 text-primary" />
                <span>{t.bills.paymentHistory}</span>
              </h2>

              <div className="space-y-2">
                {payments.map((p: any) => (
                  <div
                    key={p.id}
                    className="p-3.5 rounded-2xl bg-muted/40 border border-border/40 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <p className="font-bold text-foreground truncate">{p.note || 'ชำระค่าบริการ'}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {formatThaiDate(p.paid_date, { shortMonth: true })}
                        {p.payer_nick && ` • จ่ายโดย ${p.payer_nick}`}
                      </p>
                    </div>

                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(p.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Bill Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={t.bills.addBill}
      >
        <form onSubmit={handleSave} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold mb-1">{t.bills.billName} *</label>
            <input
              type="text"
              required
              placeholder="เช่น ค่าไฟฟ้านครหลวง, เน็ตบ้าน AIS Fiber, ค่าน้ำ"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold mb-1">{t.bills.amount} *</label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">{t.bills.dueDate} *</label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold mb-1">{t.bills.recurrence}</label>
            <select
              value={recurrenceRule}
              onChange={(e) => setRecurrenceRule(e.target.value as any)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {(Object.entries(t.bills.recurrenceOptions) as [string, string][]).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold mb-1">หมายเหตุ / วิธีการชำระ</label>
            <textarea
              rows={2}
              placeholder="เช่น ตัดผ่านบัตรเครดิต หรือ สแกน QR Code วันที่ 25"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
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

      {/* Pay Bill Modal */}
      {payingBill && (
        <Modal
          isOpen={!!payingBill}
          onClose={() => setPayingBill(null)}
          title={`บันทึกการจ่าย: ${payingBill.name}`}
        >
          <form onSubmit={handleConfirmPay} className="space-y-4">
            <div>
              <label className="block text-xs font-bold mb-1">จำนวนเงินที่ชำระ (บาท)</label>
              <input
                type="number"
                step="0.01"
                required
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-border bg-background text-xl font-extrabold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold mb-1">ผู้ชำระเงิน</label>
                <select
                  value={paidBy}
                  onChange={(e) => setPaidBy(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {familyMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nickname}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">วันที่ชำระ</label>
                <input
                  type="date"
                  required
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1">บันทึกช่วยจำ</label>
              <input
                type="text"
                value={payNote}
                onChange={(e) => setPayNote(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setPayingBill(null)}
                className="px-4 py-2.5 rounded-xl border border-border text-xs font-bold hover:bg-muted"
              >
                {t.common.cancel}
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>ยืนยันการชำระเงิน</span>
              </button>
            </div>
          </form>
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
