'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Award,
  Plus,
  Sparkles,
  Gift,
  History,
  CheckCircle2,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import { useLanguage } from '@/components/LanguageContext';
import { useAuth } from '@/components/AuthContext';
import { formatThaiDate } from '@/lib/utils';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Badge } from '@/components/ui/Badge';
import { EmptyState, LoadingSkeleton } from '@/components/ui/EmptyState';
import { Reward, PointsTransaction } from '@/types';

export default function RewardsPage() {
  const { t } = useLanguage();
  const { member, family, refreshUser } = useAuth();

  const [rewardsEnabled, setRewardsEnabled] = useState(true);
  const [currentPoints, setCurrentPoints] = useState(0);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [history, setHistory] = useState<PointsTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [redeemingReward, setRedeemingReward] = useState<Reward | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form State
  const [rewardName, setRewardName] = useState('');
  const [requiredPoints, setRequiredPoints] = useState('100');
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchRewards = useCallback(async () => {
    try {
      const res = await fetch('/api/rewards');
      if (res.ok) {
        const json = await res.json();
        setRewardsEnabled(json.rewardsEnabled);
        setCurrentPoints(json.currentPoints || 0);
        setRewards(json.rewards || []);
        setHistory(json.history || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRewards();
  }, [fetchRewards]);

  const handleCreateReward = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFormError(null);

    try {
      const res = await fetch('/api/rewards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: rewardName,
          requiredPoints,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create reward');
      }

      setIsAddModalOpen(false);
      fetchRewards();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRedeem = async () => {
    if (!redeemingReward) return;
    setIsSaving(true);

    try {
      const res = await fetch('/api/rewards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'redeem',
          rewardId: redeemingReward.id,
        }),
      });

      if (res.ok) {
        setRedeemingReward(null);
        fetchRewards();
        refreshUser();
      } else {
        const data = await res.json();
        alert(data.error || 'เกิดข้อผิดพลาดในการแลกรางวัล');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      const res = await fetch(`/api/rewards?id=${deletingId}`, { method: 'DELETE' });
      if (res.ok) {
        setDeletingId(null);
        fetchRewards();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const isAdmin = member?.role === 'ADMIN';

  if (!rewardsEnabled) {
    return (
      <EmptyState
        icon={Award}
        title={t.rewards.title}
        description={t.rewards.disabledMessage}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">{t.rewards.title}</h1>
          <p className="text-xs text-muted-foreground">ทำงานบ้านและภารกิจเพื่อสะสมแต้มแลกรางวัล</p>
        </div>

        {isAdmin && (
          <button
            onClick={() => {
              setRewardName('');
              setRequiredPoints('100');
              setFormError(null);
              setIsAddModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-primary hover:bg-primary-600 active:scale-95 text-white text-xs font-bold shadow-md transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>{t.rewards.addReward}</span>
          </button>
        )}
      </div>

      {isLoading ? (
        <LoadingSkeleton count={3} height="h-28" />
      ) : (
        <div className="space-y-6">
          {/* Points Balance Banner */}
          <div className="bg-gradient-to-tr from-amber-500/20 via-primary/10 to-transparent rounded-3xl p-6 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-soft">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-3xl bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/30 flex-shrink-0">
                <Sparkles className="w-8 h-8 animate-spin-slow" />
              </div>

              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  {t.rewards.yourPoints}
                </p>
                <div className="flex items-baseline gap-2">
                  <h2 className="text-3xl font-extrabold tracking-tight text-foreground">
                    {currentPoints}
                  </h2>
                  <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
                    {t.common.points}
                  </span>
                </div>
              </div>
            </div>

            <div className="text-xs text-muted-foreground bg-card/80 p-3 rounded-2xl border border-border/50 max-w-sm">
              💡 ทำงานบ้านที่ได้รับมอบหมายเพื่อรับแต้มเพิ่ม สะสมครบแล้วกด &quot;แลกรางวัล&quot; ได้ทันที!
            </div>
          </div>

          {/* Rewards Catalog */}
          <div className="space-y-3">
            <h2 className="font-bold text-base text-foreground px-1 flex items-center gap-2">
              <Gift className="w-4 h-4 text-primary" />
              <span>รายการของรางวัล</span>
            </h2>

            {rewards.length === 0 ? (
              <EmptyState
                icon={Gift}
                title="ยังไม่มีรายการของรางวัล"
                description={isAdmin ? 'แตะสร้างรางวัลเพื่อตั้งเป้าหมายให้คนในบ้าน' : 'รอผู้ดูแลระบบสร้างของรางวัล'}
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {rewards.map((r) => {
                  const canRedeem = currentPoints >= r.required_points;

                  return (
                    <div
                      key={r.id}
                      className="p-5 rounded-3xl bg-card border border-border shadow-soft flex flex-col justify-between gap-4 hover:border-primary/40 transition-colors"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between">
                          <h3 className="font-bold text-base text-foreground">{r.name}</h3>
                          {isAdmin && (
                            <button
                              onClick={() => setDeletingId(r.id)}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-500"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>ใช้ {r.required_points} แต้ม</span>
                        </div>
                      </div>

                      <button
                        onClick={() => setRedeemingReward(r)}
                        disabled={!canRedeem}
                        className={`w-full py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-1.5 ${
                          canRedeem
                            ? 'bg-amber-500 hover:bg-amber-600 active:scale-95 text-white shadow-amber-500/20'
                            : 'bg-muted text-muted-foreground cursor-not-allowed opacity-60'
                        }`}
                      >
                        <Gift className="w-3.5 h-3.5" />
                        <span>{canRedeem ? t.rewards.redeem : `ขาดอีก ${r.required_points - currentPoints} แต้ม`}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Points History */}
          {history.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-border/60">
              <h2 className="font-bold text-base text-foreground px-1 flex items-center gap-2">
                <History className="w-4 h-4 text-primary" />
                <span>{t.rewards.pointHistory}</span>
              </h2>

              <div className="space-y-2">
                {history.map((tx: any) => {
                  const isGain = tx.points > 0;
                  return (
                    <div
                      key={tx.id}
                      className="p-3.5 rounded-2xl bg-muted/40 border border-border/40 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <p className="font-bold text-foreground truncate">{tx.description}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {formatThaiDate(tx.created_at, { shortMonth: true })}
                          {tx.member_nick && ` • ${tx.member_nick}`}
                        </p>
                      </div>

                      <span
                        className={`font-extrabold text-sm ${
                          isGain ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'
                        }`}
                      >
                        {isGain ? `+${tx.points}` : tx.points} แต้ม
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Reward Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={t.rewards.addReward}
      >
        <form onSubmit={handleCreateReward} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold mb-1">{t.rewards.rewardName} *</label>
            <input
              type="text"
              required
              placeholder="เช่น เลือกเมนูมื้อเย็น, เล่นเกมเพิ่ม 1 ชม., ดูหนัง Netflix"
              value={rewardName}
              onChange={(e) => setRewardName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-bold mb-1">{t.rewards.requiredPoints} *</label>
            <input
              type="number"
              min="1"
              required
              placeholder="100"
              value={requiredPoints}
              onChange={(e) => setRequiredPoints(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
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

      {/* Redeem Confirmation */}
      {redeemingReward && (
        <ConfirmDialog
          isOpen={!!redeemingReward}
          onClose={() => setRedeemingReward(null)}
          onConfirm={handleRedeem}
          title={t.rewards.redeem}
          message={`คุณต้องการใช้ ${redeemingReward.required_points} แต้ม เพื่อแลก "${redeemingReward.name}" ใช่หรือไม่?`}
          confirmText="ยืนยันการแลกรางวัล"
          isDestructive={false}
          isLoading={isSaving}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
