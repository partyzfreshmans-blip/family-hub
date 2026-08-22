'use client';

import React, { useEffect, useState, useCallback } from 'react';
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
} from 'lucide-react';
import { useLanguage } from '@/components/LanguageContext';
import { useAuth } from '@/components/AuthContext';
import { MemberAvatar } from '@/components/ui/MemberAvatar';
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
  const [copied, setCopied] = useState(false);

  // Modals
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);
  const [deletingMemberId, setDeletingMemberId] = useState<string | null>(null);

  // Edit form state
  const [newNickname, setNewNickname] = useState('');
  const [newRole, setNewRole] = useState<Role>('ADULT');
  const [newColor, setNewColor] = useState('#0284c7');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openEditModal = (m: FamilyMember) => {
    setEditingMember(m);
    setNewNickname(m.nickname);
    setNewRole(m.role);
    setNewColor(m.member_color);
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
          nickname: newNickname,
          role: newRole,
          memberColor: newColor,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update member');
      }

      setEditingMember(null);
      fetchFamilyData();
      refreshUser();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
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
      }
    } catch (err) {
      console.error(err);
    }
  };

  const isAdmin = member?.role === 'ADMIN';
  const colorOptions = ['#0284c7', '#ec4899', '#10b981', '#8b5cf6', '#f59e0b', '#06b6d4', '#f43f5e'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">{t.family.title}</h1>
          <p className="text-xs text-muted-foreground">สมาชิกทั้งหมดในบ้าน {family?.name}</p>
        </div>

        {!isAdmin && (
          <Badge variant="primary" size="md">
            บทบาทของคุณ: {member?.role}
          </Badge>
        )}
      </div>

      {isLoading ? (
        <LoadingSkeleton count={3} height="h-24" />
      ) : (
        <div className="space-y-6">
          {/* Invite Code Box */}
          <div className="bg-gradient-to-r from-sky-500/10 via-primary/5 to-transparent rounded-3xl p-5 border border-sky-500/20 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-primary text-white flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-foreground">{t.family.inviteCode}</h3>
                  <p className="text-xs text-muted-foreground">{t.family.shareInfo}</p>
                </div>
              </div>

              {isAdmin && (
                <button
                  onClick={handleGenerateNewInvite}
                  className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/80 text-xs font-semibold flex items-center gap-1 transition-colors"
                  title={t.family.generateNewCode}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{t.family.generateNewCode}</span>
                </button>
              )}
            </div>

            {activeInvite ? (
              <div className="flex items-center gap-3">
                <div className="flex-1 px-4 py-3 rounded-2xl bg-card border border-border font-mono text-lg font-extrabold tracking-widest text-primary text-center">
                  {activeInvite.invite_code}
                </div>
                <button
                  onClick={() => handleCopyCode(activeInvite.invite_code)}
                  className="px-5 py-3 rounded-2xl bg-primary hover:bg-primary-600 active:scale-95 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 flex-shrink-0"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? t.family.codeCopied : t.family.copyCode}</span>
                </button>
              </div>
            ) : (
              <button
                onClick={handleGenerateNewInvite}
                className="w-full py-3 rounded-2xl bg-primary text-white font-bold text-xs"
              >
                สร้างรหัสเชิญใหม่
              </button>
            )}
          </div>

          {/* Members List */}
          <div className="space-y-3">
            <h2 className="font-bold text-base text-foreground px-1 flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              <span>{t.family.membersCount} ({members.length})</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {members.map((m) => {
                const isSelf = m.id === member?.id;

                return (
                  <div
                    key={m.id}
                    className="p-5 rounded-3xl bg-card border border-border shadow-soft flex items-center justify-between gap-3 hover:border-primary/40 transition-colors"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <MemberAvatar name={m.nickname} color={m.member_color} size="lg" />

                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-base text-foreground truncate">{m.nickname}</h3>
                          {isSelf && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground">
                              ฉัน
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-muted-foreground truncate">{m.display_name} ({m.email})</p>

                        <div className="flex items-center gap-2 pt-1">
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
                            <div className="flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400">
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>{m.points_balance} แต้ม</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    {(isAdmin || isSelf) && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditModal(m)}
                          className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          title={t.common.edit}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        {isAdmin && !isSelf && (
                          <button
                            onClick={() => setDeletingMemberId(m.id)}
                            className="p-2 rounded-xl text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                            title={t.family.removeMember}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Edit Member Modal */}
      {editingMember && (
        <Modal
          isOpen={!!editingMember}
          onClose={() => setEditingMember(null)}
          title={`แก้ไขข้อมูล: ${editingMember.nickname}`}
        >
          <form onSubmit={handleSaveMember} className="space-y-4">
            {error && (
              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold mb-1">{t.family.nickname} *</label>
              <input
                type="text"
                required
                value={newNickname}
                onChange={(e) => setNewNickname(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {isAdmin && (
              <div>
                <label className="block text-xs font-bold mb-1">{t.family.changeRole}</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as Role)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="ADMIN">{t.family.roles.ADMIN}</option>
                  <option value="ADULT">{t.family.roles.ADULT}</option>
                  <option value="CHILD">{t.family.roles.CHILD}</option>
                </select>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {t.family.roleDescriptions[newRole]}
                </p>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold mb-1.5">{t.family.memberColor}</label>
              <div className="flex items-center gap-2">
                {colorOptions.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewColor(c)}
                    style={{ backgroundColor: c }}
                    className={`w-8 h-8 rounded-full transition-transform ${
                      newColor === c ? 'ring-4 ring-primary/30 scale-110' : 'hover:scale-105'
                    }`}
                  />
                ))}
              </div>
            </div>

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
                disabled={isSaving}
                className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-600 active:scale-95 text-white text-xs font-bold shadow-md transition-all"
              >
                {isSaving ? t.common.saving : t.common.save}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deletingMemberId}
        onClose={() => setDeletingMemberId(null)}
        onConfirm={handleDeleteMember}
        title={t.family.removeMember}
        message="คุณแน่ใจหรือไม่ว่าต้องการลบสมาชิกคนนี้ออกจากครอบครัว?"
      />
    </div>
  );
}
