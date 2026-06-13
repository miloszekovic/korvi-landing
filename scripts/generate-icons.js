/**
 * Generates all favicon/PWA/OG graphics from the brand mark.
 * Mark = the gradient card (the "O" in the KORVI wordmark) on ink background.
 * Run: npm run icons
 */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const opentype = require("opentype.js");
const pngToIcoModule = require("png-to-ico");
const pngToIco = pngToIcoModule.default || pngToIcoModule;

const PUBLIC = path.join(__dirname, "..", "public");

const INK = "#0A0A0D";
const GRAD_FROM = "#49BBE1";
const GRAD_TO = "#6C3DCC";
const CARD_RATIO = 199 / 123; // card proportions from the logo's "O"
const CARD_RX_RATIO = 25 / 123; // corner radius relative to card height

/**
 * Square icon: ink background (optionally rounded), gradient card centered.
 * cardW = card width as a fraction of the icon size.
 */
function iconSvg({ size, bgRadius = 0, cardW = 0.7 }) {
  const cw = size * cardW;
  const ch = cw / CARD_RATIO;
  const cx = (size - cw) / 2;
  const cy = (size - ch) / 2;
  const rx = ch * CARD_RX_RATIO;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="${cx}" y1="${cy}" x2="${cx + cw}" y2="${cy + ch}" gradientUnits="userSpaceOnUse">
      <stop stop-color="${GRAD_FROM}"/>
      <stop offset="1" stop-color="${GRAD_TO}"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${bgRadius}" fill="${INK}"/>
  <rect x="${cx}" y="${cy}" width="${cw}" height="${ch}" rx="${rx}" fill="url(#g)"/>
</svg>`;
}

/**
 * Tagline as outlined paths in Space Grotesk Medium — text rendering in
 * sharp/libvips ignores project-local fonts, so we bypass fonts entirely.
 */
function taglinePath(text, centerX, baselineY, fontSize) {
  const buf = fs.readFileSync(path.join(__dirname, "..", "assets-src", "fonts", "SpaceGrotesk-Medium.ttf"));
  const font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  const options = { kerning: true, letterSpacing: 1.5 / fontSize };
  const width = font.getAdvanceWidth(text, fontSize, options);
  const p = font.getPath(text, centerX - width / 2, baselineY, fontSize, options);
  return p.toPathData(2);
}

/** OG image: ink bg, brand glows, KORVI wordmark, tagline. */
function ogSvg() {
  const logo = fs
    .readFileSync(path.join(PUBLIC, "images", "logo.svg"), "utf8")
    .replace(/<\/?svg[^>]*>/g, "");
  // logo viewBox is 778x123 — scale to 600px wide, centered
  const scale = 600 / 778;
  const logoX = (1200 - 600) / 2;
  const logoY = 236;
  const tagline = taglinePath("Premium visittkort med QR og NFC", 600, 425, 30);
  return `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="glowBlue" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse"
      gradientTransform="translate(170 80) scale(620)">
      <stop stop-color="${GRAD_FROM}" stop-opacity="0.22"/>
      <stop offset="1" stop-color="${GRAD_FROM}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glowPurple" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse"
      gradientTransform="translate(1050 560) scale(640)">
      <stop stop-color="${GRAD_TO}" stop-opacity="0.26"/>
      <stop offset="1" stop-color="${GRAD_TO}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="${INK}"/>
  <rect width="1200" height="630" fill="url(#glowBlue)"/>
  <rect width="1200" height="630" fill="url(#glowPurple)"/>
  <g transform="translate(${logoX} ${logoY}) scale(${scale})">${logo}</g>
  <path d="${tagline}" fill="#A1A8B8"/>
</svg>`;
}

async function render(svg, file, size) {
  const out = path.join(PUBLIC, file);
  await sharp(Buffer.from(svg), { density: 300 })
    .resize(size.w, size.h)
    .png()
    .toFile(out);
  console.log(`✓ ${file} (${size.w}×${size.h})`);
}

async function main() {
  // favicon.svg — same mark, served as-is
  const faviconSvg = iconSvg({ size: 64, bgRadius: 14, cardW: 0.74 });
  fs.writeFileSync(path.join(PUBLIC, "favicon.svg"), faviconSvg);
  console.log("✓ favicon.svg");

  // favicon.ico — 16/32/48 from the same mark
  const icoPngs = await Promise.all(
    [16, 32, 48].map((s) =>
      sharp(Buffer.from(iconSvg({ size: 64, bgRadius: 14, cardW: 0.74 })), { density: 300 })
        .resize(s, s)
        .png()
        .toBuffer()
    )
  );
  fs.writeFileSync(path.join(PUBLIC, "favicon.ico"), await pngToIco(icoPngs));
  console.log("✓ favicon.ico (16, 32, 48)");

  // apple-touch-icon — full-bleed ink (iOS rounds corners itself)
  await render(iconSvg({ size: 180, bgRadius: 0, cardW: 0.66 }), "apple-touch-icon.png", { w: 180, h: 180 });

  // manifest icons — rounded square ("any") + full-bleed with safe zone (maskable)
  await render(iconSvg({ size: 192, bgRadius: 42, cardW: 0.7 }), "icon-192.png", { w: 192, h: 192 });
  await render(iconSvg({ size: 512, bgRadius: 112, cardW: 0.7 }), "icon-512.png", { w: 512, h: 512 });
  await render(iconSvg({ size: 512, bgRadius: 0, cardW: 0.56 }), "icon-512-maskable.png", { w: 512, h: 512 });

  // OG image
  await render(ogSvg(), "og.png", { w: 1200, h: 630 });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
