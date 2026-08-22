'use client';

import React, { useState, useRef } from 'react';
import { Modal } from '@/components/ui/Modal';
import { SosEvent } from '@/types';
import { useLanguage } from '@/components/LanguageContext';
import { ShieldAlert, Phone, MapPin, CheckCircle, AlertOctagon } from 'lucide-react';
import { formatAccuracyThai } from '@/lib/geo';

interface SosModalProps {
  isOpen: boolean;
  onClose: () => void;
  myActiveSos?: SosEvent | null;
  myCoordinates?: { latitude: number; longitude: number; accuracy?: number } | null;
  onSosTriggered: () => void;
  onSosStopped: () => void;
}

export default function SosModal({
  isOpen,
  onClose,
  myActiveSos,
  myCoordinates,
  onSosTriggered,
  onSosStopped,
}: SosModalProps) {
  const { t } = useLanguage();
  const [holding, setHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<any>(null);
  const progressIntervalRef = useRef<any>(null);

  const startHold = () => {
    setHolding(true);
    setProgress(0);

    const startTime = Date.now();
    const duration = 2000; // 2 seconds hold

    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.round((elapsed / duration) * 100));
      setProgress(pct);
    }, 50);

    timerRef.current = setTimeout(async () => {
      clearInterval(progressIntervalRef.current);
      setHolding(false);
      setProgress(100);
      await triggerSos();
    }, duration);
  };

  const cancelHold = () => {
    setHolding(false);
    setProgress(0);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
  };

  const triggerSos = async () => {
    try {
      await fetch('/api/location/sos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: myCoordinates?.latitude || 0,
          longitude: myCoordinates?.longitude || 0,
          accuracy: myCoordinates?.accuracy || 10,
        }),
      });
      onSosTriggered();
    } catch (err) {
      console.error('Error triggering SOS:', err);
    }
  };

  const stopSos = async () => {
    try {
      await fetch('/api/location/sos', { method: 'PUT' });
      onSosStopped();
      onClose();
    } catch (err) {
      console.error('Error stopping SOS:', err);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t.location.sosTitle} maxWidth="md">
      <div className="space-y-5 text-center">
        {myActiveSos ? (
          /* Active SOS Screen */
          <div className="space-y-4">
            <div className="w-16 h-16 rounded-full bg-rose-500/20 text-rose-500 mx-auto flex items-center justify-center animate-bounce">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <div>
              <h3 className="font-extrabold text-lg text-rose-500">SOS กำลังทำงาน</h3>
              <p className="text-xs text-muted-foreground mt-1">
                พิกัดตำแหน่งล่าสุดของคุณถูกแชร์และแจ้งเตือนไปยังสมาชิกในครอบครัวทุกคนแล้ว
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-left text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 text-rose-700 dark:text-rose-300 font-bold">
                <MapPin className="w-4 h-4" /> พิกัดฉุกเฉิน:
              </div>
              <p className="text-muted-foreground font-mono">
                {myActiveSos.last_latitude.toFixed(5)}, {myActiveSos.last_longitude.toFixed(5)}
              </p>
              <p className="text-muted-foreground">{formatAccuracyThai(myActiveSos.last_accuracy)}</p>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={stopSos}
                className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md active:scale-98 transition-all flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                ยกเลิก SOS (ฉันปลอดภัยแล้ว)
              </button>
            </div>
          </div>
        ) : (
          /* Ready to Trigger Screen with Press & Hold */
          <div className="space-y-4">
            <div className="w-16 h-16 rounded-full bg-rose-100 dark:bg-rose-950/40 text-rose-500 mx-auto flex items-center justify-center">
              <AlertOctagon className="w-8 h-8" />
            </div>

            <div>
              <h3 className="font-extrabold text-base text-foreground">ส่งสัญญาณขอความช่วยเหลือ</h3>
              <p className="text-xs text-muted-foreground mt-1">
                ระบบจะส่งพิกัดตำแหน่งของคุณและส่งการแจ้งเตือนด่วนไปยังทุกคนในครอบครัว
              </p>
            </div>

            {/* Hold Button */}
            <div className="pt-2">
              <button
                type="button"
                onMouseDown={startHold}
                onMouseUp={cancelHold}
                onMouseLeave={cancelHold}
                onTouchStart={startHold}
                onTouchEnd={cancelHold}
                className="relative select-none w-full py-5 rounded-3xl bg-rose-500 hover:bg-rose-600 active:scale-98 text-white font-extrabold text-base shadow-lg shadow-rose-500/30 overflow-hidden transition-all"
              >
                <div
                  className="absolute inset-0 bg-rose-700 transition-all duration-75 origin-left opacity-60"
                  style={{ width: `${progress}%` }}
                />
                <span className="relative z-10 flex items-center justify-center gap-2">
                  <ShieldAlert className="w-5 h-5" />
                  {holding ? `กำลังส่ง SOS (${progress}%)...` : t.location.sosHoldToTrigger}
                </span>
              </button>
            </div>

            <p className="text-[11px] text-muted-foreground italic">
              * ฟังก์ชันนี้ใช้สำหรับประสานงานและแจ้งเตือนครอบครัวเท่านั้น ไม่ได้โทรออกหาหน่วยงานกู้ภัยโดยตรง
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}
