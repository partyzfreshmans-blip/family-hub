'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  { label: string; icon: any; color: string; bg: string; presets: string[] }
> = {
  HOUSE: {
    label: 'บ้าน & ที่อยู่อาศัย',
    icon: Home,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/20',
    presets: ['สำเนาทะเบียนบ้าน', 'โฉนดที่ดิน', 'สัญญาซื้อขาย/เช่า', 'ประกันอัคคีภัย', 'ใบรับประกันเครื่องใช้'],
  },
  VEHICLE: {
    label: 'รถยนต์ & ยานพาหนะ',
    icon: Car,
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/20',
    presets: ['เล่มทะเบียนรถ (เล่มฟ้า/เขียว)', 'พ.ร.บ. / ป้ายภาษีรถยนต์', 'ประกันภัยรถยนต์ (ชั้น 1/2/3)', 'ใบขับขี่', 'สมุดเช็คระยะ'],
  },
  PERSONAL: {
    label: 'เอกสารส่วนตัว & สมาชิก',
    icon: User,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
    presets: ['บัตรประชาชน', 'สูติบัตร', 'หนังสือเดินทาง (Passport)', 'ทะเบียนสมรส', 'ประกันสุขภาพ/ชีวิต', 'วุฒิการศึกษา', 'ประวัติฉีดวัคซีน'],
  },
  FINANCE: {
    label: 'การเงิน & สัญญา',
    icon: DollarSign,
    color: 'text-violet-600 dark:text-violet-400',
    bg: 'bg-violet-500/10 border-violet-500/20',
    presets: ['สัญญากู้ยืม / สินเชื่อบ้าน', 'กรมธรรม์ประกันสะสมทรัพย์', 'สมุดบัญชีธนาคาร', 'เอกสารภาษี', 'พินัยกรรม'],
  },
  OTHER: {
    label: 'อื่นๆ',
    icon: FolderOpen,
    color: 'text-rose-600 dark:text-rose-400',
    bg: 'bg-rose-500/10 border-rose-500/20',
    presets: ['เอกสารสัตว์เลี้ยง', 'ใบเสร็จชิ้นใหญ่', 'คู่มือการใช้งาน'],
  },
};

export default function DocumentsPage() {
  const { t } = useLanguage();
  const { member, family } = useAuth();

  const [documents, setDocuments] = useState<FamilyDocument[]>([]);
  const [alertDocs, setAlertDocs] = useState<FamilyDocument[]>([]);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [selectedOwner, setSelectedOwner] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

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
  const handleOpenAdd = () => {
    setEditingDoc(null);
    setFormTitle('');
    setFormCategory('HOUSE');
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

  // Handle File / Scan Upload
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

  // Filtered documents list
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
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
  }, [documents, activeCategory, selectedOwner, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl bg-foreground text-background font-bold text-xs shadow-2xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5">
            <span className="p-2 rounded-2xl bg-primary/10 text-primary">
              <FolderOpen className="w-6 h-6" />
            </span>
            <span>{t.documents.title}</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            {t.documents.subtitle}
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-primary hover:bg-primary-600 active:scale-95 text-white font-extrabold text-xs shadow-md transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>{t.documents.addDoc}</span>
        </button>
      </div>

      {/* Expiry Alert Banner */}
      {alertDocs.length > 0 && (
        <div className="p-4 rounded-3xl bg-amber-500/10 border border-amber-500/30 text-foreground space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
              <h3 className="font-extrabold text-sm text-amber-900 dark:text-amber-200">
                {t.documents.expiringAlert} ({alertDocs.length} {t.documents.docCount})
              </h3>
            </div>
            <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300">
              กรุณาตรวจสอบและดำเนินการต่ออายุ
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {alertDocs.map((doc) => {
              const isExpired = doc.expiry_status === 'EXPIRED';
              return (
                <div
                  key={doc.id}
                  onClick={() => handleOpenEdit(doc)}
                  className="p-3 rounded-2xl bg-card border border-border shadow-2xs hover:border-primary/40 cursor-pointer transition-all flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="font-extrabold text-xs text-foreground truncate">{doc.title}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {doc.owner_nick ? `ของ ${doc.owner_nick}` : 'ส่วนกลาง'} {doc.document_number ? `(${doc.document_number})` : ''}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded-xl text-[10px] font-extrabold shrink-0 ${
                      isExpired
                        ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                        : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {isExpired
                      ? 'หมดอายุแล้ว'
                      : `อีก ${doc.days_until_expiry} วัน`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveCategory('ALL')}
          className={`px-4 py-2 rounded-2xl text-xs font-extrabold whitespace-nowrap transition-all border ${
            activeCategory === 'ALL'
              ? 'bg-primary text-primary-foreground border-primary shadow-sm'
              : 'bg-card text-muted-foreground hover:text-foreground border-border hover:bg-muted/50'
          }`}
        >
          <span>{t.documents.allCategories}</span>
          <span className="ml-1.5 opacity-75 font-normal">({categoryCounts.ALL || 0})</span>
        </button>

        {(['HOUSE', 'VEHICLE', 'PERSONAL', 'FINANCE', 'OTHER'] as DocumentCategory[]).map((cat) => {
          const info = CATEGORY_INFO[cat];
          const Icon = info.icon;
          const isActive = activeCategory === cat;
          const count = categoryCounts[cat] || 0;

          return (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-extrabold whitespace-nowrap transition-all border ${
                isActive
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                  : 'bg-card text-muted-foreground hover:text-foreground border-border hover:bg-muted/50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.documents.categories[cat]}</span>
              <span className="opacity-75 font-normal">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Search Bar & Member Filter Row */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.documents.searchPlaceholder}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary shadow-soft"
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

        <div className="flex items-center gap-2">
          <select
            value={selectedOwner}
            onChange={(e) => setSelectedOwner(e.target.value)}
            className="px-3.5 py-2.5 rounded-2xl border border-border bg-card text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary shadow-soft text-foreground"
          >
            <option value="ALL">👤 เจ้าของ: ทั้งหมด</option>
            <option value="SHARED">🏠 ส่วนกลางของบ้าน</option>
            {familyMembers.map((m) => (
              <option key={m.id} value={m.id}>
                👤 {m.nickname} ({m.role})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Documents Grid */}
      {isLoading ? (
        <LoadingSkeleton count={3} height="h-32" />
      ) : filteredDocuments.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title={t.documents.emptyTitle}
          description={t.documents.emptyDesc}
          actionText={t.documents.addDoc}
          onAction={handleOpenAdd}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocuments.map((doc) => {
            const catInfo = CATEGORY_INFO[doc.category] || CATEGORY_INFO.OTHER;
            const CategoryIcon = catInfo.icon;
            const isExpiringSoon = doc.expiry_status === 'EXPIRING_SOON';
            const isExpired = doc.expiry_status === 'EXPIRED';

            return (
              <div
                key={doc.id}
                className="bg-card text-card-foreground rounded-3xl p-5 border border-border shadow-soft hover:shadow-md hover:border-primary/40 transition-all flex flex-col justify-between group relative overflow-hidden"
              >
                {/* Expiry status accent bar */}
                {isExpired && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-rose-500" />
                )}
                {isExpiringSoon && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
                )}

                <div className="space-y-3">
                  {/* Top Bar: Category, Owner, Privacy */}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border ${catInfo.bg} ${catInfo.color}`}
                    >
                      <CategoryIcon className="w-3.5 h-3.5" />
                      <span>{t.documents.categories[doc.category]}</span>
                    </span>

                    <div className="flex items-center gap-1.5">
                      {doc.privacy_level === 'PRIVATE' ? (
                        <span
                          className="p-1 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400"
                          title="ส่วนตัวเฉพาะฉัน"
                        >
                          <Lock className="w-3 h-3" />
                        </span>
                      ) : doc.privacy_level === 'ADULTS' ? (
                        <span
                          className="p-1 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400"
                          title="เฉพาะผู้ใหญ่ & แอดมิน"
                        >
                          <Shield className="w-3 h-3" />
                        </span>
                      ) : (
                        <span
                          className="p-1 rounded-lg bg-muted text-muted-foreground"
                          title="ทุกคนในบ้านเห็นได้"
                        >
                          <Users className="w-3 h-3" />
                        </span>
                      )}

                      {/* Owner badge */}
                      {doc.owner_nick ? (
                        <span
                          className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-muted text-[11px] font-bold text-foreground"
                          style={{
                            borderLeft: `3px solid ${doc.owner_color || '#0284c7'}`,
                          }}
                        >
                          <span>{doc.owner_nick}</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-lg bg-muted/60 text-[10px] font-bold text-muted-foreground">
                          ส่วนกลาง
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Title & Subcategory */}
                  <div>
                    <h3 className="font-extrabold text-base text-foreground group-hover:text-primary transition-colors">
                      {doc.title}
                    </h3>
                    {doc.sub_category && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {doc.sub_category}
                      </p>
                    )}
                  </div>

                  {/* Document / Plate / Policy Number with Copy */}
                  {doc.document_number && (
                    <div className="flex items-center justify-between p-2.5 rounded-2xl bg-muted/40 border border-border/60">
                      <div className="min-w-0 pr-2">
                        <p className="text-[10px] text-muted-foreground font-bold">เลขที่ / ทะเบียน</p>
                        <p className="font-mono font-bold text-xs text-foreground truncate">
                          {doc.document_number}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyDocNumber(doc.id, doc.document_number!)}
                        className="p-1.5 rounded-xl bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
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

                  {/* Issuer & Dates Info */}
                  <div className="space-y-1 text-xs text-muted-foreground">
                    {doc.issuer && (
                      <p className="truncate">
                        <span className="font-semibold text-foreground">ผู้ออก: </span>
                        {doc.issuer}
                      </p>
                    )}

                    {doc.expiry_date && (
                      <div className="flex items-center justify-between pt-1">
                        <span className="font-semibold text-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>วันหมดอายุ:</span>
                        </span>
                        <span
                          className={`font-bold px-2 py-0.5 rounded-md text-[11px] ${
                            isExpired
                              ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 font-extrabold'
                              : isExpiringSoon
                              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 font-extrabold'
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
                      <p className="text-[11px] text-muted-foreground italic line-clamp-2 pt-1">
                        &quot;{doc.notes}&quot;
                      </p>
                    )}
                  </div>
                </div>

                {/* Bottom Actions & Attachment */}
                <div className="pt-4 mt-4 border-t border-border flex items-center justify-between gap-2">
                  {doc.file_url ? (
                    <button
                      type="button"
                      onClick={() => setPreviewDoc(doc)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>{t.documents.viewAttachment}</span>
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
            );
          })}
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
                <input
                  type="date"
                  value={formIssueDate}
                  onChange={(e) => setFormIssueDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                />
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
                <input
                  type="date"
                  value={formExpiryDate}
                  onChange={(e) => setFormExpiryDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-border bg-background text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary"
                />
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
