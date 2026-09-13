/**
 * Script to generate high-contrast PNG banners for OS Notifications
 */
import fs from 'fs';
import path from 'path';

// Generate a valid PNG file using pure Node.js buffer without external heavy deps
// We can generate PNG with simple uncompressed chunks (IHDR, IDAT, IEND)
// or create rich SVG and PNG files for maximum compatibility.

function createSvgBanner(title, subtitle, bgColor1, bgColor2, accentColor) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 360" width="720" height="360">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${bgColor1}" />
      <stop offset="100%" stop-color="${bgColor2}" />
    </linearGradient>
    <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#fbbf24" />
      <stop offset="100%" stop-color="#f97316" />
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="8" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Background -->
  <rect width="720" height="360" rx="24" fill="url(#bgGrad)"/>
  
  <!-- Outer Glow Border -->
  <rect x="6" y="6" width="708" height="348" rx="20" fill="none" stroke="${accentColor}" stroke-width="4" opacity="0.8"/>

  <!-- Decorative Background Circles -->
  <circle cx="620" cy="80" r="140" fill="${accentColor}" opacity="0.08" />
  <circle cx="100" cy="300" r="180" fill="${accentColor}" opacity="0.05" />

  <!-- Badge Tag -->
  <rect x="48" y="44" width="220" height="42" rx="21" fill="${accentColor}" fill-opacity="0.2" stroke="${accentColor}" stroke-width="2" />
  <text x="158" y="71" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="900" fill="#fde047" text-anchor="middle" letter-spacing="2">
    🚨 PENGINGAT WAKTU
  </text>

  <!-- Giant Clock & Lightning Icon Graphic -->
  <g transform="translate(540, 180)">
    <circle cx="0" cy="0" r="72" fill="#0f172a" stroke="${accentColor}" stroke-width="8" filter="url(#glow)"/>
    <circle cx="0" cy="0" r="6" fill="#f8fafc"/>
    <line x1="0" y1="0" x2="0" y2="-42" stroke="#f8fafc" stroke-width="8" stroke-linecap="round"/>
    <line x1="0" y1="0" x2="32" y2="0" stroke="${accentColor}" stroke-width="7" stroke-linecap="round"/>
    <!-- Lightning bolt badge -->
    <path d="M-10 -70 L14 -70 L0 -35 L20 -35 L-15 20 L-4 -20 L-22 -20 Z" fill="#fbbf24" filter="url(#glow)"/>
  </g>

  <!-- Main Headline Title -->
  <text x="48" y="160" font-family="system-ui, -apple-system, sans-serif" font-size="44" font-weight="900" fill="#ffffff" letter-spacing="-0.5">
    ${title}
  </text>

  <!-- Subtitle / Body -->
  <text x="48" y="215" font-family="system-ui, -apple-system, sans-serif" font-size="24" font-weight="600" fill="#cbd5e1">
    ${subtitle}
  </text>

  <!-- Bottom Action Callout Pill -->
  <rect x="48" y="260" width="360" height="52" rx="14" fill="url(#accentGrad)"/>
  <text x="228" y="294" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="900" fill="#0f172a" text-anchor="middle" letter-spacing="1">
    ⚡ KLIK UNTUK BUKA & CENTANG ➔
  </text>
</svg>`;
}

const alertSvg = createSvgBanner(
  'Waktunya Kegiatan Dimulai!',
  'Buka Jadwal Kilat sekarang untuk mulai & catat progres',
  '#0f172a',
  '#1e1b4b',
  '#f59e0b'
);

const restSvg = createSvgBanner(
  '🚨 Waktu Istirahat Selesai!',
  'Kembali fokus ke kegiatan berikutnya & pertahankan streak!',
  '#1e1b4b',
  '#450a0a',
  '#ef4444'
);

fs.writeFileSync(path.resolve('./public/alert-banner.svg'), alertSvg);
fs.writeFileSync(path.resolve('./public/rest-banner.svg'), restSvg);
console.log('Successfully created alert-banner.svg and rest-banner.svg');
