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
  Building,
  Key,
  FolderCheck,
  ChevronRight,
  HelpCircle,
} from 'lucide-react';
import { useLanguage } from '@/components/LanguageContext';
import { useAuth } from '@/components/AuthContext';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { MemberAvatar } from '@/components/ui/MemberAvatar';
import { EmptyState, LoadingSkeleton } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { FamilyDocument, DocumentCategory, DocumentPrivacyLevel, FamilyMember } from '@/types';

interface CategoryConfig {
  label: string;
  subLabel: string;
  icon: any;
  color: string;
  bg: string;
  border: string;
  glow: string;
  assetTypeLabel: string;
  assetPlaceholder: string;
  defaultAssetPresets: string[];
  docTypePresets: { title: string; docNumberHint?: string; icon?: string }[];
}

const CATEGORY_INFO: Record<DocumentCategory, CategoryConfig> = {
  HOUSE: {
    label: 'บ้าน & ที่อยู่อาศัย',
    subLabel: 'ที่อยู่อาศัย & อสังหาฯ',
    icon: Home,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10 dark:bg-amber-500/15',
    border: 'border-amber-500/30',
    glow: 'hover:border-amber-500/60 hover:shadow-amber-500/10',
    assetTypeLabel: 'บ้าน / อสังหาริมทรัพย์',
    assetPlaceholder: 'เช่น บ้านสุขใจ (บ้านหลัก), คอนโดสุขุมวิท, บ้านสวนเชียงใหม่',
    defaultAssetPresets: ['บ้านหลัก (สุขใจ)', 'คอนโดสุขุมวิท', 'บ้านพักต่างจังหวัด', 'ที่ดินเปล่า'],
    docTypePresets: [
      { title: 'สำเนาทะเบียนบ้าน', docNumberHint: 'เลขรหัสประจำบ้าน 11 หลัก' },
      { title: 'โฉนดที่ดิน (น.ส. 4 จ)', docNumberHint: 'เลขที่โฉนด / ระวาง' },
      { title: 'สัญญาซื้อขาย / สัญญาเช่า', docNumberHint: 'เลขที่สัญญา' },
      { title: 'ประกันอัคคีภัย / ประกันบ้าน', docNumberHint: 'เลขที่กรมธรรม์' },
      { title: 'ใบเสร็จค่าส่วนกลาง / ค่าบำรุง', docNumberHint: 'เลขที่ใบเสร็จ' },
      { title: 'ใบรับประกันเครื่องใช้ / อุปกรณ์บ้าน', docNumberHint: 'Serial Number' },
    ],
  },
  VEHICLE: {
    label: 'รถยนต์ & ยานพาหนะ',
    subLabel: 'รถยนต์ & มอเตอร์ไซค์',
    icon: Car,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10 dark:bg-blue-500/15',
    border: 'border-blue-500/30',
    glow: 'hover:border-blue-500/60 hover:shadow-blue-500/10',
    assetTypeLabel: 'คันรถ / ยานพาหนะ / ทะเบียน',
    assetPlaceholder: 'เช่น Honda Civic (2ขค-8888), Toyota Fortuner (1กข-9999), Vespa 150',
    defaultAssetPresets: ['Toyota Fortuner (1กข-9999)', 'Honda Civic (2ขค-8888)', 'มอเตอร์ไซค์ Vespa', 'รถยนต์สำรอง'],
    docTypePresets: [
      { title: 'พ.ร.บ. / ป้ายภาษีรถยนต์', docNumberHint: 'เลขที่ พ.ร.บ. / เลขทะเบียน' },
      { title: 'ประกันภัยรถยนต์ (ชั้น 1/2/3)', docNumberHint: 'เลขที่กรมธรรม์' },
      { title: 'เล่มทะเบียนรถ (เล่มฟ้า/เขียว)', docNumberHint: 'เลขตัวถัง / เลขทะเบียน' },
      { title: 'ใบขับขี่', docNumberHint: 'เลขที่ใบอนุญาตขับรถ' },
      { title: 'สมุดเช็คระยะ / ประวัติซ่อมบำรุง', docNumberHint: 'ระยะทาง (กม.)' },
      { title: 'สัญญาเช่าซื้อ / ไฟแนนซ์', docNumberHint: 'เลขที่สัญญาเช่าซื้อ' },
    ],
  },
  PERSONAL: {
    label: 'เอกสารส่วนตัว & สมาชิก',
    subLabel: 'สมาชิกในครอบครัว',
    icon: User,
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
    border: 'border-emerald-500/30',
    glow: 'hover:border-emerald-500/60 hover:shadow-emerald-500/10',
    assetTypeLabel: 'สมาชิกเจ้าของเอกสาร',
    assetPlaceholder: 'เช่น พ่อ, แม่, หรือชื่อสมาชิกในครอบครัว',
    defaultAssetPresets: ['พ่อ', 'แม่', 'น้องต้น', 'น้องเมย์'],
    docTypePresets: [
      { title: 'บัตรประจำตัวประชาชน', docNumberHint: 'เลขประจำตัว 13 หลัก' },
      { title: 'หนังสือเดินทาง (Passport)', docNumberHint: 'Passport Number' },
      { title: 'สูติบัตร (ใบเกิด)', docNumberHint: 'เลขที่สูติบัตร' },
      { title: 'ทะเบียนสมรส / ครอบครัว', docNumberHint: 'เลขที่ทะเบียน' },
      { title: 'ประกันสุขภาพ / ประกันชีวิต', docNumberHint: 'เลขที่กรมธรรม์' },
      { title: 'วุฒิการศึกษา / ประกาศนียบัตร', docNumberHint: 'เลขที่ใบประกาศ' },
      { title: 'ประวัติการรักษา / สมุดวัคซีน', docNumberHint: 'HN / โรงพยาบาล' },
    ],
  },
  FINANCE: {
    label: 'การเงิน & สัญญา',
    subLabel: 'ธนาคาร & สินเชื่อ & ประกัน',
    icon: DollarSign,
    color: 'text-violet-500',
    bg: 'bg-violet-500/10 dark:bg-violet-500/15',
    border: 'border-violet-500/30',
    glow: 'hover:border-violet-500/60 hover:shadow-violet-500/10',
    assetTypeLabel: 'สถาบัน / บัญชี / สัญญา',
    assetPlaceholder: 'เช่น ธนาคารกสิกรไทย, ธนาคารไทยพาณิชย์, AIA ประกันชีวิต, สินเชื่อบ้าน ธอส.',
    defaultAssetPresets: ['ธนาคารกสิกรไทย', 'ธนาคารไทยพาณิชย์', 'AIA ประกันชีวิต', 'สินเชื่อบ้าน', 'สรรพากร'],
    docTypePresets: [
      { title: 'สมุดบัญชีธนาคาร / พอร์ตลงทุน', docNumberHint: 'เลขที่บัญชี' },
      { title: 'สัญญากู้ยืม / สินเชื่อบ้าน/รถ', docNumberHint: 'เลขที่สัญญากู้' },
      { title: 'กรมธรรม์ประกันชีวิต / สะสมทรัพย์', docNumberHint: 'เลขที่กรมธรรม์' },
      { title: 'เอกสารภาษี / 50 ทวิ / ลดหย่อน', docNumberHint: 'ปีภาษี' },
      { title: 'พินัยกรรม / นิติกรรมสัญญา', docNumberHint: 'เลขที่นิติกรรม' },
    ],
  },
  OTHER: {
    label: 'อื่นๆ',
    subLabel: 'สัตว์เลี้ยง & เครื่องใช้ & คลับ',
    icon: FolderOpen,
    color: 'text-rose-500',
    bg: 'bg-rose-500/10 dark:bg-rose-500/15',
    border: 'border-rose-500/30',
    glow: 'hover:border-rose-500/60 hover:shadow-rose-500/10',
    assetTypeLabel: 'หมวดหมู่ย่อย / ชื่อกลุ่ม',
    assetPlaceholder: 'เช่น สัตว์เลี้ยง (สุนัข/แมว), เครื่องใช้ไฟฟ้าห้องนั่งเล่น, บัตรสมาชิกคลับ',
    defaultAssetPresets: ['สัตว์เลี้ยง (หมา/แมว)', 'เครื่องใช้ไฟฟ้า', 'บัตรสมาชิก / คลับ', 'ทั่วไป'],
    docTypePresets: [
      { title: 'เอกสารสัตว์เลี้ยง / สมุดวัคซีน', docNumberHint: 'เลข Microchip / ทะเบียน' },
      { title: 'ใบรับประกันสินค้า / ใบเสร็จ', docNumberHint: 'Serial Number / Invoice No.' },
      { title: 'คู่มือการใช้งานสินค้า', docNumberHint: 'Model / รุ่น' },
      { title: 'บัตรสมาชิก / สิทธิพิเศษ', docNumberHint: 'Member ID' },
    ],
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
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>('ALL');
  const [selectedDocType, setSelectedDocType] = useState<string>('ALL');
  const [selectedOwner, setSelectedOwner] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'updated' | 'expiry' | 'title'>('updated');
  const [groupByAsset, setGroupByAsset] = useState(true);

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
  const [isDraggingDocFile, setIsDraggingDocFile] = useState(false);
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

  // Reset SubCategory filter when Category changes
  const handleCategoryChange = (cat: string) => {
    setActiveCategory(cat);
    setSelectedSubCategory('ALL');
    setSelectedDocType('ALL');
  };

  // Open Form for Adding
  const handleOpenAdd = (presetTitle?: string, presetCategory?: DocumentCategory, presetSubCategory?: string) => {
    const targetCategory = presetCategory || (activeCategory !== 'ALL' ? (activeCategory as DocumentCategory) : 'HOUSE');
    const targetSubCategory = presetSubCategory || (selectedSubCategory !== 'ALL' ? selectedSubCategory : '');

    setEditingDoc(null);
    setFormTitle(presetTitle || '');
    setFormCategory(targetCategory);
    setFormSubCategory(targetSubCategory);
    setFormDocNumber('');
    setFormIssuer('');
    setFormOwnerMemberId(targetCategory === 'PERSONAL' && selectedOwner !== 'ALL' && selectedOwner !== 'SHARED' ? selectedOwner : '');
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
      setFormSubCategory(selectedSubCategory !== 'ALL' ? selectedSubCategory : '');
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

  const processDocFile = (file: File) => {
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

  // Handle File / Scan Upload inside Form
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processDocFile(file);
    }
    e.target.value = '';
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

  // Extract all unique assets / subcategories
  const currentCategoryAssets = useMemo(() => {
    const map = new Map<string, { count: number; category: DocumentCategory }>();
    documents.forEach((d) => {
      if (activeCategory !== 'ALL' && d.category !== activeCategory) return;
      const assetName = d.sub_category?.trim();
      if (assetName) {
        const existing = map.get(assetName);
        if (existing) {
          existing.count += 1;
        } else {
          map.set(assetName, { count: 1, category: d.category });
        }
      }
    });
    return Array.from(map.entries()).map(([name, data]) => ({
      name,
      count: data.count,
      category: data.category,
    }));
  }, [documents, activeCategory]);

  // Filtered and Sorted documents list
  const filteredDocuments = useMemo(() => {
    const list = documents.filter((doc) => {
      // Category filter
      if (activeCategory !== 'ALL' && doc.category !== activeCategory) {
        return false;
      }
      // Sub-category (Asset) filter
      if (selectedSubCategory !== 'ALL') {
        if (selectedSubCategory === '__UNSPECIFIED__') {
          if (doc.sub_category?.trim()) return false;
        } else if (doc.sub_category?.trim() !== selectedSubCategory) {
          return false;
        }
      }
      // Doc type filter
      if (selectedDocType !== 'ALL') {
        if (!doc.title.toLowerCase().includes(selectedDocType.toLowerCase())) {
          return false;
        }
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
  }, [documents, activeCategory, selectedSubCategory, selectedDocType, selectedOwner, searchQuery, sortBy]);

  // Grouped Documents by Asset / House / Vehicle / Member / Financial Group
  const groupedDocuments = useMemo(() => {
    if (!groupByAsset || selectedSubCategory !== 'ALL') {
      return [{ key: 'ALL', label: '', count: filteredDocuments.length, docs: filteredDocuments }];
    }

    const groups: {
      key: string;
      label: string;
      subTitle?: string;
      icon?: any;
      color?: string;
      category?: DocumentCategory;
      count: number;
      docs: FamilyDocument[];
    }[] = [];

    if (activeCategory === 'PERSONAL') {
      // Group by Family Member
      const memberMap = new Map<string, FamilyDocument[]>();
      filteredDocuments.forEach((doc) => {
        const ownerId = doc.owner_member_id || 'SHARED';
        if (!memberMap.has(ownerId)) memberMap.set(ownerId, []);
        memberMap.get(ownerId)!.push(doc);
      });

      memberMap.forEach((docs, ownerId) => {
        if (ownerId === 'SHARED') {
          groups.push({
            key: 'SHARED',
            label: '🏠 เอกสารส่วนกลางของครอบครัว',
            subTitle: 'ใช้ร่วมกันทุกคน',
            icon: Users,
            color: 'text-primary',
            category: 'PERSONAL',
            count: docs.length,
            docs,
          });
        } else {
          const mem = familyMembers.find((m) => m.id === ownerId);
          groups.push({
            key: ownerId,
            label: `👤 ${mem?.nickname || docs[0].owner_nick || 'สมาชิก'}`,
            subTitle: mem ? `บทบาท: ${mem.role}` : '',
            icon: User,
            color: mem?.member_color || docs[0].owner_color || 'text-emerald-500',
            category: 'PERSONAL',
            count: docs.length,
            docs,
          });
        }
      });
    } else {
      // Group by sub_category (Asset e.g. Car Name, House Name, Bank Name)
      const assetMap = new Map<string, FamilyDocument[]>();
      filteredDocuments.forEach((doc) => {
        const asset = doc.sub_category?.trim() || 'ทั่วไป / ยังไม่ระบุกลุ่มย่อย';
        if (!assetMap.has(asset)) assetMap.set(asset, []);
        assetMap.get(asset)!.push(doc);
      });

      assetMap.forEach((docs, assetKey) => {
        const cat = docs[0].category;
        const info = CATEGORY_INFO[cat] || CATEGORY_INFO.OTHER;
        groups.push({
          key: assetKey,
          label: assetKey,
          subTitle: `${info.assetTypeLabel} • ${docs.length} รายการ`,
          icon: info.icon,
          color: info.color,
          category: cat,
          count: docs.length,
          docs,
        });
      });
    }

    return groups;
  }, [filteredDocuments, groupByAsset, selectedSubCategory, activeCategory, familyMembers]);

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
              จัดระเบียบเอกสารแยกตามบ้านแต่ละหลัง, รถแต่ละคัน, สมาชิกแต่ละคน และธุรกรรมการเงินอย่างชัดเจน
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
                        {doc.sub_category ? `[${doc.sub_category}] ` : ''}
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
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-primary" />
            <span>1. เลือกหมวดหมู่หลัก</span>
          </h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {/* ALL FOLDER */}
          <button
            type="button"
            onClick={() => handleCategoryChange('ALL')}
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
                onClick={() => handleCategoryChange(cat)}
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
                  <p className="text-[10px] text-muted-foreground truncate">{info.subLabel}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. DYNAMIC ASSET & SUBCATEGORY PILL BAR (Level 2 Navigation) */}
      {activeCategory !== 'ALL' && (
        <div className="p-4 rounded-3xl bg-card border border-border/80 shadow-soft space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
          {/* Row 1: Asset / Sub-category Separator (e.g. by Car, House, Member, Bank) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold text-muted-foreground flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-primary" />
                <span>
                  2. แยกตาม {CATEGORY_INFO[activeCategory as DocumentCategory]?.assetTypeLabel}:
                </span>
              </span>

              <button
                type="button"
                onClick={() => handleOpenAdd(undefined, activeCategory as DocumentCategory)}
                className="text-[11px] font-extrabold text-primary hover:underline flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                <span>เพิ่ม {CATEGORY_INFO[activeCategory as DocumentCategory]?.assetTypeLabel.split('/')[0]}</span>
              </button>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <button
                type="button"
                onClick={() => setSelectedSubCategory('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold shrink-0 transition-all ${
                  selectedSubCategory === 'ALL'
                    ? 'bg-primary text-white shadow-xs'
                    : 'bg-muted/60 hover:bg-muted text-foreground border border-border/60'
                }`}
              >
                ทั้งหมด ({categoryCounts[activeCategory] || 0})
              </button>

              {currentCategoryAssets.map((asset) => (
                <button
                  key={asset.name}
                  type="button"
                  onClick={() => setSelectedSubCategory(asset.name)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold shrink-0 transition-all flex items-center gap-1.5 ${
                    selectedSubCategory === asset.name
                      ? 'bg-primary text-white shadow-xs'
                      : 'bg-muted/60 hover:bg-muted text-foreground border border-border/60'
                  }`}
                >
                  <span>{asset.name}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      selectedSubCategory === asset.name
                        ? 'bg-white/20 text-white'
                        : 'bg-background text-muted-foreground'
                    }`}
                  >
                    {asset.count}
                  </span>
                </button>
              ))}

              {currentCategoryAssets.length === 0 && (
                <span className="text-[11px] text-muted-foreground/70 italic px-2 py-1">
                  (ยังไม่มีหมวดหมู่ย่อย แตะเพิ่มเอกสารเพื่อระบุชื่อ เช่น {CATEGORY_INFO[activeCategory as DocumentCategory]?.defaultAssetPresets[0]})
                </span>
              )}
            </div>
          </div>

          {/* Row 2: Document Type Quick Filters */}
          <div className="space-y-1.5 pt-2 border-t border-border/60">
            <span className="text-[11px] font-extrabold text-muted-foreground flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-primary" />
              <span>ชนิดเอกสารที่พบบ่อย (แตะกรอง หรือแตะเพิ่ม):</span>
            </span>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <button
                type="button"
                onClick={() => setSelectedDocType('ALL')}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold shrink-0 transition-all ${
                  selectedDocType === 'ALL'
                    ? 'bg-foreground text-background shadow-xs'
                    : 'bg-muted/40 hover:bg-muted text-muted-foreground border border-border/40'
                }`}
              >
                ทุกชนิด
              </button>

              {CATEGORY_INFO[activeCategory as DocumentCategory]?.docTypePresets.map((preset) => {
                const isSelected = selectedDocType === preset.title;
                return (
                  <button
                    key={preset.title}
                    type="button"
                    onClick={() => setSelectedDocType(isSelected ? 'ALL' : preset.title)}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-bold shrink-0 transition-all flex items-center gap-1 ${
                      isSelected
                        ? 'bg-foreground text-background shadow-xs'
                        : 'bg-muted/40 hover:bg-muted text-foreground border border-border/40'
                    }`}
                  >
                    <span>{preset.title}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 6. SEARCH & CONTROLS BAR */}
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

          {/* Grouping Toggle */}
          <button
            type="button"
            onClick={() => setGroupByAsset(!groupByAsset)}
            className={`px-3 py-2.5 rounded-2xl border text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-2xs ${
              groupByAsset
                ? 'bg-primary/10 border-primary text-primary'
                : 'bg-background border-border text-muted-foreground hover:text-foreground'
            }`}
            title="สลับการจัดกลุ่มตามทรัพย์สิน/บุคคล"
          >
            <FolderCheck className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{groupByAsset ? 'จัดกลุ่ม' : 'แสดงรวม'}</span>
          </button>

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

      {/* 7. DOCUMENTS CONTENT (GROUPED OR FLAT GRID / LIST) */}
      {isLoading ? (
        <LoadingSkeleton count={3} height="h-40" />
      ) : filteredDocuments.length === 0 ? (
        <div className="p-8 sm:p-12 rounded-3xl bg-card border border-border/80 shadow-soft text-center space-y-6">
          <div className="w-16 h-16 rounded-3xl bg-primary/10 text-primary flex items-center justify-center mx-auto shadow-xs">
            <FolderOpen className="w-8 h-8" />
          </div>

          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="text-lg font-extrabold text-foreground">ยังไม่มีเอกสารในหมวดหมู่นี้</h3>
            <p className="text-xs text-muted-foreground">
              เริ่มต้นบันทึกข้อมูลเอกสารสำคัญของบ้าน ทะเบียนรถ โฉนด หรือบัตรประชาชนเพื่อค้นหาและเตือนวันหมดอายุได้ง่ายๆ
            </p>
          </div>

          {/* Quick Starter Recommendations */}
          <div className="space-y-2 max-w-lg mx-auto text-left pt-2">
            <p className="text-xs font-extrabold text-foreground flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>แตะเพื่อเริ่มบันทึกเอกสารด่วน:</span>
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(activeCategory !== 'ALL'
                ? CATEGORY_INFO[activeCategory as DocumentCategory].docTypePresets.slice(0, 4)
                : [
                    { title: 'พ.ร.บ. / ป้ายภาษีรถยนต์', category: 'VEHICLE' },
                    { title: 'สำเนาทะเบียนบ้าน', category: 'HOUSE' },
                    { title: 'บัตรประจำตัวประชาชน', category: 'PERSONAL' },
                    { title: 'ประกันภัยรถยนต์ (ชั้น 1)', category: 'VEHICLE' },
                  ]
              ).map((preset: any, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() =>
                    handleOpenAdd(
                      preset.title,
                      (preset.category || activeCategory) as DocumentCategory
                    )
                  }
                  className="p-3 rounded-2xl bg-muted/40 hover:bg-primary/10 border border-border/60 hover:border-primary/40 text-left text-xs font-extrabold text-foreground transition-all flex items-center justify-between group"
                >
                  <span className="truncate">{preset.title}</span>
                  <Plus className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {groupedDocuments.map((group) => {
            const GroupIcon = group.icon || FolderOpen;

            return (
              <div key={group.key} className="space-y-4">
                {/* Group Header Banner (if grouped mode) */}
                {group.label && (
                  <div className="flex items-center justify-between px-1 pb-1 border-b border-border/60">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-2xl bg-primary/10 text-primary shadow-xs`}>
                        <GroupIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-sm sm:text-base text-foreground flex items-center gap-2">
                          <span>{group.label}</span>
                          <span className="px-2 py-0.5 rounded-full bg-muted text-foreground text-[11px] font-black">
                            {group.count} เอกสาร
                          </span>
                        </h3>
                        {group.subTitle && (
                          <p className="text-[11px] text-muted-foreground">{group.subTitle}</p>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        handleOpenAdd(
                          undefined,
                          group.category || (activeCategory !== 'ALL' ? (activeCategory as DocumentCategory) : 'HOUSE'),
                          group.key !== 'SHARED' && group.key !== 'ALL' ? group.label.replace(/^👤\s*/, '') : undefined
                        )
                      }
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-card hover:bg-muted border border-border/80 text-foreground font-extrabold text-xs shadow-2xs transition-all active:scale-95"
                    >
                      <Plus className="w-3.5 h-3.5 text-primary" />
                      <span className="hidden sm:inline">เพิ่มเอกสารในกลุ่มนี้</span>
                      <span className="sm:hidden">เพิ่ม</span>
                    </button>
                  </div>
                )}

                {/* Cards View (Grid) */}
                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {group.docs.map((doc) => {
                      const catInfo = CATEGORY_INFO[doc.category] || CATEGORY_INFO.OTHER;
                      const CategoryIcon = catInfo.icon;
                      const isExpiringSoon = doc.expiry_status === 'EXPIRING_SOON';
                      const isExpired = doc.expiry_status === 'EXPIRED';

                      return (
                        <div
                          key={doc.id}
                          className="p-5 rounded-3xl bg-card border border-border/80 shadow-soft hover:border-primary/50 hover:shadow-md transition-all flex flex-col justify-between gap-4 group relative overflow-hidden"
                        >
                          {/* Top row: Category Badge & Privacy */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11px] font-extrabold border ${catInfo.bg} ${catInfo.border} ${catInfo.color} shadow-2xs`}
                              >
                                <CategoryIcon className="w-3.5 h-3.5" />
                                <span>{t.documents.categories[doc.category]}</span>
                              </span>

                              {doc.sub_category && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-xl text-[10px] font-bold bg-muted text-muted-foreground border border-border/50 max-w-[140px] truncate">
                                  <Tag className="w-2.5 h-2.5" />
                                  <span className="truncate">{doc.sub_category}</span>
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5">
                              {doc.privacy_level === 'PRIVATE' && (
                                <span className="p-1 rounded-lg bg-rose-500/10 text-rose-500" title="เอกสารส่วนตัว">
                                  <Lock className="w-3.5 h-3.5" />
                                </span>
                              )}
                              {doc.privacy_level === 'ADULTS' && (
                                <span className="p-1 rounded-lg bg-amber-500/10 text-amber-500" title="เฉพาะผู้ใหญ่">
                                  <Shield className="w-3.5 h-3.5" />
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Middle: Title, Number, Issuer & Thumbnail */}
                          <div className="space-y-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1 space-y-1">
                                <h3 className="font-extrabold text-base text-foreground leading-snug group-hover:text-primary transition-colors">
                                  {doc.title}
                                </h3>

                                {doc.issuer && (
                                  <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                                    <span>ออกโดย: {doc.issuer}</span>
                                  </p>
                                )}
                              </div>

                              {/* Thumbnail preview if has file */}
                              {doc.file_url && (
                                <div
                                  onClick={() => setPreviewDoc(doc)}
                                  className="w-14 h-14 rounded-2xl overflow-hidden bg-muted border border-border/80 shrink-0 cursor-pointer relative group/thumb shadow-xs"
                                  title="แตะเพื่อดูเอกสารแบบขยายใหญ่"
                                >
                                  {doc.file_type?.startsWith('image/') ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={doc.file_url}
                                      alt={doc.title}
                                      className="w-full h-full object-cover group-hover/thumb:scale-110 transition-transform"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center text-primary bg-primary/10 gap-0.5">
                                      <File className="w-5 h-5" />
                                      <span className="text-[9px] font-black uppercase">PDF</span>
                                    </div>
                                  )}
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition-opacity text-white">
                                    <Maximize2 className="w-4 h-4" />
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* 1-Click Copy Number Strip */}
                            {doc.document_number && (
                              <div className="p-2.5 rounded-2xl bg-muted/40 border border-border/60 flex items-center justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="text-[10px] text-muted-foreground uppercase font-bold">เลขที่ / ทะเบียน / กรมธรรม์</p>
                                  <p className="font-mono font-black text-sm text-foreground tracking-wide truncate">
                                    {doc.document_number}
                                  </p>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleCopyDocNumber(doc.id, doc.document_number!)}
                                  className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-2xs active:scale-95 ${
                                    copiedDocId === doc.id
                                      ? 'bg-emerald-500 text-white'
                                      : 'bg-background hover:bg-muted text-foreground border border-border/80'
                                  }`}
                                  title="คัดลอกเลขที่เอกสาร"
                                >
                                  {copiedDocId === doc.id ? (
                                    <>
                                      <Check className="w-3.5 h-3.5" />
                                      <span>คัดลอกแล้ว</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                                      <span>คัดลอก</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            )}

                            {/* Expiry Date Badge */}
                            {doc.expiry_date && (
                              <div
                                className={`p-2.5 rounded-2xl border flex items-center justify-between text-xs font-bold ${
                                  isExpired
                                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
                                    : isExpiringSoon
                                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
                                    : 'bg-muted/30 border-border/60 text-muted-foreground'
                                }`}
                              >
                                <span className="flex items-center gap-1.5 font-mono">
                                  <Calendar className="w-3.5 h-3.5" />
                                  <span>หมดอายุ: {doc.expiry_date}</span>
                                </span>

                                <span className="text-[11px] font-extrabold">
                                  {isExpired
                                    ? 'หมดอายุแล้ว'
                                    : isExpiringSoon
                                    ? `อีก ${doc.days_until_expiry} วัน`
                                    : 'ใช้งานได้'}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Bottom Row: Owner & Actions */}
                          <div className="pt-3 border-t border-border/60 flex items-center justify-between gap-2">
                            {/* Owner Avatar */}
                            <div className="flex items-center gap-2 min-w-0">
                              {doc.owner_nick ? (
                                <>
                                  <MemberAvatar
                                    name={doc.owner_nick}
                                    color={doc.owner_color}
                                    avatarUrl={doc.owner_avatar}
                                    size="sm"
                                  />
                                  <span className="text-xs font-bold text-foreground truncate">
                                    {doc.owner_nick}
                                  </span>
                                </>
                              ) : (
                                <span className="text-xs text-muted-foreground font-bold flex items-center gap-1">
                                  <Users className="w-3.5 h-3.5" />
                                  <span>ส่วนกลาง</span>
                                </span>
                              )}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-1">
                              {doc.file_url && (
                                <button
                                  type="button"
                                  onClick={() => setPreviewDoc(doc)}
                                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-xs font-extrabold transition-colors"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>ดูไฟล์</span>
                                </button>
                              )}

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
                ) : (
                  /* LIST VIEW */
                  <div className="rounded-3xl bg-card border border-border/80 shadow-soft overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-muted/40 border-b border-border text-muted-foreground font-extrabold uppercase">
                          <tr>
                            <th className="p-4">เอกสาร</th>
                            <th className="p-4">หมวดหมู่ & กลุ่มย่อย</th>
                            <th className="p-4">เลขที่ / ทะเบียน</th>
                            <th className="p-4">เจ้าของ</th>
                            <th className="p-4">วันหมดอายุ</th>
                            <th className="p-4 text-right">การจัดการ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60 font-medium">
                          {group.docs.map((doc) => {
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
                                      {doc.issuer && <p className="text-[11px] text-muted-foreground truncate">{doc.issuer}</p>}
                                    </div>
                                  </div>
                                </td>

                                <td className="p-4">
                                  <div className="space-y-1">
                                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-bold border ${catInfo.bg} ${catInfo.border} ${catInfo.color}`}>
                                      <CategoryIcon className="w-3 h-3" />
                                      <span>{t.documents.categories[doc.category]}</span>
                                    </span>
                                    {doc.sub_category && (
                                      <p className="text-[11px] text-muted-foreground font-bold truncate">
                                        🏷️ {doc.sub_category}
                                      </p>
                                    )}
                                  </div>
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
              </div>
            );
          })}
        </div>
      )}

      {/* 8. ADD / EDIT DOCUMENT MODAL */}
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

            {/* Asset / Sub-category Field (e.g. Which Car? Which House? Which Member?) */}
            <div className="space-y-2 p-3.5 rounded-2xl bg-muted/40 border border-border/80">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-extrabold text-foreground">
                  🏷️ ระบุ {CATEGORY_INFO[formCategory].assetTypeLabel}
                </label>
                <span className="text-[10px] text-muted-foreground">เพื่อให้จัดกลุ่มค้นหาง่าย</span>
              </div>

              <input
                type="text"
                placeholder={CATEGORY_INFO[formCategory].assetPlaceholder}
                value={formSubCategory}
                onChange={(e) => setFormSubCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-xs sm:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary shadow-2xs"
              />

              {/* Quick suggestion chips for Asset / Sub-category */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] font-bold text-muted-foreground">แตะเพื่อเลือก:</span>
                {formCategory === 'PERSONAL' && familyMembers.length > 0 ? (
                  // Dynamic real family members
                  familyMembers.map((mem) => {
                    const isSelected = formSubCategory === mem.nickname || formOwnerMemberId === mem.id;
                    return (
                      <button
                        key={mem.id}
                        type="button"
                        onClick={() => {
                          setFormSubCategory(mem.nickname);
                          setFormOwnerMemberId(mem.id);
                        }}
                        className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition-all active:scale-95 flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/40 shadow-xs ring-1 ring-emerald-500/30'
                            : 'bg-muted/70 hover:bg-background text-foreground border-border/50'
                        }`}
                      >
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: mem.member_color || '#10b981' }}
                        />
                        <span>{mem.nickname}</span>
                      </button>
                    );
                  })
                ) : (
                  <>
                    {/* 1. Existing Assets in Family */}
                    {Array.from(
                      new Set(
                        documents
                          .filter((d) => d.category === formCategory && d.sub_category?.trim())
                          .map((d) => d.sub_category!.trim())
                      )
                    ).map((existingName) => (
                      <button
                        key={existingName}
                        type="button"
                        onClick={() => setFormSubCategory(existingName)}
                        className="px-2 py-0.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-[10px] font-extrabold border border-primary/20 transition-all active:scale-95"
                      >
                        ★ {existingName}
                      </button>
                    ))}

                    {/* 2. Default presets */}
                    {CATEGORY_INFO[formCategory].defaultAssetPresets.map((preset, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setFormSubCategory(preset)}
                        className="px-2 py-0.5 rounded-lg bg-muted hover:bg-background text-foreground text-[10px] font-bold border border-border/50 transition-all active:scale-95"
                      >
                        + {preset}
                      </button>
                    ))}
                  </>
                )}
              </div>
            </div>

            {/* Quick Presets for Document Type */}
            <div>
              <p className="text-[11px] font-bold text-muted-foreground mb-1.5 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span>คำแนะนำชนิดเอกสาร (แตะเพื่อใส่ชื่ออัตโนมัติ):</span>
              </p>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORY_INFO[formCategory].docTypePresets.map((preset, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setFormTitle(preset.title);
                    }}
                    className="px-2.5 py-1 rounded-xl bg-muted/60 hover:bg-muted text-foreground text-[11px] font-semibold border border-border/50 transition-all active:scale-95"
                  >
                    + {preset.title}
                  </button>
                ))}
              </div>
            </div>

            {/* Document Title & Document Number */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">
                  {t.documents.docTitle} *
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น พ.ร.บ. 2569, ประกันชั้น 1, โฉนดที่ดิน"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-border bg-background text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">
                  {t.documents.docNumber} (เลขที่ / ทะเบียน / กรมธรรม์)
                </label>
                <input
                  type="text"
                  placeholder="เช่น 1กข-9999, POL-2026-888"
                  value={formDocNumber}
                  onChange={(e) => setFormDocNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            {/* Issuer & Owner Member */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">
                  {t.documents.docIssuer}
                </label>
                <input
                  type="text"
                  placeholder="เช่น กรมการขนส่งทางบก, กรุงเทพประกันภัย, ธนาคารกสิกร"
                  value={formIssuer}
                  onChange={(e) => setFormIssuer(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">
                  {t.documents.docOwner}
                </label>
                <select
                  value={formOwnerMemberId}
                  onChange={(e) => {
                    const newId = e.target.value;
                    setFormOwnerMemberId(newId);
                    if (formCategory === 'PERSONAL') {
                      if (newId) {
                        const mem = familyMembers.find((m) => m.id === newId);
                        if (mem) setFormSubCategory(mem.nickname);
                      } else {
                        setFormSubCategory('');
                      }
                    }
                  }}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-border bg-background text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">🏠 ส่วนกลางของบ้าน</option>
                  {familyMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      👤 {m.nickname} ({m.role})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Issue Date & Expiry Date (With Expiry Alert) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">
                  {t.documents.issueDate}
                </label>
                <input
                  type="date"
                  value={formIssueDate}
                  onChange={(e) => setFormIssueDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5 flex items-center justify-between">
                  <span>{t.documents.expiryDate}</span>
                  <span className="text-[10px] text-amber-500 font-bold">มีระบบแจ้งเตือนต่ออายุ</span>
                </label>
                <input
                  type="date"
                  value={formExpiryDate}
                  onChange={(e) => setFormExpiryDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-border bg-background text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            {/* Privacy Level */}
            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5">
                {t.documents.privacy}
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setFormPrivacy('FAMILY')}
                  className={`p-2.5 rounded-2xl border text-center text-xs font-bold transition-all ${
                    formPrivacy === 'FAMILY'
                      ? 'border-primary bg-primary/10 ring-2 ring-primary/30 text-primary'
                      : 'border-border bg-card hover:bg-muted text-muted-foreground'
                  }`}
                >
                  <Users className="w-4 h-4 mx-auto mb-1" />
                  <span>ทุกคนในบ้าน</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFormPrivacy('ADULTS')}
                  className={`p-2.5 rounded-2xl border text-center text-xs font-bold transition-all ${
                    formPrivacy === 'ADULTS'
                      ? 'border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/30 text-amber-500'
                      : 'border-border bg-card hover:bg-muted text-muted-foreground'
                  }`}
                >
                  <Shield className="w-4 h-4 mx-auto mb-1" />
                  <span>เฉพาะผู้ใหญ่</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFormPrivacy('PRIVATE')}
                  className={`p-2.5 rounded-2xl border text-center text-xs font-bold transition-all ${
                    formPrivacy === 'PRIVATE'
                      ? 'border-rose-500 bg-rose-500/10 ring-2 ring-rose-500/30 text-rose-500'
                      : 'border-border bg-card hover:bg-muted text-muted-foreground'
                  }`}
                >
                  <Lock className="w-4 h-4 mx-auto mb-1" />
                  <span>ส่วนตัว (ฉันคนเดียว)</span>
                </button>
              </div>
            </div>

            {/* File Upload / Scanner */}
            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5">
                แนบไฟล์เอกสาร / รูปถ่าย / สแกน (สูงสุด 8MB)
              </label>

              {formFileUrl ? (
                <div className="p-3.5 rounded-2xl bg-muted/40 border border-border flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {formFileType?.startsWith('image/') ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={formFileUrl}
                        alt="Preview"
                        className="w-12 h-12 rounded-xl object-cover border border-border shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <File className="w-6 h-6 text-primary" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground truncate">{formFileName || 'ไฟล์เอกสารแนบ'}</p>
                      <p className="text-[10px] text-muted-foreground">พร้อมจัดเก็บเข้าสู่ระบบ Vault</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <label className="p-2 rounded-xl bg-background border border-border hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
                      <Upload className="w-4 h-4" />
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setFormFileUrl(null);
                        setFormFileName(null);
                        setFormFileType(null);
                      }}
                      className="p-2 rounded-xl bg-background border border-border hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 transition-colors"
                      title="ลบไฟล์"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <label
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDraggingDocFile(true);
                  }}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDraggingDocFile(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDraggingDocFile(false);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDraggingDocFile(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) {
                      processDocFile(file);
                    }
                  }}
                  className={`border-2 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all select-none ${
                    isDraggingDocFile
                      ? 'border-primary bg-primary/15 scale-[1.02] shadow-lg shadow-primary/10 ring-4 ring-primary/20'
                      : 'border-border hover:border-primary/50 hover:bg-primary/5'
                  }`}
                >
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  {isDraggingDocFile ? (
                    <>
                      <div className="w-10 h-10 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-md animate-bounce">
                        <Upload className="w-5 h-5" />
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-black text-primary">
                          วางไฟล์ที่นี่เพื่ออัปโหลดเอกสาร (Drop here)
                        </p>
                        <p className="text-[10px] text-primary/80 font-medium mt-0.5">
                          ปล่อยไฟล์เพื่อจัดเก็บเข้าคลังเอกสาร
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-10 h-10 rounded-2xl bg-muted group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                        <Upload className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                          ลากและวาง (Drag & Drop) หรือ แตะเพื่อเลือกไฟล์เอกสาร
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          รองรับไฟล์ JPG, PNG, PDF (ไม่เกิน 8MB)
                        </p>
                      </div>
                    </>
                  )}
                </label>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5">
                {t.documents.notes}
              </label>
              <textarea
                rows={2}
                placeholder="บันทึกรายละเอียดเพิ่มเติม เช่น เก็บไว้ในตู้เซฟห้องนอน, ต่ออายุผ่านแอป DLT"
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border/80">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-4 py-2.5 rounded-2xl border border-border text-xs font-bold hover:bg-muted"
              >
                {t.common.cancel}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-2xl bg-primary hover:bg-primary-600 active:scale-95 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
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

      {/* 9. LIGHTBOX PREVIEW MODAL */}
      {previewDoc && (
        <Modal
          isOpen={!!previewDoc}
          onClose={() => setPreviewDoc(null)}
          title={`เอกสาร: ${previewDoc.title}`}
          maxWidth="2xl"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-center p-2 rounded-2xl bg-black/5 dark:bg-white/5 border border-border/50 max-h-[75vh] overflow-hidden">
              {previewDoc.file_type?.startsWith('image/') || previewDoc.file_url?.startsWith('data:image/') ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewDoc.file_url!}
                  alt={previewDoc.title}
                  className="max-h-[70vh] w-auto max-w-full object-contain rounded-xl shadow-md"
                />
              ) : (
                <iframe
                  src={previewDoc.file_url!}
                  title={previewDoc.title}
                  className="w-full h-[70vh] rounded-xl border border-border"
                />
              )}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-border/60">
              <div className="min-w-0">
                <p className="font-extrabold text-sm text-foreground truncate">{previewDoc.title}</p>
                <p className="text-xs text-muted-foreground">
                  {previewDoc.sub_category ? `[${previewDoc.sub_category}] ` : ''}
                  {previewDoc.document_number ? `เลขที่: ${previewDoc.document_number}` : ''}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {previewDoc.document_number && (
                  <button
                    type="button"
                    onClick={() => handleCopyDocNumber(previewDoc.id, previewDoc.document_number!)}
                    className="px-3 py-2 rounded-xl bg-card hover:bg-muted border border-border text-foreground font-bold text-xs flex items-center gap-1.5 shadow-2xs"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>คัดลอกเลขที่</span>
                  </button>
                )}

                <a
                  href={previewDoc.file_url!}
                  download={`${previewDoc.title}.${previewDoc.file_type?.includes('pdf') ? 'pdf' : 'jpg'}`}
                  className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white font-extrabold text-xs flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  <span>ดาวน์โหลด</span>
                </a>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* 10. DELETE CONFIRMATION DIALOG */}
      <ConfirmDialog
        isOpen={!!deleteTargetId}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
