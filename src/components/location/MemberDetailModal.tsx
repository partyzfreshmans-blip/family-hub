'use client';

import React, { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { MemberCurrentLocation, MemberLocationHistory } from '@/types';
import { useLanguage } from '@/components/LanguageContext';
import { MapPin, Navigation, Send, Clock, ShieldCheck, History } from 'lucide-react';
import { formatLocationTimeThai, formatAccuracyThai, getDirectionsUrl } from '@/lib/geo';

interface MemberDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  memberLocation?: MemberCurrentLocation | null;
  isCurrentUser: boolean;
  onRequestLocation: (targetMemberId: string) => void;
}

export default function MemberDetailModal({
  isOpen,
  onClose,
  memberLocation,
  isCurrentUser,
  onRequestLocation,
}: MemberDetailModalProps) {
  const { t } = useLanguage();
  const [history, setHistory] = useState<MemberLocationHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const mem = memberLocation?.member;
  const nickname = mem?.nickname || 'สมาชิก';
  const color = mem?.member_color || '#3b82f6';
  const hasCoordinates = memberLocation && memberLocation.latitude !== 0 && memberLocation.longitude !== 0;

  useEffect(() => {
    if (isOpen && memberLocation?.family_member_id) {
      setLoadingHistory(true);
      fetch(`/api/location/history?memberId=${memberLocation.family_member_id}`)
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) setHistory(data);
        })
        .catch(console.error)
        .finally(() => setLoadingHistory(false));
    }
  }, [isOpen, memberLocation]);

  if (!memberLocation || !mem) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="รายละเอียดตำแหน่ง" maxWidth="md">
      <div className="space-y-5">
        {/* Header Profile */}
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-muted/30 border border-border/70">
          <div
            style={{ backgroundColor: color }}
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-extrabold text-lg shadow-sm"
          >
            {nickname.substring(0, 2)}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-foreground text-lg">{nickname}</h3>
              <span className="px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground text-xs font-bold">
                {mem.role}
              </span>
            </div>
            <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>
                {memberLocation.is_sharing || isCurrentUser
                  ? 'แชร์ตำแหน่งอย่างปลอดภัย'
                  : 'ไม่ได้เปิดแชร์ตำแหน่ง'}
              </span>
            </div>
          </div>
        </div>

        {/* Current Coordinates & Status */}
        {hasCoordinates && (memberLocation.is_sharing || isCurrentUser) ? (
          <div className="space-y-3">
            <div className="p-4 rounded-2xl bg-card border border-border space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-sky-500" /> สถานที่ปัจจุบัน:
                </span>
                <span className="font-bold text-foreground">
                  {memberLocation.matched_place ? memberLocation.matched_place.name : 'นอกสถานที่สำคัญ'}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/50">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> อัปเดตล่าสุด:
                </span>
                <span className="font-medium text-foreground">
                  {formatLocationTimeThai(memberLocation.recorded_at)}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>ความแม่นยำ:</span>
                <span className="font-medium text-foreground">
                  {formatAccuracyThai(memberLocation.accuracy)}
                </span>
              </div>
            </div>

            {/* Navigation & Request Actions */}
            <div className="flex gap-2">
              <a
                href={getDirectionsUrl(memberLocation.latitude, memberLocation.longitude, nickname)}
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-3 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 shadow-sm active:scale-98 transition-all"
              >
                <Navigation className="w-4 h-4" />
                เปิดนำทางใน Google Maps
              </a>

              {!isCurrentUser && (
                <button
                  onClick={() => onRequestLocation(memberLocation.family_member_id)}
                  className="px-4 py-3 rounded-2xl bg-secondary hover:bg-secondary/80 text-foreground font-bold text-sm flex items-center gap-1.5 active:scale-98 transition-all"
                >
                  <Send className="w-4 h-4 text-primary" />
                  ขอตำแหน่งล่าสุด
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="p-6 rounded-2xl bg-muted/20 border border-border/70 text-center space-y-3">
            <p className="text-sm text-muted-foreground">สมาชิกท่านนี้ยังไม่ได้แชร์ตำแหน่งปัจจุบัน</p>
            {!isCurrentUser && (
              <button
                onClick={() => onRequestLocation(memberLocation.family_member_id)}
                className="px-4 py-2.5 rounded-2xl bg-primary text-primary-foreground font-bold text-sm inline-flex items-center gap-2 shadow-sm active:scale-98 transition-all"
              >
                <Send className="w-4 h-4" />
                ส่งคำขอตำแหน่ง
              </button>
            )}
          </div>
        )}

        {/* Location History */}
        <div className="pt-2 border-t border-border space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-foreground">
            <History className="w-4 h-4 text-primary" />
            <span>ประวัติตำแหน่งล่าสุด</span>
          </div>

          {loadingHistory ? (
            <div className="text-center py-4 text-xs text-muted-foreground">กำลังโหลดประวัติ...</div>
          ) : history.length > 0 ? (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {history.map((h) => (
                <div
                  key={h.id}
                  className="p-2.5 rounded-xl bg-muted/20 border border-border/50 text-xs flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-sky-500" />
                    <span className="font-bold text-foreground">
                      {h.place_name || 'ตำแหน่งบนแผนที่'}
                    </span>
                  </div>
                  <span className="text-muted-foreground">{formatLocationTimeThai(h.recorded_at)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">ไม่มีประวัติตำแหน่งที่บันทึกไว้</p>
          )}
        </div>
      </div>
    </Modal>
  );
}
