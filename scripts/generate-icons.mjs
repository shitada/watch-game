// Generate iPad/iOS app icons for Kids Clock Master
// Usage: node scripts/generate-icons.mjs

import { createCanvas } from 'canvas';
import { writeFileSync, mkdirSync, existsSync } from 'fs';

const sizes = [
  { name: 'apple-touch-icon-180x180.png', size: 180 },
  { name: 'apple-touch-icon-167x167.png', size: 167 },
  { name: 'apple-touch-icon-152x152.png', size: 152 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'icon-192x192.png', size: 192 },
  { name: 'icon-512x512.png', size: 512 },
];

function drawClockIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.42;

  // Background (rounded rect / circle)
  ctx.fillStyle = '#87CEEB';
  ctx.beginPath();
  const rr = size * 0.18;
  ctx.moveTo(rr, 0);
  ctx.lineTo(size - rr, 0);
  ctx.quadraticCurveTo(size, 0, size, rr);
  ctx.lineTo(size, size - rr);
  ctx.quadraticCurveTo(size, size, size - rr, size);
  ctx.lineTo(rr, size);
  ctx.quadraticCurveTo(0, size, 0, size - rr);
  ctx.lineTo(0, rr);
  ctx.quadraticCurveTo(0, 0, rr, 0);
  ctx.fill();

  // Clock face shadow
  ctx.fillStyle = 'rgba(0,0,0,0.1)';
  ctx.beginPath();
  ctx.arc(cx + size * 0.01, cy + size * 0.02, r + size * 0.04, 0, Math.PI * 2);
  ctx.fill();

  // Clock rim
  ctx.fillStyle = '#8B7355';
  ctx.beginPath();
  ctx.arc(cx, cy, r + size * 0.04, 0, Math.PI * 2);
  ctx.fill();

  // Clock face
  ctx.fillStyle = '#FFF8E7';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  // Tick marks
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
    const isMajor = true;
    const outerR = r - size * 0.02;
    const innerR = r - (isMajor ? size * 0.08 : size * 0.04);
    const lw = isMajor ? size * 0.02 : size * 0.008;

    ctx.strokeStyle = '#2C3E50';
    ctx.lineWidth = lw;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * innerR, cy + Math.sin(angle) * innerR);
    ctx.lineTo(cx + Math.cos(angle) * outerR, cy + Math.sin(angle) * outerR);
    ctx.stroke();
  }

  // Numbers
  ctx.fillStyle = '#2C3E50';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const fontSize = Math.round(size * 0.1);
  ctx.font = `bold ${fontSize}px sans-serif`;

  for (let i = 1; i <= 12; i++) {
    const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
    const numR = r - size * 0.14;
    const x = cx + Math.cos(angle) * numR;
    const y = cy + Math.sin(angle) * numR;
    ctx.fillText(String(i), x, y);
  }

  // Hour hand (pointing to 10 → 300 degrees = 10/12 * 360 - 90)
  const hourAngle = (10 / 12) * Math.PI * 2 - Math.PI / 2;
  ctx.strokeStyle = '#E74C3C';
  ctx.lineWidth = size * 0.04;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(
    cx + Math.cos(hourAngle) * r * 0.5,
    cy + Math.sin(hourAngle) * r * 0.5,
  );
  ctx.stroke();

  // Minute hand (pointing to 2 → 10 min = 10/60 * 360 - 90)
  const minAngle = (10 / 60) * Math.PI * 2 - Math.PI / 2;
  ctx.strokeStyle = '#3498DB';
  ctx.lineWidth = size * 0.025;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(
    cx + Math.cos(minAngle) * r * 0.75,
    cy + Math.sin(minAngle) * r * 0.75,
  );
  ctx.stroke();

  // Center dot
  ctx.fillStyle = '#E74C3C';
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.03, 0, Math.PI * 2);
  ctx.fill();

  return canvas.toBuffer('image/png');
}

// Ensure public dir exists
if (!existsSync('public')) {
  mkdirSync('public');
}

for (const { name, size } of sizes) {
  const buf = drawClockIcon(size);
  writeFileSync(`public/${name}`, buf);
  console.log(`✅ Generated public/${name} (${size}x${size})`);
}

console.log('\nDone! Icons saved to public/');
