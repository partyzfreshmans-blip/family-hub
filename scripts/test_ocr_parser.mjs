import { parseThaiDocumentHeuristics, parseThaiDateToIso } from '../src/lib/ocr.ts';

const mockMembers = [
  { id: 'mem_dad', nickname: 'พ่อ', display_name: 'พ่อ' },
  { id: 'mem_mom', nickname: 'แม่', display_name: 'แม่' },
  { id: 'mem_ton', nickname: 'น้องต้น', display_name: 'น้องต้น' },
  { id: 'mem_may', nickname: 'น้องเมย์', display_name: 'น้องเมย์' },
];

console.log('--- Testing Thai Date Conversion ---');
console.log('15 ม.ค. 2569 ->', parseThaiDateToIso('15 ม.ค. 2569'));
console.log('31/12/2570 ->', parseThaiDateToIso('31/12/2570'));

console.log('\n--- Testing Thai ID Card OCR ---');
const idText = `
บัตรประจำตัวประชาชน Thai National ID Card
เลขประจำตัวประชาชน 1 1002 00456 78 9
ชื่อ นายสมศักดิ์ พ่อ สุขใจ
เกิดวันที่ 1 ม.ค. 2530
วันออกบัตร 10 พ.ค. 2565
วันหมดอายุ 10 พ.ค. 2573
`;
const idResult = parseThaiDocumentHeuristics(idText, mockMembers);
console.log('ID Result:', JSON.stringify(idResult, null, 2));

console.log('\n--- Testing Vehicle PRB / Insurance OCR ---');
const prbText = `
ตารางกรมธรรม์ประกันภัยคุ้มครองผู้ประสบภัยจากรถ (พ.ร.บ.)
บมจ.วิริยะประกันภัย
กรมธรรม์เลขที่ 09123-67101/POL-99812
เลขทะเบียน 1กข-9999 กทม.
วันเริ่มต้นความคุ้มครอง 15/06/2568
วันสิ้นสุดความคุ้มครอง 15/06/2569
`;
const prbResult = parseThaiDocumentHeuristics(prbText, mockMembers);
console.log('PRB Result:', JSON.stringify(prbResult, null, 2));

console.log('\n--- Testing Driving License OCR ---');
const licenseText = `
กรมการขนส่งทางบก
ใบอนุญาตขับรถยนต์ส่วนบุคคล
ฉบับที่ 65001234
วันอนุญาต 1 ม.ค. 2564
วันหมดอายุ 1 ม.ค. 2569
`;
const licenseResult = parseThaiDocumentHeuristics(licenseText, mockMembers);
console.log('License Result:', JSON.stringify(licenseResult, null, 2));

if (idResult.title === 'บัตรประจำตัวประชาชน' && idResult.document_number === '1-1002-00456-78-9' && idResult.owner_nickname === 'พ่อ') {
  console.log('\n✅ Thai ID Card parser PASSED');
} else {
  console.error('❌ Thai ID Card parser FAILED');
  process.exit(1);
}

if (prbResult.category === 'VEHICLE' && prbResult.issuer === 'บมจ.วิริยะประกันภัย' && prbResult.sub_category === '1กข-9999 กทม.') {
  console.log('✅ PRB parser PASSED');
} else {
  console.error('❌ PRB parser FAILED');
  process.exit(1);
}

console.log('\n🎉 ALL OCR PARSER UNIT TESTS PASSED!');
