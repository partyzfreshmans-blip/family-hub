'use client';

import React, { useState } from 'react';
import { LocationRequest } from '@/types';
import { useLanguage } from '@/components/LanguageContext';
import { MapPin, Check, X, Send } from 'lucide-react';

interface LocationRequestsBannerProps {
  requests: (LocationRequest & { requester_nickname?: string; requester_color?: string })[];
  onRespond: () => void;
  myCoordinates?: { latitude: number; longitude: number; accuracy?: number } | null;
}

export default function LocationRequestsBanner({
  requests,
  onRespond,
  myCoordinates,
}: LocationRequestsBannerProps) {
  const { t } = useLanguage();
  const [processingId, setProcessingId] = useState<string | null>(null);

  if (!requests || requests.length === 0) return null;

  const handleRespond = async (id: string, action: 'APPROVE' | 'DECLINE') => {
    setProcessingId(id);
    try {
      // 1. If approved, send current coordinates
      if (action === 'APPROVE' && myCoordinates) {
        await fetch('/api/location', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            latitude: myCoordinates.latitude,
            longitude: myCoordinates.longitude,
            accuracy: myCoordinates.accuracy || 10,
            source: 'manual_request',
          }),
        });
      }

      // 2. Update request status
      await fetch('/api/location/requests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      });

      onRespond();
    } catch (err) {
      console.error('Error responding to location request:', err);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-2">
      {requests.map((req) => (
        <div
          key={req.id}
          className="p-3.5 rounded-2xl bg-sky-500/10 dark:bg-sky-950/40 border border-sky-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm animate-fade-in"
        >
          <div className="flex items-center gap-3">
            <div
              style={{ backgroundColor: req.requester_color || '#0284c7' }}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-extrabold text-xs shadow-xs shrink-0"
            >
              {(req.requester_nickname || 'สมาชิก').substring(0, 2)}
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">
                <span className="text-sky-600 dark:text-sky-400 font-extrabold">
                  {req.requester_nickname || 'สมาชิก'}
                </span>{' '}
                {t.location.requestIncoming}
              </p>
              <span className="text-[10px] text-muted-foreground">คำขอจะหมดอายุใน 15 นาที</span>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              disabled={processingId === req.id}
              onClick={() => handleRespond(req.id, 'APPROVE')}
              className="px-3.5 py-1.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all active:scale-95"
            >
              <Check className="w-3.5 h-3.5" />
              {t.location.approve}
            </button>
            <button
              disabled={processingId === req.id}
              onClick={() => handleRespond(req.id, 'DECLINE')}
              className="px-3 py-1.5 rounded-xl bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground text-xs font-bold flex items-center gap-1 transition-all active:scale-95"
            >
              <X className="w-3.5 h-3.5" />
              {t.location.decline}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
