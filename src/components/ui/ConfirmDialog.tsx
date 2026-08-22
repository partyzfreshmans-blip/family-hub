'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { useLanguage } from '@/components/LanguageContext';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText,
  isDestructive = true,
  isLoading = false,
}: ConfirmDialogProps) {
  const { t } = useLanguage();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-sm bg-card text-card-foreground rounded-3xl p-6 shadow-2xl border border-border space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold">{title || t.common.deleteConfirmTitle}</h3>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed">
          {message || t.common.deleteConfirmMessage}
        </p>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2.5 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-colors"
          >
            {cancelText || t.common.cancel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-sm transition-all ${
              isDestructive
                ? 'bg-rose-500 hover:bg-rose-600 active:scale-95'
                : 'bg-primary hover:bg-primary-600 active:scale-95'
            }`}
          >
            {isLoading ? t.common.saving : confirmText || t.common.confirm}
          </button>
        </div>
      </div>
    </div>
  );
}
