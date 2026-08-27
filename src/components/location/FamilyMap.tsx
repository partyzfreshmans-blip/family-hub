'use client';

import React, { useEffect, useRef } from 'react';
import { MemberCurrentLocation, FamilySavedPlace, SosEvent } from '@/types';
import { useLanguage } from '@/components/LanguageContext';
import { useTheme } from '@/components/ThemeContext';
import { Crosshair, Users } from 'lucide-react';
import { formatLocationTimeThai, formatAccuracyThai, getDirectionsUrl } from '@/lib/geo';

interface FamilyMapProps {
  members: MemberCurrentLocation[];
  places: FamilySavedPlace[];
  activeSos?: SosEvent[];
  selectedMemberId?: string | null;
  onSelectMember?: (memberId: string) => void;
  myLocation?: { latitude: number; longitude: number; accuracy?: number } | null;
  focusCoords?: { latitude: number; longitude: number; name?: string; timestamp?: number } | null;
}

export default function FamilyMap({
  members,
  places,
  activeSos = [],
  selectedMemberId,
  onSelectMember,
  myLocation,
  focusCoords,
}: FamilyMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);
  const placesLayerRef = useRef<any>(null);
  const { t } = useLanguage();
  const { theme } = useTheme();

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    let isMounted = true;

    import('leaflet').then((L) => {
      if (!isMounted || !mapContainerRef.current) return;

      // Default center (e.g. Chiang Rai / Bangkok coordinates or first member location)
      const validMember = members.find((m) => m.latitude && m.longitude);
      const defaultLat = validMember ? validMember.latitude : 19.9072;
      const defaultLng = validMember ? validMember.longitude : 99.8325;

      const map = L.map(mapContainerRef.current, {
        center: [defaultLat, defaultLng],
        zoom: 14,
        zoomControl: false,
      });

      // Tile layer (OSM Standard or CartoDB)
      const tileUrl =
        theme === 'dark'
          ? 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
          : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

      L.tileLayer(tileUrl, {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      // Add Zoom Control at bottom right
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Layer groups
      const placesLayer = L.layerGroup().addTo(map);
      const markersLayer = L.layerGroup().addTo(map);

      mapInstanceRef.current = map;
      placesLayerRef.current = placesLayer;
      markersLayerRef.current = markersLayer;

      renderLayers(L);
    });

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Render Markers and Saved Places whenever props update
  const renderLayers = (L: any) => {
    if (!mapInstanceRef.current || !markersLayerRef.current || !placesLayerRef.current) return;

    const markersLayer = markersLayerRef.current;
    const placesLayer = placesLayerRef.current;
    markersLayer.clearLayers();
    placesLayer.clearLayers();

    // 1. Render Saved Places (Geofence Circles)
    places.forEach((place) => {
      if (!place.active || !place.latitude || !place.longitude) return;

      const circle = L.circle([place.latitude, place.longitude], {
        radius: place.radius_meters || 150,
        color: '#0284c7',
        fillColor: '#38bdf8',
        fillOpacity: 0.12,
        weight: 1.5,
        dashArray: '4, 6',
      });

      const popupContent = `
        <div style="font-family: sans-serif; padding: 4px;">
          <div style="font-weight: bold; font-size: 13px; color: #0284c7;">📍 ${place.name}</div>
          <div style="font-size: 11px; color: #64748b; margin-top: 2px;">รัศมีตรวจจับ ${place.radius_meters} เมตร</div>
        </div>
      `;
      circle.bindPopup(popupContent);
      placesLayer.addLayer(circle);
    });

    // 2. Render Member Markers
    const activeMarkers: any[] = [];

    members.forEach((mem) => {
      if (!mem.latitude || !mem.longitude || mem.latitude === 0) return;

      const isSos = activeSos.some((s) => s.family_member_id === mem.family_member_id);
      const isSelected = selectedMemberId === mem.family_member_id;
      const isLive = mem.stale_status === 'LIVE';
      const nickname = mem.member?.nickname || 'สมาชิก';
      const color = mem.member?.member_color || '#3b82f6';
      const placeName = mem.matched_place ? mem.matched_place.name : null;

      // Custom HTML Avatar Marker
      const markerHtml = `
        <div class="relative flex flex-col items-center group cursor-pointer transition-transform duration-200 ${
          isSelected ? 'scale-110 z-30' : 'hover:scale-105 z-20'
        }">
          ${
            isSos
              ? `<div class="absolute -inset-2 rounded-full bg-rose-500/40 animate-ping"></div>`
              : isLive
              ? `<div class="absolute -inset-1.5 rounded-full bg-emerald-500/30 animate-pulse"></div>`
              : ''
          }
          <div style="background-color: ${color}; width: 38px; height: 38px;" class="rounded-full border-2 ${
        isSos ? 'border-rose-500 ring-4 ring-rose-500/30' : isSelected ? 'border-primary ring-4 ring-primary/30' : 'border-white dark:border-slate-800'
      } flex items-center justify-center text-white font-extrabold text-xs shadow-lg">
            ${nickname.substring(0, 2)}
          </div>
          <div class="mt-1 px-2 py-0.5 rounded-full bg-card/90 dark:bg-card/95 text-foreground text-[10px] font-bold shadow border border-border/80 whitespace-nowrap flex items-center gap-1">
            ${isSos ? '<span class="text-rose-500 font-extrabold">🚨 SOS</span>' : ''}
            <span>${nickname}</span>
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: markerHtml,
        className: 'custom-leaflet-marker',
        iconSize: [44, 56],
        iconAnchor: [22, 50],
        popupAnchor: [0, -48],
      });

      const marker = L.marker([mem.latitude, mem.longitude], { icon: customIcon });

      const dirUrl = getDirectionsUrl(mem.latitude, mem.longitude, nickname);

      const popupHtml = `
        <div style="font-family: inherit; min-width: 170px; padding: 2px;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
            <div style="background-color: ${color}; width: 28px; height: 28px; border-radius: 9999px; display: flex; align-items: center; justify-center: center; color: white; font-weight: bold; font-size: 11px; text-align: center; line-height: 28px;">
              ${nickname.substring(0, 2)}
            </div>
            <div>
              <div style="font-weight: 800; font-size: 13px; color: #0f172a;">${nickname}</div>
              <div style="font-size: 10px; color: ${isLive ? '#10b981' : '#64748b'}; font-weight: 600;">
                ${isLive ? '🟢 กำลังแชร์สด' : `🕒 ${formatLocationTimeThai(mem.recorded_at)}`}
              </div>
            </div>
          </div>
          ${
            placeName
              ? `<div style="font-size: 11px; font-weight: 700; color: #0284c7; background: #e0f2fe; padding: 3px 8px; border-radius: 6px; margin-bottom: 6px;">📍 ${placeName}</div>`
              : ''
          }
          <div style="font-size: 10px; color: #64748b; margin-bottom: 8px;">${formatAccuracyThai(mem.accuracy)}</div>
          <div style="display: flex; gap: 4px;">
            <a href="${dirUrl}" target="_blank" rel="noreferrer" style="flex: 1; text-align: center; background: #0284c7; color: white; font-size: 11px; font-weight: bold; padding: 5px 8px; border-radius: 6px; text-decoration: none;">🧭 นำทาง</a>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml);
      marker.on('click', () => {
        if (onSelectMember) {
          onSelectMember(mem.family_member_id);
        }
      });

      markersLayer.addLayer(marker);
      activeMarkers.push(marker);
    });

    // 3. Render current user GPS dot (if available)
    if (myLocation && myLocation.latitude && myLocation.longitude) {
      const myDotIcon = L.divIcon({
        html: `
          <div class="relative flex items-center justify-center">
            <div class="w-4 h-4 rounded-full bg-primary border-2 border-white shadow-md"></div>
            <div class="absolute w-8 h-8 rounded-full bg-primary/20 animate-ping pointer-events-none"></div>
          </div>
        `,
        className: 'my-location-dot',
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });
      const myMarker = L.marker([myLocation.latitude, myLocation.longitude], { icon: myDotIcon });
      myMarker.bindPopup('<div style="font-size: 11px; font-weight: bold;">ตำแหน่งปัจจุบันของคุณ 📍</div>');
      markersLayer.addLayer(myMarker);
    }
  };

  useEffect(() => {
    if (mapInstanceRef.current) {
      import('leaflet').then((L) => renderLayers(L));
    }
  }, [members, places, activeSos, selectedMemberId, myLocation, theme]);

  // Center to selected member
  useEffect(() => {
    if (!selectedMemberId || !mapInstanceRef.current) return;
    const target = members.find((m) => m.family_member_id === selectedMemberId);
    if (target && target.latitude && target.longitude) {
      mapInstanceRef.current.setView([target.latitude, target.longitude], 16, {
        animate: true,
      });
    }
  }, [selectedMemberId]);

  // Center to focused coordinates (e.g. from Saved Places)
  useEffect(() => {
    if (!focusCoords || !mapInstanceRef.current) return;
    if (focusCoords.latitude && focusCoords.longitude) {
      mapInstanceRef.current.setView([focusCoords.latitude, focusCoords.longitude], 17, {
        animate: true,
      });
      if (focusCoords.name) {
        import('leaflet').then((L) => {
          if (!mapInstanceRef.current) return;
          L.popup({ offset: [0, -10] })
            .setLatLng([focusCoords.latitude, focusCoords.longitude])
            .setContent(`<div style="font-weight: bold; font-size: 12px; padding: 4px;">📍 ${focusCoords.name}</div>`)
            .openOn(mapInstanceRef.current);
        });
      }
    }
  }, [focusCoords]);

  // Fit all members button action
  const fitAllMembers = () => {
    if (!mapInstanceRef.current) return;
    import('leaflet').then((L) => {
      const validPoints: [number, number][] = members
        .filter((m) => m.latitude && m.longitude && m.latitude !== 0)
        .map((m) => [m.latitude, m.longitude]);

      if (myLocation && myLocation.latitude && myLocation.longitude) {
        validPoints.push([myLocation.latitude, myLocation.longitude]);
      }

      if (validPoints.length > 0) {
        const bounds = L.latLngBounds(validPoints);
        mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
      }
    });
  };

  // Recenter to user's location
  const centerMyLocation = () => {
    if (!mapInstanceRef.current) return;
    if (myLocation && myLocation.latitude && myLocation.longitude) {
      mapInstanceRef.current.setView([myLocation.latitude, myLocation.longitude], 16, { animate: true });
    }
  };

  return (
    <div className="relative w-full h-[360px] sm:h-[480px] rounded-3xl overflow-hidden border border-border shadow-soft bg-muted/20">
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Floating Map Controls Top-Right */}
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-2">
        <button
          onClick={fitAllMembers}
          className="p-2.5 rounded-2xl bg-card/90 hover:bg-card active:scale-95 text-foreground backdrop-blur-md border border-border/80 shadow-md transition-all flex items-center gap-1.5 text-xs font-bold"
          title={t.location.allMembers}
        >
          <Users className="w-4 h-4 text-primary" />
          <span className="hidden sm:inline">{t.location.allMembers}</span>
        </button>

        {myLocation && (
          <button
            onClick={centerMyLocation}
            className="p-2.5 rounded-2xl bg-card/90 hover:bg-card active:scale-95 text-foreground backdrop-blur-md border border-border/80 shadow-md transition-all flex items-center gap-1.5 text-xs font-bold"
            title={t.location.myLocation}
          >
            <Crosshair className="w-4 h-4 text-primary" />
            <span className="hidden sm:inline">{t.location.myLocation}</span>
          </button>
        )}
      </div>
    </div>
  );
}
