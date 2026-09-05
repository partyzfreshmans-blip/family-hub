import { DocumentCategory, FamilyMember } from '@/types';

export interface OcrDetectionResult {
  title?: string;
  category?: DocumentCategory;
  sub_category?: string;
  document_number?: string;
  issuer?: string;
  issue_date?: string; // YYYY-MM-DD
  expiry_date?: string; // YYYY-MM-DD
  owner_member_id?: string;
  owner_nickname?: string;
  notes?: string;
  confidence?: number;
  raw_text?: string;
}

// Helper to convert Thai Buddhist Year (พ.ศ.) to CE (ค.ศ.)
export function parseThaiDateToIso(dateStr: string): string | undefined {
  if (!dateStr) return undefined;

  const thaiMonths: Record<string, string> = {
    'ม.ค.': '01', 'มกราคม': '01',
    'ก.พ.': '02', 'กุมภาพันธ์': '02',
    'มี.ค.': '03', 'มีนาคม': '03',
    'เม.ย.': '04', 'เมษายน': '04',
    'พ.ค.': '05', 'พฤษภาคม': '05',
    'มิ.ย.': '06', 'มิถุนายน': '06',
    'ก.ค.': '07', 'กรกฎาคม': '07',
    'ส.ค.': '08', 'สิงหาคม': '08',
    'ก.ย.': '09', 'กันยายน': '09',
    'ต.ค.': '10', 'ตุลาคม': '10',
    'พ.ย.': '11', 'พฤศจิกายน': '11',
    'ธ.ค.': '12', 'ธันวาคม': '12',
  };

  const textMonthRegex = /(\d{1,2})\s*([ก-๙\.]+)\s*(\d{4})/;
  const slashRegex = /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/;

  const textMatch = dateStr.match(textMonthRegex);
  if (textMatch) {
    const day = textMatch[1].padStart(2, '0');
    const monthKey = textMatch[2].replace(/\s+/g, '');
    let month = '01';
    for (const [key, val] of Object.entries(thaiMonths)) {
      if (monthKey.includes(key)) {
        month = val;
        break;
      }
    }
    let year = parseInt(textMatch[3], 10);
    if (year > 2400) year -= 543; // convert พ.ศ. to ค.ศ.
    return `${year}-${month}-${day}`;
  }

  const slashMatch = dateStr.match(slashRegex);
  if (slashMatch) {
    const day = slashMatch[1].padStart(2, '0');
    const month = slashMatch[2].padStart(2, '0');
    let year = parseInt(slashMatch[3], 10);
    if (year > 2400) year -= 543;
    return `${year}-${month}-${day}`;
  }

  return undefined;
}

// Thai Document Heuristics Engine
export function parseThaiDocumentHeuristics(
  text: string,
  familyMembers: FamilyMember[] = []
): OcrDetectionResult {
  const clean = text.replace(/\r?\n/g, ' ').replace(/\s+/g, ' ');
  const result: OcrDetectionResult = {
    raw_text: text,
    confidence: 0.8,
  };

  const lower = clean.toLowerCase();

  // 1. Thai National ID Card (บัตรประจำตัวประชาชน)
  if (
    clean.includes('บัตรประจำตัวประชาชน') ||
    lower.includes('thai national id') ||
    lower.includes('identification card') ||
    clean.includes('เลขประจำตัวประชาชน')
  ) {
    result.title = 'บัตรประจำตัวประชาชน';
    result.category = 'PERSONAL';
    result.issuer = 'กรมการปกครอง';

    // 13 Digits pattern: e.g. 1 1002 00123 45 6 or 1-1002-00123-45-6 or 1100200123456
    const idMatch = clean.match(/(\d\s*[\-\s]?\s*\d{4}\s*[\-\s]?\s*\d{5}\s*[\-\s]?\s*\d{2}\s*[\-\s]?\s*\d)/);
    if (idMatch) {
      const digitsOnly = idMatch[1].replace(/\D/g, '');
      if (digitsOnly.length === 13) {
        result.document_number = `${digitsOnly[0]}-${digitsOnly.slice(1, 5)}-${digitsOnly.slice(5, 10)}-${digitsOnly.slice(10, 12)}-${digitsOnly[12]}`;
      } else {
        result.document_number = idMatch[1].trim();
      }
    }

    // Expiry date (วันหมดอายุ)
    if (clean.includes('ตลอดชีพ')) {
      result.expiry_date = '2099-12-31';
      result.notes = 'บัตรประจำตัวประชาชน (ตลอดชีพ)';
    } else {
      const expMatch = clean.match(/หมดอายุ\s*[:\.]?\s*(\d{1,2}\s*[ก-๙\.]+\s*\d{4}|\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/);
      if (expMatch) {
        result.expiry_date = parseThaiDateToIso(expMatch[1]);
      }
    }

    // Issue date (วันออกบัตร)
    const issueMatch = clean.match(/วันออกบัตร\s*[:\.]?\s*(\d{1,2}\s*[ก-๙\.]+\s*\d{4}|\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/);
    if (issueMatch) {
      result.issue_date = parseThaiDateToIso(issueMatch[1]);
    }
  }

  // 2. Driving License (ใบขับขี่)
  else if (
    clean.includes('ใบอนุญาตขับรถ') ||
    lower.includes('driving licence') ||
    clean.includes('กรมการขนส่งทางบก')
  ) {
    if (clean.includes('จักรยานยนต์') || clean.includes('มอเตอร์ไซค์')) {
      result.title = 'ใบขับขี่รถจักรยานยนต์';
    } else {
      result.title = 'ใบขับขี่รถยนต์ส่วนบุคคล';
    }
    result.category = 'PERSONAL';
    result.issuer = 'กรมการขนส่งทางบก';

    const numMatch = clean.match(/(?:ฉบับที่|เลขที่|no\.)\s*[:\.]?\s*([0-9A-Za-z\/\-]+)/i);
    if (numMatch) {
      result.document_number = numMatch[1].trim();
    }

    if (clean.includes('ตลอดชีพ')) {
      result.expiry_date = '2099-12-31';
    } else {
      const expMatch = clean.match(/หมดอายุ\s*[:\.]?\s*(\d{1,2}\s*[ก-๙\.]+\s*\d{4}|\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/);
      if (expMatch) {
        result.expiry_date = parseThaiDateToIso(expMatch[1]);
      }
    }

    const issueMatch = clean.match(/วันอนุญาต\s*[:\.]?\s*(\d{1,2}\s*[ก-๙\.]+\s*\d{4}|\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/);
    if (issueMatch) {
      result.issue_date = parseThaiDateToIso(issueMatch[1]);
    }
  }

  // 3. Vehicle Insurance / Tax / PRB (พ.ร.บ. / ประกันภัยรถยนต์ / ป้ายภาษี)
  else if (
    clean.includes('พ.ร.บ.') ||
    clean.includes('คุ้มครองผู้ประสบภัยจากรถ') ||
    clean.includes('ตารางกรมธรรม์ประกันภัย') ||
    clean.includes('ประกันภัยรถยนต์') ||
    clean.includes('ป้ายภาษี') ||
    clean.includes('วิริยะ') ||
    clean.includes('ทิพย') ||
    clean.includes('กรุงเทพประกันภัย') ||
    clean.includes('เมืองไทยประกันภัย') ||
    clean.includes('สินมั่นคง') ||
    clean.includes('คุ้มภัยโตเกียวมารีน')
  ) {
    result.category = 'VEHICLE';

    if (clean.includes('พ.ร.บ.') || clean.includes('คุ้มครองผู้ประสบภัยจากรถ')) {
      result.title = 'พ.ร.บ. คุ้มครองผู้ประสบภัยจากรถ';
    } else if (clean.includes('ชั้น 1') || clean.includes('ประเภท 1')) {
      result.title = 'ประกันภัยรถยนต์ (ชั้น 1)';
    } else if (clean.includes('ชั้น 2') || clean.includes('ประเภท 2')) {
      result.title = 'ประกันภัยรถยนต์ (ชั้น 2)';
    } else {
      result.title = 'ประกันภัยรถยนต์';
    }

    if (clean.includes('วิริยะประกันภัย')) result.issuer = 'บมจ.วิริยะประกันภัย';
    else if (clean.includes('ทิพยประกันภัย')) result.issuer = 'บมจ.ทิพยประกันภัย';
    else if (clean.includes('กรุงเทพประกันภัย')) result.issuer = 'บมจ.กรุงเทพประกันภัย';
    else if (clean.includes('เมืองไทยประกันภัย')) result.issuer = 'บมจ.เมืองไทยประกันภัย';
    else if (clean.includes('คุ้มภัยโตเกียวมารีน')) result.issuer = 'บมจ.คุ้มภัยโตเกียวมารีนประกันภัย';
    else result.issuer = 'บริษัทประกันภัย';

    const polMatch = clean.match(/(?:กรมธรรม์เลขที่|เลขที่กรมธรรม์|policy no\.?)\s*[:\.]?\s*([0-9A-Za-z\/\-\.]+)/i);
    if (polMatch) {
      result.document_number = polMatch[1].trim();
    }

    const plateMatch = clean.match(/(?:ทะเบียน|เลขทะเบียน)\s*[:\.]?\s*([0-9]?[ก-ฮ]{1,2}\s*[\-\s]?\s*[0-9]{1,4}(?:\s*[ก-๙\.]+)?)/);
    if (plateMatch) {
      result.sub_category = plateMatch[1].trim();
      if (!result.document_number) result.document_number = plateMatch[1].trim();
    }

    const expMatch = clean.match(/(?:สิ้นสุดวันที่|วันสิ้นสุดความคุ้มครอง|หมดอายุ)\s*[:\.]?\s*(\d{1,2}\s*[ก-๙\.]+\s*\d{4}|\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/);
    if (expMatch) {
      result.expiry_date = parseThaiDateToIso(expMatch[1]);
    }

    const startMatch = clean.match(/(?:เริ่มต้นวันที่|วันเริ่มต้นความคุ้มครอง)\s*[:\.]?\s*(\d{1,2}\s*[ก-๙\.]+\s*\d{4}|\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/);
    if (startMatch) {
      result.issue_date = parseThaiDateToIso(startMatch[1]);
    }
  }

  // 4. Life & Health Insurance (ประกันชีวิต / สุขภาพ)
  else if (
    clean.includes('AIA') ||
    clean.includes('FWD') ||
    clean.includes('ไทยประกันชีวิต') ||
    clean.includes('เมืองไทยประกันชีวิต') ||
    clean.includes('อลิอันซ์') ||
    clean.includes('Allianz') ||
    clean.includes('กรุงไทย-แอกซ่า') ||
    clean.includes('ประกันสุขภาพ') ||
    clean.includes('ประกันชีวิต')
  ) {
    result.category = 'FINANCE';
    result.title = clean.includes('ประกันสุขภาพ') ? 'กรมธรรม์ประกันสุขภาพ' : 'กรมธรรม์ประกันชีวิต';

    if (clean.includes('AIA')) result.issuer = 'AIA ประกันชีวิต';
    else if (clean.includes('FWD')) result.issuer = 'FWD ประกันชีวิต';
    else if (clean.includes('ไทยประกันชีวิต')) result.issuer = 'ไทยประกันชีวิต';
    else if (clean.includes('เมืองไทยประกันชีวิต')) result.issuer = 'เมืองไทยประกันชีวิต';
    else if (clean.includes('อลิอันซ์') || clean.includes('Allianz')) result.issuer = 'อลิอันซ์ อยุธยา';
    else if (clean.includes('กรุงไทย-แอกซ่า')) result.issuer = 'กรุงไทย-แอกซ่า ประกันชีวิต';

    const polMatch = clean.match(/(?:กรมธรรม์เลขที่|เลขที่กรมธรรม์|policy no\.?)\s*[:\.]?\s*([0-9A-Za-z\/\-\.]+)/i);
    if (polMatch) {
      result.document_number = polMatch[1].trim();
    }
  }

  // 5. Birth Certificate (สูติบัตร)
  else if (clean.includes('สูติบัตร') || clean.includes('หนังสือรับรองการเกิด')) {
    result.title = 'สูติบัตร (ใบเกิด)';
    result.category = 'PERSONAL';
    result.issuer = 'สำนักทะเบียนอำเภอ/ท้องถิ่น';

    const numMatch = clean.match(/(?:เลขที่|สูติบัตรเลขที่)\s*[:\.]?\s*([0-9A-Za-z\/\-]+)/);
    if (numMatch) {
      result.document_number = numMatch[1].trim();
    }

    const birthMatch = clean.match(/(?:เกิดวันที่|วันที่)\s*[:\.]?\s*(\d{1,2}\s*[ก-๙\.]+\s*\d{4}|\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/);
    if (birthMatch) {
      result.issue_date = parseThaiDateToIso(birthMatch[1]);
    }
  }

  // 6. House Registration / Title Deed (ทะเบียนบ้าน / โฉนดที่ดิน)
  else if (clean.includes('สำเนาทะเบียนบ้าน') || clean.includes('สมุดประจำบ้าน') || clean.includes('ทะเบียนบ้าน')) {
    result.title = 'สำเนาทะเบียนบ้าน';
    result.category = 'HOUSE';
    result.issuer = 'สำนักทะเบียนท้องถิ่น';
    const hMatch = clean.match(/(?:รหัสประจำบ้าน|เลขรหัสประจำบ้าน)\s*[:\.]?\s*([0-9\-]+)/);
    if (hMatch) result.document_number = hMatch[1].trim();
  } else if (clean.includes('โฉนดที่ดิน') || clean.includes('น.ส. 4') || clean.includes('ตราจอง')) {
    result.title = 'โฉนดที่ดิน (น.ส. 4)';
    result.category = 'HOUSE';
    result.issuer = 'กรมที่ดิน';
    const dMatch = clean.match(/(?:โฉนดที่ดินเลขที่|เลขที่โฉนด)\s*[:\.]?\s*([0-9]+)/);
    if (dMatch) result.document_number = dMatch[1].trim();
  }

  // 7. Bank Account / Passbook (สมุดบัญชีธนาคาร)
  else if (
    clean.includes('กสิกรไทย') ||
    clean.includes('ไทยพาณิชย์') ||
    clean.includes('กรุงไทย') ||
    clean.includes('กรุงเทพ') ||
    clean.includes('ทหารไทยธนชาต') ||
    clean.includes('ttb') ||
    clean.includes('ออมสิน') ||
    clean.includes('ธอส.') ||
    clean.includes('เลขที่บัญชี')
  ) {
    result.category = 'FINANCE';
    result.title = 'สมุดบัญชีธนาคาร';

    if (clean.includes('กสิกรไทย') || lower.includes('kasikorn')) result.issuer = 'ธนาคารกสิกรไทย';
    else if (clean.includes('ไทยพาณิชย์') || lower.includes('scb')) result.issuer = 'ธนาคารไทยพาณิชย์';
    else if (clean.includes('กรุงไทย')) result.issuer = 'ธนาคารกรุงไทย';
    else if (clean.includes('กรุงเทพ') || lower.includes('bangkok bank')) result.issuer = 'ธนาคารกรุงเทพ';
    else if (clean.includes('ttb') || clean.includes('ทหารไทยธนชาต')) result.issuer = 'ธนาคารทหารไทยธนชาต (ttb)';
    else if (clean.includes('ออมสิน')) result.issuer = 'ธนาคารออมสิน';
    else if (clean.includes('ธอส.')) result.issuer = 'ธนาคารอาคารสงเคราะห์ (ธอส.)';

    const accMatch = clean.match(/(?:เลขที่บัญชี|account no\.?)\s*[:\.]?\s*([0-9\-\s]{9,15})/i);
    if (accMatch) {
      result.document_number = accMatch[1].trim();
    }
  }

  // 8. Match Family Member Owner
  if (familyMembers.length > 0) {
    for (const mem of familyMembers) {
      const nick = mem.nickname?.trim();
      const display = mem.display_name?.trim();

      if (nick && clean.includes(nick)) {
        result.owner_member_id = mem.id;
        result.owner_nickname = nick;
        if (!result.sub_category && result.category === 'PERSONAL') {
          result.sub_category = nick;
        }
        break;
      }
      if (display && clean.includes(display)) {
        result.owner_member_id = mem.id;
        result.owner_nickname = nick || display;
        if (!result.sub_category && result.category === 'PERSONAL') {
          result.sub_category = nick || display;
        }
        break;
      }
    }
  }

  // Fallback title if none detected
  if (!result.title) {
    result.title = 'เอกสารครอบครัวที่สแกนแล้ว';
    result.category = result.category || 'OTHER';
  }

  return result;
}

// Client-Side Tesseract OCR Runner with Image Preprocessing
export async function runClientOcr(
  imageSource: string | File | Blob,
  onProgress?: (progress: number, statusText: string) => void
): Promise<string> {
  const { createWorker } = await import('tesseract.js');

  onProgress?.(10, 'กำลังเตรียมโมเดล AI OCR ภาษาไทยและภาษาอังกฤษ...');
  const worker = await createWorker(['tha', 'eng'], 1, {
    logger: (m) => {
      if (m.status === 'recognizing text') {
        const pct = Math.round(20 + (m.progress || 0) * 75);
        onProgress?.(pct, `กำลังอ่านตัวอักษรและประมวลผล (${Math.round((m.progress || 0) * 100)}%)...`);
      }
    },
  });

  try {
    onProgress?.(30, 'กำลังวิเคราะห์ข้อความบนเอกสาร...');
    const ret = await worker.recognize(imageSource);
    onProgress?.(100, 'ประมวลผลเอกสารสำเร็จ');
    await worker.terminate();
    return ret.data.text || '';
  } catch (err) {
    await worker.terminate();
    throw err;
  }
}
