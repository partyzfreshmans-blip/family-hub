'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Users,
  UserPlus,
  Copy,
  Check,
  Shield,
  Trash2,
  Edit2,
  RefreshCw,
  Sparkles,
  KeyRound,
  ShieldAlert,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  Mail,
  User,
  Search,
  Key,
  Award,
  Share2,
  CheckCircle2,
  Crown,
  UserCheck,
  Baby,
  Dice5,
  Plus,
  Minus,
  ExternalLink,
  ChevronRight,
  Camera,
} from 'lucide-react';
import { useLanguage } from '@/components/LanguageContext';
import { useAuth } from '@/components/AuthContext';
import { MemberAvatar } from '@/components/ui/MemberAvatar';
import { AvatarPicker } from '@/components/ui/AvatarPicker';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { LoadingSkeleton } from '@/components/ui/EmptyState';
import { FamilyMember, FamilyInvite, Role } from '@/types';

export default function FamilyPage() {
  const { t } = useLanguage();
  const { member, family, refreshUser } = useAuth();

  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [invites, setInvites] = useState<FamilyInvite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | Role>('ALL');

  // Modals
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);
  const [pinResetMember, setPinResetMember] = useState<FamilyMember | null>(null);
  const [pointsAdjustMember, setPointsAdjustMember] = useState<FamilyMember | null>(null);
  const [deletingMemberId, setDeletingMemberId] = useState<string | null>(null);

  // Add Member form state
  const [addNickname, setAddNickname] = useState('');
  const [addDisplayName, setAddDisplayName] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addPin, setAddPin] = useState('123456');
  const [addRole, setAddRole] = useState<Role>('ADULT');
  const [addColor, setAddColor] = useState('#0284c7');
  const [addAvatarUrl, setAddAvatarUrl] = useState<string | null>(null);
  const [addInitialPoints, setAddInitialPoints] = useState('0');
  const [showAddPin, setShowAddPin] = useState(false);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Edit Member form state
  const [editNickname, setEditNickname] = useState('');
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPin, setEditPin] = useState('');
  const [editRole, setEditRole] = useState<Role>('ADULT');
  const [editColor, setEditColor] = useState('#0284c7');
  const [editAvatarUrl, setEditAvatarUrl] = useState<string | null>(null);
  const [showEditPin, setShowEditPin] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Quick PIN Reset form state
  const [quickPin, setQuickPin] = useState('123456');
  const [showQuickPin, setShowQuickPin] = useState(true);
  const [isResettingPin, setIsResettingPin] = useState(false);
  const [pinResetSuccess, setPinResetSuccess] = useState(false);

  // Quick Points Adjust form state
  const [pointsDelta, setPointsDelta] = useState<number>(10);
  const [pointsReason, setPointsReason] = useState('');
  const [isAdjustingPoints, setIsAdjustingPoints] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const fetchFamilyData = useCallback(async () => {
    try {
      const [memRes, invRes] = await Promise.all([
        fetch('/api/families/members'),
        fetch('/api/families/invites'),
      ]);

      if (memRes.ok) {
        const memJson = await memRes.json();
        setMembers(memJson.members || []);
      }

      if (invRes.ok) {
        const invJson = await invRes.json();
        setInvites(invJson.invites || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFamilyData();
  }, [fetchFamilyData]);

  const activeInvite = invites[0];

  const handleCopyText = (text: string, successMsg = 'คัดลอกเรียบร้อยแล้ว') => {
    navigator.clipboard.writeText(text);
    showToast(successMsg);
  };

  const handleGenerateNewInvite = async () => {
    try {
      const res = await fetch('/api/families/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'ADULT' }),
      });
      if (res.ok) {
        fetchFamilyData();
        showToast('สร้างรหัสเชิญใหม่เรียบร้อยแล้ว');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const generateRandomPin = () => {
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    return pin;
  };

  // Quick Preset for Add Member
  const handleApplyPreset = (preset: 'CHILD' | 'ADULT' | 'ADMIN') => {
    setAddRole(preset);
    if (preset === 'CHILD') {
      setAddColor('#10b981');
      setAddInitialPoints('50');
    } else if (preset === 'ADMIN') {
      setAddColor('#f59e0b');
      setAddInitialPoints('0');
    } else {
      setAddColor('#0284c7');
      setAddInitialPoints('0');
    }
  };

  const openAddMemberModal = () => {
    setAddNickname('');
    setAddDisplayName('');
    setAddEmail('');
    setAddPin('123456');
    setAddRole('ADULT');
    setAddColor('#0284c7');
    setAddAvatarUrl(null);
    setAddInitialPoints('0');
    setShowAddPin(false);
    setAddError(null);
    setIsAddMemberModalOpen(true);
  };

  const handleAddMember = async (e: React.FormEvent, copySlip = false) => {
    e.preventDefault();
    if (!addNickname.trim()) return;

    setIsAddingMember(true);
    setAddError(null);

    const generatedEmail = addEmail.trim() || `${addNickname.trim().toLowerCase().replace(/\s+/g, '')}_${Math.random().toString(36).substring(2, 6)}@familyhub.local`;
    const finalPin = addPin.trim() || '123456';

    try {
      const res = await fetch('/api/families/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nickname: addNickname.trim(),
          displayName: addDisplayName.trim() || addNickname.trim(),
          email: generatedEmail,
          pin: finalPin,
          role: addRole,
          memberColor: addColor,
          avatarUrl: addAvatarUrl,
          initialPoints: addInitialPoints,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to add member');
      }

      setIsAddMemberModalOpen(false);
      fetchFamilyData();
      refreshUser();

      if (copySlip) {
        const slip = `🏠 บัญชีเข้าใช้งาน Family Hub (${family?.name || 'ครอบครัว'})\n👤 ชื่อ: ${addNickname.trim()}\n✉️ บัญชี/อีเมล: ${generatedEmail}\n🔑 PIN เข้าสู่ระบบ: ${finalPin}\n🌐 ลิงก์เข้าใช้งาน: ${window.location.origin}/login`;
        handleCopyText(slip, `เพิ่มสมาชิก "${addNickname.trim()}" และคัดลอกข้อมูลล็อกอินแล้ว!`);
      } else {
        showToast(`เพิ่มสมาชิก "${addNickname.trim()}" เรียบร้อยแล้ว`);
      }
    } catch (err: any) {
      setAddError(err.message);
    } finally {
      setIsAddingMember(false);
    }
  };

  const openEditModal = (m: FamilyMember) => {
    setEditingMember(m);
    setEditNickname(m.nickname);
    setEditDisplayName(m.display_name || m.nickname);
    setEditEmail(m.email || '');
    setEditPin('');
    setEditRole(m.role);
    setEditColor(m.member_color);
    setEditAvatarUrl(m.avatar_url || null);
    setShowEditPin(false);
    setError(null);
  };

  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;
    setIsSaving(true);
    setError(null);

    try {
      const res = await fetch('/api/families/members', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId: editingMember.id,
          nickname: editNickname.trim(),
          displayName: editDisplayName.trim(),
          email: editEmail.trim(),
          pin: editPin.trim() || undefined,
          role: editRole,
          memberColor: editColor,
          avatarUrl: editAvatarUrl,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update member');
      }

      setEditingMember(null);
      fetchFamilyData();
      refreshUser();
      showToast(`บันทึกข้อมูล "${editNickname.trim()}" สำเร็จ`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const openQuickPinModal = (m: FamilyMember) => {
    setPinResetMember(m);
    setQuickPin(generateRandomPin());
    setShowQuickPin(true);
    setPinResetSuccess(false);
  };

  const handleConfirmResetPin = async (copyToClipboard = true) => {
    if (!pinResetMember || !quickPin.trim()) return;
    setIsResettingPin(true);

    try {
      const res = await fetch('/api/families/members', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId: pinResetMember.id,
          pin: quickPin.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to reset PIN');
      }

      setPinResetSuccess(true);
      fetchFamilyData();

      if (copyToClipboard) {
        const slip = `🔑 รหัส PIN ใหม่สำหรับเข้า Family Hub (${family?.name || 'ครอบครัว'})\n👤 สมาชิก: ${pinResetMember.nickname}\n✉️ บัญชี/อีเมล: ${pinResetMember.email}\n🔐 PIN ใหม่: ${quickPin.trim()}\n🌐 เข้าสู่ระบบที่: ${window.location.origin}/login`;
        handleCopyText(slip, `รีเซ็ต PIN ของ "${pinResetMember.nickname}" และคัดลอกข้อมูลแล้ว!`);
      } else {
        showToast(`รีเซ็ต PIN ของ "${pinResetMember.nickname}" สำเร็จ`);
      }

      setTimeout(() => {
        setPinResetMember(null);
        setPinResetSuccess(false);
      }, 1200);
    } catch (err: any) {
      alert(err.message || 'เกิดข้อผิดพลาดในการรีเซ็ต PIN');
    } finally {
      setIsResettingPin(false);
    }
  };

  const openPointsAdjustModal = (m: FamilyMember) => {
    setPointsAdjustMember(m);
    setPointsDelta(10);
    setPointsReason('รางวัลทำงานบ้าน / ช่วยเหลืองานในครอบครัว');
  };

  const handleConfirmAdjustPoints = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pointsAdjustMember || pointsDelta === 0) return;
    setIsAdjustingPoints(true);

    try {
      const res = await fetch('/api/families/members', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId: pointsAdjustMember.id,
          pointsDelta: pointsDelta,
          pointsReason: pointsReason.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to adjust points');
      }

      setPointsAdjustMember(null);
      fetchFamilyData();
      showToast(`ปรับแต้มของ "${pointsAdjustMember.nickname}" (${pointsDelta > 0 ? `+${pointsDelta}` : pointsDelta} แต้ม) สำเร็จ`);
    } catch (err: any) {
      alert(err.message || 'เกิดข้อผิดพลาดในการปรับแต้ม');
    } finally {
      setIsAdjustingPoints(false);
    }
  };

  const handleDeleteMember = async () => {
    if (!deletingMemberId) return;
    try {
      const res = await fetch(`/api/families/members?id=${deletingMemberId}`, { method: 'DELETE' });
      if (res.ok) {
        setDeletingMemberId(null);
        fetchFamilyData();
        refreshUser();
        showToast('ลบสมาชิกออกจากครอบครัวเรียบร้อยแล้ว');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const copyMemberLoginSlip = (m: FamilyMember) => {
    const slip = `🏠 ข้อมูลเข้าใช้งาน Family Hub (${family?.name || 'ครอบครัว'})\n👤 ชื่อ: ${m.nickname} (${m.display_name || m.nickname})\n✉️ บัญชี/อีเมล: ${m.email}\n🌐 หน้าเข้าสู่ระบบ: ${window.location.origin}/login`;
    handleCopyText(slip, `คัดลอกข้อมูลบัญชีของ "${m.nickname}" แล้ว!`);
  };

  const isAdmin = member?.role === 'ADMIN';

  // Metrics computation
  const stats = useMemo(() => {
    const total = members.length;
    const admins = members.filter((m) => m.role === 'ADMIN').length;
    const adults = members.filter((m) => m.role === 'ADULT').length;
    const children = members.filter((m) => m.role === 'CHILD').length;
    const totalPoints = members.reduce((sum, m) => sum + (m.points_balance || 0), 0);
    return { total, admins, adults, children, totalPoints };
  }, [members]);

  // Filtered members list
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const matchRole = roleFilter === 'ALL' || m.role === roleFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        m.nickname.toLowerCase().includes(q) ||
        (m.display_name && m.display_name.toLowerCase().includes(q)) ||
        (m.email && m.email.toLowerCase().includes(q));
      return matchRole && matchQuery;
    });
  }, [members, roleFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl bg-foreground text-background font-bold text-xs shadow-2xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header & Main Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              จัดการสมาชิกในบ้าน
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-extrabold">
              {stats.total} คน
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            ศูนย์ควบคุมและจัดการสมาชิก สิทธิ์ รูปโปรไฟล์ และรหัสผ่าน/PIN ของทุกคนในบ้าน {family?.name}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsInviteModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-muted/70 hover:bg-muted text-foreground text-xs font-bold border border-border/80 transition-all active:scale-95 shadow-sm"
          >
            <KeyRound className="w-4 h-4 text-primary" />
            <span>รหัสเชิญ ({activeInvite?.invite_code || 'ดูรหัส'})</span>
          </button>

          {isAdmin && (
            <button
              onClick={openAddMemberModal}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-primary to-sky-500 hover:from-primary-600 hover:to-sky-600 active:scale-95 text-white text-xs font-extrabold shadow-md transition-all"
            >
              <UserPlus className="w-4 h-4" />
              <span>เพิ่มสมาชิกใหม่</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-3xl bg-card border border-border/80 shadow-soft flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-sky-500/10 text-sky-500 flex items-center justify-center font-extrabold shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-muted-foreground">สมาชิกทั้งหมด</p>
            <p className="text-xl font-extrabold text-foreground">{stats.total} <span className="text-xs font-normal text-muted-foreground">คน</span></p>
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-card border border-border/80 shadow-soft flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center font-extrabold shrink-0">
            <Crown className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-muted-foreground">ผู้ดูแลบ้าน (Admin)</p>
            <p className="text-xl font-extrabold text-foreground">{stats.admins} <span className="text-xs font-normal text-muted-foreground">คน</span></p>
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-card border border-border/80 shadow-soft flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-extrabold shrink-0">
            <Baby className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-muted-foreground">สมาชิกเด็ก (Child)</p>
            <p className="text-xl font-extrabold text-foreground">{stats.children} <span className="text-xs font-normal text-muted-foreground">คน</span></p>
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-card border border-border/80 shadow-soft flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-extrabold shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-muted-foreground">แต้มสะสมรวมทั้งบ้าน</p>
            <p className="text-xl font-extrabold text-foreground">{stats.totalPoints} <span className="text-xs font-normal text-muted-foreground">แต้ม</span></p>
          </div>
        </div>
      </div>

      {/* Search & Filter Pills Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2 rounded-2xl bg-card border border-border shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="ค้นหาด้วยชื่อเรียก, ชื่อจริง หรืออีเมล/ชื่อผู้ใช้..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
        </div>

        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 shrink-0">
          <button
            onClick={() => setRoleFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              roleFilter === 'ALL'
                ? 'bg-primary text-white shadow-xs'
                : 'bg-muted/50 text-muted-foreground hover:text-foreground'
            }`}
          >
            ทั้งหมด ({members.length})
          </button>
          <button
            onClick={() => setRoleFilter('ADMIN')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              roleFilter === 'ADMIN'
                ? 'bg-rose-500 text-white shadow-xs'
                : 'bg-muted/50 text-muted-foreground hover:text-foreground'
            }`}
          >
            👑 ผู้ดูแล ({stats.admins})
          </button>
          <button
            onClick={() => setRoleFilter('ADULT')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              roleFilter === 'ADULT'
                ? 'bg-sky-500 text-white shadow-xs'
                : 'bg-muted/50 text-muted-foreground hover:text-foreground'
            }`}
          >
            🧑 ผู้ใหญ่ ({stats.adults})
          </button>
          <button
            onClick={() => setRoleFilter('CHILD')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              roleFilter === 'CHILD'
                ? 'bg-emerald-500 text-white shadow-xs'
                : 'bg-muted/50 text-muted-foreground hover:text-foreground'
            }`}
          >
            🧒 เด็ก ({stats.children})
          </button>
        </div>
      </div>

      {/* Main Members Grid */}
      {isLoading ? (
        <LoadingSkeleton count={4} height="h-32" />
      ) : filteredMembers.length === 0 ? (
        <div className="p-12 text-center bg-card rounded-3xl border border-border shadow-soft space-y-3">
          <Users className="w-12 h-12 text-muted-foreground mx-auto opacity-40" />
          <h3 className="font-bold text-base text-foreground">ไม่พบสมาชิกตามเงื่อนไขที่ค้นหา</h3>
          <p className="text-xs text-muted-foreground">ลองเปลี่ยนคำค้นหา หรือกดล้างการกรอง</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredMembers.map((m) => {
            const isSelf = m.id === member?.id;

            return (
              <div
                key={m.id}
                className="p-5 rounded-3xl bg-card border border-border shadow-soft flex flex-col justify-between gap-4 hover:border-primary/50 transition-all group relative overflow-hidden"
              >
                {/* Accent Top Bar based on member color */}
                <div
                  style={{ backgroundColor: m.member_color || '#0284c7' }}
                  className="absolute top-0 left-0 right-0 h-1.5 opacity-80"
                />

                {/* Profile Header */}
                <div className="flex items-start justify-between gap-3 pt-1">
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="relative shrink-0">
                      <MemberAvatar
                        name={m.nickname}
                        color={m.member_color}
                        avatarUrl={m.avatar_url}
                        size="lg"
                        className="shadow-sm"
                      />
                      {m.role === 'ADMIN' && (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-sm">
                          <Crown className="w-3 h-3" />
                        </div>
                      )}
                    </div>

                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3
                          onClick={() => (isAdmin || isSelf) && openEditModal(m)}
                          className={`font-extrabold text-base text-foreground truncate ${(isAdmin || isSelf) ? 'cursor-pointer hover:text-primary' : ''}`}
                          title="คลิกเพื่อแก้ไขข้อมูลสมาชิก"
                        >
                          {m.nickname}
                        </h3>
                        {isSelf && (
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                            ฉัน (บัญชีนี้)
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-muted-foreground truncate">
                        {m.display_name && m.display_name !== m.nickname ? `${m.display_name}` : 'สมาชิกในครอบครัว'}
                      </p>

                      <div className="flex items-center gap-2 pt-1 flex-wrap">
                        <Badge
                          variant={
                            m.role === 'ADMIN' ? 'danger' : m.role === 'ADULT' ? 'primary' : 'success'
                          }
                          size="sm"
                        >
                          <Shield className="w-3 h-3" />
                          <span>{t.family.roles[m.role]}</span>
                        </Badge>

                        {family?.rewards_enabled === 1 && (
                          <div
                            onClick={() => isAdmin && openPointsAdjustModal(m)}
                            className={`flex items-center gap-1 text-xs font-extrabold px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 ${
                              isAdmin ? 'cursor-pointer hover:bg-amber-500/20' : ''
                            }`}
                            title={isAdmin ? 'คลิกเพื่อปรับแต้ม' : undefined}
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>{m.points_balance || 0} แต้ม</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Top Action Menu */}
                  {(isAdmin || isSelf) && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => openEditModal(m)}
                        className="p-2 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                        title="แก้ไขรายละเอียด, สิทธิ์ & รูปโปรไฟล์"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      {isAdmin && !isSelf && (
                        <button
                          onClick={() => setDeletingMemberId(m.id)}
                          className="p-2 rounded-xl text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                          title="ลบสมาชิกออกจากบ้าน"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Account & Security Card Details */}
                <div className="p-3 rounded-2xl bg-muted/40 border border-border/70 space-y-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground flex items-center gap-1.5 shrink-0">
                      <Mail className="w-3.5 h-3.5 text-sky-500" /> บัญชีเข้าสู่ระบบ:
                    </span>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-bold text-foreground font-mono text-[11px] truncate select-all">
                        {m.email}
                      </span>
                      <button
                        onClick={() => handleCopyText(m.email || '', 'คัดลอกอีเมลแล้ว')}
                        className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground shrink-0"
                        title="คัดลอกบัญชี"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/40">
                    <span className="text-muted-foreground flex items-center gap-1.5 shrink-0">
                      <Lock className="w-3.5 h-3.5 text-amber-500" /> PIN เข้าใช้งาน:
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                        พร้อมใช้งาน
                      </span>
                      {isAdmin && (
                        <button
                          onClick={() => openQuickPinModal(m)}
                          className="px-2 py-0.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-[10px] font-bold transition-colors"
                          title="ตั้งหรือรีเซ็ต PIN ใหม่"
                        >
                          รีเซ็ต PIN
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Footer Bar for Admin */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/60 text-xs">
                  <button
                    onClick={() => copyMemberLoginSlip(m)}
                    className="px-3 py-1.5 rounded-xl bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground font-bold flex items-center gap-1.5 transition-colors"
                    title="คัดลอกข้อมูลสำหรับส่งให้สมาชิกนำไปเข้าสู่ระบบ"
                  >
                    <Share2 className="w-3.5 h-3.5 text-primary" />
                    <span>คัดลอกข้อมูลล็อกอิน</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => openEditModal(m)}
                      className="px-2.5 py-1.5 rounded-xl bg-muted/70 hover:bg-muted text-foreground font-bold flex items-center gap-1 transition-colors"
                      title="เปลี่ยนรูปโปรไฟล์"
                    >
                      <Camera className="w-3.5 h-3.5 text-primary" />
                      <span>รูปโปรไฟล์</span>
                    </button>

                    {isAdmin && (
                      <>
                        {family?.rewards_enabled === 1 && (
                          <button
                            onClick={() => openPointsAdjustModal(m)}
                            className="px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1 transition-colors"
                            title="ปรับแต้มสะสม"
                          >
                            <Award className="w-3.5 h-3.5" />
                            <span>ปรับแต้ม</span>
                          </button>
                        )}
                        <button
                          onClick={() => openQuickPinModal(m)}
                          className="px-2.5 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary font-bold flex items-center gap-1 transition-colors"
                          title="เปลี่ยนรหัส PIN"
                        >
                          <Key className="w-3.5 h-3.5" />
                          <span>เปลี่ยน PIN</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Member Modal (Admin Only) */}
      {isAddMemberModalOpen && (
        <Modal
          isOpen={isAddMemberModalOpen}
          onClose={() => setIsAddMemberModalOpen(false)}
          title="เพิ่มสมาชิกใหม่ในบ้าน"
          maxWidth="md"
        >
          <form onSubmit={(e) => handleAddMember(e, false)} className="space-y-4">
            {addError && (
              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs font-bold">
                {addError}
              </div>
            )}

            {/* Quick Role Presets */}
            <div>
              <label className="block text-[11px] font-bold text-muted-foreground mb-1.5">
                เลือกประเภทสมาชิกด่วน (Preset)
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleApplyPreset('CHILD')}
                  className={`p-2.5 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                    addRole === 'CHILD'
                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400'
                      : 'bg-muted/40 border-border hover:bg-muted text-foreground'
                  }`}
                >
                  <Baby className="w-4 h-4" />
                  <span>เด็ก / ลูก</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('ADULT')}
                  className={`p-2.5 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                    addRole === 'ADULT'
                      ? 'bg-sky-500/10 border-sky-500 text-sky-600 dark:text-sky-400'
                      : 'bg-muted/40 border-border hover:bg-muted text-foreground'
                  }`}
                >
                  <UserCheck className="w-4 h-4" />
                  <span>ผู้ใหญ่ / สมาชิก</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('ADMIN')}
                  className={`p-2.5 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                    addRole === 'ADMIN'
                      ? 'bg-rose-500/10 border-rose-500 text-rose-600 dark:text-rose-400'
                      : 'bg-muted/40 border-border hover:bg-muted text-foreground'
                  }`}
                >
                  <Crown className="w-4 h-4" />
                  <span>ผู้ดูแล (Admin)</span>
                </button>
              </div>
            </div>

            {/* Avatar Picker */}
            <div className="p-3 rounded-2xl bg-muted/30 border border-border">
              <label className="block text-xs font-bold mb-2">รูปโปรไฟล์สมาชิก</label>
              <AvatarPicker
                currentAvatarUrl={addAvatarUrl}
                name={addNickname || 'สมาชิกใหม่'}
                color={addColor}
                onAvatarChange={setAddAvatarUrl}
                onColorChange={setAddColor}
                size="lg"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold mb-1">ชื่อเรียกในบ้าน (Nickname) *</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น น้องวิน, คุณยาย, พี่บอส"
                  value={addNickname}
                  onChange={(e) => {
                    setAddNickname(e.target.value);
                    if (!addEmail) {
                      setAddDisplayName(e.target.value);
                    }
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">ชื่อ-นามสกุลจริง</label>
                <input
                  type="text"
                  placeholder="เช่น วินัย สุขใจ"
                  value={addDisplayName}
                  onChange={(e) => setAddDisplayName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold">อีเมล / บัญชีสำหรับเข้าสู่ระบบ</label>
                <span className="text-[10px] text-muted-foreground">(เว้นว่างเพื่อสร้างอัตโนมัติ)</span>
              </div>
              <input
                type="text"
                placeholder={`เช่น ${addNickname ? addNickname.toLowerCase().replace(/\s+/g, '') : 'name'}@familyhub.local หรืออีเมลจริง`}
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono text-xs"
              />
            </div>

            {/* PIN / Password with Random Generator */}
            <div className="p-3.5 rounded-2xl bg-primary/5 border border-primary/20 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-primary flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" /> รหัส PIN สำหรับเข้าใช้งาน (อย่างน้อย 4-6 ตัว) *
                </label>
                <button
                  type="button"
                  onClick={() => setAddPin(generateRandomPin())}
                  className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1"
                >
                  <Dice5 className="w-3 h-3" /> สุ่ม PIN ใหม่
                </button>
              </div>

              <div className="relative">
                <input
                  type={showAddPin ? 'text' : 'password'}
                  required
                  placeholder="เช่น 123456"
                  value={addPin}
                  onChange={(e) => setAddPin(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-primary tracking-wider"
                />
                <button
                  type="button"
                  onClick={() => setShowAddPin(!showAddPin)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showAddPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1">แต้มสะสมเริ่มต้น</label>
              <input
                type="number"
                min="0"
                placeholder="0"
                value={addInitialPoints}
                onChange={(e) => setAddInitialPoints(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Submit Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setIsAddMemberModalOpen(false)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-border text-xs font-bold hover:bg-muted"
              >
                {t.common.cancel}
              </button>

              <button
                type="button"
                disabled={isAddingMember || !addNickname.trim()}
                onClick={(e) => handleAddMember(e, true)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground text-xs font-bold transition-all flex items-center justify-center gap-1.5"
              >
                <Share2 className="w-3.5 h-3.5 text-primary" />
                <span>บันทึก & คัดลอกข้อมูลล็อกอิน</span>
              </button>

              <button
                type="submit"
                disabled={isAddingMember || !addNickname.trim()}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-600 active:scale-95 text-white text-xs font-extrabold shadow-md transition-all flex items-center justify-center gap-1.5"
              >
                {isAddingMember ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>กำลังเพิ่มสมาชิก...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>เพิ่มสมาชิก</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Member Modal */}
      {editingMember && (
        <Modal
          isOpen={!!editingMember}
          onClose={() => setEditingMember(null)}
          title={`แก้ไขข้อมูลและโปรไฟล์: ${editingMember.nickname}`}
          maxWidth="md"
        >
          <form onSubmit={handleSaveMember} className="space-y-4">
            {error && (
              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs font-bold">
                {error}
              </div>
            )}

            {/* Avatar Picker for Member */}
            <div className="p-3 rounded-2xl bg-muted/30 border border-border">
              <label className="block text-xs font-bold mb-2">รูปโปรไฟล์สมาชิก</label>
              <AvatarPicker
                currentAvatarUrl={editAvatarUrl}
                name={editNickname || editingMember.nickname}
                color={editColor}
                onAvatarChange={setEditAvatarUrl}
                onColorChange={setEditColor}
                size="lg"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold mb-1">{t.family.nickname} *</label>
                <input
                  type="text"
                  required
                  value={editNickname}
                  onChange={(e) => setEditNickname(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">ชื่อ-นามสกุลจริง</label>
                <input
                  type="text"
                  placeholder="ชื่อ-นามสกุล"
                  value={editDisplayName}
                  onChange={(e) => setEditDisplayName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1">อีเมล / บัญชีสำหรับเข้าสู่ระบบ</label>
              <input
                type="text"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono text-xs"
              />
            </div>

            {/* PIN / Password reset field */}
            <div className="p-3.5 rounded-2xl bg-primary/5 border border-primary/20 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
                  <Lock className="w-3.5 h-3.5" />
                  <span>รีเซ็ตหรือเปลี่ยน PIN เข้าสู่ระบบ</span>
                </div>
                <button
                  type="button"
                  onClick={() => setEditPin(generateRandomPin())}
                  className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1"
                >
                  <Dice5 className="w-3 h-3" /> สุ่ม PIN 6 หลัก
                </button>
              </div>

              <div className="relative">
                <input
                  type={showEditPin ? 'text' : 'password'}
                  placeholder="พิมพ์ PIN ใหม่ (เว้นว่างหากไม่ต้องการเปลี่ยน)"
                  value={editPin}
                  onChange={(e) => setEditPin(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-primary tracking-wider"
                />
                <button
                  type="button"
                  onClick={() => setShowEditPin(!showEditPin)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showEditPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground">
                แอดมินสามารถกำหนดรหัส PIN ใหม่ (เช่น 123456) ให้สมาชิกท่านนี้เพื่อใช้ล็อกอินได้ทันที
              </p>
            </div>

            {isAdmin && (
              <div>
                <label className="block text-xs font-bold mb-1">{t.family.changeRole}</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as Role)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="ADMIN">{t.family.roles.ADMIN} (ผู้ดูแลบ้าน - สิทธิ์เต็ม)</option>
                  <option value="ADULT">{t.family.roles.ADULT} (ผู้ใหญ่ - จัดการงานบ้าน/บิล/ซื้อของ)</option>
                  <option value="CHILD">{t.family.roles.CHILD} (เด็ก - ทำงานบ้านและสะสมแต้ม)</option>
                </select>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {t.family.roleDescriptions[editRole]}
                </p>
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setEditingMember(null)}
                className="px-4 py-2.5 rounded-xl border border-border text-xs font-bold hover:bg-muted"
              >
                {t.common.cancel}
              </button>
              <button
                type="submit"
                disabled={isSaving || !editNickname.trim()}
                className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-600 active:scale-95 text-white text-xs font-extrabold shadow-md transition-all flex items-center gap-1.5"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>{t.common.saving}</span>
                  </>
                ) : (
                  <span>{t.common.save}</span>
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Quick PIN Reset Modal */}
      {pinResetMember && (
        <Modal
          isOpen={!!pinResetMember}
          onClose={() => setPinResetMember(null)}
          title={`รีเซ็ต PIN เข้าใช้งาน: ${pinResetMember.nickname}`}
          maxWidth="sm"
        >
          <div className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300">
              <p className="font-bold">🔑 กำหนดรหัส PIN ใหม่สำหรับ {pinResetMember.nickname}</p>
              <p className="text-[11px] mt-0.5">สมาชิกจะสามารถใช้ PIN นี้ในการเข้าสู่ระบบได้ทันที</p>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-foreground">รหัส PIN ใหม่ (4-6 ตัว)</label>
                <button
                  type="button"
                  onClick={() => setQuickPin(generateRandomPin())}
                  className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                >
                  <Dice5 className="w-3.5 h-3.5" /> สุ่มเลขใหม่
                </button>
              </div>

              <div className="relative">
                <input
                  type={showQuickPin ? 'text' : 'password'}
                  required
                  value={quickPin}
                  onChange={(e) => setQuickPin(e.target.value)}
                  placeholder="เช่น 123456"
                  className="w-full px-4 py-3 rounded-2xl border border-border bg-background text-center text-2xl font-mono font-extrabold tracking-widest text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowQuickPin(!showQuickPin)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showQuickPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                disabled={isResettingPin || !quickPin.trim()}
                onClick={() => handleConfirmResetPin(true)}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-primary to-sky-500 hover:from-primary-600 hover:to-sky-600 text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2 active:scale-98"
              >
                {isResettingPin ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Share2 className="w-4 h-4" />
                )}
                <span>บันทึกและคัดลอกข้อมูลส่งให้สมาชิก</span>
              </button>

              <button
                type="button"
                onClick={() => setPinResetMember(null)}
                className="w-full py-2 rounded-xl text-xs font-bold text-muted-foreground hover:bg-muted transition-colors"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Adjust Points Modal */}
      {pointsAdjustMember && (
        <Modal
          isOpen={!!pointsAdjustMember}
          onClose={() => setPointsAdjustMember(null)}
          title={`ปรับแต้มสะสม: ${pointsAdjustMember.nickname}`}
          maxWidth="sm"
        >
          <form onSubmit={handleConfirmAdjustPoints} className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between">
              <div>
                <p className="font-bold">แต้มสะสมปัจจุบัน</p>
                <p className="text-lg font-extrabold text-amber-600 dark:text-amber-400">
                  {pointsAdjustMember.points_balance || 0} แต้ม
                </p>
              </div>
              <div className="text-right">
                <p className="font-bold text-muted-foreground">ผลรวมหลังปรับ</p>
                <p className="text-lg font-extrabold text-foreground">
                  {Math.max(0, (pointsAdjustMember.points_balance || 0) + pointsDelta)} แต้ม
                </p>
              </div>
            </div>

            {/* Quick Adjust Buttons */}
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1.5">
                เลือกจำนวนแต้มด่วน
              </label>
              <div className="grid grid-cols-5 gap-1.5">
                {[10, 20, 50, -10, -20].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setPointsDelta(amt)}
                    className={`py-2 rounded-xl text-xs font-extrabold border transition-all ${
                      pointsDelta === amt
                        ? amt > 0
                          ? 'bg-emerald-500 text-white border-emerald-600'
                          : 'bg-rose-500 text-white border-rose-600'
                        : 'bg-muted/50 border-border hover:bg-muted text-foreground'
                    }`}
                  >
                    {amt > 0 ? `+${amt}` : amt}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1">จำนวนแต้มที่ต้องการปรับ (+ หรือ -)</label>
              <input
                type="number"
                required
                value={pointsDelta}
                onChange={(e) => setPointsDelta(parseInt(e.target.value) || 0)}
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-lg font-extrabold text-center focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-bold mb-1">เหตุผลในการให้ / หักแต้ม</label>
              <input
                type="text"
                placeholder="เช่น ช่วยล้างจาน, ทำการบ้านเสร็จตรงเวลา"
                value={pointsReason}
                onChange={(e) => setPointsReason(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPointsAdjustMember(null)}
                className="px-4 py-2.5 rounded-xl border border-border text-xs font-bold hover:bg-muted"
              >
                {t.common.cancel}
              </button>
              <button
                type="submit"
                disabled={isAdjustingPoints || pointsDelta === 0}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white text-xs font-extrabold shadow-md transition-all flex items-center gap-1.5"
              >
                {isAdjustingPoints ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Award className="w-3.5 h-3.5" />}
                <span>ยืนยันการปรับแต้ม</span>
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Invite Code Modal */}
      {isInviteModalOpen && (
        <Modal
          isOpen={isInviteModalOpen}
          onClose={() => setIsInviteModalOpen(false)}
          title="รหัสเชิญเข้าร่วมครอบครัว"
          maxWidth="sm"
        >
          <div className="space-y-4 text-center">
            <div className="w-14 h-14 rounded-3xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
              <KeyRound className="w-7 h-7" />
            </div>

            <div>
              <h3 className="font-extrabold text-base text-foreground">รหัสเชิญสำหรับครอบครัว {family?.name}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                ส่งรหัสนี้ให้สมาชิกในบ้านเพื่อนำไปกรอกตอนลงทะเบียน
              </p>
            </div>

            {activeInvite ? (
              <div className="p-4 rounded-2xl bg-muted/40 border border-border space-y-3">
                <p className="font-mono text-2xl font-black tracking-widest text-primary select-all">
                  {activeInvite.invite_code}
                </p>

                <button
                  type="button"
                  onClick={() => handleCopyText(activeInvite.invite_code, 'คัดลอกรหัสเชิญแล้ว!')}
                  className="w-full py-2.5 rounded-xl bg-primary hover:bg-primary-600 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-2"
                >
                  <Copy className="w-4 h-4" />
                  <span>คัดลอกรหัสเชิญ</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleGenerateNewInvite}
                className="w-full py-3 rounded-2xl bg-primary text-white font-bold text-xs"
              >
                สร้างรหัสเชิญใหม่
              </button>
            )}

            {isAdmin && activeInvite && (
              <button
                type="button"
                onClick={handleGenerateNewInvite}
                className="text-xs font-bold text-muted-foreground hover:text-foreground flex items-center justify-center gap-1.5 mx-auto"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>สร้างรหัสเชิญชุดใหม่</span>
              </button>
            )}
          </div>
        </Modal>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deletingMemberId}
        onClose={() => setDeletingMemberId(null)}
        onConfirm={handleDeleteMember}
        title={t.family.removeMember}
        message="คุณแน่ใจหรือไม่ว่าต้องการลบสมาชิกคนนี้ออกจากครอบครัว? ประวัติและข้อมูลที่เกี่ยวข้องจะไม่สามารถกู้คืนได้"
      />
    </div>
  );
}
