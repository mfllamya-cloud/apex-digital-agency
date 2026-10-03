// ---------------------------------------------------------------------------
// Ad design templates — layer B of the ad design (text and logo, drawn by code).
//
// The AI only produces the scene (the customer's product in a setting, with no text and no
// logo). Everything a customer reads on the ad is drawn here on a <canvas>: headline,
// call-to-action button, logo. That is what keeps the text exact, in any language, including
// Arabic (the browser shapes Arabic and handles right-to-left natively).
//
// One fixed layout per style and per format. Every layout keeps the text block in the upper
// 45% of the image and leaves the lower part to the product, which is how the scene is
// generated (see FORMAT_LAYOUT in backend/adDesign.js).
//
// This file has no React and no imports on purpose: it can be run and checked on its own.
// ---------------------------------------------------------------------------

export const AD_FORMATS = {
  "1:1": { width: 1080, height: 1080, label: "1080 × 1080" },
  "9:16": { width: 1080, height: 1920, label: "1080 × 1920" },
};

export const AD_STYLES = ["clean_studio", "bold_color", "luxury_dark", "lifestyle_scene"];

// Fonts already loaded by public/index.html. Cairo covers Arabic in every stack.
const FONT_SANS = '"Plus Jakarta Sans", "Cairo", system-ui, sans-serif';
const FONT_SANS_AR = '"Cairo", "Plus Jakarta Sans", system-ui, sans-serif';
const FONT_DISPLAY = '"Cormorant Garamond", "Cairo", Georgia, serif';

const RTL_RE = /[֐-ࣿיִ-﷿ﹰ-﻿]/;

export function isRtlText(text) {
  return RTL_RE.test(String(text || ""));
}

// Makes sure the web fonts are ready before drawing; a canvas does not wait for them.
export async function ensureAdFonts(sampleText) {
  if (typeof document === "undefined" || !document.fonts || !document.fonts.load) return;
  const sample = String(sampleText || "") + " Abc";
  const wanted = [
    '800 64px "Plus Jakarta Sans"',
    '700 64px "Plus Jakarta Sans"',
    '600 64px "Cormorant Garamond"',
    '800 64px "Cairo"',
    '700 64px "Cairo"',
    '600 64px "Cairo"',
  ];
  try {
    await Promise.all(wanted.map((f) => document.fonts.load(f, sample)));
  } catch (_) {
    // Drawing still works with the fallback fonts of each stack.
  }
}

// --- colour helpers --------------------------------------------------------

function hexToRgb(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || ""));
  const n = parseInt(m ? m[1] : "111111", 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function luminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const lin = (v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrastRatio(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

// Text colour that stays readable on the given background.
function onColor(hex) {
  return contrastRatio(hex, "#ffffff") >= contrastRatio(hex, "#0e0e10") ? "#ffffff" : "#0e0e10";
}

// If the brand colour would be unreadable on the given backdrop, fall back to a safe ink.
function readableOn(hex, backdropHex, fallback) {
  return contrastRatio(hex, backdropHex) >= 3 ? hex : fallback;
}

// --- drawing helpers -------------------------------------------------------

function roundRectPath(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function drawCover(ctx, img, W, H) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) return;
  const scale = Math.max(W / iw, H / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  // Anchor to the bottom: the product sits in the lower part and must never be cropped.
  ctx.drawImage(img, (W - dw) / 2, H - dh, dw, dh);
}

function setFont(ctx, weight, size, family) {
  ctx.font = weight + " " + Math.round(size) + "px " + family;
}

function setTracking(ctx, em, size) {
  // letterSpacing on canvas is not available in every browser; the layout does not depend on it.
  if ("letterSpacing" in ctx) ctx.letterSpacing = (em * size).toFixed(2) + "px";
}

function wrapLines(ctx, text, maxWidth) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? line + " " + word : word;
    if (!line || ctx.measureText(candidate).width <= maxWidth) {
      line = candidate;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// Largest size at which the text fits the box (width, line count and height).
function fitText(ctx, text, o) {
  let size = o.maxSize;
  let lines = [];
  for (; size >= o.minSize; size -= 2) {
    setFont(ctx, o.weight, size, o.family);
    setTracking(ctx, o.tracking || 0, size);
    lines = wrapLines(ctx, text, o.maxWidth);
    const widest = Math.max.apply(null, lines.map((l) => ctx.measureText(l).width).concat([0]));
    const height = lines.length * size * o.leading;
    if (lines.length <= o.maxLines && widest <= o.maxWidth && height <= o.maxHeight) break;
  }
  size = Math.max(size, o.minSize);
  setFont(ctx, o.weight, size, o.family);
  setTracking(ctx, o.tracking || 0, size);
  lines = wrapLines(ctx, text, o.maxWidth).slice(0, o.maxLines + 1);
  return { size, lines, height: lines.length * size * o.leading };
}

function drawLines(ctx, fit, x, top, leading, align) {
  ctx.textAlign = align;
  ctx.textBaseline = "alphabetic";
  fit.lines.forEach((line, i) => {
    // The ascent factor makes "top" the visual top of the first line (Arabic sits taller).
    const ascent = isRtlText(line) ? 1.0 : 0.8;
    ctx.fillText(line, x, top + fit.size * ascent + i * fit.size * leading);
  });
}

function drawArrow(ctx, x, cy, size, rtl, color) {
  const dir = rtl ? -1 : 1;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(3, size * 0.14);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(x - dir * size * 0.5, cy);
  ctx.lineTo(x + dir * size * 0.5, cy);
  ctx.moveTo(x + dir * size * 0.12, cy - size * 0.36);
  ctx.lineTo(x + dir * size * 0.5, cy);
  ctx.lineTo(x + dir * size * 0.12, cy + size * 0.36);
  ctx.stroke();
  ctx.restore();
}

// A real button: shape, padding, label, arrow. Returns its box.
function drawButton(ctx, label, o) {
  if (!label) return { width: 0, height: 0 };
  const rtl = o.rtl;
  const text = o.uppercase && !rtl ? label.toUpperCase() : label;
  const family = rtl ? FONT_SANS_AR : FONT_SANS;
  let size = o.size;
  const arrow = size * 0.62;
  const gap = size * 0.5;
  const tracking = o.uppercase && !rtl ? 0.08 : 0;
  let textW;
  for (; size >= 22; size -= 2) {
    setFont(ctx, 700, size, family);
    setTracking(ctx, tracking, size);
    textW = ctx.measureText(text).width;
    if (textW + arrow + gap + o.padX * 2 <= o.maxWidth) break;
  }
  const width = textW + arrow + gap + o.padX * 2;
  const height = o.height;
  let x = o.x;
  if (o.align === "end") x = o.x - width;
  if (o.align === "center") x = o.x - width / 2;

  ctx.save();
  if (o.shadow) {
    ctx.shadowColor = "rgba(0,0,0,0.22)";
    ctx.shadowBlur = 28;
    ctx.shadowOffsetY = 10;
  }
  roundRectPath(ctx, x, o.y, width, height, o.radius);
  if (o.outline) {
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = o.color;
    ctx.stroke();
  } else {
    ctx.fillStyle = o.color;
    ctx.fill();
  }
  ctx.restore();

  ctx.fillStyle = o.textColor;
  ctx.textBaseline = "middle";
  const cy = o.y + height / 2 + size * 0.04;
  if (rtl) {
    ctx.textAlign = "right";
    ctx.fillText(text, x + width - o.padX, cy);
    drawArrow(ctx, x + o.padX + arrow / 2, o.y + height / 2, arrow, true, o.textColor);
  } else {
    ctx.textAlign = "left";
    ctx.fillText(text, x + o.padX, cy);
    drawArrow(ctx, x + width - o.padX - arrow / 2, o.y + height / 2, arrow, false, o.textColor);
  }
  setTracking(ctx, 0, size);
  return { x, width, height };
}

// Mean luminance of the logo's opaque pixels, to decide whether it needs a backing chip.
function logoLuminance(img) {
  try {
    const c = document.createElement("canvas");
    c.width = 48;
    c.height = 48;
    const x = c.getContext("2d");
    x.drawImage(img, 0, 0, 48, 48);
    const d = x.getImageData(0, 0, 48, 48).data;
    let sum = 0;
    let n = 0;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] > 40) {
        sum += (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255;
        n += 1;
      }
    }
    return n ? sum / n : null;
  } catch (_) {
    return null;
  }
}

// Logo (or the brand name as a wordmark when there is no logo file) in the top-start corner.
// "backdropLum" is how light the area behind it is (0 dark … 1 light). Returns the block height.
function drawBrand(ctx, o) {
  const { logo, brandName, rtl, x, y, maxW, maxH, backdropLum } = o;
  if (logo && (logo.naturalWidth || logo.width)) {
    const iw = logo.naturalWidth || logo.width;
    const ih = logo.naturalHeight || logo.height;
    const scale = Math.min(maxW / iw, maxH / ih);
    const w = iw * scale;
    const h = ih * scale;
    const lx = rtl ? x - w : x;
    const lum = logoLuminance(logo);
    const needsChip = lum !== null && Math.abs(lum - backdropLum) < 0.32;
    if (needsChip) {
      const pad = 18;
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.18)";
      ctx.shadowBlur = 20;
      ctx.shadowOffsetY = 6;
      ctx.fillStyle = lum > 0.5 ? "rgba(14,14,16,0.92)" : "rgba(255,255,255,0.96)";
      roundRectPath(ctx, lx - pad, y - pad, w + pad * 2, h + pad * 2, 16);
      ctx.fill();
      ctx.restore();
    }
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(logo, lx, y, w, h);
    return h;
  }
  if (brandName) {
    const brandRtl = isRtlText(brandName);
    const size = Math.round(maxH * (brandRtl ? 0.62 : 0.36));
    setFont(ctx, 800, size, brandRtl ? FONT_SANS_AR : FONT_SANS);
    setTracking(ctx, brandRtl ? 0 : 0.16, size);
    ctx.fillStyle = o.inkColor;
    ctx.textAlign = rtl ? "right" : "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(brandRtl ? brandName : brandName.toUpperCase(), x, y + size);
    setTracking(ctx, 0, size);
    return size * 1.25;
  }
  return 0;
}

// --- layout metrics per format --------------------------------------------

function metrics(format) {
  const { width: W, height: H } = AD_FORMATS[format] || AD_FORMATS["1:1"];
  // zoneBottom: the text block must end above this line. The scene is generated with the product
  // boxed below it (FORMAT_LAYOUT padding in backend/adDesign.js), so text never covers the product.
  if (format === "9:16") {
    // Top 220 px stays free of text: story/reel interfaces cover it.
    return { W, H, margin: 84, top: 220, zoneBottom: Math.round(H * 0.45), logoH: 84, scale: 1.12 };
  }
  return { W, H, margin: 72, top: 60, zoneBottom: Math.round(H * 0.45), logoH: 64, scale: 1 };
}

// --- the four styles -------------------------------------------------------

function styleCleanStudio(ctx, m, d) {
  const { W, H, margin, top } = m;
  drawCover(ctx, d.scene, W, H);

  // Contrast layer: a white veil that fades out before the product.
  const veil = ctx.createLinearGradient(0, 0, 0, H * 0.56);
  veil.addColorStop(0, "rgba(255,255,255,0.96)");
  veil.addColorStop(0.62, "rgba(255,255,255,0.82)");
  veil.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = veil;
  ctx.fillRect(0, 0, W, H * 0.56);

  const startX = d.rtl ? W - margin : margin;
  const align = d.rtl ? "right" : "left";
  const ink = "#101114";
  const accent = readableOn(d.colors[0], "#ffffff", ink);

  const brandH = drawBrand(ctx, { ...d, x: startX, y: top, maxW: 300, maxH: m.logoH, backdropLum: 0.95, inkColor: ink });
  let y = top + brandH + 28 * m.scale;

  // Accent rule
  ctx.fillStyle = accent;
  ctx.fillRect(d.rtl ? startX - 72 : startX, y, 72, 8);
  y += 8 + 24 * m.scale;

  const btnH = 78 * m.scale;
  const fit = fitText(ctx, d.headline, {
    weight: 800,
    family: d.rtl ? FONT_SANS_AR : FONT_SANS,
    maxSize: 92 * m.scale,
    minSize: 44,
    maxWidth: W - margin * 2 - 60,
    maxLines: 3,
    maxHeight: m.zoneBottom - y - btnH - 34,
    leading: d.rtl ? 1.3 : 1.08,
    tracking: d.rtl ? 0 : -0.025,
  });
  ctx.fillStyle = ink;
  drawLines(ctx, fit, startX, y, d.rtl ? 1.3 : 1.08, align);
  setTracking(ctx, 0, fit.size);
  y += fit.height + 30 * m.scale;

  drawButton(ctx, d.cta, {
    x: startX,
    y,
    align: d.rtl ? "end" : "start",
    height: btnH,
    padX: 40 * m.scale,
    size: 31 * m.scale,
    radius: 999,
    color: accent,
    textColor: onColor(accent),
    maxWidth: W - margin * 2,
    rtl: d.ctaRtl,
    shadow: true,
  });
}

function styleBoldColor(ctx, m, d) {
  const { W, H, margin, top } = m;
  drawCover(ctx, d.scene, W, H);

  // Contrast layer: a solid brand-colour block with a slanted lower edge.
  const c1 = d.colors[0];
  const edgeHigh = m.zoneBottom - 56;
  const edgeLow = m.zoneBottom + 10;
  ctx.fillStyle = c1;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(W, 0);
  ctx.lineTo(W, d.rtl ? edgeLow : edgeHigh);
  ctx.lineTo(0, d.rtl ? edgeHigh : edgeLow);
  ctx.closePath();
  ctx.fill();
  // Thin second-colour edge under the block.
  ctx.strokeStyle = d.colors[1];
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(0, (d.rtl ? edgeHigh : edgeLow) + 4);
  ctx.lineTo(W, (d.rtl ? edgeLow : edgeHigh) + 4);
  ctx.stroke();

  const ink = onColor(c1);
  const startX = d.rtl ? W - margin : margin;
  const align = d.rtl ? "right" : "left";

  const brandH = drawBrand(ctx, { ...d, x: startX, y: top, maxW: 280, maxH: m.logoH * 0.9, backdropLum: luminance(c1), inkColor: ink });
  let y = top + brandH + 30 * m.scale;

  const btnH = 76 * m.scale;
  const headline = d.rtl ? d.headline : d.headline.toUpperCase();
  const fit = fitText(ctx, headline, {
    weight: 800,
    family: d.rtl ? FONT_SANS_AR : FONT_SANS,
    maxSize: 104 * m.scale,
    minSize: 42,
    maxWidth: W - margin * 2,
    maxLines: 3,
    maxHeight: edgeHigh - y - btnH - 40,
    leading: d.rtl ? 1.28 : 1.02,
    tracking: d.rtl ? 0 : -0.03,
  });
  ctx.fillStyle = ink;
  drawLines(ctx, fit, startX, y, d.rtl ? 1.28 : 1.02, align);
  setTracking(ctx, 0, fit.size);
  y += fit.height + 26 * m.scale;

  const c2 = contrastRatio(d.colors[1], c1) >= 1.6 ? d.colors[1] : ink;
  drawButton(ctx, d.cta, {
    x: startX,
    y,
    align: d.rtl ? "end" : "start",
    height: btnH,
    padX: 36 * m.scale,
    size: 29 * m.scale,
    radius: 12,
    color: c2,
    textColor: onColor(c2),
    maxWidth: W - margin * 2,
    rtl: d.ctaRtl,
    uppercase: true,
  });
}

function styleLuxuryDark(ctx, m, d) {
  const { W, H, margin, top } = m;
  drawCover(ctx, d.scene, W, H);

  // Contrast layer: a deep veil from the top, plus a soft vignette.
  const veil = ctx.createLinearGradient(0, 0, 0, H * 0.6);
  veil.addColorStop(0, "rgba(6,6,8,0.94)");
  veil.addColorStop(0.6, "rgba(6,6,8,0.72)");
  veil.addColorStop(1, "rgba(6,6,8,0)");
  ctx.fillStyle = veil;
  ctx.fillRect(0, 0, W, H * 0.6);
  const vig = ctx.createRadialGradient(W / 2, H * 0.62, H * 0.25, W / 2, H * 0.62, H * 0.85);
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(1, "rgba(0,0,0,0.45)");
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);

  // Hairline frame
  const inset = 30;
  ctx.strokeStyle = "rgba(255,255,255,0.22)";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(inset, inset, W - inset * 2, H - inset * 2);

  const cream = "#f6f0e2";
  const accent = readableOn(d.colors[1], "#0a0a0c", "#d4af37");
  const startX = d.rtl ? W - margin : margin;

  const brandH = drawBrand(ctx, { ...d, x: startX, y: top, maxW: 260, maxH: m.logoH * 0.85, backdropLum: 0.04, inkColor: cream });
  let y = top + brandH + 38 * m.scale;

  // Centered accent rule
  ctx.fillStyle = accent;
  ctx.fillRect(W / 2 - 44, y, 88, 3);
  y += 3 + 34 * m.scale;

  const btnH = 72 * m.scale;
  const fit = fitText(ctx, d.headline, {
    weight: 600,
    family: d.rtl ? FONT_SANS_AR : FONT_DISPLAY,
    maxSize: (d.rtl ? 84 : 108) * m.scale,
    minSize: 44,
    maxWidth: W - margin * 2 - 40,
    maxLines: 3,
    maxHeight: m.zoneBottom - y - btnH - 36,
    leading: d.rtl ? 1.32 : 1.06,
    tracking: 0,
  });
  ctx.fillStyle = cream;
  drawLines(ctx, fit, W / 2, y, d.rtl ? 1.32 : 1.06, "center");
  y += fit.height + 30 * m.scale;

  drawButton(ctx, d.cta, {
    x: W / 2,
    y,
    align: "center",
    height: btnH,
    padX: 40 * m.scale,
    size: 25 * m.scale,
    radius: 999,
    color: accent,
    textColor: accent,
    outline: true,
    maxWidth: W - margin * 2,
    rtl: d.ctaRtl,
    uppercase: true,
  });
}

function styleLifestyleScene(ctx, m, d) {
  const { W, H, margin, top } = m;
  drawCover(ctx, d.scene, W, H);

  const pad = 44 * m.scale;
  const cardX = margin - 20;
  const cardW = W - cardX * 2;
  const cardY = top - 16;
  const innerW = cardW - pad * 2;
  const ink = "#14151a";
  const accent = readableOn(d.colors[0], "#ffffff", ink);
  const btnH = 72 * m.scale;
  const logoH = m.logoH * 0.72;
  const startX = d.rtl ? cardX + cardW - pad : cardX + pad;
  const align = d.rtl ? "right" : "left";

  // Measure first, then draw the card to the measured height.
  const headlineTop = cardY + pad + logoH + 26 * m.scale;
  const fit = fitText(ctx, d.headline, {
    weight: 700,
    family: d.rtl ? FONT_SANS_AR : FONT_SANS,
    maxSize: 74 * m.scale,
    minSize: 40,
    maxWidth: innerW,
    maxLines: 3,
    maxHeight: m.zoneBottom - headlineTop - btnH - 26 * m.scale - pad,
    leading: d.rtl ? 1.3 : 1.1,
    tracking: d.rtl ? 0 : -0.02,
  });
  const cardH = pad + logoH + 26 * m.scale + fit.height + (d.cta ? 26 * m.scale + btnH : 0) + pad;

  // Contrast layer: a soft white card.
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.22)";
  ctx.shadowBlur = 50;
  ctx.shadowOffsetY = 18;
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  roundRectPath(ctx, cardX, cardY, cardW, cardH, 34);
  ctx.fill();
  ctx.restore();
  // Accent tab on the start edge of the card
  ctx.fillStyle = accent;
  roundRectPath(ctx, d.rtl ? cardX + cardW - 10 : cardX, cardY + 40, 10, cardH - 80, 5);
  ctx.fill();

  drawBrand(ctx, { ...d, x: startX, y: cardY + pad, maxW: 260, maxH: logoH, backdropLum: 0.95, inkColor: ink });

  setFont(ctx, 700, fit.size, d.rtl ? FONT_SANS_AR : FONT_SANS);
  setTracking(ctx, d.rtl ? 0 : -0.02, fit.size);
  ctx.fillStyle = ink;
  drawLines(ctx, fit, startX, headlineTop, d.rtl ? 1.3 : 1.1, align);
  setTracking(ctx, 0, fit.size);

  drawButton(ctx, d.cta, {
    x: startX,
    y: headlineTop + fit.height + 26 * m.scale,
    align: d.rtl ? "end" : "start",
    height: btnH,
    padX: 36 * m.scale,
    size: 28 * m.scale,
    radius: 999,
    color: accent,
    textColor: onColor(accent),
    maxWidth: innerW,
    rtl: d.ctaRtl,
  });
}

const STYLE_RENDERERS = {
  clean_studio: styleCleanStudio,
  bold_color: styleBoldColor,
  luxury_dark: styleLuxuryDark,
  lifestyle_scene: styleLifestyleScene,
};

// Draws the finished ad on the canvas at its export size (1080x1080 or 1080x1920).
//   opts: { format, style, scene (loaded image), headline, cta, brandName, colors [c1, c2], logo (loaded image or null) }
export function drawAd(canvas, opts) {
  const format = AD_FORMATS[opts.format] ? opts.format : "1:1";
  const m = metrics(format);
  canvas.width = m.W;
  canvas.height = m.H;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, m.W, m.H);

  const headline = String(opts.headline || "").trim();
  const cta = String(opts.cta || "").trim();
  const colors = [
    /^#[0-9a-f]{6}$/i.test(opts.colors && opts.colors[0]) ? opts.colors[0] : "#111111",
    /^#[0-9a-f]{6}$/i.test(opts.colors && opts.colors[1]) ? opts.colors[1] : "#d4af37",
  ];
  const data = {
    scene: opts.scene,
    headline,
    cta,
    brandName: String(opts.brandName || "").trim(),
    colors,
    logo: opts.logo || null,
    rtl: isRtlText(headline),
    ctaRtl: isRtlText(cta),
  };
  ctx.direction = data.rtl ? "rtl" : "ltr";
  (STYLE_RENDERERS[opts.style] || styleCleanStudio)(ctx, m, data);
  return canvas;
}
