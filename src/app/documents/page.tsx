'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  FolderOpen,
  Plus,
  Search,
  FileText,
  Home,
  Car,
  User,
  DollarSign,
  AlertTriangle,
  Calendar,
  Shield,
  Eye,
  Trash2,
  Edit2,
  Copy,
  ExternalLink,
  Download,
  CheckCircle2,
  Clock,
  Lock,
  Users,
  Upload,
  X,
  File,
  Sparkles,
  Loader2,
  Filter,
  Check,
  LayoutGrid,
  List,
  ShieldCheck,
  Camera,
  ArrowRight,
  Maximize2,
  Layers,
  ArrowUpDown,
  Tag,
} from 'lucide-react';
import { useLanguage } from '@/components/LanguageContext';
import { useAuth } from '@/components/AuthContext';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { MemberAvatar } from '@/components/ui/MemberAvatar';
import { EmptyState, LoadingSkeleton } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { FamilyDocument, DocumentCategory, DocumentPrivacyLevel, FamilyMember } from '@/types';

const CATEGORY_INFO: Record<
  DocumentCategory,
  { label: string; icon: any; color: string; bg: string; border: string; glow: string; presets: string[] }
> = {
  HOUSE: {
    label: 'บ้าน & ที่อยู่อาศัย',
    icon: Home,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10 dark:bg-amber-500/15',
    border: 'border-amber-500/30',
    glow: 'hover:border-amber-500/60 hover:shadow-amber-500/10',
    presets: ['สำเนาทะเบียนบ้าน', 'โฉนดที่ดิน', 'สัญญาซื้อขาย/เช่า', 'ประกันอัคคีภัย', 'ใบรับประกันเครื่องใช้'],
  },
  VEHICLE: {
    label: 'รถยนต์ & ยานพาหนะ',
    icon: Car,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10 dark:bg-blue-500/15',
    border: 'border-blue-500/30',
    glow: 'hover:border-blue-500/60 hover:shadow-blue-500/10',
    presets: ['เล่มทะเบียนรถ (เล่มฟ้า/เขียว)', 'พ.ร.บ. / ป้ายภาษีรถยนต์', 'ประกันภัยรถยนต์ (ชั้น 1/2/3)', 'ใบขับขี่', 'สมุดเช็คระยะ'],
  },
  PERSONAL: {
    label: 'เอกสารส่วนตัว & สมาชิก',
    icon: User,
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
    border: 'border-emerald-500/30',
    glow: 'hover:border-emerald-500/60 hover:shadow-emerald-500/10',
    presets: ['บัตรประชาชน', 'สูติบัตร', 'หนังสือเดินทาง (Passport)', 'ทะเบียนสมรส', 'ประกันสุขภาพ/ชีวิต', 'วุฒิการศึกษา', 'ประวัติฉีดวัคซีน'],
  },
  FINANCE: {
    label: 'การเงิน & สัญญา',
    icon: DollarSign,
    color: 'text-violet-500',
    bg: 'bg-violet-500/10 dark:bg-violet-500/15',
    border: 'border-violet-500/30',
    glow: 'hover:border-violet-500/60 hover:shadow-violet-500/10',
    presets: ['สัญญากู้ยืม / สินเชื่อบ้าน', 'กรมธรรม์ประกันสะสมทรัพย์', 'สมุดบัญชีธนาคาร', 'เอกสารภาษี', 'พินัยกรรม'],
  },
  OTHER: {
    label: 'อื่นๆ',
    icon: FolderOpen,
    color: 'text-rose-500',
    bg: 'bg-rose-500/10 dark:bg-rose-500/15',
    border: 'border-rose-500/30',
    glow: 'hover:border-rose-500/60 hover:shadow-rose-500/10',
    presets: ['เอกสารสัตว์เลี้ยง', 'ใบเสร็จชิ้นใหญ่', 'คู่มือการใช้งาน'],
  },
};

export default function DocumentsPage() {
  const { t } = useLanguage();
  const { member, family } = useAuth();
  const quickFileInputRef = useRef<HTMLInputElement>(null);

  const [documents, setDocuments] = useState<FamilyDocument[]>([]);
  const [alertDocs, setAlertDocs] = useState<FamilyDocument[]>([]);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters & Views
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [selectedOwner, setSelectedOwner] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'updated' | 'expiry' | 'title'>('updated');

  // Modal States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<FamilyDocument | null>(null);
  const [previewDoc, setPreviewDoc] = useState<FamilyDocument | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form Fields
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState<DocumentCategory>('HOUSE');
  const [formSubCategory, setFormSubCategory] = useState('');
  const [formDocNumber, setFormDocNumber] = useState('');
  const [formIssuer, setFormIssuer] = useState('');
  const [formOwnerMemberId, setFormOwnerMemberId] = useState<string>('');
  const [formPrivacy, setFormPrivacy] = useState<DocumentPrivacyLevel>('FAMILY');
  const [formIssueDate, setFormIssueDate] = useState('');
  const [formExpiryDate, setFormExpiryDate] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formFileUrl, setFormFileUrl] = useState<string | null>(null);
  const [formFileName, setFormFileName] = useState<string | null>(null);
  const [formFileType, setFormFileType] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [copiedDocId, setCopiedDocId] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const fetchDocuments = useCallback(async () => {
    try {
      const [docsRes, memRes] = await Promise.all([
        fetch('/api/documents'),
        fetch('/api/families/members'),
      ]);

      if (docsRes.ok) {
        const data = await docsRes.json();
        setDocuments(data.documents || []);
        setAlertDocs(data.alertDocs || []);
        setCategoryCounts(data.categoryCounts || {});
      }

      if (memRes.ok) {
        const memData = await memRes.json();
        setFamilyMembers(memData.members || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Open Form for Adding
  const handleOpenAdd = (presetTitle?: string, presetCategory?: DocumentCategory) => {
    setEditingDoc(null);
    setFormTitle(presetTitle || '');
    setFormCategory(presetCategory || (activeCategory !== 'ALL' ? (activeCategory as DocumentCategory) : 'HOUSE'));
    setFormSubCategory('');
    setFormDocNumber('');
    setFormIssuer('');
    setFormOwnerMemberId('');
    setFormPrivacy('FAMILY');
    setFormIssueDate('');
    setFormExpiryDate('');
    setFormNotes('');
    setFormFileUrl(null);
    setFormFileName(null);
    setFormFileType(null);
    setFormError(null);
    setIsFormOpen(true);
  };

  // Open Form for Editing
  const handleOpenEdit = (doc: FamilyDocument) => {
    setEditingDoc(doc);
    setFormTitle(doc.title);
    setFormCategory(doc.category);
    setFormSubCategory(doc.sub_category || '');
    setFormDocNumber(doc.document_number || '');
    setFormIssuer(doc.issuer || '');
    setFormOwnerMemberId(doc.owner_member_id || '');
    setFormPrivacy(doc.privacy_level);
    setFormIssueDate(doc.issue_date || '');
    setFormExpiryDate(doc.expiry_date || '');
    setFormNotes(doc.notes || '');
    setFormFileUrl(doc.file_url || null);
    setFormFileName(doc.file_name || null);
    setFormFileType(doc.file_type || null);
    setFormError(null);
    setIsFormOpen(true);
  };

  // Handle Quick Scan Upload from Header
  const handleQuickUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      alert('ขนาดไฟล์ต้องไม่เกิน 8MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setEditingDoc(null);
      setFormTitle(file.name.replace(/\.[^/.]+$/, ''));
      setFormCategory(activeCategory !== 'ALL' ? (activeCategory as DocumentCategory) : 'HOUSE');
      setFormSubCategory('');
      setFormDocNumber('');
      setFormIssuer('');
      setFormOwnerMemberId('');
      setFormPrivacy('FAMILY');
      setFormIssueDate('');
      setFormExpiryDate('');
      setFormNotes('');
      setFormFileUrl(reader.result as string);
      setFormFileName(file.name);
      setFormFileType(file.type);
      setFormError(null);
      setIsFormOpen(true);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Handle File / Scan Upload inside Form
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      setFormError('ขนาดไฟล์ต้องไม่เกิน 8MB');
      return;
    }

    setFormFileName(file.name);
    setFormFileType(file.type);

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setFormFileUrl(result);
    };
    reader.readAsDataURL(file);
  };

  // Submit Add / Edit
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setFormError('กรุณาระบุชื่อเอกสาร');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    const payload = {
      title: formTitle.trim(),
      category: formCategory,
      sub_category: formSubCategory.trim() || null,
      document_number: formDocNumber.trim() || null,
      issuer: formIssuer.trim() || null,
      owner_member_id: formOwnerMemberId || null,
      privacy_level: formPrivacy,
      issue_date: formIssueDate || null,
      expiry_date: formExpiryDate || null,
      file_url: formFileUrl,
      file_name: formFileName,
      file_type: formFileType,
      notes: formNotes.trim() || null,
    };

    try {
      let res;
      if (editingDoc) {
        res = await fetch('/api/documents', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingDoc.id, ...payload }),
        });
      } else {
        res = await fetch('/api/documents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save document');
      }

      setIsFormOpen(false);
      await fetchDocuments();
      showToast(editingDoc ? 'บันทึกการแก้ไขเอกสารเรียบร้อยแล้ว' : 'เพิ่มเอกสารสำคัญเรียบร้อยแล้ว');
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Document
  const handleConfirmDelete = async () => {
    if (!deleteTargetId) return;

    try {
      const res = await fetch(`/api/documents?id=${deleteTargetId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await fetchDocuments();
        showToast('ลบเอกสารเรียบร้อยแล้ว');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDeleteTargetId(null);
    }
  };

  // Copy Document Number
  const handleCopyDocNumber = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedDocId(id);
    showToast(`คัดลอก "${text}" เรียบร้อยแล้ว`);
    setTimeout(() => setCopiedDocId(null), 2000);
  };

  // Filtered and Sorted documents list
  const filteredDocuments = useMemo(() => {
    const list = documents.filter((doc) => {
      // Category filter
      if (activeCategory !== 'ALL' && doc.category !== activeCategory) {
        return false;
      }
      // Owner filter
      if (selectedOwner !== 'ALL') {
        if (selectedOwner === 'SHARED' && doc.owner_member_id) return false;
        if (selectedOwner !== 'SHARED' && doc.owner_member_id !== selectedOwner) return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = doc.title.toLowerCase().includes(q);
        const matchNum = (doc.document_number || '').toLowerCase().includes(q);
        const matchIssuer = (doc.issuer || '').toLowerCase().includes(q);
        const matchNotes = (doc.notes || '').toLowerCase().includes(q);
        const matchSub = (doc.sub_category || '').toLowerCase().includes(q);
        const matchOwner = (doc.owner_nick || '').toLowerCase().includes(q);
        return matchTitle || matchNum || matchIssuer || matchNotes || matchSub || matchOwner;
      }
      return true;
    });

    return list.sort((a, b) => {
      if (sortBy === 'expiry') {
        if (!a.expiry_date) return 1;
        if (!b.expiry_date) return -1;
        return a.expiry_date.localeCompare(b.expiry_date);
      }
      if (sortBy === 'title') {
        return a.title.localeCompare(b.title);
      }
      return (b.updated_at || b.created_at || '').localeCompare(a.updated_at || a.created_at || '');
    });
  }, [documents, activeCategory, selectedOwner, searchQuery, sortBy]);

  // Overall Stats
  const totalCount = documents.length;
  const assetCount = (categoryCounts.HOUSE || 0) + (categoryCounts.VEHICLE || 0);
  const personalCount = categoryCounts.PERSONAL || 0;
  const alertCount = alertDocs.length;

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl bg-foreground text-background font-bold text-xs shadow-2xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Hidden Quick Upload Input */}
      <input
        ref={quickFileInputRef}
        type="file"
        accept="image/*,application/pdf"
        onChange={handleQuickUpload}
        className="hidden"
      />

      {/* 1. HERO VAULT BANNER (Modern Apple/Fintech Aesthetic) */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-card via-card to-primary/5 border border-border shadow-soft p-6 sm:p-8">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-10 w-48 h-48 rounded-full bg-blue-500/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-extrabold shadow-2xs">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Family Vault &bull; ปลอดภัยและเป็นส่วนตัว</span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground">
              {t.documents.title}
            </h1>

            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              จัดเก็บ ค้นหาเลขที่ และแจ้งเตือนวันหมดอายุ (พ.ร.บ., ภาษี, ประกัน, บัตรประชาชน) สำหรับทุกคนในครอบครัว
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => quickFileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-card hover:bg-muted border border-border text-foreground font-extrabold text-xs shadow-xs transition-all active:scale-95"
              title="อัปโหลดหรือถ่ายรูปเอกสารทันที"
            >
              <Camera className="w-4 h-4 text-primary" />
              <span>สแกน / อัปโหลด</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenAdd()}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-primary hover:bg-primary-600 text-white font-extrabold text-xs shadow-md transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>{t.documents.addDoc}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. BENTO OVERVIEW METRICS (4 Metric Tiles) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-3xl bg-card border border-border/80 shadow-soft flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-extrabold shrink-0 shadow-2xs">
            <FolderOpen className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">เอกสารทั้งหมด</p>
            <h3 className="text-xl sm:text-2xl font-extrabold text-foreground">{totalCount}</h3>
          </div>
        </div>

        <div
          onClick={() => {
            if (alertCount > 0) {
              const el = document.getElementById('expiry-radar-section');
              el?.scrollIntoView({ behavior: 'smooth' });
            }
          }}
          className={`p-4 rounded-3xl bg-card border shadow-soft flex items-center gap-3.5 transition-all cursor-pointer ${
            alertCount > 0 ? 'border-amber-500/40 hover:border-amber-500' : 'border-border/80'
          }`}
        >
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center font-extrabold shrink-0 shadow-2xs ${
              alertCount > 0 ? 'bg-amber-500/15 text-amber-500 animate-pulse' : 'bg-emerald-500/10 text-emerald-500'
            }`}
          >
            {alertCount > 0 ? <AlertTriangle className="w-6 h-6" /> : <ShieldCheck className="w-6 h-6" />}
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">เตือนต่ออายุ</p>
            <h3 className={`text-xl sm:text-2xl font-extrabold ${alertCount > 0 ? 'text-amber-500' : 'text-foreground'}`}>
              {alertCount > 0 ? `${alertCount} รายการ` : 'ปกติ'}
            </h3>
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-card border border-border/80 shadow-soft flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center font-extrabold shrink-0 shadow-2xs">
            <Car className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">บ้าน & ยานพาหนะ</p>
            <h3 className="text-xl sm:text-2xl font-extrabold text-foreground">{assetCount}</h3>
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-card border border-border/80 shadow-soft flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-extrabold shrink-0 shadow-2xs">
            <User className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">เอกสารส่วนตัว</p>
            <h3 className="text-xl sm:text-2xl font-extrabold text-foreground">{personalCount}</h3>
          </div>
        </div>
      </div>

      {/* 3. EXPIRY RADAR ALERT BANNER (If any documents expiring soon or expired) */}
      {alertDocs.length > 0 && (
        <div id="expiry-radar-section" className="p-5 rounded-3xl bg-gradient-to-r from-amber-500/15 via-rose-500/10 to-amber-500/15 border border-amber-500/30 text-foreground space-y-4 shadow-soft">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-amber-500/20">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-amber-500 text-white shadow-xs">
                <AlertTriangle className="w-4 h-4" />
              </span>
              <div>
                <h3 className="font-extrabold text-sm sm:text-base text-foreground flex items-center gap-2">
                  <span>{t.documents.expiringAlert}</span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[11px] font-black">
                    {alertDocs.length}
                  </span>
                </h3>
                <p className="text-xs text-muted-foreground">เอกสารสำคัญที่ใกล้ถึงกำหนด หรือหมดอายุแล้ว</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {alertDocs.map((doc) => {
              const isExpired = doc.expiry_status === 'EXPIRED';
              return (
                <div
                  key={doc.id}
                  onClick={() => handleOpenEdit(doc)}
                  className="p-3.5 rounded-2xl bg-card/90 backdrop-blur-md border border-border/80 shadow-2xs hover:border-primary/50 cursor-pointer transition-all flex flex-col justify-between gap-2 group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-extrabold text-xs sm:text-sm text-foreground truncate group-hover:text-primary transition-colors">
                        {doc.title}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                        {doc.owner_nick ? `ของ ${doc.owner_nick}` : 'ส่วนกลาง'} {doc.document_number ? `(${doc.document_number})` : ''}
                      </p>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-xl text-[10px] font-extrabold shrink-0 ${
                        isExpired
                          ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                          : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      {isExpired ? 'หมดอายุแล้ว' : `อีก ${doc.days_until_expiry} วัน`}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/50">
                    <span className="flex items-center gap-1 font-mono">
                      <Calendar className="w-3 h-3 text-amber-500" />
                      <span>{doc.expiry_date}</span>
                    </span>
                    <span className="text-primary font-bold text-[10px] group-hover:underline">แตะเพื่อดู/แก้ไข &rarr;</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. INTERACTIVE 3D CATEGORY FOLDERS GRID (6 Tiles) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-primary" />
            <span>หมวดหมู่เอกสาร</span>
          </h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {/* ALL FOLDER */}
          <button
            type="button"
            onClick={() => setActiveCategory('ALL')}
            className={`p-3.5 rounded-3xl border text-left transition-all flex flex-col justify-between gap-3 shadow-soft group ${
              activeCategory === 'ALL'
                ? 'bg-card border-primary ring-2 ring-primary/30 shadow-md'
                : 'bg-card/70 hover:bg-card border-border hover:border-primary/40'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className={`w-9 h-9 rounded-2xl flex items-center justify-center font-extrabold ${
                activeCategory === 'ALL' ? 'bg-primary text-white shadow-xs' : 'bg-muted text-muted-foreground group-hover:text-primary'
              }`}>
                <FolderOpen className="w-4 h-4" />
              </div>
              <span className="text-xs font-black px-2 py-0.5 rounded-full bg-muted text-foreground">
                {categoryCounts.ALL || 0}
              </span>
            </div>
            <div>
              <p className="font-extrabold text-xs text-foreground truncate">ทุกหมวดหมู่</p>
              <p className="text-[10px] text-muted-foreground truncate">เอกสารทั้งหมด</p>
            </div>
          </button>

          {/* 5 Specific Folders */}
          {(['HOUSE', 'VEHICLE', 'PERSONAL', 'FINANCE', 'OTHER'] as DocumentCategory[]).map((cat) => {
            const info = CATEGORY_INFO[cat];
            const Icon = info.icon;
            const isSelected = activeCategory === cat;
            const count = categoryCounts[cat] || 0;

            return (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`p-3.5 rounded-3xl border text-left transition-all flex flex-col justify-between gap-3 shadow-soft group ${
                  isSelected
                    ? `bg-card border-primary ring-2 ring-primary/30 shadow-md`
                    : `bg-card/70 hover:bg-card border-border ${info.glow}`
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className={`w-9 h-9 rounded-2xl flex items-center justify-center font-extrabold ${
                    isSelected ? 'bg-primary text-white shadow-xs' : `${info.bg} ${info.color}`
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-black px-2 py-0.5 rounded-full bg-muted text-foreground">
                    {count}
                  </span>
                </div>
                <div>
                  <p className="font-extrabold text-xs text-foreground truncate">{info.label.split(' ')[0]}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{info.label.split('&')[1] || info.label}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. SEARCH & FILTER CONTROLS BAR */}
      <div className="p-4 rounded-3xl bg-card border border-border/80 shadow-soft flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Bar */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาชื่อเอกสาร, เลขที่, ทะเบียนรถ, กรมธรรม์, ผู้ออก..."
            className="w-full pl-10 pr-9 py-2.5 rounded-2xl border border-border bg-background text-xs sm:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary shadow-2xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Dropdowns & View Switcher */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Owner Filter */}
          <select
            value={selectedOwner}
            onChange={(e) => setSelectedOwner(e.target.value)}
            className="px-3.5 py-2.5 rounded-2xl border border-border bg-background text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary shadow-2xs text-foreground"
          >
            <option value="ALL">👤 เจ้าของ: ทั้งหมด</option>
            <option value="SHARED">🏠 ส่วนกลางของบ้าน</option>
            {familyMembers.map((m) => (
              <option key={m.id} value={m.id}>
                👤 {m.nickname} ({m.role})
              </option>
            ))}
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3.5 py-2.5 rounded-2xl border border-border bg-background text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary shadow-2xs text-foreground"
          >
            <option value="updated">⏰ อัปเดตล่าสุด</option>
            <option value="expiry">⚠️ วันหมดอายุ</option>
            <option value="title">🔤 ตามชื่อ ก-ฮ</option>
          </select>

          {/* View Mode Toggle (Grid / List) */}
          <div className="flex items-center p-1 rounded-2xl bg-muted/60 border border-border/80">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-xl transition-all ${
                viewMode === 'grid' ? 'bg-card text-primary shadow-xs' : 'text-muted-foreground hover:text-foreground'
              }`}
              title="มุมมองแบบการ์ด"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-xl transition-all ${
                viewMode === 'list' ? 'bg-card text-primary shadow-xs' : 'text-muted-foreground hover:text-foreground'
              }`}
              title="มุมมองแบบตาราง/รายการ"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 6. DOCUMENTS CONTENT (GRID / LIST / EMPTY PRESETS) */}
      {isLoading ? (
        <LoadingSkeleton count={3} height="h-40" />
      ) : filteredDocuments.length === 0 ? (
        <div className="p-8 sm:p-12 rounded-3xl bg-card border border-border/80 shadow-soft text-center space-y-6">
          <div className="w-16 h-16 rounded-3xl bg-primary/10 text-primary flex items-center justify-center mx-auto shadow-xs">
            <FolderOpen className="w-8 h-8" />
          </div>

          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="font-extrabold text-base sm:text-lg text-foreground">
              {searchQuery ? 'ไม่พบเอกสารที่ตรงกับคำค้นหา' : t.documents.emptyTitle}
            </h3>
            <p className="text-xs text-muted-foreground">
              {searchQuery ? 'ลองค้นหาด้วยคำอื่น หรือเลือกหมวดหมู่อื่น' : 'เริ่มต้นบันทึกเอกสารสำคัญของบ้าน รถ หรือสมาชิกในครอบครัว'}
            </p>
          </div>

          {/* Recommended Starter Presets */}
          <div className="pt-4 border-t border-border/60 max-w-lg mx-auto space-y-3">
            <p className="text-xs font-bold text-foreground flex items-center justify-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>เอกสารสำคัญที่แนะนำให้บันทึกไว้ในบ้าน:</span>
            </p>

            <div className="flex flex-wrap items-center justify-center gap-2">
              {[
                { title: 'สำเนาทะเบียนบ้าน', cat: 'HOUSE' as DocumentCategory },
                { title: 'โฉนดที่ดิน', cat: 'HOUSE' as DocumentCategory },
                { title: 'เล่มทะเบียนรถ', cat: 'VEHICLE' as DocumentCategory },
                { title: 'พ.ร.บ. / ภาษีรถยนต์', cat: 'VEHICLE' as DocumentCategory },
                { title: 'บัตรประชาชน', cat: 'PERSONAL' as DocumentCategory },
                { title: 'หนังสือเดินทาง (Passport)', cat: 'PERSONAL' as DocumentCategory },
                { title: 'กรมธรรม์ประกันภัย/สุขภาพ', cat: 'FINANCE' as DocumentCategory },
              ].map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleOpenAdd(preset.title, preset.cat)}
                  className="px-3.5 py-2 rounded-2xl bg-muted/60 hover:bg-primary hover:text-white border border-border/80 text-xs font-extrabold transition-all shadow-2xs active:scale-95"
                >
                  + {preset.title}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocuments.map((doc) => {
            const catInfo = CATEGORY_INFO[doc.category] || CATEGORY_INFO.OTHER;
            const CategoryIcon = catInfo.icon;
            const isExpiringSoon = doc.expiry_status === 'EXPIRING_SOON';
            const isExpired = doc.expiry_status === 'EXPIRED';

            return (
              <div
                key={doc.id}
                className="bg-card text-card-foreground rounded-3xl border border-border/80 shadow-soft hover:shadow-md hover:border-primary/50 transition-all flex flex-col justify-between group relative overflow-hidden"
              >
                {/* Expiry status accent bar */}
                {isExpired && <div className="absolute top-0 left-0 right-0 h-1.5 bg-rose-500 z-10" />}
                {isExpiringSoon && <div className="absolute top-0 left-0 right-0 h-1.5 bg-amber-500 z-10" />}

                {/* Scan Image Header (if attachment exists) */}
                {doc.file_url && doc.file_type?.startsWith('image/') && (
                  <div
                    onClick={() => setPreviewDoc(doc)}
                    className="relative w-full h-36 bg-muted/40 overflow-hidden cursor-pointer group/img border-b border-border/60"
                    title="แตะเพื่อดูภาพสแกนเต็ม"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={doc.file_url}
                      alt={doc.title}
                      className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity flex items-end p-3 text-white">
                      <span className="text-xs font-bold flex items-center gap-1.5">
                        <Maximize2 className="w-3.5 h-3.5" /> แตะเพื่อซูมดูภาพ
                      </span>
                    </div>
                  </div>
                )}

                <div className="p-5 space-y-3.5 flex-1 flex flex-col justify-between">
                  <div className="space-y-3">
                    {/* Category & Privacy & Owner Pills */}
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-extrabold border ${catInfo.bg} ${catInfo.border} ${catInfo.color}`}
                      >
                        <CategoryIcon className="w-3.5 h-3.5" />
                        <span>{t.documents.categories[doc.category]}</span>
                      </span>

                      <div className="flex items-center gap-1.5">
                        {doc.privacy_level === 'PRIVATE' ? (
                          <span
                            className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400"
                            title="ส่วนตัวเฉพาะฉัน"
                          >
                            <Lock className="w-3.5 h-3.5" />
                          </span>
                        ) : doc.privacy_level === 'ADULTS' ? (
                          <span
                            className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400"
                            title="เฉพาะผู้ใหญ่ & แอดมิน"
                          >
                            <Shield className="w-3.5 h-3.5" />
                          </span>
                        ) : null}

                        {/* Owner Badge */}
                        {doc.owner_nick ? (
                          <span
                            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-muted text-[11px] font-bold text-foreground"
                            style={{
                              borderLeft: `3px solid ${doc.owner_color || '#0284c7'}`,
                            }}
                          >
                            <span>{doc.owner_nick}</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-xl bg-muted/60 text-[10px] font-bold text-muted-foreground">
                            ส่วนกลาง
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Title & Subcategory */}
                    <div>
                      <h4 className="font-extrabold text-base text-foreground group-hover:text-primary transition-colors leading-tight">
                        {doc.title}
                      </h4>
                      {doc.sub_category && (
                        <p className="text-xs text-muted-foreground mt-0.5">{doc.sub_category}</p>
                      )}
                    </div>

                    {/* Document Number / License Plate Badge with 1-Click Copy */}
                    {doc.document_number && (
                      <div className="flex items-center justify-between p-2.5 rounded-2xl bg-muted/40 border border-border/80">
                        <div className="min-w-0 pr-2">
                          <p className="text-[10px] text-muted-foreground font-bold uppercase">เลขที่ / ทะเบียน</p>
                          <p className="font-mono font-extrabold text-xs text-foreground truncate">
                            {doc.document_number}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyDocNumber(doc.id, doc.document_number!)}
                          className="p-2 rounded-xl bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-all shadow-2xs shrink-0"
                          title="คัดลอกเลขที่เอกสาร"
                        >
                          {copiedDocId === doc.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    )}

                    {/* Issuer & Expiry Timeline */}
                    <div className="space-y-1.5 text-xs text-muted-foreground pt-1">
                      {doc.issuer && (
                        <p className="truncate">
                          <span className="font-semibold text-foreground">ผู้ออก: </span>
                          <span>{doc.issuer}</span>
                        </p>
                      )}

                      {doc.expiry_date && (
                        <div className="flex items-center justify-between pt-1">
                          <span className="font-semibold text-foreground flex items-center gap-1 text-[11px]">
                            <Calendar className="w-3 h-3 text-primary" />
                            <span>วันหมดอายุ:</span>
                          </span>
                          <span
                            className={`font-black px-2.5 py-0.5 rounded-xl text-[10px] ${
                              isExpired
                                ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 font-black'
                                : isExpiringSoon
                                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 font-black'
                                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            }`}
                          >
                            {doc.expiry_date}
                            {isExpiringSoon && ` (อีก ${doc.days_until_expiry} วัน)`}
                            {isExpired && ' (หมดอายุแล้ว)'}
                          </span>
                        </div>
                      )}

                      {doc.notes && (
                        <p className="text-[11px] text-muted-foreground italic line-clamp-2 pt-1 border-t border-border/40">
                          &quot;{doc.notes}&quot;
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Bottom Actions Row */}
                  <div className="pt-3 mt-3 border-t border-border/60 flex items-center justify-between gap-2">
                    {doc.file_url ? (
                      <button
                        type="button"
                        onClick={() => setPreviewDoc(doc)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-xs font-extrabold transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>ดูเอกสาร</span>
                      </button>
                    ) : (
                      <span className="text-[11px] text-muted-foreground/60 italic">ไม่มีไฟล์แนบ</span>
                    )}

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(doc)}
                        className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        title={t.common.edit}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeleteTargetId(doc.id)}
                        className="p-2 rounded-xl text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                        title={t.common.delete}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* LIST VIEW */
        <div className="rounded-3xl bg-card border border-border/80 shadow-soft overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 border-b border-border text-muted-foreground font-extrabold uppercase">
                <tr>
                  <th className="p-4">เอกสาร</th>
                  <th className="p-4">หมวดหมู่</th>
                  <th className="p-4">เลขที่ / ทะเบียน</th>
                  <th className="p-4">เจ้าของ</th>
                  <th className="p-4">วันหมดอายุ</th>
                  <th className="p-4 text-right">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 font-medium">
                {filteredDocuments.map((doc) => {
                  const catInfo = CATEGORY_INFO[doc.category] || CATEGORY_INFO.OTHER;
                  const CategoryIcon = catInfo.icon;
                  const isExpiringSoon = doc.expiry_status === 'EXPIRING_SOON';
                  const isExpired = doc.expiry_status === 'EXPIRED';

                  return (
                    <tr key={doc.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          {doc.file_url ? (
                            <div
                              onClick={() => setPreviewDoc(doc)}
                              className="w-10 h-10 rounded-xl overflow-hidden bg-muted border border-border shrink-0 cursor-pointer"
                              title="ดูเอกสาร"
                            >
                              {doc.file_type?.startsWith('image/') ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={doc.file_url} alt={doc.title} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-primary">
                                  <File className="w-5 h-5" />
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${catInfo.bg} ${catInfo.color}`}>
                              <CategoryIcon className="w-5 h-5" />
                            </div>
                          )}

                          <div className="min-w-0">
                            <p className="font-extrabold text-foreground text-sm truncate">{doc.title}</p>
                            {doc.sub_category && <p className="text-[11px] text-muted-foreground truncate">{doc.sub_category}</p>}
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-bold border ${catInfo.bg} ${catInfo.border} ${catInfo.color}`}>
                          <CategoryIcon className="w-3 h-3" />
                          <span>{t.documents.categories[doc.category]}</span>
                        </span>
                      </td>

                      <td className="p-4">
                        {doc.document_number ? (
                          <div className="flex items-center gap-1.5 font-mono font-bold text-foreground">
                            <span>{doc.document_number}</span>
                            <button
                              type="button"
                              onClick={() => handleCopyDocNumber(doc.id, doc.document_number!)}
                              className="p-1 rounded-md hover:bg-muted text-muted-foreground"
                              title="คัดลอก"
                            >
                              {copiedDocId === doc.id ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>
                        ) : (
                          <span className="text-muted-foreground/50">-</span>
                        )}
                      </td>

                      <td className="p-4">
                        {doc.owner_nick ? (
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded-lg bg-muted text-[11px] font-bold text-foreground"
                            style={{ borderLeft: `3px solid ${doc.owner_color || '#0284c7'}` }}
                          >
                            {doc.owner_nick}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-[11px]">ส่วนกลาง</span>
                        )}
                      </td>

                      <td className="p-4">
                        {doc.expiry_date ? (
                          <span
                            className={`px-2 py-0.5 rounded-lg text-[11px] font-bold ${
                              isExpired
                                ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 font-extrabold'
                                : isExpiringSoon
                                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 font-extrabold'
                                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            }`}
                          >
                            {doc.expiry_date}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/50">-</span>
                        )}
                      </td>

                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {doc.file_url && (
                            <button
                              type="button"
                              onClick={() => setPreviewDoc(doc)}
                              className="p-2 rounded-xl text-primary hover:bg-primary/10"
                              title="ดูเอกสาร"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(doc)}
                            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted"
                            title="แก้ไข"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTargetId(doc.id)}
                            className="p-2 rounded-xl text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10"
                            title="ลบ"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Document Modal */}
      {isFormOpen && (
        <Modal
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          title={editingDoc ? t.documents.editDoc : t.documents.addDoc}
          maxWidth="lg"
        >
          <form onSubmit={handleSubmitForm} className="space-y-4">
            {formError && (
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs font-bold">
                {formError}
              </div>
            )}

            {/* Category Selection */}
            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5">
                {t.documents.docCategory} *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {(['HOUSE', 'VEHICLE', 'PERSONAL', 'FINANCE', 'OTHER'] as DocumentCategory[]).map((cat) => {
                  const info = CATEGORY_INFO[cat];
                  const Icon = info.icon;
                  const isSelected = formCategory === cat;

                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setFormCategory(cat)}
                      className={`p-3 rounded-2xl border text-left flex items-center gap-2.5 transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/10 ring-2 ring-primary/30 font-bold'
                          : 'border-border bg-card hover:bg-muted'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                      <span className="text-xs">{t.documents.categories[cat]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Presets based on selected Category */}
            <div>
              <p className="text-[11px] font-bold text-muted-foreground mb-1.5 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span>คำแนะนำเอกสารที่พบบ่อย (แตะเพื่อใส่ชื่ออัตโนมัติ):</span>
              </p>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORY_INFO[formCategory].presets.map((preset, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setFormTitle(preset)}
                    className="px-2.5 py-1 rounded-xl bg-muted/60 hover:bg-muted text-foreground text-[11px] font-semibold border border-border/50 transition-all active:scale-95"
                  >
                    + {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Document Title & Subcategory */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">
                  {t.documents.docTitle} *
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น ทะเบียนรถ Honda Civic, โฉนดที่ดินเชียงใหม่"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-border bg-background text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">
                  {t.documents.docSubCategory}
                </label>
                <input
                  type="text"
                  placeholder="เช่น พ.ร.บ. ปี 2569, ประกันชั้น 1 ซ่อมห้าง"
                  value={formSubCategory}
                  onChange={(e) => setFormSubCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            {/* Document Number & Issuer */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">
                  {t.documents.docNumber}
                </label>
                <input
                  type="text"
                  placeholder="เช่น 1กข-9999 กทม., POL-2026-888"
                  value={formDocNumber}
                  onChange={(e) => setFormDocNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">
                  {t.documents.docIssuer}
                </label>
                <input
                  type="text"
                  placeholder="เช่น กรมการขนส่ง, วิริยะประกันภัย, AIA"
                  value={formIssuer}
                  onChange={(e) => setFormIssuer(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            {/* Owner & Privacy Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">
                  {t.documents.docOwner}
                </label>
                <select
                  value={formOwnerMemberId}
                  onChange={(e) => setFormOwnerMemberId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-border bg-background text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">🏠 {t.documents.familyShared}</option>
                  {familyMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      👤 {m.nickname} ({m.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">
                  {t.documents.privacy}
                </label>
                <select
                  value={formPrivacy}
                  onChange={(e) => setFormPrivacy(e.target.value as DocumentPrivacyLevel)}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-border bg-background text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="FAMILY">👨‍👩‍👧‍👦 {t.documents.privacyLevels.FAMILY}</option>
                  <option value="ADULTS">🔒 {t.documents.privacyLevels.ADULTS}</option>
                  <option value="PRIVATE">🔐 {t.documents.privacyLevels.PRIVATE}</option>
                </select>
              </div>
            </div>

            {/* Issue Date & Expiry Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">
                  {t.documents.issueDate}
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-primary absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="date"
                    value={formIssueDate}
                    onChange={(e) => setFormIssueDate(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl border border-border bg-background text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5 flex items-center justify-between">
                  <span>{t.documents.expiryDate} (เตือนต่ออายุ)</span>
                  {formExpiryDate && (
                    <button
                      type="button"
                      onClick={() => setFormExpiryDate('')}
                      className="text-[10px] text-rose-500 font-bold hover:underline"
                    >
                      ลบวันหมดอายุ
                    </button>
                  )}
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-amber-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="date"
                    value={formExpiryDate}
                    onChange={(e) => setFormExpiryDate(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl border border-border bg-background text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            </div>

            {/* File Attachment / Scan Upload */}
            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5">
                {t.documents.uploadFile}
              </label>

              {formFileUrl ? (
                <div className="p-3.5 rounded-2xl bg-muted/50 border border-border flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {formFileType?.startsWith('image/') ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={formFileUrl}
                        alt="Document Preview"
                        className="w-12 h-12 rounded-xl object-cover border border-border shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                        <File className="w-6 h-6" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-bold text-xs text-foreground truncate">{formFileName || 'ไฟล์แนบ'}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{formFileType || 'เอกสาร'}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setFormFileUrl(null);
                      setFormFileName(null);
                      setFormFileType(null);
                    }}
                    className="p-2 rounded-xl text-rose-500 hover:bg-rose-500/10 transition-colors"
                    title={t.documents.removeFile}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="border-2 border-dashed border-border hover:border-primary/60 rounded-3xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer bg-card hover:bg-muted/30 transition-all text-center group">
                  <Upload className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
                  <div>
                    <p className="text-xs font-bold text-foreground">แตะเพื่อถ่ายรูป หรือเลือกไฟล์เอกสาร (PDF, JPG, PNG)</p>
                    <p className="text-[10px] text-muted-foreground">ขนาดไฟล์สูงสุด 8MB</p>
                  </div>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* Additional Notes */}
            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5">
                {t.documents.notes}
              </label>
              <textarea
                rows={2}
                placeholder="เช่น เก็บตัวจริงไว้ในตู้เซฟห้องนอนใหญ่, ต่ออายุผ่านแอป DLT ได้เลย"
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Form Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-border text-xs font-bold hover:bg-muted"
              >
                {t.common.cancel}
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !formTitle.trim()}
                className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-600 active:scale-95 text-white text-xs font-extrabold shadow-md transition-all flex items-center gap-1.5"
              >
                {isSubmitting ? (
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

      {/* Document Lightbox / Viewer Modal */}
      {previewDoc && (
        <Modal
          isOpen={!!previewDoc}
          onClose={() => setPreviewDoc(null)}
          title={previewDoc.title}
          maxWidth="lg"
        >
          <div className="space-y-4">
            <div className="p-3 rounded-2xl bg-muted/40 border border-border flex items-center justify-between text-xs">
              <div>
                <p className="font-extrabold text-foreground">{previewDoc.title}</p>
                {previewDoc.document_number && (
                  <p className="font-mono text-muted-foreground font-semibold">
                    เลขที่: {previewDoc.document_number}
                  </p>
                )}
              </div>

              {previewDoc.file_url && (
                <a
                  href={previewDoc.file_url}
                  download={previewDoc.file_name || 'document'}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-600 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{t.documents.downloadAttachment}</span>
                </a>
              )}
            </div>

            {/* Document display preview */}
            <div className="max-h-[65vh] overflow-auto rounded-2xl bg-muted/20 border border-border flex items-center justify-center p-2">
              {previewDoc.file_type?.startsWith('image/') ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewDoc.file_url!}
                  alt={previewDoc.title}
                  className="max-w-full h-auto rounded-xl object-contain shadow-md"
                />
              ) : previewDoc.file_url ? (
                <iframe
                  src={previewDoc.file_url}
                  title={previewDoc.title}
                  className="w-full h-[55vh] rounded-xl border border-border"
                />
              ) : (
                <p className="p-8 text-xs text-muted-foreground">ไม่มีข้อมูลไฟล์สำหรับแสดงตัวอย่าง</p>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteTargetId}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={handleConfirmDelete}
        title={t.common.deleteConfirmTitle}
        message={t.common.deleteConfirmMessage}
      />
    </div>
  );
}
