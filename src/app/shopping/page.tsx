'use client';

import React, { useEffect, useState, useCallback } from 'react';
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
} from 'lucide-react';
import { useLanguage } from '@/components/LanguageContext';
import { useAuth } from '@/components/AuthContext';
import { Badge } from '@/components/ui/Badge';
import { EmptyState, LoadingSkeleton } from '@/components/ui/EmptyState';
import { ShoppingItem } from '@/types';

export default function ShoppingPage() {
  const { t } = useLanguage();
  const { member } = useAuth();

  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [frequentItems, setFrequentItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Fast Inline Add Form State
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('');
  const [category, setCategory] = useState<any>('Grocery');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch('/api/shopping');
      if (res.ok) {
        const json = await res.json();
        setItems(json.items || []);
        setFrequentItems(json.frequentItems || []);
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
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleTogglePurchased = async (item: ShoppingItem) => {
    if (togglingId) return;
    setTogglingId(item.id);
    const nextPurchased = item.purchased === 1 ? 0 : 1;

    try {
      // Small visual delay so the user sees the beautiful tick / spin animation
      const [res] = await Promise.all([
        fetch('/api/shopping', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: item.id, purchased: nextPurchased }),
        }),
        new Promise((resolve) => setTimeout(resolve, 280)),
      ]);

      if (res.ok) {
        await fetchItems();
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
      const [res] = await Promise.all([
        fetch(`/api/shopping?id=${itemId}`, { method: 'DELETE' }),
        new Promise((resolve) => setTimeout(resolve, 200)),
      ]);
      if (res.ok) {
        await fetchItems();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingId(null);
    }
  };

  const pendingItems = items.filter((i) => i.purchased === 0);
  const purchasedItems = items.filter((i) => i.purchased === 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">{t.shopping.title}</h1>
        <p className="text-xs text-muted-foreground">รายการของที่ต้องซื้อร่วมกันในบ้าน</p>
      </div>

      {/* Fast Inline Input Card */}
      <div className="bg-card text-card-foreground rounded-3xl p-4 sm:p-5 border border-border shadow-soft space-y-3">
        <form onSubmit={handleQuickAdd} className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              required
              placeholder={t.shopping.quickAddPlaceholder}
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              className="flex-1 px-4 py-2.5 rounded-2xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              type="submit"
              disabled={isSubmitting || !itemName.trim()}
              className="px-5 py-2.5 rounded-2xl bg-primary hover:bg-primary-600 active:scale-95 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 flex-shrink-0"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              <span className="hidden sm:inline">{t.common.add}</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <input
              type="number"
              min="1"
              placeholder="จำนวน (เช่น 1)"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <input
              type="text"
              placeholder="หน่วย (เช่น กล่อง, ถุง)"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="col-span-2 sm:col-span-1 px-3 py-1.5 rounded-xl border border-border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {(Object.entries(t.shopping.categories) as [string, string][]).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
        </form>

        {/* 1-Tap Frequent Items */}
        {frequentItems.length > 0 && (
          <div className="border-t border-border/60 pt-3">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground mb-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>{t.shopping.frequentItems}:</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {frequentItems.map((freq, idx) => (
                <button
                  key={idx}
                  onClick={() => handle1TapAdd(freq)}
                  className="px-3 py-1 rounded-xl bg-muted/60 hover:bg-muted text-xs font-semibold text-foreground border border-border/50 transition-colors flex items-center gap-1 active:scale-95"
                >
                  <Plus className="w-3 h-3 text-primary" />
                  <span>{freq.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Lists */}
      {isLoading ? (
        <LoadingSkeleton count={3} height="h-16" />
      ) : (
        <div className="space-y-6">
          {/* 1. Pending Section (ต้องซื้อ) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="font-bold text-base text-foreground flex items-center gap-2">
                <span>{t.shopping.pendingSection}</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  {pendingItems.length}
                </span>
              </h2>
            </div>

            {pendingItems.length === 0 ? (
              <EmptyState
                icon={ShoppingCart}
                title="ไม่มีของที่ต้องซื้อในขณะนี้"
                description="พิมพ์รายการของที่ต้องการด้านบนเพื่อบันทึกเข้าสู่รายการรวมของบ้าน"
              />
            ) : (
              <div className="space-y-2">
                {pendingItems.map((item: any) => {
                  const isToggling = togglingId === item.id;
                  const isDeleting = deletingId === item.id;

                  return (
                    <div
                      key={item.id}
                      className={`p-3.5 rounded-2xl bg-card border border-border shadow-soft flex items-center justify-between gap-3 transition-all duration-300 ${
                        isToggling
                          ? 'scale-[0.98] bg-emerald-500/10 border-emerald-500/40'
                          : isDeleting
                          ? 'opacity-0 scale-95'
                          : 'hover:border-primary/40 animate-slide-up'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <button
                          onClick={() => handleTogglePurchased(item)}
                          disabled={isToggling}
                          className="p-1 rounded-xl text-muted-foreground hover:text-emerald-500 transition-all flex-shrink-0 active:scale-90"
                          title="ซื้อแล้ว"
                        >
                          {isToggling ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-500 animate-check-pop" />
                          ) : (
                            <Circle className="w-5 h-5 hover:scale-110 transition-transform" />
                          )}
                        </button>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p
                              className={`font-bold text-sm text-foreground truncate transition-all duration-200 ${
                                isToggling ? 'line-through text-muted-foreground' : ''
                              }`}
                            >
                              {item.name}
                            </p>
                            <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-muted text-foreground">
                              {item.quantity} {item.unit || 'ชิ้น'}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                            <Badge variant="primary" size="sm">
                              {t.shopping.categories[item.category as keyof typeof t.shopping.categories] || item.category}
                            </Badge>
                            {item.adder_nick && <span>เพิ่มโดย {item.adder_nick}</span>}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDelete(item.id)}
                        disabled={isDeleting || isToggling}
                        className="p-2 rounded-xl text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 2. Purchased Section (ซื้อแล้ว) */}
          {purchasedItems.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between px-1">
                <h2 className="font-bold text-sm text-muted-foreground flex items-center gap-2">
                  <span>{t.shopping.purchasedSection}</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                    {purchasedItems.length}
                  </span>
                </h2>
              </div>

              <div className="space-y-2">
                {purchasedItems.map((item: any) => {
                  const isToggling = togglingId === item.id;
                  const isDeleting = deletingId === item.id;

                  return (
                    <div
                      key={item.id}
                      className={`p-3.5 rounded-2xl bg-muted/30 border border-border/40 flex items-center justify-between gap-3 transition-all duration-300 ${
                        isToggling
                          ? 'scale-[0.98] opacity-100 bg-primary-500/10 border-primary/40'
                          : isDeleting
                          ? 'opacity-0 scale-95'
                          : 'opacity-60 hover:opacity-100 animate-slide-up'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium text-sm line-through text-muted-foreground truncate">
                            {item.name} ({item.quantity} {item.unit || 'ชิ้น'})
                          </p>
                          {item.buyer_nick && (
                            <p className="text-[10px] text-muted-foreground">ซื้อแล้วโดย {item.buyer_nick}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleTogglePurchased(item)}
                          disabled={isToggling}
                          className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-primary hover:bg-primary/10 flex items-center gap-1.5 transition-all active:scale-95"
                          title={t.shopping.restore}
                        >
                          <RotateCcw className={`w-3.5 h-3.5 ${isToggling ? 'animate-spin' : ''}`} />
                          <span className="hidden sm:inline">
                            {isToggling ? 'กำลังย้าย...' : t.shopping.restore}
                          </span>
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          disabled={isDeleting || isToggling}
                          className="p-2 rounded-xl text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
