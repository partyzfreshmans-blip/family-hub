'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  ShoppingCart,
  Plus,
  CheckCircle2,
  Circle,
  RotateCcw,
  Trash2,
  Sparkles,
  Loader2,
  Check,
  Copy,
  Edit2,
  Receipt,
  CheckCircle,
} from 'lucide-react';
import { useLanguage } from '@/components/LanguageContext';
import { useAuth } from '@/components/AuthContext';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { EmptyState, LoadingSkeleton } from '@/components/ui/EmptyState';
import { ShoppingItem, FamilyMember } from '@/types';

const CATEGORIES = [
  { id: 'Grocery', label: 'อาหาร / ของสด', icon: '🥦', expCat: 'Food' },
  { id: 'Household', label: 'ของใช้ในบ้าน', icon: '🧼', expCat: 'House' },
  { id: 'Personal', label: 'ของใช้ส่วนตัว', icon: '🧴', expCat: 'Shopping' },
  { id: 'Pharmacy', label: 'ยาและสุขภาพ', icon: '💊', expCat: 'Health' },
  { id: 'Pets', label: 'สัตว์เลี้ยง', icon: '🐱', expCat: 'Pets' },
  { id: 'Other', label: 'อื่นๆ', icon: '📦', expCat: 'Shopping' },
];

export default function ShoppingPage() {
  const { t } = useLanguage();
  const { member } = useAuth();

  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [frequentItems, setFrequentItems] = useState<any[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Purchase & Expense Prompt Modal State
  const [purchasingItem, setPurchasingItem] = useState<ShoppingItem | null>(null);
  const [purchasePrice, setPurchasePrice] = useState<string>('');
  const [purchasePaidBy, setPurchasePaidBy] = useState<string>('');
  const [purchaseCategory, setPurchaseCategory] = useState<string>('Shopping');
  const [purchaseRecordExpense, setPurchaseRecordExpense] = useState<boolean>(true);
  const [isSubmittingPurchase, setIsSubmittingPurchase] = useState<boolean>(false);

  // Edit Modal State
  const [editingItem, setEditingItem] = useState<ShoppingItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editQuantity, setEditQuantity] = useState('1');
  const [editUnit, setEditUnit] = useState('');
  const [editCategory, setEditCategory] = useState<any>('Grocery');
  const [editPrice, setEditPrice] = useState('');
  const [editNote, setEditNote] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Fast Inline Add Form State
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('');
  const [category, setCategory] = useState<any>('Grocery');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const fetchItems = useCallback(async () => {
    try {
      const [shopRes, memRes] = await Promise.all([
        fetch('/api/shopping'),
        fetch('/api/families/members'),
      ]);

      if (shopRes.ok) {
        const json = await shopRes.json();
        setItems(json.items || []);
        setFrequentItems(json.frequentItems || []);
      }

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
    fetchItems();
  }, [fetchItems]);

  const handleQuickAdd = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!itemName.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/shopping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: itemName.trim(),
          quantity,
          unit,
          category,
        }),
      });

      if (res.ok) {
        setItemName('');
        setQuantity('1');
        setUnit('');
        fetchItems();
        showToast(`เพิ่ม "${itemName.trim()}" ลงในรายการซื้อแล้ว`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handle1TapAdd = async (frequent: { name: string; cat: string; unit: string }) => {
    try {
      const res = await fetch('/api/shopping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: frequent.name,
          quantity: 1,
          unit: frequent.unit,
          category: frequent.cat,
        }),
      });
      if (res.ok) {
        fetchItems();
        showToast(`เพิ่ม "${frequent.name}" แล้ว`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Click on unpurchased item circle -> Open Purchase & Expense Modal
  const handleInitiatePurchase = (item: ShoppingItem) => {
    if (item.purchased === 1) {
      // If already purchased, unmark it (restore)
      handleToggleRestore(item);
      return;
    }

    const catObj = CATEGORIES.find((c) => c.id === item.category);
    setPurchasingItem(item);
    setPurchasePrice(item.price ? String(item.price) : '');
    setPurchasePaidBy(member?.id || familyMembers[0]?.id || '');
    setPurchaseCategory(catObj?.expCat || 'Shopping');
    setPurchaseRecordExpense(true);
  };

  // Confirm Purchase with optional price and automatic expense logging
  const handleConfirmPurchase = async (e?: React.FormEvent, recordExp = purchaseRecordExpense) => {
    if (e) e.preventDefault();
    if (!purchasingItem) return;

    setIsSubmittingPurchase(true);
    try {
      const res = await fetch('/api/shopping', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: purchasingItem.id,
          purchased: 1,
          price: purchasePrice ? parseFloat(purchasePrice) : null,
          recordExpense: recordExp && Boolean(purchasePrice && parseFloat(purchasePrice) > 0),
          expensePaidBy: purchasePaidBy || member?.id,
          expenseCategory: purchaseCategory,
          expenseNote: `ซื้อ ${purchasingItem.name} (${purchasingItem.quantity || 1} ${purchasingItem.unit || 'ชิ้น'})`,
        }),
      });

      if (res.ok) {
        const pName = purchasingItem.name;
        const pAmt = parseFloat(purchasePrice);
        setPurchasingItem(null);
        await fetchItems();
        if (recordExp && pAmt > 0) {
          showToast(`ซื้อ "${pName}" สำเร็จ และบันทึกลงรายจ่ายบ้าน ฿${pAmt.toLocaleString()} แล้ว!`);
        } else {
          showToast(`ทำเครื่องหมายซื้อ "${pName}" แล้ว`);
        }
      }
    } catch (err) {
      console.error('Purchase error:', err);
    } finally {
      setIsSubmittingPurchase(false);
    }
  };

  // Restore item back to To Buy (and remove auto expense)
  const handleToggleRestore = async (item: ShoppingItem) => {
    if (togglingId) return;
    setTogglingId(item.id);

    try {
      const res = await fetch('/api/shopping', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, purchased: 0 }),
      });

      if (res.ok) {
        await fetchItems();
        showToast(`ย้าย "${item.name}" กลับไปรายการที่ต้องซื้อแล้ว`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (itemId: string) => {
    setDeletingId(itemId);
    try {
      const res = await fetch(`/api/shopping?id=${itemId}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchItems();
        showToast('ลบรายการซื้อของแล้ว');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleDuplicate = async (item: ShoppingItem) => {
    if (duplicatingId) return;
    setDuplicatingId(item.id);
    try {
      const res = await fetch('/api/shopping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: item.name,
          quantity: item.quantity,
          unit: item.unit || '',
          category: item.category,
          note: item.note || '',
        }),
      });
      if (res.ok) {
        await fetchItems();
        showToast(`ทำซ้ำ "${item.name}" ไปยังรายการที่ต้องซื้อแล้ว`);
      }
    } catch (err) {
      console.error('Duplicate shopping item error:', err);
    } finally {
      setDuplicatingId(null);
    }
  };

  const openEditModal = (item: ShoppingItem) => {
    setEditingItem(item);
    setEditName(item.name);
    setEditQuantity(String(item.quantity || 1));
    setEditUnit(item.unit || '');
    setEditCategory(item.category || 'Grocery');
    setEditPrice(item.price ? String(item.price) : '');
    setEditNote(item.note || '');
    setEditError(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    setIsSavingEdit(true);
    setEditError(null);

    try {
      const res = await fetch('/api/shopping', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingItem.id,
          name: editName.trim(),
          quantity: editQuantity,
          unit: editUnit.trim() || null,
          category: editCategory,
          price: editPrice ? parseFloat(editPrice) : null,
          note: editNote.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update shopping item');
      }

      setEditingItem(null);
      fetchItems();
      showToast(`แก้ไขข้อมูล "${editName.trim()}" สำเร็จ`);
    } catch (err: any) {
      setEditError(err.message);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const toBuyItems = items.filter((i) => !i.purchased);
  const purchasedItems = items.filter((i) => i.purchased);

  // Total amount spent on purchased items
  const totalPurchasedAmount = useMemo(() => {
    return purchasedItems.reduce((sum, item) => sum + (item.price || 0), 0);
  }, [purchasedItems]);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl bg-foreground text-background font-bold text-xs shadow-2xl flex items-center gap-2 animate-bounce">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            {t.shopping.title}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            รายการของที่ต้องซื้อร่วมกันในบ้าน และบันทึกค่าใช้จ่ายเข้าบัญชีครอบครัวอัตโนมัติ
          </p>
        </div>

        {purchasedItems.length > 0 && totalPurchasedAmount > 0 && (
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold shrink-0">
            <Receipt className="w-4 h-4" />
            <span>ยอดซื้อรวม: ฿{totalPurchasedAmount.toLocaleString()}</span>
          </div>
        )}
      </div>

      {/* 1. Fast Inline Add Box */}
      <div className="bg-card text-card-foreground rounded-3xl p-5 sm:p-6 border border-border shadow-soft space-y-4">
        <form onSubmit={handleQuickAdd} className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              required
              placeholder={t.shopping.quickAddPlaceholder || 'เพิ่มของที่ต้องซื้อ...'}
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              className="flex-1 px-4 py-2.5 rounded-2xl border border-border bg-background text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              type="submit"
              disabled={isSubmitting || !itemName.trim()}
              className="px-5 py-2.5 rounded-2xl bg-primary hover:bg-primary-600 active:scale-95 text-white font-extrabold text-xs shadow-md transition-all flex items-center gap-1.5 shrink-0"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              <span>{t.common.add}</span>
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <input
              type="number"
              min="1"
              step="any"
              placeholder={t.shopping.quantity}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="px-3.5 py-2 rounded-xl border border-border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary"
            />

            <input
              type="text"
              placeholder={t.shopping.unit}
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="px-3.5 py-2 rounded-xl border border-border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary"
            />

            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="px-3.5 py-2 rounded-xl border border-border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.label}
                </option>
              ))}
            </select>
          </div>
        </form>

        {/* 1-Tap Add Frequent Items */}
        {frequentItems.length > 0 && (
          <div className="pt-2 border-t border-border/60">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground mb-2">
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>{t.shopping.frequentItems || 'ซื้อบ่อย'}:</span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {frequentItems.map((f, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handle1TapAdd(f)}
                  className="px-2.5 py-1 rounded-xl bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground text-xs font-bold transition-colors flex items-center gap-1 border border-border/40 active:scale-95"
                >
                  <Plus className="w-3 h-3 text-primary" />
                  <span>{f.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 2. Items List */}
      {isLoading ? (
        <LoadingSkeleton count={3} height="h-20" />
      ) : items.length === 0 ? (
        <div className="p-12 text-center bg-card rounded-3xl border border-border shadow-soft space-y-3">
          <ShoppingCart className="w-12 h-12 text-muted-foreground mx-auto opacity-40" />
          <h3 className="font-bold text-base text-foreground">ยังไม่มีรายการซื้อของ</h3>
          <p className="text-xs text-muted-foreground">เพิ่มรายการของที่ต้องซื้อร่วมกันในบ้านได้ที่ช่องด้านบน</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* TO BUY SECTION */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-extrabold text-base flex items-center gap-2 text-foreground">
                <span>{t.shopping.pendingSection || 'ต้องซื้อ'}</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                  {toBuyItems.length}
                </span>
              </h2>
              <span className="text-[11px] text-muted-foreground">แตะที่วงกลมเพื่อระบุราคา & ลงรายจ่าย</span>
            </div>

            {toBuyItems.length === 0 ? (
              <div className="p-8 text-center bg-card rounded-3xl border border-dashed border-border text-muted-foreground text-xs">
                🎉 ซื้อของครบหมดแล้ว! เพิ่มรายการใหม่ด้านบนได้เลย
              </div>
            ) : (
              <div className="space-y-2">
                {toBuyItems.map((item) => {
                  const catObj = CATEGORIES.find((c) => c.id === item.category);

                  return (
                    <div
                      key={item.id}
                      className="p-4 rounded-3xl bg-card border border-border shadow-soft flex items-center justify-between gap-3 hover:border-primary/50 transition-all group"
                    >
                      {/* Checkbox circle -> Click to open purchase modal */}
                      <button
                        type="button"
                        onClick={() => handleInitiatePurchase(item)}
                        className="p-1 rounded-full text-muted-foreground hover:text-primary hover:scale-110 active:scale-95 transition-all shrink-0"
                        title="คลิกเพื่อติ๊กซื้อและบันทึกค่าใช้จ่าย"
                      >
                        <Circle className="w-6 h-6 stroke-[1.5]" />
                      </button>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-extrabold text-sm text-foreground">
                            {item.name}
                          </p>
                          <span className="text-xs font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-lg">
                            {item.quantity} {item.unit || 'ชิ้น'}
                          </span>
                          {item.price && (
                            <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg">
                              ฿{item.price.toLocaleString()}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 pt-1 text-[11px] text-muted-foreground">
                          <span className="px-1.5 py-0.5 rounded-md bg-muted/60 text-muted-foreground font-semibold">
                            {catObj?.icon} {catObj?.label || item.category}
                          </span>
                          {item.adder_nick && (
                            <span>เพิ่มโดย {item.adder_nick}</span>
                          )}
                          {item.note && (
                            <span className="truncate italic">({item.note})</span>
                          )}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleInitiatePurchase(item)}
                          className="px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-xs font-extrabold transition-colors flex items-center gap-1"
                          title="บันทึกว่าซื้อแล้ว"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>ซื้อแล้ว</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => openEditModal(item)}
                          className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          title="แก้ไขรายละเอียด"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          disabled={deletingId === item.id}
                          className="p-2 rounded-xl text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                          title="ลบรายการ"
                        >
                          {deletingId === item.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* PURCHASED SECTION */}
          {purchasedItems.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-border/80">
              <div className="flex items-center justify-between">
                <h2 className="font-extrabold text-base flex items-center gap-2 text-muted-foreground">
                  <span>{t.shopping.purchasedSection || 'ซื้อแล้ว'}</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    {purchasedItems.length}
                  </span>
                </h2>
              </div>

              <div className="space-y-2">
                {purchasedItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-3xl bg-muted/30 border border-border/60 flex items-center justify-between gap-3 opacity-80 hover:opacity-100 transition-all group"
                  >
                    {/* Checkbox */}
                    <button
                      type="button"
                      onClick={() => handleToggleRestore(item)}
                      className="p-1 text-emerald-600 dark:text-emerald-400 shrink-0"
                      title="ย้ายกลับไปรายการที่ต้องซื้อ"
                    >
                      <CheckCircle2 className="w-5 h-5 fill-emerald-500 text-card" />
                    </button>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-sm text-muted-foreground line-through">
                          {item.name}
                        </p>
                        <span className="text-xs text-muted-foreground">
                          ({item.quantity} {item.unit || 'ชิ้น'})
                        </span>

                        {item.price && (
                          <span className="text-xs font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 px-2 py-0.5 rounded-lg flex items-center gap-1">
                            <Receipt className="w-3 h-3" />
                            <span>฿{item.price.toLocaleString()} (ลงรายจ่ายแล้ว)</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 pt-0.5 text-[11px] text-muted-foreground">
                        {item.buyer_nick && (
                          <span>ซื้อแล้วโดย {item.buyer_nick}</span>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleDuplicate(item)}
                        disabled={duplicatingId === item.id}
                        className="px-2.5 py-1.5 rounded-xl bg-muted hover:bg-muted/80 text-foreground font-bold text-xs flex items-center gap-1 transition-colors"
                        title="ทำซ้ำไปยังรายการที่ต้องซื้อ"
                      >
                        {duplicatingId === item.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 text-primary" />
                        )}
                        <span>ทำซ้ำ</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleRestore(item)}
                        disabled={togglingId === item.id}
                        className="px-2.5 py-1.5 rounded-xl bg-muted hover:bg-muted/80 text-foreground font-bold text-xs flex items-center gap-1 transition-colors"
                        title="ย้ายกลับไปรายการที่ต้องซื้อ"
                      >
                        {togglingId === item.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <RotateCcw className="w-3.5 h-3.5 text-sky-500" />
                        )}
                        <span>ย้ายกลับ</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => openEditModal(item)}
                        className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted"
                        title="แก้ไข"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        disabled={deletingId === item.id}
                        className="p-1.5 rounded-xl text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10"
                        title="ลบ"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. Record Purchase & Expense Modal */}
      {purchasingItem && (
        <Modal
          isOpen={!!purchasingItem}
          onClose={() => setPurchasingItem(null)}
          title="บันทึกการซื้อ & ค่าใช้จ่าย"
          maxWidth="sm"
        >
          <form onSubmit={(e) => handleConfirmPurchase(e, purchaseRecordExpense)} className="space-y-4">
            {/* Item Summary Banner */}
            <div className="p-3.5 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-between">
              <div>
                <p className="font-extrabold text-base text-foreground">{purchasingItem.name}</p>
                <p className="text-xs text-muted-foreground">
                  จำนวน: {purchasingItem.quantity} {purchasingItem.unit || 'ชิ้น'}
                </p>
              </div>
              <span className="text-2xl">
                {CATEGORIES.find((c) => c.id === purchasingItem.category)?.icon || '🛒'}
              </span>
            </div>

            {/* Price Input */}
            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5">
                จำนวนเงินที่ซื้อ (บาท)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-extrabold text-primary text-base">
                  ฿
                </span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  autoFocus
                  placeholder="0.00"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(e.target.value)}
                  className="w-full pl-9 pr-4 py-3 rounded-2xl border border-border bg-background text-lg font-extrabold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Quick price increment pills */}
              <div className="flex items-center gap-1.5 pt-2 flex-wrap">
                {[50, 100, 150, 200, 300, 500].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => {
                      const cur = parseFloat(purchasePrice) || 0;
                      setPurchasePrice(String(cur + amt));
                    }}
                    className="px-2.5 py-1 rounded-xl bg-muted/60 hover:bg-muted text-xs font-bold border border-border/50 text-foreground transition-all active:scale-95"
                  >
                    +{amt}
                  </button>
                ))}
                {purchasePrice && (
                  <button
                    type="button"
                    onClick={() => setPurchasePrice('')}
                    className="px-2.5 py-1 rounded-xl text-xs font-bold text-rose-500 hover:bg-rose-500/10 transition-colors"
                  >
                    ล้าง
                  </button>
                )}
              </div>
            </div>

            {/* Payer and Category Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold mb-1 text-muted-foreground">
                  ผู้จ่ายเงิน
                </label>
                <select
                  value={purchasePaidBy}
                  onChange={(e) => setPurchasePaidBy(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {familyMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nickname} ({m.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1 text-muted-foreground">
                  หมวดหมู่รายจ่าย
                </label>
                <select
                  value={purchaseCategory}
                  onChange={(e) => setPurchaseCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="Food">🥦 อาหาร / ของกิน (Food)</option>
                  <option value="House">🧼 ของใช้ในบ้าน (House)</option>
                  <option value="Shopping">🛍️ ซื้อของทั่วไป (Shopping)</option>
                  <option value="Health">💊 ยาและสุขภาพ (Health)</option>
                  <option value="Pets">🐱 สัตว์เลี้ยง (Pets)</option>
                  <option value="Other">📦 อื่นๆ (Other)</option>
                </select>
              </div>
            </div>

            {/* Auto Expense Toggle Checkbox */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-muted/40 border border-border">
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Receipt className="w-3.5 h-3.5 text-emerald-500" />
                  <span>บันทึกลงในรายจ่ายครอบครัวอัตโนมัติ</span>
                </p>
                <p className="text-[10px] text-muted-foreground">
                  หักลบกับงบประมาณรายจ่ายประจำเดือนของบ้านทันที
                </p>
              </div>
              <input
                type="checkbox"
                checked={purchaseRecordExpense}
                onChange={(e) => setPurchaseRecordExpense(e.target.checked)}
                className="w-5 h-5 rounded text-primary focus:ring-primary"
              />
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              <button
                type="submit"
                disabled={isSubmittingPurchase}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-primary to-sky-500 hover:from-primary-600 hover:to-sky-600 text-white font-extrabold text-sm shadow-md transition-all flex items-center justify-center gap-2 active:scale-98"
              >
                {isSubmittingPurchase ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                <span>
                  {purchasePrice && parseFloat(purchasePrice) > 0 && purchaseRecordExpense
                    ? `บันทึกซื้อ & ลงรายจ่าย (฿${parseFloat(purchasePrice).toLocaleString()})`
                    : 'บันทึกว่าซื้อแล้ว'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleConfirmPurchase(undefined, false)}
                className="w-full py-2 rounded-xl text-xs font-bold text-muted-foreground hover:bg-muted transition-colors text-center"
              >
                ติ๊กซื้อเฉยๆ (ไม่ต้องลงรายจ่าย)
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* 4. Edit Item Modal */}
      {editingItem && (
        <Modal
          isOpen={!!editingItem}
          onClose={() => setEditingItem(null)}
          title={t.shopping.editItem || 'แก้ไขรายการซื้อของ'}
          maxWidth="md"
        >
          <form onSubmit={handleSaveEdit} className="space-y-4">
            {editError && (
              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs font-bold">
                {editError}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold mb-1">{t.shopping.itemName} *</label>
              <input
                type="text"
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold mb-1">{t.shopping.quantity}</label>
                <input
                  type="number"
                  min="0.1"
                  step="any"
                  value={editQuantity}
                  onChange={(e) => setEditQuantity(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">{t.shopping.unit}</label>
                <input
                  type="text"
                  placeholder="เช่น กล่อง, ถุง"
                  value={editUnit}
                  onChange={(e) => setEditUnit(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-bold mb-1">ราคา (บาท)</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0.00"
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm font-extrabold focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1">{t.shopping.category}</label>
              <select
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1">{t.shopping.note}</label>
              <input
                type="text"
                placeholder="เช่น ยี่ห้อที่ต้องการ, ร้านที่ซื้อ"
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="px-4 py-2.5 rounded-xl border border-border text-xs font-bold hover:bg-muted"
              >
                {t.common.cancel}
              </button>
              <button
                type="submit"
                disabled={isSavingEdit || !editName.trim()}
                className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-600 active:scale-95 text-white text-xs font-extrabold shadow-md transition-all flex items-center gap-1.5"
              >
                {isSavingEdit ? (
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
      )}
    </div>
  );
}
