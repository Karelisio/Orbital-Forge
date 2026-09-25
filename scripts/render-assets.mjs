// Renders the SVG sources in /assets to the PNG inputs expected by @capacitor/assets.
// Usage: node scripts/render-assets.mjs && npx capacitor-assets generate --android
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const sharp = require('sharp');

const icon = readFileSync('assets/icon.svg', 'utf8');
const layer = (id) =>
  icon.replace(/<g id="(background|foreground)">[\s\S]*?\n  <\/g>\n/g, (m, name) => (name === id ? m : ''));

// Adaptive icon foreground must fit in the central 66% safe zone: scale it down on a transparent canvas.
const fg = layer('foreground').replace(
  '<g id="foreground">',
  '<g id="foreground" transform="translate(512 512) scale(0.72) translate(-512 -512)">',
);
const bg = layer('background');

function splash(dark) {
  const bgColor = dark ? '#05060f' : '#e9f1ff';
  const text = dark ? '#e6f1ff' : '#140f3d';
  const inner = icon.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="2732" height="2732" viewBox="0 0 2732 2732">
  <rect width="2732" height="2732" fill="${bgColor}"/>
  <g transform="translate(1066 900) scale(0.586)">
    <clipPath id="c"><rect width="1024" height="1024" rx="220"/></clipPath>
    <g clip-path="url(#c)">${inner}</g>
  </g>
  <text x="1366" y="1720" text-anchor="middle" font-family="sans-serif" font-weight="800" font-size="150" letter-spacing="30" fill="${text}">ORBITAL FORGE</text>
</svg>`;
}

const jobs = [
  ['assets/icon-only.png', icon, 1024],
  ['assets/icon-foreground.png', fg, 1024],
  ['assets/icon-background.png', bg, 1024],
  ['assets/splash.png', splash(false), 2732],
  ['assets/splash-dark.png', splash(true), 2732],
  ['public/icon-512.png', icon, 512],
];
for (const [out, svg, size] of jobs) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(out);
  console.log('rendered', out);
}
writeFileSync('public/favicon.svg', icon);
