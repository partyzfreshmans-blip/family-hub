'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Calendar as CalendarIcon,
  Plus,
  Clock,
  MapPin,
  Users,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Trash2,
  AlertCircle,
  Link2,
  Copy,
  Check,
  Download,
  ExternalLink,
  Smartphone,
} from 'lucide-react';
import { useLanguage } from '@/components/LanguageContext';
import { useAuth } from '@/components/AuthContext';
import { formatThaiDate, getTodayDateString } from '@/lib/utils';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Badge } from '@/components/ui/Badge';
import { EmptyState, LoadingSkeleton } from '@/components/ui/EmptyState';
import { MemberAvatar } from '@/components/ui/MemberAvatar';
import { CalendarEvent, FamilyMember } from '@/types';


const categoryColorMap: Record<string, string> = {
  Family: "bg-blue-500 text-white",
  School: "bg-amber-500 text-white",
  Work: "bg-purple-500 text-white",
  Appointment: "bg-emerald-500 text-white",
  Birthday: "bg-rose-500 text-white",
  Travel: "bg-sky-500 text-white",
  Health: "bg-red-500 text-white",
  Other: "bg-slate-500 text-white",
};

function isEventOnDate(e: CalendarEvent, targetDateStr: string): boolean {
  if (e.event_date === targetDateStr) return true;
  if (!e.recurrence_rule || e.recurrence_rule === "NONE") return false;
  if (targetDateStr < e.event_date) return false;

  const targetDate = new Date(targetDateStr + "T00:00:00");
  const eventDate = new Date(e.event_date + "T00:00:00");

  switch (e.recurrence_rule) {
    case "DAILY":
      return true;
    case "WEEKDAYS": {
      const day = targetDate.getDay();
      return day >= 1 && day <= 5;
    }
    case "WEEKLY":
      return targetDate.getDay() === eventDate.getDay();
    case "BIWEEKLY": {
      if (targetDate.getDay() !== eventDate.getDay()) return false;
      const diffMs = targetDate.getTime() - eventDate.getTime();
      const diffWeeks = Math.round(diffMs / (7 * 24 * 60 * 60 * 1000));
      return diffWeeks % 2 === 0;
    }
    case "MONTHLY":
      return targetDate.getDate() === eventDate.getDate();
    case "YEARLY":
      return targetDate.getMonth() === eventDate.getMonth() && targetDate.getDate() === eventDate.getDate();
    default:
      return false;
  }
}

function getGoogleCalendarUrl(evt: CalendarEvent) {
  const title = encodeURIComponent(evt.title);
  const details = encodeURIComponent(evt.description || "กิจกรรมจาก Family Hub");
  const loc = encodeURIComponent(evt.location || "");

  let dates: string;
  const cleanDate = evt.event_date.replace(/-/g, "");
  if (evt.all_day || !evt.start_time) {
    dates = cleanDate + "/" + cleanDate;
  } else {
    const cleanStartTime = evt.start_time.replace(/:/g, "") + "00";
    const cleanEndTime = (evt.end_time ? evt.end_time.replace(/:/g, "") : cleanStartTime) + "00";
    dates = cleanDate + "T" + cleanStartTime + "/" + cleanDate + "T" + cleanEndTime;
  }

  return "https://calendar.google.com/calendar/render?action=TEMPLATE&text=" + title + "&dates=" + dates + "&details=" + details + "&location=" + loc;
}

export default function CalendarPage() {
  const { t } = useLanguage();
  const { member, family } = useAuth();

  const [view, setView] = useState<'day' | 'week' | 'month'>('month');
  const [selectedDate, setSelectedDate] = useState(getTodayDateString());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [copiedFeed, setCopiedFeed] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState(selectedDate);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [allDay, setAllDay] = useState(false);
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState<any>('Family');
  const [recurrenceRule, setRecurrenceRule] = useState<any>('NONE');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch('/api/events');
      if (res.ok) {
        const json = await res.json();
        setEvents(json.events || []);
      }

      const memRes = await fetch('/api/families/members');
      if (memRes.ok) {
        const memJson = await memRes.json();
        setFamilyMembers(memJson.members || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const openAddModal = (dateStr?: string) => {
    setEditingEvent(null);
    setTitle('');
    setDescription('');
    setEventDate(dateStr || selectedDate);
    setStartTime('09:00');
    setEndTime('10:00');
    setAllDay(false);
    setLocation('');
    setCategory('Family');
    setRecurrenceRule('NONE');
    setSelectedMembers(member ? [member.id] : []);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (evt: CalendarEvent) => {
    setEditingEvent(evt);
    setTitle(evt.title);
    setDescription(evt.description || '');
    setEventDate(evt.event_date);
    setStartTime(evt.start_time || '09:00');
    setEndTime(evt.end_time || '10:00');
    setAllDay(evt.all_day === 1);
    setLocation(evt.location || '');
    setCategory(evt.category);
    setRecurrenceRule(evt.recurrence_rule);
    setSelectedMembers(evt.member_ids || []);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFormError(null);

    try {
      const payload = {
        id: editingEvent?.id,
        title,
        description,
        eventDate,
        startTime: allDay ? null : startTime,
        endTime: allDay ? null : endTime,
        allDay,
        location,
        category,
        recurrenceRule,
        memberIds: selectedMembers,
      };

      const res = await fetch('/api/events', {
        method: editingEvent ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t.common.errorMessage);
      }

      setIsModalOpen(false);
      fetchEvents();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      const res = await fetch(`/api/events?id=${deletingId}`, { method: 'DELETE' });
      if (res.ok) {
        setDeletingId(null);
        fetchEvents();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Filter events for selected date using recurrence rules
  const dayEvents = events.filter((e) => isEventOnDate(e, selectedDate));

  // Month calculations
  const currentDate = new Date(selectedDate);
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();

  const prevMonth = () => {
    const d = new Date(currentYear, currentMonth - 1, 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const nextMonth = () => {
    const d = new Date(currentYear, currentMonth + 1, 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };


  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const feedHttpsUrl = family ? `${origin}/api/calendar/feed?familyId=${family.id}` : '';
  const feedWebcalUrl = feedHttpsUrl.replace(/^https?:\/\//, 'webcal://');

  const copyFeedUrl = () => {
    if (!feedHttpsUrl) return;
    navigator.clipboard.writeText(feedHttpsUrl);
    setCopiedFeed(true);
    setTimeout(() => setCopiedFeed(false), 3000);
  };

  const prevDay = () => {
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() - 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    setSelectedDate(`${y}-${m}-${day}`);
  };

  const nextDay = () => {
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() + 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    setSelectedDate(`${y}-${m}-${day}`);
  };

  const goToToday = () => {
    setSelectedDate(getTodayDateString());
  };

  const openAddModalWithTime = (dateStr?: string, timeStr?: string) => {
    setEditingEvent(null);
    setTitle('');
    setDescription('');
    setEventDate(dateStr || selectedDate);
    const start = timeStr || '09:00';
    setStartTime(start);
    const [h, m] = start.split(':').map(Number);
    const endH = String(Math.min(23, (h || 9) + 1)).padStart(2, '0');
    setEndTime(`${endH}:${String(m || 0).padStart(2, '0')}`);
    setAllDay(false);
    setLocation('');
    setCategory('Family');
    setRecurrenceRule('NONE');
    setSelectedMembers(member ? [member.id] : []);
    setFormError(null);
    setIsModalOpen(true);
  };

  // Timeline hours (06:00 to 23:00)
  const timelineHours = Array.from({ length: 18 }, (_, i) => i + 6);
  const hourHeight = 68; // px per hour slot
  const isSelectedToday = selectedDate === getTodayDateString();
  const currentNow = new Date();
  const currentMinutes = currentNow.getHours() * 60 + currentNow.getMinutes();
  const currentNowTop = ((currentMinutes - 6 * 60) / 60) * hourHeight;

  const allDayDayEvents = dayEvents.filter((e) => e.all_day === 1);
  const timedDayEvents = dayEvents.filter((e) => !e.all_day);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">{t.calendar.title}</h1>
          <p className="text-xs text-muted-foreground">ปฏิทินกิจกรรมและการนัดหมายของคนในครอบครัว</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {/* Sync Button */}
          <button
            onClick={() => setIsSyncModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl border border-border bg-card hover:bg-muted text-foreground text-xs font-bold shadow-soft transition-all"
          >
            <Link2 className="w-4 h-4 text-primary" />
            <span>{t.calendar.syncCalendar}</span>
          </button>

          {/* View Switcher */}
          <div className="flex items-center p-1 bg-muted rounded-2xl">
            <button
              onClick={() => setView('month')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                view === 'month' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
              }`}
            >
              {t.calendar.monthView}
            </button>
            <button
              onClick={() => setView('day')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                view === 'day' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
              }`}
            >
              {t.calendar.dayView}
            </button>
          </div>

          <button
            onClick={() => openAddModal()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-primary hover:bg-primary-600 active:scale-95 text-white text-xs font-bold shadow-md transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>{t.calendar.addEvent}</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <LoadingSkeleton count={3} height="h-32" />
      ) : (
        <>
          {/* 1. MONTH VIEW */}
          {view === 'month' && (
            <div className="bg-card text-card-foreground rounded-3xl p-4 sm:p-5 border border-border shadow-soft space-y-4">
              {/* Month Header Controller */}
              <div className="flex items-center justify-between">
                <button
                  onClick={prevMonth}
                  className="p-2 rounded-xl border border-border hover:bg-muted text-muted-foreground hover:text-foreground"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold">
                    {formatThaiDate(new Date(currentYear, currentMonth, 1), { shortMonth: false, showYear: true })}
                  </h2>
                  {!isSelectedToday && (
                    <button
                      onClick={goToToday}
                      className="px-2.5 py-1 rounded-xl text-[11px] font-bold border border-border bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
                    >
                      {t.calendar.todayBtn}
                    </button>
                  )}
                </div>

                <button
                  onClick={nextMonth}
                  className="p-2 rounded-xl border border-border hover:bg-muted text-muted-foreground hover:text-foreground"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Month View Grid */}
              <div>
                <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs text-muted-foreground mb-2">
                  <span>อา</span>
                  <span>จ</span>
                  <span>อ</span>
                  <span>พ</span>
                  <span>พฤ</span>
                  <span>ศ</span>
                  <span>ส</span>
                </div>

                <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
                  {/* Empty days before 1st */}
                  {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                    <div key={`empty-${i}`} className="min-h-[52px] sm:min-h-[72px] p-1 rounded-2xl bg-muted/20" />
                  ))}

                  {/* Days of current month */}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const monthStr = String(currentMonth + 1).padStart(2, '0');
                    const dayStr = String(day).padStart(2, '0');
                    const thisDateStr = `${currentYear}-${monthStr}-${dayStr}`;
                    const isToday = thisDateStr === getTodayDateString();
                    const isSelected = thisDateStr === selectedDate;

                    const dayEvts = events.filter((e) => isEventOnDate(e, thisDateStr));

                    return (
                      <button
                        key={day}
                        onClick={() => setSelectedDate(thisDateStr)}
                        className={`min-h-[52px] sm:min-h-[72px] p-1 sm:p-1.5 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                          isSelected
                            ? 'border-primary ring-2 ring-primary/20 bg-primary-50/40 dark:bg-primary-950/30'
                            : isToday
                            ? 'border-sky-400 bg-sky-50/20 dark:bg-sky-950/20'
                            : 'border-border/50 bg-card hover:bg-muted/40'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full ${
                              isToday ? 'bg-primary text-white' : 'text-foreground'
                            }`}
                          >
                            {day}
                          </span>
                          {dayEvts.length > 0 && (
                            <span className="hidden sm:inline-block text-[10px] font-bold text-muted-foreground">
                              {dayEvts.length}
                            </span>
                          )}
                        </div>

                        {/* Mini event tags */}
                        <div className="space-y-0.5 overflow-hidden">
                          {dayEvts.slice(0, 2).map((ev) => (
                            <div
                              key={ev.id}
                              className={`text-[9px] px-1 py-0.5 rounded truncate font-medium ${
                                categoryColorMap[ev.category] || 'bg-primary text-white'
                              }`}
                            >
                              {ev.title}
                            </div>
                          ))}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* 2. DAY VIEW (TIMELINE CHART) */}
          {view === 'day' && (
            <div className="bg-card text-card-foreground rounded-3xl p-4 sm:p-6 border border-border shadow-soft space-y-5">
              {/* Day Controller */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <button
                    onClick={prevDay}
                    className="p-2 rounded-xl border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    title="วันก่อนหน้า"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
                    <span>{formatThaiDate(selectedDate, { showDayOfWeek: true })}</span>
                    {isSelectedToday && (
                      <Badge variant="primary" size="sm">
                        {t.calendar.todayBtn}
                      </Badge>
                    )}
                  </h2>

                  <button
                    onClick={nextDay}
                    className="p-2 rounded-xl border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    title="วันถัดไป"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  {!isSelectedToday && (
                    <button
                      onClick={goToToday}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold border border-border bg-muted hover:bg-muted/80 text-foreground transition-all"
                    >
                      {t.calendar.todayBtn}
                    </button>
                  )}
                  <button
                    onClick={() => openAddModal(selectedDate)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-600 active:scale-95 transition-all shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{t.calendar.addEvent}</span>
                  </button>
                </div>
              </div>

              {/* All-Day Events Banner (if any) */}
              {allDayDayEvents.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-muted/40 border border-border space-y-2">
                  <div className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                    <span>{t.calendar.allDayTitle} ({allDayDayEvents.length})</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {allDayDayEvents.map((evt) => (
                      <div
                        key={evt.id}
                        onClick={() => openEditModal(evt)}
                        className={`cursor-pointer px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-2 shadow-sm transition-all hover:scale-[1.02] ${
                          categoryColorMap[evt.category] || 'bg-primary text-white'
                        }`}
                      >
                        <span>{evt.title}</span>
                        {evt.location && <span className="text-[10px] opacity-80">📍 {evt.location}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Hourly Timeline Chart Component */}
              <div className="relative border border-border/70 rounded-2xl bg-background/50 overflow-hidden select-none">
                <div className="flex">
                  {/* Left Column: Hour Labels */}
                  <div className="w-16 sm:w-20 shrink-0 border-r border-border/60 bg-muted/20">
                    {timelineHours.map((hour) => (
                      <div
                        key={hour}
                        style={{ height: `${hourHeight}px` }}
                        className="text-right pr-2.5 pt-2 text-xs font-bold text-muted-foreground select-none"
                      >
                        {String(hour).padStart(2, '0')}:00
                      </div>
                    ))}
                  </div>

                  {/* Right Column: Interactive Schedule Canvas */}
                  <div className="relative flex-1" style={{ height: `${timelineHours.length * hourHeight}px` }}>
                    {/* Background Hour Rows */}
                    {timelineHours.map((hour, idx) => (
                      <div
                        key={hour}
                        onClick={() => openAddModalWithTime(selectedDate, `${String(hour).padStart(2, '0')}:00`)}
                        style={{ height: `${hourHeight}px` }}
                        className="border-b border-border/40 hover:bg-primary/5 transition-colors cursor-pointer group relative"
                      >
                        {/* Half-hour subtle dotted line */}
                        <div className="absolute left-0 right-0 top-1/2 border-b border-dashed border-border/20 pointer-events-none" />

                        {/* Hover Quick Add Hint */}
                        <div className="absolute right-3 top-2 hidden group-hover:flex items-center gap-1 text-[11px] font-bold text-primary opacity-80 bg-primary/10 px-2 py-0.5 rounded-lg pointer-events-none">
                          <Plus className="w-3 h-3" />
                          <span>{t.calendar.addAtHour} {String(hour).padStart(2, '0')}:00</span>
                        </div>
                      </div>
                    ))}

                    {/* Current Time Red Line (if today) */}
                    {isSelectedToday && currentNowTop >= 0 && currentNowTop <= timelineHours.length * hourHeight && (
                      <div
                        style={{ top: `${currentNowTop}px` }}
                        className="absolute left-0 right-0 z-30 flex items-center pointer-events-none"
                      >
                        <div className="flex items-center gap-1 -ml-2">
                          <span className="w-3.5 h-3.5 rounded-full bg-rose-500 ring-4 ring-rose-500/20 shadow-md animate-pulse" />
                          <span className="px-1.5 py-0.5 rounded-md bg-rose-500 text-white text-[10px] font-extrabold shadow-sm">
                            {String(currentNow.getHours()).padStart(2, '0')}:{String(currentNow.getMinutes()).padStart(2, '0')}
                          </span>
                        </div>
                        <div className="h-[2px] flex-1 bg-rose-500 shadow-sm" />
                      </div>
                    )}

                    {/* Timed Event Blocks on Timeline */}
                    {timedDayEvents.map((evt) => {
                      const [startH, startM] = (evt.start_time || '09:00').split(':').map(Number);
                      const [endH, endM] = (evt.end_time || `${(startH || 9) + 1}:00`).split(':').map(Number);

                      const startMinutes = (startH || 9) * 60 + (startM || 0);
                      const endMinutes = Math.max(startMinutes + 30, (endH || (startH || 9) + 1) * 60 + (endM || 0));

                      const topPx = Math.max(0, ((startMinutes - 6 * 60) / 60) * hourHeight);
                      const heightPx = Math.max(48, ((endMinutes - startMinutes) / 60) * hourHeight);

                      return (
                        <div
                          key={evt.id}
                          style={{
                            top: `${topPx}px`,
                            height: `${heightPx}px`,
                            left: '8px',
                            right: '8px',
                          }}
                          className={`absolute z-10 p-2.5 sm:p-3 rounded-2xl border shadow-sm flex flex-col justify-between overflow-hidden transition-all hover:shadow-md hover:z-20 group bg-card/95 backdrop-blur-sm ${
                            evt.category === 'Family'
                              ? 'border-blue-500/40 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 hover:border-blue-500'
                              : evt.category === 'School'
                              ? 'border-amber-500/40 bg-gradient-to-r from-amber-500/10 to-orange-500/10 hover:border-amber-500'
                              : evt.category === 'Work'
                              ? 'border-purple-500/40 bg-gradient-to-r from-purple-500/10 to-violet-500/10 hover:border-purple-500'
                              : evt.category === 'Appointment'
                              ? 'border-emerald-500/40 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 hover:border-emerald-500'
                              : evt.category === 'Birthday'
                              ? 'border-rose-500/40 bg-gradient-to-r from-rose-500/10 to-pink-500/10 hover:border-rose-500'
                              : evt.category === 'Health'
                              ? 'border-red-500/40 bg-gradient-to-r from-red-500/10 to-rose-500/10 hover:border-red-500'
                              : 'border-primary/40 bg-gradient-to-r from-primary/10 to-primary/5 hover:border-primary'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-extrabold text-foreground truncate">
                                  {evt.title}
                                </span>
                                <Badge variant="primary" size="sm">
                                  {t.calendar.categories[evt.category] || evt.category}
                                </Badge>
                                {evt.recurrence_rule && evt.recurrence_rule !== 'NONE' && (
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground">
                                    🔄 {t.calendar.recurrenceOptions[evt.recurrence_rule]}
                                  </span>
                                )}
                              </div>

                              {evt.description && (
                                <p className="text-[11px] text-muted-foreground truncate pt-0.5">
                                  {evt.description}
                                </p>
                              )}
                            </div>

                            {/* Actions on Event Block */}
                            <div className="flex items-center gap-1 shrink-0">
                              <a
                                href={getGoogleCalendarUrl(evt)}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                                title="เพิ่มลง Google Calendar"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditModal(evt);
                                }}
                                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                title={t.common.edit}
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeletingId(evt.id);
                                }}
                                className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                                title={t.common.delete}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Bottom Row inside Event Block */}
                          <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                            <div className="flex items-center gap-3">
                              <span className="flex items-center gap-1 font-bold text-foreground text-[11px]">
                                <Clock className="w-3 h-3 text-primary" />
                                {evt.start_time || '09:00'} - {evt.end_time || '10:00'}
                              </span>

                              {evt.location && (
                                <span className="flex items-center gap-1 text-[11px] truncate max-w-[150px]">
                                  <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
                                  <span className="truncate">{evt.location}</span>
                                </span>
                              )}
                            </div>

                            {evt.member_ids && evt.member_ids.length > 0 && (
                              <div className="flex -space-x-1 shrink-0">
                                {evt.member_ids.map((mid) => {
                                  const m = familyMembers.find((mem) => mem.id === mid);
                                  return m ? (
                                    <MemberAvatar
                                      key={m.id}
                                      name={m.nickname}
                                      color={m.member_color}
                                      size="sm"
                                    />
                                  ) : null;
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Selected Date Events List */}
          <div className="bg-card text-card-foreground rounded-3xl p-5 border border-border shadow-soft space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border/60">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-base">
                  กิจกรรมวันที่ {formatThaiDate(selectedDate, { showDayOfWeek: true })}
                </h3>
              </div>

              <button
                onClick={() => openAddModal(selectedDate)}
                className="text-xs font-bold text-primary flex items-center gap-1 hover:underline"
              >
                <Plus className="w-3.5 h-3.5" /> เพิ่มในวันนี้
              </button>
            </div>

            {dayEvents.length === 0 ? (
              <EmptyState
                icon={CalendarIcon}
                title="ยังไม่มีกิจกรรมในวันนี้"
                actionText="เพิ่มกิจกรรมใหม่"
                onAction={() => openAddModal(selectedDate)}
              />
            ) : (
              <div className="space-y-3">
                {dayEvents.map((evt) => (
                  <div
                    key={evt.id}
                    className="p-4 rounded-2xl bg-muted/30 border border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/60 transition-colors"
                  >
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${
                            categoryColorMap[evt.category]?.split(' ')[0] || 'bg-primary'
                          }`}
                        />
                        <h4 className="font-bold text-sm text-foreground truncate">{evt.title}</h4>
                        <Badge variant="primary" size="sm">
                          {t.calendar.categories[evt.category] || evt.category}
                        </Badge>
                      </div>

                      {evt.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{evt.description}</p>
                      )}

                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-1">
                        <span className="flex items-center gap-1 font-semibold text-primary">
                          <Clock className="w-3.5 h-3.5" />
                          {evt.all_day ? 'ทั้งวัน' : `${evt.start_time || '09:00'} - ${evt.end_time || '10:00'}`}
                        </span>

                        {evt.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            {evt.location}
                          </span>
                        )}

                        {evt.member_ids && evt.member_ids.length > 0 && (
                          <div className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" />
                            <div className="flex -space-x-1">
                              {evt.member_ids.map((mid) => {
                                const m = familyMembers.find((mem) => mem.id === mid);
                                return m ? (
                                  <MemberAvatar
                                    key={m.id}
                                    name={m.nickname}
                                    color={m.member_color}
                                    size="sm"
                                  />
                                ) : null;
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 self-end sm:self-auto">
                      <a
                        href={getGoogleCalendarUrl(evt)}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors flex items-center gap-1 text-xs font-semibold"
                        title="เพิ่มลง Google Calendar"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                      <button
                        onClick={() => openEditModal(evt)}
                        className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        title={t.common.edit}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeletingId(evt.id)}
                        className="p-2 rounded-xl text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                        title={t.common.delete}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Sync Calendar Modal */}
      <Modal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        title={t.calendar.syncCalendar}
      >
        <div className="space-y-5">
          <p className="text-xs text-muted-foreground leading-relaxed">
            {t.calendar.syncDesc}
          </p>

          {/* Option 1: Apple Calendar (iPhone / iPad / Mac) */}
          <div className="p-4 rounded-2xl border border-border bg-card hover:border-primary/50 transition-colors space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center font-bold text-lg shadow-sm">
                🍏
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">Apple Calendar (iOS / Mac)</h4>
                <p className="text-xs text-muted-foreground">ซิงค์แบบเรียลไทม์ผ่าน iCalendar Feed</p>
              </div>
            </div>

            <a
              href={feedWebcalUrl}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all text-center"
            >
              <Smartphone className="w-4 h-4" />
              <span>{t.calendar.appleCalendarBtn}</span>
            </a>
            <p className="text-[11px] text-muted-foreground leading-normal">
              💡 แตะปุ่มด้านบนบน iPhone หรือ Mac ➔ หน้าต่างจะเด้งขึ้นมาให้กด <strong>"สมัครรับ (Subscribe)"</strong> เพื่อให้ปฏิทินครอบครัวอัปเดตอัตโนมัติ
            </p>
          </div>

          {/* Option 2: Google Calendar */}
          <div className="p-4 rounded-2xl border border-border bg-card hover:border-primary/50 transition-colors space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-lg">
                📅
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">Google Calendar (Android / PC)</h4>
                <p className="text-xs text-muted-foreground">เพิ่มผ่านลิงก์ URL ปฏิทิน</p>
              </div>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={feedHttpsUrl}
                className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-border bg-background text-muted-foreground select-all focus:outline-none"
              />
              <button
                onClick={copyFeedUrl}
                className="px-3.5 py-2 rounded-xl bg-primary text-white text-xs font-bold flex items-center gap-1 hover:bg-primary-600 active:scale-95 shrink-0 transition-all"
              >
                {copiedFeed ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedFeed ? 'คัดลอกแล้ว' : 'คัดลอก'}</span>
              </button>
            </div>

            <a
              href={`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(feedHttpsUrl)}`}
              target="_blank"
              rel="noreferrer"
              className="w-full py-2.5 px-4 rounded-xl border border-border bg-background hover:bg-muted text-foreground text-xs font-bold flex items-center justify-center gap-2 transition-all text-center"
            >
              <ExternalLink className="w-4 h-4 text-blue-500" />
              <span>{t.calendar.googleCalendarBtn} (เปิดในเว็บ)</span>
            </a>
            <p className="text-[11px] text-muted-foreground leading-normal">
              💡 ใน Google Calendar: กด <strong>"เครื่องหมาย + ข้างปฏิทินอื่นๆ" ➔ "จาก URL (From URL)"</strong> แล้ววางลิงก์ที่คัดลอกไว้
            </p>
          </div>

          {/* Option 3: Download .ics */}
          <div className="p-3.5 rounded-2xl bg-muted/40 border border-border flex items-center justify-between">
            <div className="text-xs">
              <div className="font-bold text-foreground">ดาวน์โหลดไฟล์ .ics</div>
              <div className="text-[11px] text-muted-foreground">สำหรับนำเข้าไฟล์ปฏิทินแบบออฟไลน์</div>
            </div>
            <a
              href={feedHttpsUrl}
              download={`${family?.name || 'family'}-calendar.ics`}
              className="px-3.5 py-1.5 rounded-xl border border-border bg-card hover:bg-muted text-xs font-bold flex items-center gap-1.5 text-foreground transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t.calendar.downloadIcs}</span>
            </a>
          </div>
        </div>
      </Modal>

      {/* Add / Edit Event Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingEvent ? t.calendar.editEvent : t.calendar.addEvent}
        maxWidth="md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold mb-1">{t.calendar.eventTitle} *</label>
            <input
              type="text"
              required
              placeholder="เช่น นัดทานข้าว, ไปพบหมอ, ประชุมผู้ปกครอง"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold mb-1">{t.calendar.eventDate} *</label>
              <input
                type="date"
                required
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">{t.calendar.category}</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {(Object.entries(t.calendar.categories) as [string, string][]).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold mb-1">{t.calendar.recurrence}</label>
            <select
              value={recurrenceRule}
              onChange={(e) => setRecurrenceRule(e.target.value as any)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {(Object.entries(t.calendar.recurrenceOptions) as [string, string][]).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="allDayCheck"
              checked={allDay}
              onChange={(e) => setAllDay(e.target.checked)}
              className="w-4 h-4 rounded text-primary focus:ring-primary"
            />
            <label htmlFor="allDayCheck" className="text-xs font-semibold select-none">
              {t.calendar.allDay}
            </label>
          </div>

          {!allDay && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold mb-1">{t.calendar.startTime}</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">{t.calendar.endTime}</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold mb-1">{t.calendar.location}</label>
            <input
              type="text"
              placeholder="เช่น ร้านอาหารบ้านสวน, โรงพยาบาลกรุงเทพ"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Member Attendees Selection */}
          <div>
            <label className="block text-xs font-bold mb-1.5">{t.calendar.attendees}</label>
            <div className="flex flex-wrap gap-2">
              {familyMembers.map((m) => {
                const isSelected = selectedMembers.includes(m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        setSelectedMembers(selectedMembers.filter((id) => id !== m.id));
                      } else {
                        setSelectedMembers([...selectedMembers, m.id]);
                      }
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-muted/40 text-muted-foreground'
                    }`}
                  >
                    <MemberAvatar name={m.nickname} color={m.member_color} size="sm" />
                    <span>{m.nickname}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold mb-1">{t.calendar.description}</label>
            <textarea
              rows={2}
              placeholder="รายละเอียดหรือข้อมูลเพิ่มเติม..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
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
