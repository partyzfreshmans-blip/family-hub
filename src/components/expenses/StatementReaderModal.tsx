'use client';

import React, { useState, useRef } from 'react';
import {
  FileText,
  Upload,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Check,
  CreditCard,
  FileSpreadsheet,
  ArrowRight,
  Loader2,
  Calendar,
  DollarSign,
  Tag,
  Users,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { MemberAvatar } from '@/components/ui/MemberAvatar';
import { FamilyMember } from '@/types';
import { formatCurrency, formatThaiDate } from '@/lib/utils';

export interface ParsedTransaction {
  id: string;
  selected: boolean;
  expenseDate: string;
  description: string;
  amount: number;
  category: string;
  paidBy: string;
  note?: string;
  raw?: string;
}

interface StatementReaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  familyMembers: FamilyMember[];
  currentMemberId: string;
  onImportSuccess: () => void;
}

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Food: [
    '7-eleven', '7-11', 'seven', 'lotus', 'big c', 'tops', 'makro', 'gourmet', 'foodland',
    'grabfood', 'lineman', 'foodpanda', 'shopeefood', 'robinhood',
    'starbucks', 'amazon', 'cafe', 'coffee', 'kfc', 'mcdonald', 'burger king', 'chester',
    'bar b q', 'shabu', 'suki', 'haidilao', 'mk', 'yayoi', 'fuji', 'bonchon',
    'อาหาร', 'ข้าว', 'ก๋วยเตี๋ยว', 'กาแฟ', 'ชา', 'เบเกอรี่', 'หมูกระทะ', 'ตลาด', 'ผลไม้', 'ขนม', 'ร้านอาหาร'
  ],
  Transport: [
    'ptt', 'or', 'shell', 'caltex', 'bangchak', 'susco', 'esso',
    'bts', 'mrt', 'srt', 'airlink', 'expressway', 'tollway', 'ทางด่วน', 'easy pass', 'm-flow', 'mflow',
    'grab', 'bolt', 'line man taxi', 'cabb', 'taxi',
    'ปั๊ม', 'น้ำมัน', 'เติมน้ำมัน', 'ที่จอดรถ', 'ค่าผ่านทาง', 'อู่', 'ล้างรถ', 'ขนส่ง'
  ],
  Utilities: [
    'mea', 'pea', 'mwa', 'pwa', 'การไฟฟ้านครหลวง', 'การไฟฟ้าส่วนภูมิภาค', 'การประปา',
    'true', 'ais', 'dtac', 'nt', '3bb', 'tot', 'cat',
    'ค่าไฟ', 'ค่าน้ำ', 'ค่าเน็ต', 'โทรศัพท์', 'อินเทอร์เน็ต', 'ส่วนกลาง'
  ],
  Shopping: [
    'shopee', 'lazada', 'tiktok', 'central', 'robinson', 'the mall', 'siam', 'iconsiam',
    'uniqlo', 'zara', 'h&m', 'decathlon', 'homepro', 'ikea', 'index', 'mr.diy', 'mrdiy',
    'b2s', 'officemate', 'watson', 'boots',
    'ช้อป', 'เสื้อผ้า', 'รองเท้า', 'ของใช้', 'ห้าง', 'สั่งของ'
  ],
  Health: [
    'hospital', 'clinic', 'pharmacy', 'lab',
    'รพ.', 'โรงพยาบาล', 'คลินิก', 'เภสัช', 'ร้านยา', 'ทันตกรรม', 'ทำฟัน', 'ตรวจสุขภาพ', 'หมอ'
  ],
  Education: [
    'school', 'university', 'college', 'academy', 'course', 'udemy', 'coursera',
    'โรงเรียน', 'มหาวิทยาลัย', 'ค่าเทอม', 'กวดวิชา', 'เรียนพิเศษ', 'หนังสือ', 'อุปกรณ์การเรียน'
  ],
  Entertainment: [
    'netflix', 'spotify', 'youtube', 'disney', 'apple.com/bill', 'major', 'sf cinema', 'cinema', 'steam', 'playstation',
    'โรงหนัง', 'ดูหนัง', 'เกม', 'คอนเสิร์ต'
  ],
};

function autoCategorize(text: string): string {
  const lower = text.toLowerCase();
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw.toLowerCase()))) {
      return cat;
    }
  }
  return 'Other';
}

function parseThaiOrIsoDate(rawDate: string): string {
  const today = new Date().toISOString().split('T')[0];
  if (!rawDate) return today;

  const clean = rawDate.trim().replace(/[.]/g, '/').replace(/[-]/g, '/');
  
  // Format DD/MM/YYYY or DD/MM/YY
  const dmyMatch = clean.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (dmyMatch) {
    let day = parseInt(dmyMatch[1], 10);
    let month = parseInt(dmyMatch[2], 10);
    let year = parseInt(dmyMatch[3], 10);

    // Buddhist year check (e.g. 2567 -> 2024, 67 -> 2024)
    if (year > 2500) year -= 543;
    else if (year > 50 && year < 100) year = (year + 2500) - 543;
    else if (year < 50) year = 2000 + year;

    const pad = (n: number) => String(n).padStart(2, '0');
    return `${year}-${pad(month)}-${pad(day)}`;
  }

  // Format YYYY/MM/DD
  const ymdMatch = clean.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})/);
  if (ymdMatch) {
    let year = parseInt(ymdMatch[1], 10);
    let month = parseInt(ymdMatch[2], 10);
    let day = parseInt(ymdMatch[3], 10);
    if (year > 2500) year -= 543;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${year}-${pad(month)}-${pad(day)}`;
  }

  return today;
}

export function parseStatementText(text: string, defaultPayerId: string): ParsedTransaction[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const results: ParsedTransaction[] = [];
  let idCounter = 1;

  for (const line of lines) {
    // Skip common header words
    if (
      line.includes('Statement') ||
      line.includes('เลขที่บัญชี') ||
      line.includes('ยอดคงเหลือ') ||
      line.includes('Account Number') ||
      line.includes('Beginning Balance') ||
      line.includes('Ending Balance') ||
      line.includes('วันที่,รายการ') ||
      line.toLowerCase().startsWith('date,')
    ) {
      continue;
    }

    // 1. CSV Format check (comma or tab separated)
    if (line.includes(',') || line.includes('\t')) {
      const parts = line.includes('\t') ? line.split('\t') : line.split(',');
      if (parts.length >= 2) {
        let datePart = '';
        let descPart = '';
        let amountPart = 0;

        for (const p of parts) {
          const cleanP = p.replace(/["']/g, '').trim();
          // Check for date
          if (!datePart && /\d{1,4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,4}/.test(cleanP)) {
            datePart = cleanP;
          }
          // Check for numeric amount
          const cleanNum = cleanP.replace(/,/g, '').replace(/[฿\+]/g, '');
          const parsedNum = parseFloat(cleanNum);
          if (!isNaN(parsedNum) && parsedNum !== 0) {
            // Negative or positive amount
            amountPart = Math.abs(parsedNum);
          } else if (cleanP.length > 2 && !/\d{10,}/.test(cleanP)) {
            // Text description
            if (!descPart) descPart = cleanP;
            else descPart += ' ' + cleanP;
          }
        }

        if (amountPart > 0 && (descPart || datePart)) {
          const finalDesc = descPart || 'รายการโอนเงิน';
          results.push({
            id: `stmt_${Date.now()}_${idCounter++}`,
            selected: true,
            expenseDate: parseThaiOrIsoDate(datePart),
            description: finalDesc,
            amount: amountPart,
            category: autoCategorize(finalDesc),
            paidBy: defaultPayerId,
            raw: line,
          });
          continue;
        }
      }
    }

    // 2. Free-text regex search (e.g. Bank SMS, e-slip copy paste, notifications)
    // Matches amounts like: 250, 1,250.00, 50.50 บาท / THB
    const amountMatch = line.match(/(?:จำนวนเงิน|ยอดเงิน|amount|จ่าย|โอน|จ่ายเงิน|THB|฿)?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?|\d+\.\d{1,2})\s*(?:บาท|THB|.-)?/i);
    const dateMatch = line.match(/(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})/);

    if (amountMatch) {
      const cleanNum = amountMatch[1].replace(/,/g, '');
      const parsedNum = parseFloat(cleanNum);

      if (!isNaN(parsedNum) && parsedNum > 0 && parsedNum < 10000000) {
        // Clean line to get description
        let desc = line
          .replace(amountMatch[0], '')
          .replace(/โอนเงินให้|โอนเงินไป|ชำระค่าสินค้า|PromptPay|พร้อมเพย์|QR Payment|สำเร็จ|เวลา \d{2}:\d{2}/gi, '')
          .trim();

        if (!desc || desc.length < 2) {
          desc = 'รายการใช้จ่ายจาก Statement';
        }

        results.push({
          id: `stmt_${Date.now()}_${idCounter++}`,
          selected: true,
          expenseDate: dateMatch ? parseThaiOrIsoDate(dateMatch[1]) : new Date().toISOString().split('T')[0],
          description: desc.slice(0, 60),
          amount: parsedNum,
          category: autoCategorize(desc),
          paidBy: defaultPayerId,
          raw: line,
        });
      }
    }
  }

  return results;
}

export function StatementReaderModal({
  isOpen,
  onClose,
  familyMembers,
  currentMemberId,
  onImportSuccess,
}: StatementReaderModalProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [inputText, setInputText] = useState('');
  const [parsedItems, setParsedItems] = useState<ParsedTransaction[]>([]);
  const [defaultPayer, setDefaultPayer] = useState<string>(currentMemberId);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = parseStatementText(content, defaultPayer);
        if (parsed.length === 0) {
          setErrorMsg('ไม่พบรายการค่าใช้จ่ายในไฟล์ กรุณาตรวจสอบรูปแบบไฟล์ หรือใช้แท็บวางข้อความ');
        } else {
          setParsedItems(parsed);
        }
      } catch (err) {
        setErrorMsg('เกิดข้อผิดพลาดในการอ่านไฟล์');
      } finally {
        setIsProcessing(false);
      }
    };
    reader.onerror = () => {
      setErrorMsg('ไม่สามารถอ่านไฟล์ได้');
      setIsProcessing(false);
    };

    reader.readAsText(file);
  };

  const handleParseText = () => {
    if (!inputText.trim()) {
      setErrorMsg('กรุณากรอกหรือวางข้อความ Statement');
      return;
    }
    setErrorMsg(null);
    setIsProcessing(true);
    setTimeout(() => {
      const parsed = parseStatementText(inputText, defaultPayer);
      if (parsed.length === 0) {
        setErrorMsg('ไม่พบรายการค่าใช้จ่าย กรุณาลองคัดลอกข้อความระบุวันที่และจำนวนเงินให้ชัดเจน');
      } else {
        setParsedItems(parsed);
      }
      setIsProcessing(false);
    }, 150);
  };

  const handleToggleSelect = (id: string) => {
    setParsedItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, selected: !item.selected } : item))
    );
  };

  const handleSelectAll = (select: boolean) => {
    setParsedItems((prev) => prev.map((item) => ({ ...item, selected: select })));
  };

  const handleItemChange = (id: string, field: keyof ParsedTransaction, value: any) => {
    setParsedItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handlePayerChangeAll = (newPayerId: string) => {
    setDefaultPayer(newPayerId);
    setParsedItems((prev) => prev.map((item) => ({ ...item, paidBy: newPayerId })));
  };

  const handleRemoveItem = (id: string) => {
    setParsedItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleImport = async () => {
    const selected = parsedItems.filter((i) => i.selected);
    if (selected.length === 0) {
      setErrorMsg('กรุณาเลือกอย่างน้อย 1 รายการเพื่อบันทึก');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/expenses/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: selected }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'ไม่สามารถบันทึกข้อมูลได้');
      }

      setSuccessMsg(`นำเข้ารายจ่ายสำเร็จ ${selected.length} รายการ`);
      setTimeout(() => {
        onImportSuccess();
        onClose();
        setParsedItems([]);
        setInputText('');
        setSuccessMsg(null);
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err.message || 'เกิดข้อผิดพลาดในการบันทึก');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCount = parsedItems.filter((i) => i.selected).length;
  const totalAmount = parsedItems
    .filter((i) => i.selected)
    .reduce((acc, curr) => acc + (curr.amount || 0), 0);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="อ่าน Statement & สลิปโอนเงินอัตโนมัติ"
      maxWidth="3xl"
    >
      <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
        {/* Error / Success Alerts */}
        {errorMsg && (
          <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {parsedItems.length === 0 ? (
          /* Step 1: Input / Upload */
          <div className="space-y-4">
            <div className="flex items-center p-1 bg-muted rounded-2xl">
              <button
                onClick={() => setActiveTab('upload')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'upload' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>อัปโหลดไฟล์ (CSV / Statement)</span>
              </button>
              <button
                onClick={() => setActiveTab('paste')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'paste' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>วางข้อความจากแอปธนาคาร</span>
              </button>
            </div>

            {activeTab === 'upload' ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border hover:border-primary/60 rounded-3xl p-8 text-center cursor-pointer bg-muted/20 hover:bg-muted/40 transition-all group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt,.json,.tsv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                  <FileSpreadsheet className="w-7 h-7" />
                </div>
                <h4 className="font-bold text-sm text-foreground">
                  คลิกเพื่อเลือกไฟล์ หรือลากไฟล์มาวางที่นี่
                </h4>
                <p className="text-xs text-muted-foreground mt-1">
                  รองรับไฟล์ CSV, TXT ส่งออกจาก KBank, SCB, BBL, Krungthai, TTB
                </p>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                  <Badge variant="primary" size="sm">กสิกร (KBank)</Badge>
                  <Badge variant="purple" size="sm">ไทยพาณิชย์ (SCB)</Badge>
                  <Badge variant="success" size="sm">กรุงเทพ / กรุงไทย</Badge>
                  <Badge variant="warning" size="sm">PromptPay SMS</Badge>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">
                    วางข้อความรายการ หรือ SMS แจ้งเตือน:
                  </label>
                  <textarea
                    rows={6}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={`ตัวอย่าง:\n23/08/2026 12:30 โอนเงินให้ ร้านอาหารส้มตำ 250.00 บาท\n23/08/2026 15:45 PTT ปั๊มน้ำมัน 1,200.00 บาท\n22/08/2026 19:10 Lotus Supermarket 850.00 บาท`}
                    className="w-full p-3.5 rounded-2xl border border-border bg-background text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleParseText}
                  disabled={isProcessing || !inputText.trim()}
                  className="w-full py-3 rounded-2xl bg-primary hover:bg-primary-600 active:scale-95 text-white text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  <span>สแกนและแยกหมวดหมู่อัตโนมัติ (Smart AI Parse)</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Step 2: Review, Edit & Confirm Table */
          <div className="space-y-4">
            {/* Action Bar */}
            <div className="p-4 rounded-2xl bg-primary-50/50 dark:bg-primary-950/20 border border-primary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-foreground">
                    ตรวจพบ {parsedItems.length} รายการ
                  </span>
                  <span className="text-xs font-extrabold text-primary">
                    (เลือก {selectedCount} รายการ: {formatCurrency(totalAmount)})
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  ระบบแยกหมวดหมู่ให้แล้ว คุณสามารถปรับเปลี่ยนหรือเลือกเฉพาะรายการที่ต้องการได้
                </p>
              </div>

              {/* Global Payer Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-foreground shrink-0 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-primary" /> จ่ายโดย:
                </span>
                <select
                  value={defaultPayer}
                  onChange={(e) => handlePayerChangeAll(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-border bg-card text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {familyMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nickname}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Selection quick toggles */}
            <div className="flex items-center justify-between px-1 text-xs">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleSelectAll(true)}
                  className="font-bold text-primary hover:underline"
                >
                  เลือกทั้งหมด
                </button>
                <span className="text-muted-foreground">•</span>
                <button
                  type="button"
                  onClick={() => handleSelectAll(false)}
                  className="font-bold text-muted-foreground hover:text-foreground"
                >
                  ยกเลิกทั้งหมด
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setParsedItems([]);
                  setInputText('');
                }}
                className="text-muted-foreground hover:text-rose-500 font-bold"
              >
                อ่านไฟล์ใหม่
              </button>
            </div>

            {/* Transactions List */}
            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
              {parsedItems.map((item) => (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    item.selected
                      ? 'bg-card border-border shadow-soft'
                      : 'bg-muted/30 border-border/40 opacity-50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <input
                      type="checkbox"
                      checked={item.selected}
                      onChange={() => handleToggleSelect(item.id)}
                      className="w-4 h-4 rounded text-primary focus:ring-primary border-border cursor-pointer shrink-0"
                    />

                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                          className="font-bold text-xs text-foreground bg-transparent border-b border-dashed border-border focus:border-primary focus:outline-none min-w-[180px] flex-1"
                        />
                        <span className="font-extrabold text-sm text-foreground shrink-0">
                          {formatCurrency(item.amount)}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                        <input
                          type="date"
                          value={item.expenseDate}
                          onChange={(e) => handleItemChange(item.id, 'expenseDate', e.target.value)}
                          className="px-2 py-0.5 rounded-lg border border-border bg-background text-[11px]"
                        />

                        <select
                          value={item.category}
                          onChange={(e) => handleItemChange(item.id, 'category', e.target.value)}
                          className="px-2 py-0.5 rounded-lg border border-border bg-background text-[11px] font-bold"
                        >
                          <option value="Food">อาหารและเครื่องดื่ม</option>
                          <option value="Transport">การเดินทาง / น้ำมัน</option>
                          <option value="Utilities">ค่าน้ำ ค่าไฟ อินเทอร์เน็ต</option>
                          <option value="Shopping">ซื้อของใช้ / ช้อปปิ้ง</option>
                          <option value="Health">สุขภาพ / ยา</option>
                          <option value="Education">การศึกษา</option>
                          <option value="Entertainment">บันเทิง / กิจกรรม</option>
                          <option value="Other">อื่นๆ</option>
                        </select>

                        <select
                          value={item.paidBy}
                          onChange={(e) => handleItemChange(item.id, 'paidBy', e.target.value)}
                          className="px-2 py-0.5 rounded-lg border border-border bg-background text-[11px]"
                        >
                          {familyMembers.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.nickname}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveItem(item.id)}
                    className="p-1.5 rounded-xl text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors self-end sm:self-auto"
                    title="ลบรายการนี้"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Confirm Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setParsedItems([])}
                className="px-4 py-2.5 rounded-2xl border border-border text-xs font-bold hover:bg-muted"
              >
                ย้อนกลับ
              </button>
              <button
                type="button"
                onClick={handleImport}
                disabled={isSubmitting || selectedCount === 0}
                className="px-6 py-2.5 rounded-2xl bg-primary hover:bg-primary-600 active:scale-95 text-white text-xs font-bold shadow-md transition-all flex items-center gap-2"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                <span>บันทึก {selectedCount} รายการ ({formatCurrency(totalAmount)})</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
