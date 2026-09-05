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
  Image as ImageIcon,
  FileText,
  Upload,
  Download,
  Maximize2,
  Loader2,
  Edit2,
  QrCode,
} from 'lucide-react';
import { useLanguage } from '@/components/LanguageContext';
import { useAuth } from '@/components/AuthContext';
import { formatCurrency, formatThaiDate, getTodayDateString } from '@/lib/utils';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Badge } from '@/components/ui/Badge';
import { EmptyState, LoadingSkeleton } from '@/components/ui/EmptyState';
import { Bill, BillPayment, FamilyMember } from '@/types';

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

export default function BillsPage() {
  const { t } = useLanguage();
  const { member } = useAuth();

  const [bills, setBills] = useState<Bill[]>([]);
  const [payments, setPayments] = useState<BillPayment[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [payingBill, setPayingBill] = useState<Bill | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(null);
  const [lightboxMedia, setLightboxMedia] = useState<{ url: string; title: string; isImage: boolean } | null>(null);

  // Form State
  const today = getTodayDateString();
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Utilities');
  const [dueDate, setDueDate] = useState(today);
  const [recurrenceRule, setRecurrenceRule] = useState<any>('MONTHLY');
  const [notes, setNotes] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const [attachmentName, setAttachmentName] = useState<string | null>(null);
  const [attachmentType, setAttachmentType] = useState<string | null>(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Pay Modal State
  const [paidBy, setPaidBy] = useState(member?.id || '');
  const [payDate, setPayDate] = useState(today);
  const [payAmount, setPayAmount] = useState('');
  const [payNote, setPayNote] = useState('');
  const [payAttachmentUrl, setPayAttachmentUrl] = useState<string | null>(null);
  const [payAttachmentName, setPayAttachmentName] = useState<string | null>(null);
  const [payAttachmentType, setPayAttachmentType] = useState<string | null>(null);
  const [isUploadingPayFile, setIsUploadingPayFile] = useState(false);
  const [isDraggingBillAttachment, setIsDraggingBillAttachment] = useState(false);
  const [isDraggingPaySlip, setIsDraggingPaySlip] = useState(false);

  // Upload Slip for Existing Payment Modal State
  const [uploadingSlipPayment, setUploadingSlipPayment] = useState<BillPayment | null>(null);
  const [retroSlipUrl, setRetroSlipUrl] = useState<string | null>(null);
  const [retroSlipName, setRetroSlipName] = useState<string | null>(null);
  const [retroSlipType, setRetroSlipType] = useState<string | null>(null);
  const [isUploadingRetroSlip, setIsUploadingRetroSlip] = useState(false);
  const [isDraggingRetroSlip, setIsDraggingRetroSlip] = useState(false);

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
    setEditingBill(null);
    setName('');
    setAmount('');
    setCategory('Utilities');
    setDueDate(today);
    setRecurrenceRule('MONTHLY');
    setNotes('');
    setAttachmentUrl(null);
    setAttachmentName(null);
    setAttachmentType(null);
    setFormError(null);
    setIsAddModalOpen(true);
  };

  const openEditModal = (b: Bill) => {
    setEditingBill(b);
    setName(b.name);
    setAmount(String(b.amount));
    setCategory(b.category);
    setDueDate(b.due_date);
    setRecurrenceRule(b.recurrence_rule);
    setNotes(b.notes || '');
    setAttachmentUrl(b.attachment_url || b.image_url || null);
    setAttachmentName(b.attachment_name || (b.image_url ? 'รูปบิล/QR Code' : null));
    setAttachmentType(b.attachment_type || (b.image_url ? 'image/jpeg' : null));
    setFormError(null);
    setIsAddModalOpen(true);
  };

  const processBillFile = async (file: File) => {
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('ขนาดไฟล์ต้องไม่เกิน 5MB');
      return;
    }

    setIsUploadingFile(true);
    try {
      if (file.type.startsWith('image/')) {
        const compressed = await compressImage(file, 1280, 0.82);
        setAttachmentUrl(compressed);
        setAttachmentName(file.name);
        setAttachmentType('image');
      } else {
        const reader = new FileReader();
        reader.onload = () => {
          setAttachmentUrl(reader.result as string);
          setAttachmentName(file.name);
          setAttachmentType(file.type || 'application/pdf');
          setIsUploadingFile(false);
        };
        reader.onerror = () => {
          alert('ไม่สามารถอ่านไฟล์ได้');
          setIsUploadingFile(false);
        };
        reader.readAsDataURL(file);
        return;
      }
    } catch (err) {
      console.error('File process error:', err);
      alert('เกิดข้อผิดพลาดในการประมวลผลไฟล์');
    } finally {
      setIsUploadingFile(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processBillFile(file);
    }
    e.target.value = '';
  };

  const processPayFile = async (file: File) => {
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('ขนาดไฟล์ต้องไม่เกิน 5MB');
      return;
    }

    setIsUploadingPayFile(true);
    try {
      if (file.type.startsWith('image/')) {
        const compressed = await compressImage(file, 1280, 0.82);
        setPayAttachmentUrl(compressed);
        setPayAttachmentName(file.name);
        setPayAttachmentType('image');
      } else {
        const reader = new FileReader();
        reader.onload = () => {
          setPayAttachmentUrl(reader.result as string);
          setPayAttachmentName(file.name);
          setPayAttachmentType(file.type || 'application/pdf');
          setIsUploadingPayFile(false);
        };
        reader.onerror = () => {
          alert('ไม่สามารถอ่านไฟล์ได้');
          setIsUploadingPayFile(false);
        };
        reader.readAsDataURL(file);
        return;
      }
    } catch (err) {
      console.error('Payment file process error:', err);
      alert('เกิดข้อผิดพลาดในการประมวลผลสลิป');
    } finally {
      setIsUploadingPayFile(false);
    }
  };

  const handlePayFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processPayFile(file);
    }
    e.target.value = '';
  };

  const openPayModal = (b: Bill) => {
    setPayingBill(b);
    setPayAmount(String(b.amount));
    setPaidBy(member?.id || '');
    setPayDate(today);
    setPayNote('ชำระบิลตามกำหนด');
    setPayAttachmentUrl(null);
    setPayAttachmentName(null);
    setPayAttachmentType(null);
    setIsUploadingPayFile(false);
  };

  const openUploadSlipForPayment = (p: BillPayment) => {
    setUploadingSlipPayment(p);
    setRetroSlipUrl(p.attachment_url || p.image_url || null);
    setRetroSlipName(p.attachment_name || null);
    setRetroSlipType(p.attachment_type || null);
    setIsUploadingRetroSlip(false);
    setIsDraggingRetroSlip(false);
  };

  const processRetroSlipFile = async (file: File) => {
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('ขนาดไฟล์ต้องไม่เกิน 5MB');
      return;
    }

    setIsUploadingRetroSlip(true);
    try {
      if (file.type.startsWith('image/')) {
        const compressed = await compressImage(file, 1280, 0.82);
        setRetroSlipUrl(compressed);
        setRetroSlipName(file.name);
        setRetroSlipType('image');
      } else {
        const reader = new FileReader();
        reader.onload = () => {
          setRetroSlipUrl(reader.result as string);
          setRetroSlipName(file.name);
          setRetroSlipType(file.type || 'application/pdf');
          setIsUploadingRetroSlip(false);
        };
        reader.onerror = () => {
          alert('ไม่สามารถอ่านไฟล์ได้');
          setIsUploadingRetroSlip(false);
        };
        reader.readAsDataURL(file);
        return;
      }
    } catch (err) {
      console.error('Retro slip process error:', err);
      alert('เกิดข้อผิดพลาดในการประมวลผลสลิป');
    } finally {
      setIsUploadingRetroSlip(false);
    }
  };

  const handleRetroSlipSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processRetroSlipFile(file);
    }
    e.target.value = '';
  };

  const handleSaveRetroSlip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadingSlipPayment || !retroSlipUrl) {
      alert('กรุณาแนบสลิปการโอนเงินก่อนบันทึก');
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/bills', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId: uploadingSlipPayment.id,
          attachmentUrl: retroSlipUrl,
          attachmentName: retroSlipName || 'สลิปการโอนเงิน',
          attachmentType: retroSlipType || 'image/jpeg',
        }),
      });

      if (res.ok) {
        setUploadingSlipPayment(null);
        await fetchBills();
      } else {
        const data = await res.json();
        alert(data.error || 'ไม่สามารถบันทึกสลิปได้');
      }
    } catch (err) {
      console.error('Save retro slip error:', err);
      alert('เกิดข้อผิดพลาดในการบันทึกสลิป');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFormError(null);

    try {
      const payload = {
        id: editingBill?.id,
        name,
        amount,
        category,
        dueDate,
        recurrenceRule,
        notes,
        attachmentUrl,
        attachmentName,
        attachmentType,
      };

      const res = await fetch('/api/bills', {
        method: editingBill ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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
          attachmentUrl: payAttachmentUrl,
          attachmentName: payAttachmentName,
          attachmentType: payAttachmentType,
          imageUrl: payAttachmentUrl,
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

  const handleDeletePayment = async () => {
    if (!deletingPaymentId) return;
    try {
      const res = await fetch(`/api/bills?paymentId=${deletingPaymentId}`, { method: 'DELETE' });
      if (res.ok) {
        setDeletingPaymentId(null);
        fetchBills();
      } else {
        const data = await res.json();
        alert(data.error || 'ไม่สามารถลบประวัติการชำระเงินได้');
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
                  const fileUrl = b.attachment_url || b.image_url;
                  const isImage = fileUrl ? (!b.attachment_type || b.attachment_type.startsWith('image/') || b.attachment_type === 'image' || fileUrl.startsWith('data:image/')) : false;

                  return (
                    <div
                      key={b.id}
                      className="p-5 rounded-3xl bg-card border border-border shadow-soft flex flex-col justify-between gap-4 hover:border-primary/40 transition-colors"
                    >
                      <div className="space-y-3">
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

                        {/* File / QR Code / Slip Preview */}
                        {fileUrl && (
                          <div className="pt-1">
                            {isImage ? (
                              <div
                                onClick={() => setLightboxMedia({ url: fileUrl, title: b.name, isImage: true })}
                                className="group relative inline-flex items-center gap-2 p-1.5 pr-3 rounded-2xl bg-muted/40 hover:bg-muted/70 border border-border/80 cursor-pointer transition-all active:scale-98"
                              >
                                <img
                                  src={fileUrl}
                                  alt="Bill/QR Attachment"
                                  className="w-12 h-12 rounded-xl object-cover border border-border/50 shrink-0"
                                />
                                <div className="min-w-0">
                                  <span className="text-xs font-bold text-foreground flex items-center gap-1 group-hover:text-primary transition-colors">
                                    <QrCode className="w-3.5 h-3.5 text-primary" />
                                    <span>{b.attachment_name || 'รูปบิล / QR Code'}</span>
                                  </span>
                                  <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                    <Maximize2 className="w-3 h-3" /> แตะเพื่อดูรูปขยาย
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <a
                                href={fileUrl}
                                download={b.attachment_name || 'bill-attachment'}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl bg-muted/50 hover:bg-muted border border-border/80 text-xs font-bold text-foreground hover:text-primary transition-all active:scale-98"
                              >
                                <FileText className="w-4 h-4 text-primary shrink-0" />
                                <span className="truncate max-w-[180px]">{b.attachment_name || 'ไฟล์แนบ (PDF/Doc)'}</span>
                                <Download className="w-3.5 h-3.5 text-muted-foreground" />
                              </a>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-border/60">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEditModal(b)}
                            className="p-2 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                            title="แก้ไขบิล"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeletingId(b.id)}
                            className="p-2 rounded-xl text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                            title={t.common.delete}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

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
                {payments.map((p: any) => {
                  const slipUrl = p.attachment_url || p.image_url;
                  const isImageSlip = slipUrl ? (!p.attachment_type || p.attachment_type.startsWith('image/') || p.attachment_type === 'image' || slipUrl.startsWith('data:image/')) : false;

                  return (
                    <div
                      key={p.id}
                      className="p-3.5 rounded-2xl bg-card border border-border/70 hover:border-primary/40 flex items-center justify-between gap-3 text-xs shadow-2xs transition-all group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {slipUrl ? (
                          <div
                            onClick={() =>
                              setLightboxMedia({
                                url: slipUrl,
                                title: `สลิปการจ่าย: ${p.note || 'ชำระบิล'} (${formatCurrency(p.amount)})`,
                                isImage: isImageSlip,
                              })
                            }
                            className="w-11 h-11 rounded-xl overflow-hidden bg-muted border border-border shrink-0 cursor-pointer relative group/thumb shadow-xs"
                            title="แตะเพื่อดูสลิปหลักฐานการจ่าย"
                          >
                            {isImageSlip ? (
                              <img
                                src={slipUrl}
                                alt="Slip"
                                className="w-full h-full object-cover group-hover/thumb:scale-110 transition-transform"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-primary bg-primary/10">
                                <FileText className="w-5 h-5" />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition-opacity text-white">
                              <Maximize2 className="w-3.5 h-3.5" />
                            </div>
                          </div>
                        ) : (
                          <div
                            onClick={() => openUploadSlipForPayment(p)}
                            className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 flex items-center justify-center shrink-0 cursor-pointer transition-colors group/check"
                            title="แตะเพื่อแนบสลิปการโอนเงิน"
                          >
                            <CheckCircle className="w-5 h-5 group-hover/check:scale-110 transition-transform" />
                          </div>
                        )}

                        <div className="space-y-0.5 min-w-0">
                          <p className="font-extrabold text-foreground truncate">{p.note || 'ชำระค่าบริการ'}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {formatThaiDate(p.paid_date, { shortMonth: true })}
                            {p.payer_nick && ` • จ่ายโดย ${p.payer_nick}`}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-extrabold text-sm text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(p.amount)}
                        </span>

                        {slipUrl ? (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                setLightboxMedia({
                                  url: slipUrl,
                                  title: `สลิปการจ่าย: ${p.note || 'ชำระบิล'} (${formatCurrency(p.amount)})`,
                                  isImage: isImageSlip,
                                })
                              }
                              className="px-2.5 py-1 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold transition-all flex items-center gap-1 shadow-2xs"
                              title="ดูหลักฐานการจ่าย"
                            >
                              <ImageIcon className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline text-[11px]">ดูสลิป</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => openUploadSlipForPayment(p)}
                              className="p-1.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                              title="เปลี่ยนรูปสลิป"
                            >
                              <Upload className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openUploadSlipForPayment(p)}
                            className="px-2.5 py-1 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold transition-all flex items-center gap-1 shadow-2xs border border-emerald-500/20 hover:border-emerald-500/40"
                            title="อัปโหลดสลิปการโอนเงินย้อนหลัง"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            <span className="text-[11px]">+ แนบสลิป</span>
                          </button>
                        )}

                        {member?.role === 'ADMIN' && (
                          <button
                            type="button"
                            onClick={() => setDeletingPaymentId(p.id)}
                            className="p-1.5 rounded-xl text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                            title="ลบประวัติการชำระเงิน (เฉพาะแอดมิน)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Bill Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={editingBill ? 'แก้ไขบิลค่าใช้จ่าย' : t.bills.addBill}
        maxWidth="md"
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
              <div className="relative">
                <Calendar className="w-4 h-4 text-primary absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="date"
                  required
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-border bg-background text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
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

          {/* File Upload / Photo / QR Code Attachment Section */}
          <div>
            <label className="block text-xs font-bold mb-1.5">
              แนบไฟล์ / รูปภาพใบแจ้งหนี้ / QR Code สแกนจ่าย
            </label>

            {attachmentUrl ? (
              <div className="p-3 rounded-2xl bg-muted/40 border border-border flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {attachmentType === 'image' || (!attachmentType && attachmentUrl.startsWith('data:image/')) ? (
                    <img
                      src={attachmentUrl}
                      alt="Preview"
                      className="w-12 h-12 rounded-xl object-cover border border-border shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <FileText className="w-6 h-6 text-primary" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">
                      {attachmentName || 'ไฟล์แนบที่เลือก'}
                    </p>
                    <p className="text-[10px] text-muted-foreground">พร้อมบันทึกเข้าสู่บิล</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <label className="p-2 rounded-xl bg-background border border-border hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
                    <Upload className="w-4 h-4" />
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handleFileSelect}
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
                    className="p-2 rounded-xl bg-background border border-border hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 transition-colors"
                    title="ลบไฟล์แนบ"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <label
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingBillAttachment(true);
                }}
                onDragEnter={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingBillAttachment(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingBillAttachment(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingBillAttachment(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) {
                    processBillFile(file);
                  }
                }}
                className={`border-2 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all group select-none ${
                  isDraggingBillAttachment
                    ? 'border-primary bg-primary/15 scale-[1.02] shadow-lg shadow-primary/10 ring-4 ring-primary/20'
                    : 'border-border hover:border-primary/50 hover:bg-primary/5'
                }`}
              >
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                {isUploadingFile ? (
                  <div className="flex items-center gap-2 text-xs text-primary font-bold">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>กำลังประมวลผลไฟล์...</span>
                  </div>
                ) : isDraggingBillAttachment ? (
                  <>
                    <div className="w-10 h-10 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-md animate-bounce">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-black text-primary">
                        วางไฟล์ที่นี่เพื่ออัปโหลด (Drop here)
                      </p>
                      <p className="text-[10px] text-primary/80 font-medium mt-0.5">
                        ปล่อยไฟล์เพื่อแนบรูปบิลหรือ QR Code
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-2xl bg-muted group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                      <Upload className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                        ลากและวาง (Drag & Drop) หรือ แตะเพื่อเลือกรูปภาพ / PDF
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        รองรับรูปบิล, QR Code พร้อมเพย์, หรือใบแจ้งหนี้ PDF (ไม่เกิน 5MB)
                      </p>
                    </div>
                  </>
                )}
              </label>
            )}
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
              disabled={isSaving || isUploadingFile}
              className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-600 active:scale-95 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{t.common.saving}</span>
                </>
              ) : (
                <span>{t.common.save}</span>
              )}
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
            {/* Show Bill QR/Attachment inside Pay Modal if present! */}
            {(payingBill.attachment_url || payingBill.image_url) && (
              <div className="p-3 rounded-2xl bg-muted/40 border border-border flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <QrCode className="w-5 h-5 text-primary shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">
                      {payingBill.attachment_name || 'เอกสาร / QR Code สำหรับชำระเงิน'}
                    </p>
                    <p className="text-[10px] text-muted-foreground">แตะเพื่อเปิดดูแบบขยายใหญ่</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setLightboxMedia({
                      url: (payingBill.attachment_url || payingBill.image_url)!,
                      title: `QR / บิล: ${payingBill.name}`,
                      isImage: true,
                    })
                  }
                  className="px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold flex items-center gap-1 transition-colors"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>ดู QR Code</span>
                </button>
              </div>
            )}

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
                <div className="relative">
                  <Calendar className="w-4 h-4 text-primary absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="date"
                    required
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-border bg-background text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
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

            {/* Payment Proof / Slip Attachment Section */}
            <div>
              <label className="block text-xs font-bold mb-1.5 flex items-center justify-between">
                <span>แนบหลักฐานการโอน / สลิปการจ่ายเงิน (Payment Slip)</span>
                {payAttachmentUrl && (
                  <span className="text-[11px] text-emerald-500 font-bold">แนบสลิปแล้ว ✓</span>
                )}
              </label>

              {payAttachmentUrl ? (
                <div className="p-3 rounded-2xl bg-muted/40 border border-border flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {payAttachmentType === 'image' || (!payAttachmentType && payAttachmentUrl.startsWith('data:image/')) ? (
                      <img
                        src={payAttachmentUrl}
                        alt="Payment Slip Preview"
                        className="w-12 h-12 rounded-xl object-cover border border-border shrink-0 cursor-pointer"
                        onClick={() =>
                          setLightboxMedia({
                            url: payAttachmentUrl,
                            title: `สลิปการจ่าย: ${payingBill.name}`,
                            isImage: true,
                          })
                        }
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                        <FileText className="w-6 h-6 text-emerald-500" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground truncate">
                        {payAttachmentName || 'สลิปการโอนเงิน'}
                      </p>
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                        พร้อมบันทึกเป็นหลักฐาน
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        setLightboxMedia({
                          url: payAttachmentUrl,
                          title: `สลิปการจ่าย: ${payingBill.name}`,
                          isImage: true,
                        })
                      }
                      className="p-2 rounded-xl bg-background border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      title="ดูสลิปแบบขยายใหญ่"
                    >
                      <Maximize2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPayAttachmentUrl(null);
                        setPayAttachmentName(null);
                        setPayAttachmentType(null);
                      }}
                      className="p-2 rounded-xl bg-background border border-border hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 transition-colors"
                      title="ลบสลิป"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <label
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDraggingPaySlip(true);
                  }}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDraggingPaySlip(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDraggingPaySlip(false);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDraggingPaySlip(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) {
                      processPayFile(file);
                    }
                  }}
                  className={`border-2 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all group select-none ${
                    isDraggingPaySlip
                      ? 'border-emerald-500 bg-emerald-500/15 scale-[1.02] shadow-lg shadow-emerald-500/10 ring-4 ring-emerald-500/20'
                      : 'border-border hover:border-emerald-500/50 hover:bg-emerald-500/5'
                  }`}
                >
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handlePayFileSelect}
                    className="hidden"
                  />
                  {isUploadingPayFile ? (
                    <div className="flex items-center gap-2 text-xs text-emerald-600 font-bold">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>กำลังประมวลผลสลิป...</span>
                    </div>
                  ) : isDraggingPaySlip ? (
                    <>
                      <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md animate-bounce">
                        <Upload className="w-5 h-5" />
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                          วางไฟล์ที่นี่เพื่อแนบสลิปทันที (Drop slip here)
                        </p>
                        <p className="text-[10px] text-emerald-600/80 font-medium mt-0.5">
                          ปล่อยไฟล์เพื่อเริ่มประมวลผลสลิปการโอนเงิน
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-10 h-10 rounded-2xl bg-muted group-hover:bg-emerald-500/10 flex items-center justify-center transition-colors">
                        <Upload className="w-5 h-5 text-muted-foreground group-hover:text-emerald-600 transition-colors" />
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-bold text-foreground group-hover:text-emerald-600 transition-colors">
                          ลากและวาง (Drag & Drop) หรือ แตะเพื่อแนบสลิปการโอน
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          รูปภาพสลิปจากแอปธนาคาร หรือไฟล์ PDF (ไม่เกิน 5MB)
                        </p>
                      </div>
                    </>
                  )}
                </label>
              )}
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

      {/* Lightbox Modal for Bill Attachment / QR Code */}
      {lightboxMedia && (
        <Modal
          isOpen={!!lightboxMedia}
          onClose={() => setLightboxMedia(null)}
          title={lightboxMedia.title}
          maxWidth="lg"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-center p-2 rounded-2xl bg-black/5 dark:bg-white/5 border border-border/50 max-h-[75vh] overflow-hidden">
              <img
                src={lightboxMedia.url}
                alt={lightboxMedia.title}
                className="max-h-[70vh] w-auto max-w-full object-contain rounded-xl shadow-md"
              />
            </div>
            <div className="flex items-center justify-between gap-2 pt-1">
              <span className="text-xs text-muted-foreground truncate">{lightboxMedia.title}</span>
              <a
                href={lightboxMedia.url}
                download={`${lightboxMedia.title}.jpg`}
                className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm shrink-0"
              >
                <Download className="w-4 h-4" />
                <span>ดาวน์โหลดรูป</span>
              </a>
            </div>
          </div>
        </Modal>
      )}

      {/* Upload Retro Slip Modal */}
      {uploadingSlipPayment && (
        <Modal
          isOpen={!!uploadingSlipPayment}
          onClose={() => setUploadingSlipPayment(null)}
          title="แนบสลิปการโอนเงิน (Payment Slip)"
          maxWidth="md"
        >
          <form onSubmit={handleSaveRetroSlip} className="space-y-4">
            {/* Summary card */}
            <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/80 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-[11px]">รายการชำระ</span>
                <span className="font-extrabold text-foreground">{uploadingSlipPayment.note || 'ชำระบิล'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-[11px]">ยอดเงิน</span>
                <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">
                  {formatCurrency(uploadingSlipPayment.amount)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-[11px]">วันที่จ่าย</span>
                <span className="text-foreground">{formatThaiDate(uploadingSlipPayment.paid_date)}</span>
              </div>
              {uploadingSlipPayment.payer_nick && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-[11px]">จ่ายโดย</span>
                  <span className="text-foreground">{uploadingSlipPayment.payer_nick}</span>
                </div>
              )}
            </div>

            {/* Upload / Dropzone */}
            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5">
                รูปภาพสลิปหลักฐานการโอน *
              </label>

              {retroSlipUrl ? (
                <div className="p-3 rounded-2xl bg-muted/30 border border-border flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={retroSlipUrl}
                      alt="Slip Preview"
                      className="w-12 h-12 rounded-xl object-cover border border-border shrink-0 shadow-xs"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground truncate">{retroSlipName || 'สลิปการโอนเงิน'}</p>
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">พร้อมบันทึกเข้าประวัติ</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <label className="px-2.5 py-1.5 rounded-xl bg-background border border-border hover:bg-muted text-xs font-bold text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
                      <span>เปลี่ยนรูป</span>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={handleRetroSlipSelect}
                        className="hidden"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setRetroSlipUrl(null);
                        setRetroSlipName(null);
                        setRetroSlipType(null);
                      }}
                      className="p-2 rounded-xl bg-background border border-border hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 transition-colors"
                      title="ลบสลิป"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <label
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDraggingRetroSlip(true);
                  }}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDraggingRetroSlip(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDraggingRetroSlip(false);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDraggingRetroSlip(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) {
                      processRetroSlipFile(file);
                    }
                  }}
                  className={`border-2 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all group select-none ${
                    isDraggingRetroSlip
                      ? 'border-emerald-500 bg-emerald-500/15 scale-[1.02] shadow-lg shadow-emerald-500/10 ring-4 ring-emerald-500/20'
                      : 'border-border hover:border-emerald-500/50 hover:bg-emerald-500/5'
                  }`}
                >
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleRetroSlipSelect}
                    className="hidden"
                  />
                  {isUploadingRetroSlip ? (
                    <div className="flex items-center gap-2 text-xs text-emerald-600 font-bold">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>กำลังประมวลผลสลิป...</span>
                    </div>
                  ) : isDraggingRetroSlip ? (
                    <>
                      <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md animate-bounce">
                        <Upload className="w-5 h-5" />
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                          วางไฟล์ที่นี่เพื่อแนบสลิปทันที (Drop slip here)
                        </p>
                        <p className="text-[10px] text-emerald-600/80 font-medium mt-0.5">
                          ปล่อยไฟล์เพื่อเริ่มประมวลผลสลิปการโอนเงิน
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-10 h-10 rounded-2xl bg-muted group-hover:bg-emerald-500/10 flex items-center justify-center transition-colors">
                        <Upload className="w-5 h-5 text-muted-foreground group-hover:text-emerald-600 transition-colors" />
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-bold text-foreground group-hover:text-emerald-600 transition-colors">
                          ลากและวาง (Drag & Drop) หรือ แตะเพื่อแนบสลิปการโอน
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          รูปภาพสลิปจากแอปธนาคาร หรือไฟล์ PDF (ไม่เกิน 5MB)
                        </p>
                      </div>
                    </>
                  )}
                </label>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border/80">
              <button
                type="button"
                onClick={() => setUploadingSlipPayment(null)}
                className="px-4 py-2.5 rounded-xl border border-border text-xs font-bold hover:bg-muted"
              >
                {t.common.cancel}
              </button>
              <button
                type="submit"
                disabled={isSaving || !retroSlipUrl}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>{isSaving ? 'กำลังบันทึก...' : 'บันทึกสลิป'}</span>
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

      {/* Delete Payment History Confirmation (Admin Only) */}
      <ConfirmDialog
        isOpen={!!deletingPaymentId}
        onClose={() => setDeletingPaymentId(null)}
        onConfirm={handleDeletePayment}
        title="ลบประวัติการชำระเงิน"
        message="คุณต้องการลบรายการชำระเงินนี้ใช่หรือไม่? รายการนี้จะถูกลบออกจากประวัติบิลอย่างถาวร (สิทธิ์เฉพาะแอดมิน)"
      />
    </div>
  );
}
