'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { MemberLocationSettings } from '@/types';
import { useLanguage } from '@/components/LanguageContext';
import { Shield, Clock, Trash2, CheckCircle2, History, AlertTriangle } from 'lucide-react';

interface LocationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings?: MemberLocationSettings;
  onSettingsUpdated: () => void;
}

export default function LocationSettingsModal({
  isOpen,
  onClose,
  settings,
  onSettingsUpdated,
}: LocationSettingsModalProps) {
  const { t } = useLanguage();
  const [sharingMode, setSharingMode] = useState<string>(settings?.sharing_mode || 'APP_ACTIVE');
  const [durationHours, setDurationHours] = useState<string>('4');
  const [historyEnabled, setHistoryEnabled] = useState<boolean>(settings?.history_enabled === 1);
  const [retentionDays, setRetentionDays] = useState<number>(settings?.retention_days || 7);
  const [saving, setSaving] = useState(false);
  const [purging, setPurging] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/location/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sharing_mode: sharingMode,
          sharing_enabled: sharingMode !== 'OFF' ? 1 : 0,
          duration_hours: sharingMode === 'TIMED' ? durationHours : null,
          history_enabled: historyEnabled ? 1 : 0,
          retention_days: retentionDays,
        }),
      });
      if (res.ok) {
        setMsg('บันทึกการตั้งค่าเรียบร้อยแล้ว');
        onSettingsUpdated();
        setTimeout(() => setMsg(null), 2500);
      }
    } catch (err) {
      console.error('Error updating location settings:', err);
    } finally {
      setSaving(false);
    }
  };

  const handlePurgeHistory = async (range: 'TODAY' | 'WEEK' | 'ALL') => {
    if (!confirm(t.location.deleteHistoryConfirm)) return;
    setPurging(true);
    try {
      const res = await fetch(`/api/location/history?range=${range}`, { method: 'DELETE' });
      if (res.ok) {
        setMsg(t.location.historyPurged);
        setTimeout(() => setMsg(null), 2500);
      }
    } catch (err) {
      console.error('Error purging history:', err);
    } finally {
      setPurging(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t.location.privacySettings} maxWidth="md">
      <form onSubmit={handleSaveSettings} className="space-y-5">
        {msg && (
          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            {msg}
          </div>
        )}

        {/* Section 1: Sharing Mode */}
        <div className="p-4 rounded-2xl bg-card border border-border/80 space-y-3">
          <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            โหมดการแชร์ตำแหน่ง
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              { id: 'OFF', label: t.location.modes.OFF, desc: 'ไม่ส่งพิกัดตำแหน่งใดๆ' },
              { id: 'ONCE', label: t.location.modes.ONCE, desc: 'แชร์ครั้งเดียวแล้วปิดทันที' },
              { id: 'TIMED', label: t.location.modes.TIMED, desc: 'แชร์ตามระยะเวลาที่กำหนด' },
              { id: 'APP_ACTIVE', label: t.location.modes.APP_ACTIVE, desc: 'แชร์ขณะเปิดใช้งานแอป' },
            ].map((m) => (
              <label
                key={m.id}
                className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                  sharingMode === m.id
                    ? 'border-primary bg-primary/5 shadow-xs'
                    : 'border-border/60 hover:bg-muted/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-foreground">{m.label}</span>
                  <input
                    type="radio"
                    name="sharingMode"
                    value={m.id}
                    checked={sharingMode === m.id}
                    onChange={(e) => setSharingMode(e.target.value)}
                    className="accent-primary"
                  />
                </div>
                <span className="text-[11px] text-muted-foreground mt-1">{m.desc}</span>
              </label>
            ))}
          </div>

          {sharingMode === 'TIMED' && (
            <div className="pt-2 border-t border-border/50 flex items-center justify-between gap-3">
              <span className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> เลือกระยะเวลา:
              </span>
              <select
                value={durationHours}
                onChange={(e) => setDurationHours(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-secondary border border-input text-foreground text-xs font-bold outline-none"
              >
                <option value="1">{t.location.timedOptions['1']}</option>
                <option value="4">{t.location.timedOptions['4']}</option>
                <option value="8">{t.location.timedOptions['8']}</option>
                <option value="EOD">{t.location.timedOptions['EOD']}</option>
              </select>
            </div>
          )}
        </div>

        {/* Section 2: Location History & Retention */}
        <div className="p-4 rounded-2xl bg-card border border-border/80 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
              <History className="w-4 h-4 text-primary" />
              {t.location.locationHistory}
            </h4>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={historyEnabled}
                onChange={(e) => setHistoryEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          {historyEnabled && (
            <div className="space-y-3 pt-2 border-t border-border/50">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-bold">{t.location.retention}:</span>
                <select
                  value={retentionDays}
                  onChange={(e) => setRetentionDays(Number(e.target.value))}
                  className="px-3 py-1.5 rounded-xl bg-secondary border border-input text-foreground text-xs font-bold outline-none"
                >
                  <option value={1}>{t.location.retentionOptions['1']}</option>
                  <option value={7}>{t.location.retentionOptions['7']}</option>
                  <option value={30}>{t.location.retentionOptions['30']}</option>
                </select>
              </div>

              {/* Purge Buttons */}
              <div className="pt-2 border-t border-border/50">
                <span className="block text-xs font-bold text-muted-foreground mb-2">
                  ลบประวัติตำแหน่ง:
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={purging}
                    onClick={() => handlePurgeHistory('TODAY')}
                    className="flex-1 py-1.5 rounded-xl bg-secondary/80 hover:bg-secondary text-foreground text-xs font-bold transition-all"
                  >
                    วันนี้
                  </button>
                  <button
                    type="button"
                    disabled={purging}
                    onClick={() => handlePurgeHistory('WEEK')}
                    className="flex-1 py-1.5 rounded-xl bg-secondary/80 hover:bg-secondary text-foreground text-xs font-bold transition-all"
                  >
                    7 วันที่ผ่านมา
                  </button>
                  <button
                    type="button"
                    disabled={purging}
                    onClick={() => handlePurgeHistory('ALL')}
                    className="flex-1 py-1.5 rounded-xl bg-destructive/10 hover:bg-destructive/20 text-destructive text-xs font-bold transition-all"
                  >
                    ทั้งหมด
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Notice */}
        <div className="p-3 rounded-2xl bg-muted/30 border border-border/50 text-[11px] text-muted-foreground flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <span>
            Family Hub แชร์ตำแหน่งเฉพาะเมื่อคุณเปิดใช้งานและให้สิทธิ์เท่านั้น ไม่มีการแอบติดตามแบบลับหลังใดๆ ทั้งสิ้น
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-muted-foreground hover:bg-secondary"
          >
            {t.common.cancel}
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-sm active:scale-98 transition-all"
          >
            {saving ? t.common.saving : t.common.save}
          </button>
        </div>
      </form>
    </Modal>
  );
}
