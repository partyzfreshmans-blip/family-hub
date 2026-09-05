import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserContext } from '@/lib/session';
import { query } from '@/lib/db';
import { FamilyMember } from '@/types';
import { parseThaiDocumentHeuristics } from '@/lib/ocr';

export async function POST(req: NextRequest) {
  try {
    const ctx = await getCurrentUserContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { imageBase64, mimeType, rawText } = body;

    // Fetch active family members to aid owner matching
    const members = await query<FamilyMember>(
      'SELECT id, nickname, member_color, role FROM family_members WHERE family_id = ?',
      [ctx.family.id]
    );

    // If client already provided raw text extracted via client OCR, parse with heuristics
    if (rawText && typeof rawText === 'string') {
      const detected = parseThaiDocumentHeuristics(rawText, members);
      return NextResponse.json({
        success: true,
        source: 'heuristics',
        detected,
      });
    }

    // Check for Google Gemini Vision API Key
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    if (!apiKey || !imageBase64) {
      // Instruct client to run client-side Tesseract OCR
      return NextResponse.json({
        success: true,
        fallbackToClient: true,
        message: 'No Gemini API key configured. Client OCR will be used.',
      });
    }

    // Clean base64 string
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
    const cleanMime = mimeType || 'image/jpeg';

    const memberListStr = members.map((m) => `${m.nickname} (ID: ${m.id})`).join(', ');

    const prompt = `
คุณคือผู้เชี่ยวชาญด้าน OCR และการสกัดข้อมูลเอกสารไทย (Thai Document Information Extraction)
โปรดอ่านรูปภาพเอกสารนี้อย่างละเอียด และแปลงข้อมูลสำคัญออกมาเป็น JSON โดยยึดตาม Schema ต่อไปนี้เท่านั้น:

Schema:
{
  "title": "ชื่อชนิดเอกสาร เช่น บัตรประจำตัวประชาชน, ใบขับขี่รถยนต์, พ.ร.บ. คุ้มครองผู้ประสบภัยจากรถ, กรมธรรม์ประกันภัยรถยนต์, ประกันสุขภาพ, โฉนดที่ดิน, ทะเบียนบ้าน, สูติบัตร, สมุดบัญชีธนาคาร",
  "category": "HOUSE" หรือ "VEHICLE" หรือ "PERSONAL" หรือ "FINANCE" หรือ "OTHER",
  "sub_category": "หมวดหมู่ย่อย เช่น ชื่อสมาชิกเจ้าของ (สำหรับ PERSONAL), ยี่ห้อรถ/ทะเบียน (สำหรับ VEHICLE), ธนาคาร (สำหรับ FINANCE), บ้าน/คอนโด (สำหรับ HOUSE)",
  "document_number": "เลขประจำตัว 13 หลัก / เลขที่กรมธรรม์ / เลขที่ใบอนุญาต / เลขทะเบียนรถ / เลขที่บัญชี / เลขที่โฉนด",
  "issuer": "หน่วยงานหรือบริษัทผู้ออกเอกสาร เช่น กรมการปกครอง, กรมการขนส่งทางบก, วิริยะประกันภัย, AIA, ธนาคารกสิกรไทย",
  "issue_date": "วันที่ออกเอกสารในรูปแบบ YYYY-MM-DD (แปลง พ.ศ. เป็น ค.ศ. ให้ถูกต้อง)",
  "expiry_date": "วันหมดอายุ / วันสิ้นสุดความคุ้มครอง ในรูปแบบ YYYY-MM-DD (หากเป็นตลอดชีพให้ใส่ 2099-12-31)",
  "owner_member_id": "หากพบชื่อที่ตรงกับสมาชิกในครอบครัวต่อไปนี้ ให้ระบุ ID: [${memberListStr}] หรือเว้นว่างไว้ถ้าไม่พบ",
  "notes": "รายละเอียดเพิ่มเติมหรือหมายเหตุสั้นๆ จากเอกสาร"
}

ตอบกลับเป็น JSON เท่านั้น ไม่ต้องใส่คำอธิบายเพิ่มเติม
`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: cleanMime,
                  data: cleanBase64,
                },
              },
            ],
          },
        ],
        generationConfig: {
          response_mime_type: 'application/json',
          temperature: 0.1,
        },
      }),
    });

    if (!geminiRes.ok) {
      console.warn('Gemini OCR failed, falling back to client OCR:', await geminiRes.text());
      return NextResponse.json({
        success: true,
        fallbackToClient: true,
      });
    }

    const geminiData = await geminiRes.json();
    const rawJsonText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawJsonText) {
      return NextResponse.json({
        success: true,
        fallbackToClient: true,
      });
    }

    const detected = JSON.parse(rawJsonText);

    return NextResponse.json({
      success: true,
      source: 'gemini_ai',
      detected,
    });
  } catch (error) {
    console.error('OCR Route error:', error);
    return NextResponse.json({
      success: true,
      fallbackToClient: true,
    });
  }
}
