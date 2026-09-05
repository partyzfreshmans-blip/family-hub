'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  DollarSign,
  Plus,
  Trash2,
  PieChart,
  Calendar,
  CreditCard,
  User,
  ArrowUpRight,
  MapPin,
  Navigation,
  Image as ImageIcon,
  Upload,
  Download,
  Maximize2,
  Loader2,
  Check,
  Edit2,
  ExternalLink,
  Sparkles,
  FileSpreadsheet,
} from 'lucide-react';
import { useLanguage } from '@/components/LanguageContext';
import { useAuth } from '@/components/AuthContext';
import { formatCurrency, formatThaiDate, getTodayDateString } from '@/lib/utils';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Badge } from '@/components/ui/Badge';
import { EmptyState, LoadingSkeleton } from '@/components/ui/EmptyState';
import { MemberAvatar } from '@/components/ui/MemberAvatar';
import { Expense, FamilyMember, FamilySavedPlace } from '@/types';
import { StatementReaderModal } from '@/components/expenses/StatementReaderModal';

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

export default function ExpensesPage() {
  const { t } = useLanguage();
  const { member, family } = useAuth();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [savedPlaces, setSavedPlaces] = useState<FamilySavedPlace[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isStatementModalOpen, setIsStatementModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Form State
  const today = getTodayDateString();
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<any>('Food');
  const [paidBy, setPaidBy] = useState(member?.id || '');
  const [expenseDate, setExpenseDate] = useState(today);
  const [note, setNote] = useState('');
  const [location, setLocation] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isCompressingImage, setIsCompressingImage] = useState(false);
  const [isDraggingExpenseImage, setIsDraggingExpenseImage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchExpenses = useCallback(async () => {
    try {
      const res = await fetch('/api/expenses');
      if (res.ok) {
        const json = await res.json();
        setExpenses(json.expenses || []);
        setSummary(json.summary || null);
      }

      const memRes = await fetch('/api/families/members');
      if (memRes.ok) {
        const memJson = await memRes.json();
        setFamilyMembers(memJson.members || []);
      }

      const placesRes = await fetch('/api/location/places');
      if (placesRes.ok) {
        const placesJson = await placesRes.json();
        setSavedPlaces(placesJson.places || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const openAddModal = () => {
    setEditingExpense(null);
    setAmount('');
    setDescription('');
    setCategory('Food');
    setPaidBy(member?.id || '');
    setExpenseDate(today);
    setNote('');
    setLocation('');
    setImageUrl(null);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (exp: Expense) => {
    setEditingExpense(exp);
    setAmount(String(exp.amount || ''));
    setDescription(exp.description || '');
    setCategory(exp.category || 'Food');
    setPaidBy(exp.paid_by || member?.id || '');
    setExpenseDate(exp.expense_date || today);
    setNote(exp.note || '');
    setLocation(exp.location || '');
    setImageUrl(exp.image_url || null);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleGetGpsLocation = () => {
    if (!navigator.geolocation) {
      alert('อุปกรณ์ไม่รองรับการระบุตำแหน่ง GPS');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        let matchedName = '';
        for (const p of savedPlaces) {
          const dLat = (p.latitude - lat) * 111000;
          const dLng = (p.longitude - lng) * 111000 * Math.cos((lat * Math.PI) / 180);
          const dist = Math.sqrt(dLat * dLat + dLng * dLng);
          if (dist <= (p.radius_meters || 150)) {
            matchedName = p.name;
            break;
          }
        }
        setLocation(matchedName || `พิกัด GPS (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
        setIsLocating(false);
      },
      (err) => {
        console.error('GPS error:', err);
        setIsLocating(false);
        alert('ไม่สามารถดึงตำแหน่ง GPS ได้ กรุณาอนุญาตการเข้าถึงตำแหน่งในเบราว์เซอร์');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const processExpenseImage = async (file: File) => {
    if (!file) return;
    try {
      setIsCompressingImage(true);
      const compressed = await compressImage(file, 1280, 0.82);
      setImageUrl(compressed);
    } catch (err) {
      console.error('Image compression error:', err);
      alert('ไม่สามารถประมวลผลรูปภาพได้');
    } finally {
      setIsCompressingImage(false);
    }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processExpenseImage(file);
    }
    e.target.value = '';
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFormError(null);

    try {
      const payload = {
        id: editingExpense?.id,
        amount,
        description,
        category,
        paidBy,
        expenseDate,
        note,
        location,
        imageUrl,
      };

      const res = await fetch('/api/expenses', {
        method: editingExpense ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t.common.errorMessage);
      }

      setIsModalOpen(false);
      fetchExpenses();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      const res = await fetch(`/api/expenses?id=${deletingId}`, { method: 'DELETE' });
      if (res.ok) {
        setDeletingId(null);
        fetchExpenses();
      } else {
        const data = await res.json();
        alert(data.error || 'ไม่สามารถลบรายการได้');
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
        <p className="text-xs text-muted-foreground">ส่วนนี้สำหรับบันทึกค่าใช้จ่ายของครอบครัวเท่านั้น</p>
      </div>
    );
  }

  const totalSpent = summary?.totalSpent || 0;
  const budget = family?.monthly_budget || 0;
  const remaining = Math.max(0, budget - totalSpent);
  const isOverBudget = totalSpent > budget && budget > 0;
  const budgetPercent = budget > 0 ? Math.min(100, Math.round((totalSpent / budget) * 100)) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">{t.expenses.title}</h1>
          <p className="text-xs text-muted-foreground">บันทึกและติดตามการใช้จ่ายภายในครอบครัว</p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setIsStatementModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl border border-border bg-card hover:bg-muted text-foreground text-xs font-bold shadow-soft transition-all"
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>อ่าน Statement / สลิป</span>
          </button>

          <button
            onClick={openAddModal}
            className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-primary hover:bg-primary-600 active:scale-95 text-white text-xs font-bold shadow-md transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>{t.expenses.addExpense}</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <LoadingSkeleton count={3} height="h-28" />
      ) : (
        <>
          {/* Monthly Budget Summary Card */}
          <div className="bg-card text-card-foreground rounded-3xl p-6 border border-border shadow-soft space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  {t.expenses.monthlyTotal}
                </p>
                <h2 className="text-3xl font-extrabold tracking-tight text-foreground mt-1">
                  {formatCurrency(totalSpent)}
                </h2>
              </div>

              {budget > 0 && (
                <div className="text-left sm:text-right space-y-0.5">
                  <p className="text-xs text-muted-foreground font-semibold">
                    {t.home.budget}: {formatCurrency(budget)}
                  </p>
                  <p
                    className={`text-sm font-extrabold ${
                      isOverBudget ? 'text-rose-500' : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {isOverBudget
                      ? `เกินงบ ${formatCurrency(totalSpent - budget)}`
                      : `คงเหลือ ${formatCurrency(remaining)}`}
                  </p>
                </div>
              )}
            </div>

            {budget > 0 && (
              <div className="space-y-1.5">
                <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                  <div
                    style={{ width: `${budgetPercent}%` }}
                    className={`h-full rounded-full transition-all duration-500 ${
                      isOverBudget ? 'bg-rose-500' : 'bg-gradient-to-r from-primary to-sky-400'
                    }`}
                  />
                </div>
                <div className="flex justify-between text-[11px] font-bold text-muted-foreground">
                  <span>ใช้น้อยกว่างบ ({budgetPercent}%)</span>
                  <span>100%</span>
                </div>
              </div>
            )}

            {/* Category summary pills */}
            {summary?.categoryTotals && Object.keys(summary.categoryTotals).length > 0 && (
              <div className="border-t border-border/60 pt-3 flex flex-wrap gap-2">
                {Object.entries(summary.categoryTotals).map(([cat, sum]) => (
                  <div
                    key={cat}
                    className="px-3 py-1 rounded-xl bg-muted/60 text-xs font-semibold text-foreground flex items-center gap-1.5"
                  >
                    <span className="text-muted-foreground">{t.expenses.categories[cat as keyof typeof t.expenses.categories] || cat}:</span>
                    <span className="font-bold">{formatCurrency(sum as number)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Expenses List */}
          <div className="space-y-3">
            <h3 className="font-bold text-base text-foreground px-1">{t.expenses.recentExpenses}</h3>

            {expenses.length === 0 ? (
              <EmptyState
                icon={DollarSign}
                title={t.expenses.noExpensesThisMonth}
                description="แตะที่ปุ่มบันทึกรายจ่ายเพื่อเริ่มบันทึกเงินที่จ่ายไป"
                actionText={t.expenses.addExpense}
                onAction={openAddModal}
              />
            ) : (
              <div className="space-y-2.5">
                {expenses.map((exp: any) => {
                  const payer = familyMembers.find((m) => m.id === exp.paid_by);

                  return (
                    <div
                      key={exp.id}
                      className="p-4 rounded-3xl bg-card border border-border shadow-soft flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 hover:border-primary/40 transition-colors"
                    >
                      <div className="flex items-start gap-3.5 min-w-0 flex-1">
                        {exp.image_url ? (
                          <div
                            onClick={() => setLightboxImage(exp.image_url)}
                            className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl overflow-hidden border border-border shrink-0 cursor-pointer group relative shadow-xs"
                            title="แตะเพื่อดูสลิป/รูปภาพเต็ม"
                          >
                            <img
                              src={exp.image_url}
                              alt={exp.description}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                              <Maximize2 className="w-3.5 h-3.5" />
                            </div>
                          </div>
                        ) : (
                          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold shrink-0">
                            <DollarSign className="w-5 h-5 sm:w-6 sm:h-6" />
                          </div>
                        )}

                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-sm text-foreground truncate">{exp.description}</p>
                            <Badge variant="purple" size="sm">
                              {t.expenses.categories[exp.category as keyof typeof t.expenses.categories] || exp.category}
                            </Badge>
                            {exp.image_url && (
                              <span
                                onClick={() => setLightboxImage(exp.image_url)}
                                className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center gap-1 cursor-pointer hover:bg-purple-500/20 transition-colors"
                                title="คลิกเพื่อดูสลิป/รูปภาพ"
                              >
                                <ImageIcon className="w-3 h-3" /> มีสลิป/รูปแนบ
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground pt-0.5">
                            {payer && (
                              <div className="flex items-center gap-1 font-semibold text-foreground/80">
                                <MemberAvatar name={payer.nickname} color={payer.member_color} size="sm" className="w-4 h-4 text-[9px]" />
                                <span>{payer.nickname}</span>
                              </div>
                            )}
                            <span>• {formatThaiDate(exp.expense_date, { shortMonth: true })}</span>

                            {exp.location && (
                              <a
                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(exp.location)}`}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1 hover:text-blue-500 hover:underline transition-colors font-medium"
                                title="เปิดใน Google Maps"
                              >
                                <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                                <span className="max-w-[130px] truncate">{exp.location}</span>
                                <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                              </a>
                            )}
                          </div>

                          {exp.note && (
                            <p className="text-[11px] text-muted-foreground line-clamp-1 italic">
                              หมายเหตุ: {exp.note}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                        <span className="font-extrabold text-base text-foreground pr-1">
                          -{formatCurrency(exp.amount)}
                        </span>

                        {exp.image_url && (
                          <button
                            onClick={() => setLightboxImage(exp.image_url)}
                            className="p-2 rounded-xl text-muted-foreground hover:text-purple-600 hover:bg-purple-500/10 transition-colors"
                            title="ดูสลิป/รูปภาพ"
                          >
                            <ImageIcon className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => openEditModal(exp)}
                          className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          title={t.common.edit}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeletingId(exp.id)}
                          className="p-2 rounded-xl text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                          title={t.common.delete}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* Add / Edit Expense Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingExpense ? 'แก้ไขรายจ่าย' : t.expenses.addExpense}
        maxWidth="lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold mb-1">{t.expenses.amount} *</label>
            <input
              type="number"
              step="0.01"
              required
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border border-border bg-background text-xl font-extrabold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-bold mb-1">{t.expenses.description} *</label>
            <input
              type="text"
              required
              placeholder="เช่น ซื้อของ Lotus, เติมน้ำมันรถ, ค่าอาหารกลางวัน"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold mb-1">{t.expenses.category}</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {(Object.entries(t.expenses.categories) as [string, string][]).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">{t.expenses.paidBy}</label>
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
          </div>

          <div>
            <label className="block text-xs font-bold mb-1">{t.expenses.expenseDate}</label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-primary absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="date"
                required
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-border bg-background text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Enhanced Location Section */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold">สถานที่ / ร้านค้าที่ใช้จ่าย</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleGetGpsLocation}
                  disabled={isLocating}
                  className="text-[11px] font-bold text-primary hover:text-primary-600 flex items-center gap-1 transition-colors"
                >
                  {isLocating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Navigation className="w-3 h-3" />}
                  <span>{isLocating ? 'กำลังค้นหา...' : 'ปักหมุด GPS ปัจจุบัน'}</span>
                </button>
                {location && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] font-bold text-muted-foreground hover:text-blue-500 flex items-center gap-0.5"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>ดูบนแผนที่</span>
                  </a>
                )}
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
                <MapPin className="w-4 h-4" />
              </div>
              <input
                type="text"
                placeholder="เช่น Lotus สาขาใหญ่, ร้านอาหารบ้านสวน, ปั๊ม PTT"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Quick select from saved family places */}
            {savedPlaces.length > 0 && (
              <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-muted-foreground font-semibold">สถานที่ของบ้าน:</span>
                {savedPlaces.slice(0, 6).map((place) => (
                  <button
                    key={place.id}
                    type="button"
                    onClick={() => setLocation(place.name)}
                    className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium transition-all ${
                      location === place.name
                        ? 'border-primary bg-primary/10 text-primary font-bold shadow-xs'
                        : 'border-border/60 bg-muted/40 text-foreground hover:bg-muted'
                    }`}
                  >
                    {place.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Receipt / Image Upload Section */}
          <div>
            <label className="block text-xs font-bold mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-primary" />
                <span>สลิปโอนเงิน / ใบเสร็จรับเงิน / รูปสินค้า</span>
              </span>
              {imageUrl && (
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  <Check className="w-3 h-3" /> แนบสลิป/รูปแล้ว
                </span>
              )}
            </label>

            {imageUrl ? (
              <div className="relative group rounded-2xl overflow-hidden border border-border bg-muted/30 p-2.5 flex items-center gap-3">
                <img
                  src={imageUrl}
                  alt="Expense attachment"
                  className="w-20 h-20 object-cover rounded-xl border border-border/80 shadow-xs cursor-pointer hover:opacity-90 transition-opacity shrink-0"
                  onClick={() => setLightboxImage(imageUrl)}
                  title="แตะเพื่อขยายดูรูปขนาดเต็ม"
                />
                <div className="flex-1 min-w-0 space-y-1.5">
                  <p className="text-xs font-bold text-foreground truncate">สลิป/ใบเสร็จสำหรับรายจ่ายนี้</p>
                  <p className="text-[11px] text-muted-foreground">แตะที่รูปเพื่อขยายดูขนาดเต็ม</p>
                  <div className="flex items-center gap-2 pt-0.5">
                    <label className="cursor-pointer px-2.5 py-1 rounded-lg border border-border bg-card hover:bg-muted text-[11px] font-bold text-foreground flex items-center gap-1 transition-colors">
                      <Upload className="w-3 h-3" />
                      <span>เปลี่ยนรูป</span>
                      <input type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                    </label>
                    <button
                      type="button"
                      onClick={() => setImageUrl(null)}
                      className="px-2.5 py-1 rounded-lg border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-[11px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>ลบรูป</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <label
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingExpenseImage(true);
                }}
                onDragEnter={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingExpenseImage(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingExpenseImage(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingExpenseImage(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) {
                    processExpenseImage(file);
                  }
                }}
                className={`flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-2xl cursor-pointer transition-all text-center group select-none ${
                  isDraggingExpenseImage
                    ? 'border-primary bg-primary/15 scale-[1.02] shadow-lg shadow-primary/10 ring-4 ring-primary/20'
                    : 'border-border hover:border-primary/60 bg-muted/20 hover:bg-muted/40'
                }`}
              >
                <input type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                {isCompressingImage ? (
                  <div className="flex items-center gap-2 text-xs font-bold text-primary py-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>กำลังประมวลผลและบีบอัดรูปภาพ...</span>
                  </div>
                ) : isDraggingExpenseImage ? (
                  <>
                    <div className="w-10 h-10 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center mb-1 shadow-md animate-bounce">
                      <Upload className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-black text-primary">วางรูปภาพที่นี่เพื่อแนบสลิป (Drop here)</span>
                    <span className="text-[10px] text-primary/80 font-medium mt-0.5">ปล่อยไฟล์รูปภาพเพื่อบันทึก</span>
                  </>
                ) : (
                  <>
                    <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-1 group-hover:scale-105 transition-transform">
                      <Upload className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-foreground">ลากและวาง (Drag & Drop) หรือ แตะเพื่อแนบสลิป/ใบเสร็จ</span>
                    <span className="text-[10px] text-muted-foreground mt-0.5">JPG, PNG, WEBP (บีบอัดและปรับขนาดให้อัตโนมัติ)</span>
                  </>
                )}
              </label>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold mb-1">{t.expenses.note}</label>
            <textarea
              rows={2}
              placeholder="หมายเหตุเพิ่มเติม (ถ้ามี)..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
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
          title="สลิป / ใบเสร็จรับเงิน"
          maxWidth="lg"
        >
          <div className="space-y-4">
            <div className="max-h-[70vh] flex items-center justify-center overflow-hidden rounded-2xl bg-black/5 dark:bg-black/40 p-2">
              <img
                src={lightboxImage}
                alt="Expense Full View"
                className="max-h-[65vh] w-auto object-contain rounded-xl shadow-md"
              />
            </div>
            <div className="flex items-center justify-between pt-1">
              <a
                href={lightboxImage}
                download="expense-receipt.jpg"
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
