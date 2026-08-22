'use client';

import React from 'react';
import { MemberCurrentLocation } from '@/types';
import { useLanguage } from '@/components/LanguageContext';
import { Navigation, MapPin, Send, Eye, ShieldAlert } from 'lucide-react';
import { formatLocationTimeThai, formatAccuracyThai, getDirectionsUrl } from '@/lib/geo';

interface MemberLocationCardProps {
  memberLocation: MemberCurrentLocation;
  isCurrentUser: boolean;
  isSosActive: boolean;
  onFocusMap: (memberId: string) => void;
  onOpenDetail: (memberId: string) => void;
  onRequestLocation: (targetMemberId: string) => void;
}

export default function MemberLocationCard({
  memberLocation,
  isCurrentUser,
  isSosActive,
  onFocusMap,
  onOpenDetail,
  onRequestLocation,
}: MemberLocationCardProps) {
  const { t } = useLanguage();
  const mem = memberLocation.member;
  const isSharing = memberLocation.is_sharing || isCurrentUser;
  const isLive = memberLocation.stale_status === 'LIVE';
  const hasCoordinates = memberLocation.latitude !== 0 && memberLocation.longitude !== 0;

  const nickname = mem?.nickname || 'สมาชิก';
  const color = mem?.member_color || '#3b82f6';
  const placeName = memberLocation.matched_place ? memberLocation.matched_place.name : null;

  return (
    <div
      className={`relative p-4 rounded-3xl transition-all border ${
        isSosActive
          ? 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800 shadow-rose-500/10 shadow-lg'
          : 'bg-card border-border/80 shadow-soft hover:shadow-md'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Member Avatar & Basic Info */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <div
              style={{ backgroundColor: color }}
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-extrabold text-base shadow-sm"
            >
              {nickname.substring(0, 2)}
            </div>
            {isSosActive ? (
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-500 text-[9px] text-white font-bold items-center justify-center">!</span>
              </span>
            ) : isLive && isSharing ? (
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-card rounded-full" />
            ) : null}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-foreground text-sm sm:text-base">{nickname}</h4>
              {isCurrentUser && (
                <span className="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                  คุณ
                </span>
              )}
              {isSosActive && (
                <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-extrabold flex items-center gap-1 animate-pulse">
                  <ShieldAlert className="w-3 h-3" /> SOS
                </span>
              )}
            </div>

            {/* Location or Sharing Status */}
            {isSharing && hasCoordinates ? (
              <div className="mt-0.5 flex flex-col">
                {placeName ? (
                  <span className="text-xs font-bold text-sky-600 dark:text-sky-400 flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {placeName}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">นอกสถานที่สำคัญ</span>
                )}
                <span className="text-[11px] text-muted-foreground mt-0.5">
                  {isLive ? '🟢 กำลังแชร์สด' : `🕒 ${formatLocationTimeThai(memberLocation.recorded_at)}`}
                  {' • '}
                  {formatAccuracyThai(memberLocation.accuracy)}
                </span>
              </div>
            ) : (
              <span className="text-xs text-muted-foreground/80 mt-1 block">
                {isCurrentUser ? 'คุณไม่ได้แชร์ตำแหน่ง' : 'ไม่ได้แชร์ตำแหน่ง'}
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5">
          {hasCoordinates && isSharing ? (
            <>
              <button
                onClick={() => onFocusMap(memberLocation.family_member_id)}
                className="p-2 rounded-xl bg-secondary/80 hover:bg-secondary text-foreground text-xs font-bold transition-all"
                title="ดูบนแผนที่"
              >
                <MapPin className="w-4 h-4 text-sky-500" />
              </button>
              <a
                href={getDirectionsUrl(memberLocation.latitude, memberLocation.longitude, nickname)}
                target="_blank"
                rel="noreferrer"
                className="p-2 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 dark:text-sky-400 text-xs font-bold transition-all"
                title="นำทาง"
              >
                <Navigation className="w-4 h-4" />
              </a>
            </>
          ) : !isCurrentUser ? (
            <button
              onClick={() => onRequestLocation(memberLocation.family_member_id)}
              className="px-2.5 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold flex items-center gap-1 transition-all"
              title="ขอตำแหน่งล่าสุด"
            >
              <Send className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">ขอตำแหน่ง</span>
            </button>
          ) : null}

          <button
            onClick={() => onOpenDetail(memberLocation.family_member_id)}
            className="p-2 rounded-xl bg-secondary/80 hover:bg-secondary text-muted-foreground hover:text-foreground text-xs transition-all"
            title="ดูรายละเอียด"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
