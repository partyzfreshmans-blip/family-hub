import fs from 'fs';
import path from 'path';

const REPO_OWNER = 'partyzfreshmans-blip';
const REPO_NAME = 'family-hub';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || process.argv[2];

if (!GITHUB_TOKEN) {
  console.error('❌ กรุณาระบุ GITHUB_TOKEN เช่น: node scripts/github-upload.mjs ghp_xxxxxxxxxxxx');
  process.exit(1);
}

const IGNORED = [
  'node_modules',
  '.next',
  '.git',
  '.env.local',
  '.env',
  'data',
  '.DS_Store',
  'push.bat',
  'push.ps1',
];

function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    if (IGNORED.includes(file)) return;
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
    } else {
      arrayOfFiles.push(fullPath);
    }
  });

  return arrayOfFiles;
}

const headers = {
  Authorization: `Bearer ${GITHUB_TOKEN}`,
  'User-Agent': 'Family-Hub-Atomic-Uploader',
  'Content-Type': 'application/json',
  Accept: 'application/vnd.github+json',
};

async function ghFetch(endpoint, options = {}) {
  const res = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}${endpoint}`, {
    ...options,
    headers: { ...headers, ...options.headers },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub API Error ${res.status} on ${endpoint}: ${text}`);
  }
  return res.json();
}

async function createBlob(filePath) {
  const content = fs.readFileSync(filePath);
  const base64Content = content.toString('base64');
  const res = await ghFetch('/git/blobs', {
    method: 'POST',
    body: JSON.stringify({
      content: base64Content,
      encoding: 'base64',
    }),
  });
  return res.sha;
}

async function main() {
  console.log(`🚀 กำลังรวบรวมไฟล์ทั้งหมดของ Family Hub...`);
  const rootDir = process.cwd();
  const allFiles = getAllFiles(rootDir);

  // 1. Get latest commit SHA on main
  console.log(`📡 ดึงข้อมูล commit ล่าสุดของ branch main...`);
  let parentCommitSha = null;
  try {
    const refData = await ghFetch('/git/ref/heads/main');
    parentCommitSha = refData.object.sha;
  } catch (err) {
    console.log(`⚠️ ไม่พบ ref main, กำลังลอง master...`);
    try {
      const refMaster = await ghFetch('/git/ref/heads/master');
      parentCommitSha = refMaster.object.sha;
    } catch (_) {}
  }

  // 2. Upload blobs concurrently
  console.log(`📦 กำลังสร้าง Blob สำหรับไฟล์ทั้งหมด ${allFiles.length} ไฟล์...`);
  const treeEntries = [];

  for (let i = 0; i < allFiles.length; i++) {
    const file = allFiles[i];
    const relPath = path.relative(rootDir, file).replace(/\\/g, '/');
    const blobSha = await createBlob(file);
    treeEntries.push({
      path: relPath,
      mode: '100644',
      type: 'blob',
      sha: blobSha,
    });
    process.stdout.write(`\r✅ อัปโหลด Blobs: ${i + 1}/${allFiles.length} ไฟล์ (${relPath})          `);
  }
  console.log('\n');

  // 3. Create Tree
  console.log(`🌳 กำลังสร้าง Git Tree ใน commit เดียว...`);
  const treeData = await ghFetch('/git/trees', {
    method: 'POST',
    body: JSON.stringify({
      tree: treeEntries,
    }),
  });

  // 4. Create Single Commit
  console.log(`📝 กำลังสร้าง 1 Atomic Commit: "Release Family Hub with Timeline & Recurrence"...`);
  const commitData = await ghFetch('/git/commits', {
    method: 'POST',
    body: JSON.stringify({
      message: 'Release Family Hub (Timeline Chart & Repeat Recurrence)',
      tree: treeData.sha,
      parents: parentCommitSha ? [parentCommitSha] : [],
    }),
  });

  // 5. Update Ref
  console.log(`🔗 กำลังอัปเดต main branch ไปยัง commit ใหม่ (${commitData.sha.substring(0, 7)})...`);
  try {
    await ghFetch('/git/refs/heads/main', {
      method: 'PATCH',
      body: JSON.stringify({
        sha: commitData.sha,
        force: true,
      }),
    });
  } catch (e) {
    await ghFetch('/git/refs', {
      method: 'POST',
      body: JSON.stringify({
        ref: 'refs/heads/main',
        sha: commitData.sha,
      }),
    });
  }

  console.log(`\n🎉 สำเร็จแล้ว! รวมไฟล์ทั้งหมด ${allFiles.length} ไฟล์ขึ้น GitHub ใน 1 Commit เรียบร้อย!`);
}

main().catch(console.error);
