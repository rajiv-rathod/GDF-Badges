#!/usr/bin/env node
// Renders the GDF app icon, adaptive-icon foreground, and splash image as PNGs
// using headless Chromium. Run: node scripts/generate-app-icons.mjs
// Outputs into apps/mobile/assets/.
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'apps', 'mobile', 'assets');
mkdirSync(outDir, { recursive: true });

const seal = (size, opts = {}) => `
<div style="width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;
            background:${opts.transparent ? 'transparent' : '#06002e'};margin:0">
  <svg width="${size * (opts.scale ?? 0.72)}" height="${size * (opts.scale ?? 0.72)}" viewBox="0 0 240 240">
    <defs>
      <linearGradient id="seal" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#d73cbe"/><stop offset="1" stop-color="#ff45e1"/>
      </linearGradient>
    </defs>
    <circle cx="120" cy="120" r="112" fill="#06002e" stroke="url(#seal)" stroke-width="7"/>
    <g stroke="url(#seal)" stroke-width="3" fill="none" opacity="0.9">
      <circle cx="120" cy="104" r="52"/>
      <ellipse cx="120" cy="104" rx="52" ry="22"/>
      <ellipse cx="120" cy="104" rx="22" ry="52"/>
      <line x1="68" y1="104" x2="172" y2="104"/>
    </g>
    <text x="120" y="196" text-anchor="middle" font-family="Helvetica, Arial, sans-serif"
          font-size="34" font-weight="700" fill="#fbfbf9" letter-spacing="6">GDF</text>
  </svg>
</div>`;

const targets = [
  { file: 'icon.png', width: 1024, height: 1024, html: seal(1024) },
  { file: 'adaptive-icon.png', width: 1024, height: 1024, html: seal(1024, { transparent: true, scale: 0.6 }) },
  { file: 'splash.png', width: 1024, height: 1024, html: seal(1024, { transparent: true, scale: 0.5 }) },
];

const browser = await chromium.launch(
  process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {},
);
for (const t of targets) {
  const page = await browser.newPage({ viewport: { width: t.width, height: t.height } });
  await page.setContent(`<body style="margin:0">${t.html}</body>`);
  await page.screenshot({
    path: join(outDir, t.file),
    omitBackground: t.file !== 'icon.png',
  });
  await page.close();
  console.log('wrote', join('apps/mobile/assets', t.file));
}
await browser.close();
