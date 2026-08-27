'use client';

import React, { useRef, useState } from 'react';
import { Camera, Upload, Trash2, Sparkles, Check, Image as ImageIcon } from 'lucide-react';
import { MemberAvatar } from './MemberAvatar';

interface AvatarPickerProps {
  currentAvatarUrl?: string | null;
  name: string;
  color: string;
  onAvatarChange: (url: string | null) => void;
  onColorChange?: (color: string) => void;
  size?: 'md' | 'lg' | 'xl';
}

const EMOJI_PRESETS = [
  '👨', '👩', '👦', '👧', '👴', '👵', 
  '👶', '👱‍♂️', '👱‍♀️', '🐱', '🐶', '🐰', 
  '🐼', '🦁', '🦄', '👑', '🚀', '🌟'
];

const COLOR_PRESETS = [
  '#0284c7', '#ec4899', '#10b981', '#8b5cf6', 
  '#f59e0b', '#06b6d4', '#f43f5e', '#64748b'
];

/**
 * Compresses an image file to a square base64 JPEG data URL
 */
export function compressAvatarImage(file: File, size = 512, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        // Center crop square
        const minDim = Math.min(img.width, img.height);
        const startX = (img.width - minDim) / 2;
        const startY = (img.height - minDim) / 2;

        ctx.drawImage(img, startX, startY, minDim, minDim, 0, 0, size, size);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Generates an SVG Data URL for an Emoji with background color
 */
export function generateEmojiAvatarUrl(emoji: string, bgColor: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="${bgColor}"/><text x="50" y="58" font-size="52" text-anchor="middle" dominant-baseline="middle">${emoji}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function AvatarPicker({
  currentAvatarUrl,
  name,
  color,
  onAvatarChange,
  onColorChange,
  size = 'xl',
}: AvatarPickerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'emoji'>('upload');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      const compressed = await compressAvatarImage(file, 512, 0.85);
      onAvatarChange(compressed);
    } catch (err) {
      console.error('Failed to compress avatar:', err);
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSelectEmoji = (emoji: string) => {
    const emojiUrl = generateEmojiAvatarUrl(emoji, color);
    onAvatarChange(emojiUrl);
  };

  return (
    <div className="space-y-4">
      {/* Avatar Preview */}
      <div className="flex items-center gap-4 p-4 rounded-3xl bg-muted/40 border border-border/80">
        <div className="relative group shrink-0">
          <MemberAvatar
            name={name}
            color={color}
            avatarUrl={currentAvatarUrl}
            size={size}
            className="ring-4 ring-background shadow-md"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute -bottom-1 -right-1 p-2 rounded-full bg-primary text-white shadow-md hover:bg-primary-600 active:scale-95 transition-all"
            title="อัปโหลดรูปภาพ"
          >
            <Camera className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-1 min-w-0">
          <h4 className="font-extrabold text-sm text-foreground truncate">
            {name || 'ชื่อสมาชิก'}
          </h4>
          <p className="text-xs text-muted-foreground">
            {currentAvatarUrl ? 'มีรูปโปรไฟล์แล้ว' : 'ใช้ตัวอักษรย่อตามสีประจำตัว'}
          </p>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="px-3 py-1 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold transition-colors flex items-center gap-1"
            >
              <Upload className="w-3 h-3" />
              <span>{isProcessing ? 'กำลังโหลด...' : 'เลือกรูปภาพ'}</span>
            </button>

            {currentAvatarUrl && (
              <button
                type="button"
                onClick={() => onAvatarChange(null)}
                className="px-2.5 py-1 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold transition-colors flex items-center gap-1"
                title="ลบรูปโปรไฟล์"
              >
                <Trash2 className="w-3 h-3" />
                <span>ลบรูป</span>
              </button>
            )}
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Selector Tabs: Upload or Emoji Presets */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-2 border-b border-border pb-1 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`pb-1 font-bold transition-colors flex items-center gap-1.5 ${
              activeTab === 'upload'
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>สีประจำตัว</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('emoji')}
            className={`pb-1 font-bold transition-colors flex items-center gap-1.5 ${
              activeTab === 'emoji'
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>อิโมจิโปรไฟล์</span>
          </button>
        </div>

        {activeTab === 'upload' && onColorChange && (
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-muted-foreground">
              เลือกสีประจำตัว (สำหรับพื้นหลังและตัวอักษรย่อ)
            </label>
            <div className="flex items-center gap-2 flex-wrap pt-0.5">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    onColorChange(c);
                    // If current avatar is SVG emoji, update its background
                    if (currentAvatarUrl?.startsWith('data:image/svg+xml')) {
                      // find matching emoji if any
                      const decoded = decodeURIComponent(currentAvatarUrl);
                      const match = decoded.match(/dominant-baseline="middle">(.*?)<\/text>/);
                      if (match && match[1]) {
                        onAvatarChange(generateEmojiAvatarUrl(match[1], c));
                      }
                    }
                  }}
                  style={{ backgroundColor: c }}
                  className={`w-7 h-7 rounded-full transition-transform flex items-center justify-center text-white ${
                    color === c ? 'ring-4 ring-primary/30 scale-110' : 'hover:scale-105'
                  }`}
                >
                  {color === c && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </button>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'emoji' && (
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-muted-foreground">
              เลือกตัวละคร / อิโมจิน่ารักๆ
            </label>
            <div className="grid grid-cols-6 gap-2 pt-0.5">
              {EMOJI_PRESETS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleSelectEmoji(emoji)}
                  className="p-2 rounded-2xl bg-muted/50 hover:bg-muted text-xl flex items-center justify-center border border-border/60 hover:scale-105 active:scale-95 transition-all shadow-2xs"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
