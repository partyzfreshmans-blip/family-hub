'use client';

import React, { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/components/AuthContext';
import { useLanguage } from '@/components/LanguageContext';
import {
  MemberCurrentLocation,
  FamilySavedPlace,
  MemberLocationSettings,
  SosEvent,
  LocationRequest,
} from '@/types';
import MemberLocationCard from '@/components/location/MemberLocationCard';
import LocationRequestsBanner from '@/components/location/LocationRequestsBanner';
import MemberDetailModal from '@/components/location/MemberDetailModal';
import SavedPlacesModal from '@/components/location/SavedPlacesModal';
import LocationSettingsModal from '@/components/location/LocationSettingsModal';
import SosModal from '@/components/location/SosModal';
import {
  MapPin,
  Shield,
  ShieldAlert,
  Settings,
  Plus,
  RefreshCw,
  EyeOff,
  Radio,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

// Dynamic import for Leaflet map to prevent SSR issues
const FamilyMap = dynamic(() => import('@/components/location/FamilyMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[360px] sm:h-[480px] rounded-3xl bg-muted/30 border border-border flex items-center justify-center text-muted-foreground text-sm font-bold animate-pulse">
      กำลังโหลดแผนที่ครอบครัว...
    </div>
  ),
});

export default function LocationPage() {
  const { user, member } = useAuth();
  const { t } = useLanguage();

  // State
  const [members, setMembers] = useState<MemberCurrentLocation[]>([]);
  const [places, setPlaces] = useState<FamilySavedPlace[]>([]);
  const [mySettings, setMySettings] = useState<MemberLocationSettings | null>(null);
  const [activeSos, setActiveSos] = useState<SosEvent[]>([]);
  const [pendingRequests, setPendingRequests] = useState<
    (LocationRequest & { requester_nickname?: string; requester_color?: string })[]
  >([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [placesModalOpen, setPlacesModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [sosModalOpen, setSosModalOpen] = useState(false);

  // Browser GPS State
  const [myCoords, setMyCoords] = useState<{ latitude: number; longitude: number; accuracy?: number } | null>(null);
  const [permissionState, setPermissionState] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const lastSyncTimeRef = useRef<number>(0);

  // Fetch initial family location state
  const loadLocationData = async () => {
    try {
      const res = await fetch('/api/location');
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members || []);
        setPlaces(data.places || []);
        setMySettings(data.mySettings || null);
        setActiveSos(data.activeSos || []);
        setPendingRequests(data.pendingRequests || []);
      }
    } catch (err) {
      console.error('Error loading location data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLocationData();
    const interval = setInterval(loadLocationData, 15000); // Polling every 15s
    return () => clearInterval(interval);
  }, []);

  // Handle Geolocation Tracking while app is active
  useEffect(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) return;

    // Check permission status if API available
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions
        .query({ name: 'geolocation' as any })
        .then((result) => {
          setPermissionState(result.state as any);
          result.onchange = () => setPermissionState(result.state as any);
        })
        .catch(() => {});
    }

    const isSharing =
      mySettings?.sharing_enabled === 1 &&
      mySettings.sharing_mode !== 'OFF';

    if (isSharing) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        async (pos) => {
          setPermissionState('granted');
          const coords = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          };
          setMyCoords(coords);

          // Throttle updates to at most once per 30 seconds
          const now = Date.now();
          if (now - lastSyncTimeRef.current > 30000) {
            lastSyncTimeRef.current = now;
            try {
              await fetch('/api/location', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  ...coords,
                  source: activeSos.some((s) => s.family_member_id === member?.id)
                    ? 'sos'
                    : 'foreground',
                }),
              });
              loadLocationData();
            } catch (e) {
              console.error('Error syncing GPS:', e);
            }
          }
        },
        (err) => {
          if (err.code === err.PERMISSION_DENIED) {
            setPermissionState('denied');
          }
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );
    } else {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    }

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [mySettings?.sharing_enabled, mySettings?.sharing_mode]);

  // Request fresh location once
  const requestCurrentGpsOnce = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setPermissionState('granted');
        const coords = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        };
        setMyCoords(coords);
        await fetch('/api/location', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...coords, source: 'one_time_share' }),
        });
        showToast('อัปเดตตำแหน่งของคุณเรียบร้อยแล้ว');
        loadLocationData();
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) setPermissionState('denied');
      }
    );
  };

  // Stop sharing action
  const handleStopSharing = async () => {
    try {
      await fetch('/api/location/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sharing_mode: 'OFF', sharing_enabled: 0 }),
      });
      showToast('หยุดแชร์ตำแหน่งเรียบร้อยแล้ว');
      loadLocationData();
    } catch (e) {
      console.error(e);
    }
  };

  // Request location from a member
  const handleRequestMemberLocation = async (targetMemberId: string) => {
    try {
      const res = await fetch('/api/location/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_member_id: targetMemberId }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(t.location.requestSent);
      } else {
        showToast(data.error || 'ไม่สามารถส่งคำขอได้');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const isMySharingActive =
    mySettings?.sharing_enabled === 1 && mySettings.sharing_mode !== 'OFF';

  const myMemberLoc = members.find((m) => m.family_member_id === member?.id);
  const selectedMemberLoc = members.find((m) => m.family_member_id === selectedMemberId);

  return (
    <div className="space-y-6 pb-12">
        {/* Toast Notification */}
        {toastMsg && (
          <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl bg-foreground text-background font-bold text-xs shadow-xl flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            {toastMsg}
          </div>
        )}

        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground flex items-center gap-2.5">
              <span className="p-2 rounded-2xl bg-sky-500/10 text-sky-500">
                <MapPin className="w-6 h-6" />
              </span>
              {t.location.title}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">{t.location.subtitle}</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* SOS Emergency Button */}
            <button
              onClick={() => setSosModalOpen(true)}
              className="px-3.5 py-2.5 rounded-2xl bg-rose-500 hover:bg-rose-600 active:scale-95 text-white font-extrabold text-xs shadow-md shadow-rose-500/20 flex items-center gap-1.5 transition-all"
            >
              <ShieldAlert className="w-4 h-4" />
              {t.location.sosButton}
            </button>

            {/* Saved Places Button */}
            <button
              onClick={() => setPlacesModalOpen(true)}
              className="px-3.5 py-2.5 rounded-2xl bg-secondary hover:bg-secondary/80 text-foreground font-bold text-xs flex items-center gap-1.5 transition-all"
            >
              <MapPin className="w-4 h-4 text-sky-500" />
              {t.location.savedPlaces}
            </button>

            {/* Privacy Settings Button */}
            <button
              onClick={() => setSettingsModalOpen(true)}
              className="p-2.5 rounded-2xl bg-secondary hover:bg-secondary/80 text-foreground font-bold text-xs transition-all"
              title={t.location.privacySettings}
            >
              <Settings className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Global Active SOS Alert Banner (if any family member triggers SOS) */}
        {activeSos.length > 0 && (
          <div className="p-4 rounded-3xl bg-rose-500 text-white shadow-lg shadow-rose-500/30 flex items-center justify-between gap-3 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-2xl bg-white/20">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-extrabold text-sm sm:text-base">🚨 มีสมาชิกส่งสัญญาณฉุกเฉิน (SOS)</h4>
                <p className="text-xs opacity-90">โปรดตรวจสอบพิกัดตำแหน่งบนแผนที่ทันที</p>
              </div>
            </div>
            <button
              onClick={() => setSosModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-white text-rose-600 font-extrabold text-xs shadow-sm hover:bg-white/90 active:scale-95 transition-all"
            >
              ดูสถานะ SOS
            </button>
          </div>
        )}

        {/* Pending Location Requests Banner */}
        <LocationRequestsBanner
          requests={pendingRequests}
          onRespond={() => {
            loadLocationData();
            showToast('ตอบรับคำขอตำแหน่งแล้ว');
          }}
          myCoordinates={myCoords}
        />

        {/* Active Location Sharing Status Pill */}
        <div className="p-4 rounded-3xl bg-card border border-border/80 shadow-soft flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-3.5 h-3.5 rounded-full ${
                isMySharingActive ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground/40'
              }`}
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-foreground">
                  {isMySharingActive ? t.location.sharingActive : t.location.sharingDisabled}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground text-[10px] font-bold">
                  {isMySharingActive
                    ? mySettings?.sharing_mode === 'TIMED'
                      ? 'แชร์เป็นเวลา'
                      : mySettings?.sharing_mode === 'ONCE'
                      ? 'แชร์ครั้งเดียว'
                      : 'แชร์ขณะเปิดแอป'
                    : 'ปิดอยู่'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isMySharingActive
                  ? 'สมาชิกในครอบครัวสุขใจสามารถดูพิกัดล่าสุดของคุณได้'
                  : 'ไม่มีการส่งพิกัดตำแหน่งของคุณไปยังผู้อื่น'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            {isMySharingActive ? (
              <button
                onClick={handleStopSharing}
                className="px-4 py-2 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95"
              >
                <EyeOff className="w-3.5 h-3.5" />
                {t.location.stopSharing}
              </button>
            ) : (
              <button
                onClick={requestCurrentGpsOnce}
                className="px-4 py-2 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
              >
                <Radio className="w-3.5 h-3.5" />
                {t.location.shareMyLoc}
              </button>
            )}

            <button
              onClick={() => setSettingsModalOpen(true)}
              className="px-3 py-2 rounded-2xl bg-secondary hover:bg-secondary/80 text-foreground font-bold text-xs transition-all"
            >
              {t.location.privacySettings}
            </button>
          </div>
        </div>

        {/* Permission Denied Notice */}
        {permissionState === 'denied' && (
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-500" />
            <span>{t.location.permissionDenied}</span>
          </div>
        )}

        {/* Map View */}
        <FamilyMap
          members={members}
          places={places}
          activeSos={activeSos}
          selectedMemberId={selectedMemberId}
          onSelectMember={(id) => {
            setSelectedMemberId(id);
            setDetailModalOpen(true);
          }}
          myLocation={myCoords}
        />

        {/* Member Location Cards List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-foreground text-base flex items-center gap-2">
              <span>สมาชิกในบ้าน ({members.length})</span>
            </h3>
            <button
              onClick={loadLocationData}
              className="text-xs font-bold text-muted-foreground hover:text-foreground flex items-center gap-1 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              รีเฟรช
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {members.map((memLoc) => (
              <MemberLocationCard
                key={memLoc.family_member_id}
                memberLocation={memLoc}
                isCurrentUser={memLoc.family_member_id === member?.id}
                isSosActive={activeSos.some((s) => s.family_member_id === memLoc.family_member_id)}
                onFocusMap={(id) => setSelectedMemberId(id)}
                onOpenDetail={(id) => {
                  setSelectedMemberId(id);
                  setDetailModalOpen(true);
                }}
                onRequestLocation={handleRequestMemberLocation}
              />
            ))}
          </div>
        </div>

        {/* Modals */}
        <MemberDetailModal
          isOpen={detailModalOpen}
          onClose={() => setDetailModalOpen(false)}
          memberLocation={selectedMemberLoc}
          isCurrentUser={selectedMemberLoc?.family_member_id === member?.id}
          onRequestLocation={handleRequestMemberLocation}
        />

        <SavedPlacesModal
          isOpen={placesModalOpen}
          onClose={() => setPlacesModalOpen(false)}
          places={places}
          onPlacesUpdated={loadLocationData}
          myCoordinates={myCoords}
        />

        <LocationSettingsModal
          isOpen={settingsModalOpen}
          onClose={() => setSettingsModalOpen(false)}
          settings={mySettings || undefined}
          onSettingsUpdated={loadLocationData}
        />

        <SosModal
          isOpen={sosModalOpen}
          onClose={() => setSosModalOpen(false)}
          myActiveSos={activeSos.find((s) => s.family_member_id === member?.id) || null}
          myCoordinates={myCoords}
          onSosTriggered={() => {
            loadLocationData();
            showToast('ส่งสัญญาณ SOS เรียบร้อยแล้ว');
          }}
          onSosStopped={() => {
            loadLocationData();
            showToast('ยกเลิก SOS เรียบร้อยแล้ว');
          }}
        />
      </div>
  );
}
