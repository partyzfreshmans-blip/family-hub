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
  'data',
  '.DS_Store'
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

async function uploadFile(filePath, repoPath) {
  const content = fs.readFileSync(filePath);
  const base64Content = content.toString('base64');
  const apiUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${repoPath}`;

  // Check if file exists to get SHA
  let sha;
  try {
    const getRes = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        'User-Agent': 'Family-Hub-Uploader',
        Accept: 'application/vnd.github+json',
      },
    });
    if (getRes.ok) {
      const data = await getRes.json();
      sha = data.sha;
    }
  } catch (_) {}

  const body = {
    message: `Upload ${repoPath}`,
    content: base64Content,
  };
  if (sha) {
    body.sha = sha;
  }

  const putRes = await fetch(apiUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      'User-Agent': 'Family-Hub-Uploader',
      'Content-Type': 'application/json',
      Accept: 'application/vnd.github+json',
    },
    body: JSON.stringify(body),
  });

  if (putRes.ok) {
    console.log(`✅ Uploaded: ${repoPath}`);
  } else {
    const errText = await putRes.text();
    console.error(`❌ Failed: ${repoPath} -> ${errText}`);
  }
}

async function main() {
  console.log(`🚀 กำลังอัปโหลดโปรเจกต์ Family Hub ไปยัง ${REPO_OWNER}/${REPO_NAME}...`);
  const rootDir = process.cwd();
  const allFiles = getAllFiles(rootDir);

  for (const file of allFiles) {
    const relPath = path.relative(rootDir, file).replace(/\\/g, '/');
    await uploadFile(file, relPath);
  }

  console.log('\n🎉 อัปโหลดไฟล์ทั้งหมดขึ้น GitHub เสร็จสมบูรณ์แล้ว!');
}

main().catch(console.error);
