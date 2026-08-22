'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Info,
  Plus,
  Phone,
  ShieldAlert,
  Trash2,
  Wifi,
  Wrench,
  HeartHandshake,
  FileText,
  Dog,
} from 'lucide-react';
import { useLanguage } from '@/components/LanguageContext';
import { useAuth } from '@/components/AuthContext';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Badge } from '@/components/ui/Badge';
import { EmptyState, LoadingSkeleton } from '@/components/ui/EmptyState';
import { HouseholdInfo } from '@/types';

export default function HouseholdInfoPage() {
  const { t } = useLanguage();
  const { member } = useAuth();

  const [items, setItems] = useState<HouseholdInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [value, setValue] = useState('');
  const [category, setCategory] = useState<any>('GENERAL');
  const [contactPhone, setContactPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchInfo = useCallback(async () => {
    try {
      const res = await fetch('/api/info');
      if (res.ok) {
        const json = await res.json();
        setItems(json.items || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInfo();
  }, [fetchInfo]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFormError(null);

    try {
      const res = await fetch('/api/info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          value,
          category,
          contactPhone,
          notes,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save info');
      }

      setIsAddModalOpen(false);
      fetchInfo();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      const res = await fetch(`/api/info?id=${deletingId}`, { method: 'DELETE' });
      if (res.ok) {
        setDeletingId(null);
        fetchInfo();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'EMERGENCY':
        return Phone;
      case 'UTILITY':
        return Wifi;
      case 'DEVICE':
        return Wrench;
      case 'PET':
        return Dog;
      default:
        return FileText;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">{t.householdInfo.title}</h1>
          <p className="text-xs text-muted-foreground">บันทึกเบอร์โทรสำคัญ รหัส Wi-Fi ช่างประจำบ้าน และข้อมูลเครื่องใช้</p>
        </div>

        <button
          onClick={() => {
            setTitle('');
            setValue('');
            setCategory('GENERAL');
            setContactPhone('');
            setNotes('');
            setFormError(null);
            setIsAddModalOpen(true);
          }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-primary hover:bg-primary-600 active:scale-95 text-white text-xs font-bold shadow-md transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>{t.householdInfo.addInfo}</span>
        </button>
      </div>

      {/* Security Warning Banner */}
      <div className="p-4 rounded-3xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-3">
        <ShieldAlert className="w-5 h-5 text-amber-500 flex-shrink-0" />
        <span>{t.householdInfo.securityWarning}</span>
      </div>

      {/* Info List */}
      {isLoading ? (
        <LoadingSkeleton count={3} height="h-24" />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Info}
          title="ยังไม่มีข้อมูลบ้านที่บันทึกไว้"
          description="บันทึกเบอร์ฉุกเฉิน ช่างแอร์ ช่างไฟ หรือรหัส Wi-Fi เพื่อให้คนในบ้านดูได้สะดวก"
          actionText={t.householdInfo.addInfo}
          onAction={() => setIsAddModalOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {items.map((item) => {
            const Icon = getCategoryIcon(item.category);

            return (
              <div
                key={item.id}
                className="p-5 rounded-3xl bg-card border border-border shadow-soft flex flex-col justify-between gap-3 hover:border-primary/40 transition-colors"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                        <Icon className="w-4 h-4" />
                      </div>
                      <h3 className="font-bold text-sm text-foreground truncate">{item.title}</h3>
                    </div>

                    <Badge variant="primary" size="sm">
                      {t.householdInfo.categories[item.category as keyof typeof t.householdInfo.categories] || item.category}
                    </Badge>
                  </div>

                  <p className="text-sm font-semibold text-foreground/90 bg-muted/40 p-3 rounded-2xl border border-border/40 select-all">
                    {item.value}
                  </p>

                  {item.contact_phone && (
                    <a
                      href={`tel:${item.contact_phone}`}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline pt-1"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>โทร: {item.contact_phone}</span>
                    </a>
                  )}

                  {item.notes && <p className="text-xs text-muted-foreground">{item.notes}</p>}
                </div>

                <div className="flex justify-end pt-2 border-t border-border/40">
                  <button
                    onClick={() => setDeletingId(item.id)}
                    className="p-1.5 rounded-xl text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Info Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={t.householdInfo.addInfo}
      >
        <form onSubmit={handleSave} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold mb-1">{t.householdInfo.infoTitle} *</label>
            <input
              type="text"
              required
              placeholder="เช่น เบอร์นิติบุคคล, ช่างล้างแอร์ประจำ, รหัส Wi-Fi"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-bold mb-1">{t.householdInfo.value} *</label>
            <input
              type="text"
              required
              placeholder="รายละเอียด ข้อมูล หรือข้อความ"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold mb-1">{t.householdInfo.category}</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {(Object.entries(t.householdInfo.categories) as [string, string][]).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">{t.householdInfo.contactPhone}</label>
              <input
                type="tel"
                placeholder="08X-XXX-XXXX"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold mb-1">{t.householdInfo.notes}</label>
            <textarea
              rows={2}
              placeholder="หมายเหตุเพิ่มเติม..."
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

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
