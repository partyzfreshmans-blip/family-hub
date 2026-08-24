'use client';

import React, { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { MemberCurrentLocation, MemberLocationHistory, FamilySavedPlace } from '@/types';
import { useLanguage } from '@/components/LanguageContext';
import {
  MapPin,
  Navigation,
  Send,
  Clock,
  ShieldCheck,
  History,
  Plus,
  CheckCircle2,
  Loader2,
  Home,
  GraduationCap,
  Briefcase,
  HeartHandshake,
  Building2,
} from 'lucide-react';
import { formatLocationTimeThai, formatAccuracyThai, getDirectionsUrl } from '@/lib/geo';

interface MemberDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  memberLocation?: MemberCurrentLocation | null;
  isCurrentUser: boolean;
  onRequestLocation: (targetMemberId: string) => void;
  onPlaceSaved?: () => void;
}

export default function MemberDetailModal({
  isOpen,
  onClose,
  memberLocation,
  isCurrentUser,
  onRequestLocation,
  onPlaceSaved,
}: MemberDetailModalProps) {
  const { t } = useLanguage();
  const [history, setHistory] = useState<MemberLocationHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Name Place Form State
  const [isNamingPlace, setIsNamingPlace] = useState(false);
  const [placeName, setPlaceName] = useState('');
  const [placeCategory, setPlaceCategory] = useState<FamilySavedPlace['category']>('WORK');
  const [placeRadius, setPlaceRadius] = useState<number>(150);
  const [customCoords, setCustomCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [savingPlace, setSavingPlace] = useState(false);
  const [placeSuccessMsg, setPlaceSuccessMsg] = useState<string | null>(null);

  const mem = memberLocation?.member;
  const nickname = mem?.nickname || 'สมาชิก';
  const color = mem?.member_color || '#3b82f6';
  const hasCoordinates = memberLocation && memberLocation.latitude !== 0 && memberLocation.longitude !== 0;

  useEffect(() => {
    if (isOpen && memberLocation?.family_member_id) {
      setIsNamingPlace(false);
      setPlaceName('');
      setCustomCoords(null);
      setPlaceSuccessMsg(null);
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

  const handleOpenNamingForm = (coords?: { lat: number; lng: number }) => {
    if (coords) {
      setCustomCoords(coords);
    } else if (memberLocation) {
      setCustomCoords({ lat: memberLocation.latitude, lng: memberLocation.longitude });
    }
    setIsNamingPlace(true);
    setPlaceName('');
  };

  const handleSaveNewPlace = async (e: React.FormEvent) => {
    e.preventDefault();
    const lat = customCoords ? customCoords.lat : memberLocation?.latitude;
    const lng = customCoords ? customCoords.lng : memberLocation?.longitude;

    if (!placeName.trim() || typeof lat !== 'number' || typeof lng !== 'number') return;

    setSavingPlace(true);
    try {
      const res = await fetch('/api/location/places', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: placeName.trim(),
          latitude: lat,
          longitude: lng,
          radius_meters: placeRadius,
          category: placeCategory,
          icon: placeCategory === 'HOME' ? 'Home' : placeCategory === 'SCHOOL' ? 'GraduationCap' : 'MapPin',
        }),
      });

      if (res.ok) {
        setPlaceSuccessMsg(`บันทึกสถานที่ "${placeName.trim()}" เรียบร้อยแล้ว`);
        setIsNamingPlace(false);
        setPlaceName('');
        setCustomCoords(null);
        if (onPlaceSaved) onPlaceSaved();
        setTimeout(() => setPlaceSuccessMsg(null), 3000);
      }
    } catch (err) {
      console.error('Error saving place name:', err);
    } finally {
      setSavingPlace(false);
    }
  };

  if (!memberLocation || !mem) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="รายละเอียดตำแหน่ง" maxWidth="md">
      <div className="space-y-5">
        {/* Success Alert */}
        {placeSuccessMsg && (
          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{placeSuccessMsg}</span>
          </div>
        )}

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
            <div className="p-4 rounded-2xl bg-card border border-border space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground flex items-center gap-1.5 text-sm">
                  <MapPin className="w-4 h-4 text-sky-500 shrink-0" /> สถานที่ปัจจุบัน:
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-foreground text-sm">
                    {memberLocation.matched_place ? memberLocation.matched_place.name : 'นอกสถานที่สำคัญ'}
                  </span>
                  {!memberLocation.matched_place && !isNamingPlace && (
                    <button
                      onClick={() => handleOpenNamingForm()}
                      className="px-2.5 py-1 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold flex items-center gap-1 transition-all active:scale-95 shadow-xs border border-primary/20"
                      title="ตั้งชื่อสถานที่นี้เป็นสถานที่ของบ้าน"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>ตั้งชื่อสถานที่นี้</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Inline Naming Form */}
              {isNamingPlace && (
                <form
                  onSubmit={handleSaveNewPlace}
                  className="p-3.5 rounded-2xl bg-primary/5 border border-primary/20 space-y-3 animate-fadeIn"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-xs text-primary flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" /> ตั้งชื่อสถานที่สำคัญที่พิกัดนี้
                    </h4>
                    <span className="text-[10px] text-muted-foreground">
                      ({(customCoords?.lat || memberLocation.latitude).toFixed(4)}, {(customCoords?.lng || memberLocation.longitude).toFixed(4)})
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-muted-foreground mb-1">
                      ชื่อสถานที่ (เช่น ที่ทำงานแม่, โรงเรียน, บ้านคุณยาย) *
                    </label>
                    <input
                      type="text"
                      required
                      autoFocus
                      placeholder="เช่น ที่ทำงานแม่, ร้านกาแฟประจำ, สนามกีฬา"
                      value={placeName}
                      onChange={(e) => setPlaceName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-background border border-border text-foreground text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-muted-foreground mb-1">หมวดหมู่</label>
                      <select
                        value={placeCategory}
                        onChange={(e) => setPlaceCategory(e.target.value as any)}
                        className="w-full px-2.5 py-1.5 rounded-xl bg-background border border-border text-foreground text-xs font-semibold outline-none"
                      >
                        <option value="WORK">ที่ทำงาน</option>
                        <option value="HOME">บ้าน</option>
                        <option value="SCHOOL">โรงเรียน</option>
                        <option value="GRANDPARENTS">บ้านญาติ</option>
                        <option value="HOSPITAL">โรงพยาบาล</option>
                        <option value="OTHER">อื่นๆ</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-muted-foreground mb-1">รัศมีตรวจจับ</label>
                      <select
                        value={placeRadius}
                        onChange={(e) => setPlaceRadius(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 rounded-xl bg-background border border-border text-foreground text-xs font-semibold outline-none"
                      >
                        <option value={100}>100 เมตร (บ้าน)</option>
                        <option value={150}>150 เมตร (ที่ทำงาน/โรงเรียน)</option>
                        <option value={200}>200 เมตร (ห้าง/บริเวณกว้าง)</option>
                        <option value={300}>300 เมตร (พื้นที่ขนาดใหญ่)</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsNamingPlace(false);
                        setCustomCoords(null);
                      }}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold text-muted-foreground hover:bg-muted"
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="submit"
                      disabled={savingPlace || !placeName.trim()}
                      className="px-4 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-sm flex items-center gap-1.5"
                    >
                      {savingPlace ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                      <span>บันทึกสถานที่</span>
                    </button>
                  </div>
                </form>
              )}

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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold text-foreground">
              <History className="w-4 h-4 text-primary" />
              <span>ประวัติตำแหน่งล่าสุด</span>
            </div>
            <span className="text-[11px] text-muted-foreground font-medium">
              {history.length} จุดที่บันทึก
            </span>
          </div>

          {loadingHistory ? (
            <div className="text-center py-4 text-xs text-muted-foreground">กำลังโหลดประวัติ...</div>
          ) : history.length > 0 ? (
            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {history.map((h) => (
                <div
                  key={h.id}
                  className="p-2.5 rounded-xl bg-muted/20 border border-border/50 text-xs flex items-center justify-between gap-2 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <MapPin className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                    <div className="min-w-0">
                      <span className="font-bold text-foreground truncate block">
                        {h.place_name || 'ตำแหน่งบนแผนที่'}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {formatLocationTimeThai(h.recorded_at)}
                      </span>
                    </div>
                  </div>

                  {!h.place_name && (
                    <button
                      onClick={() => handleOpenNamingForm({ lat: h.latitude, lng: h.longitude })}
                      className="px-2 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-[10px] font-bold shrink-0 flex items-center gap-1 transition-colors"
                      title="ตั้งชื่อพิกัดนี้เป็นสถานที่สำคัญ"
                    >
                      <Plus className="w-3 h-3" />
                      <span>ตั้งชื่อ</span>
                    </button>
                  )}
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
