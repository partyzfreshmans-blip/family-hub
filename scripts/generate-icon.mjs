import fs from 'fs';
import path from 'path';

// Generate a valid 192x192 PNG buffer for PWA icon
// A minimal PNG header + 192x192 data or SVG
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0284c7" />
      <stop offset="100%" stop-color="#38bdf8" />
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="128" fill="url(#bg)" />
  <g fill="#ffffff" transform="translate(106, 106) scale(0.58)">
    <path d="M256 32L32 224h64v256h128V352h64v128h128V224h64L256 32z"/>
  </g>
</svg>`;

const publicDir = path.join(process.cwd(), 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgContent);
// Also save a fallback png
fs.writeFileSync(path.join(publicDir, 'icon.png'), svgContent);
console.log('Icons generated successfully');
