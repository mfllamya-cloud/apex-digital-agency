// ---------------------------------------------------------------------------
// Ad design templates — everything a customer reads on the ad is drawn here, by code, on a
// <canvas>: brand, headline, subheadline, benefit chips, call-to-action button, offer badge.
// The AI only produces the scene (the customer's real product in a setting, no text, no logo).
//
// Layout principle: text zones and the product zone never overlap.
//   - colour PANELS and shapes (built from the palette) carry all the text;
//   - the SCENE is clipped to its own region, where the product is the hero.
// One square scene is generated per design, with the product boxed in its centre (SCENE_PADDING
// in backend/adJobs.js). Every layout here crops that same square around the product box, so
// all formats show the same concept and text can never cover the product.
//
// Formats: 4:5 is the "feature poster" (brand, headline, tagline, product, three benefits with
// icon and explanation, badge, button, strip of product qualities). 1:1 and 9:16 are the panel
// layouts.
//
// Each style has its own look (panel colour, type, shapes). The "variant" number changes the
// panel side, the edge shape and, in 9:16, whether the panel is above or below the product, so
// two ads for the same customer do not look identical.
//
// No React and no imports on purpose: this file can be run and checked on its own.
// ---------------------------------------------------------------------------

export const AD_FORMATS = {
  "4:5": { width: 1080, height: 1350, label: "1080 × 1350" },
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
    '500 64px "Plus Jakarta Sans"',
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

function rgbToHex(r, g, b) {
  const h = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return "#" + h(r) + h(g) + h(b);
}

function rgbToHsl(r, g, b) {
  const R = r / 255;
  const G = g / 255;
  const B = b / 255;
  const max = Math.max(R, G, B);
  const min = Math.min(R, G, B);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h;
  if (max === R) h = ((G - B) / d) % 6;
  else if (max === G) h = (B - R) / d + 2;
  else h = (R - G) / d + 4;
  return { h: (h * 60 + 360) % 360, s, l };
}

function hslToHex(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let rgb;
  if (h < 60) rgb = [c, x, 0];
  else if (h < 120) rgb = [x, c, 0];
  else if (h < 180) rgb = [0, c, x];
  else if (h < 240) rgb = [0, x, c];
  else if (h < 300) rgb = [x, 0, c];
  else rgb = [c, 0, x];
  return rgbToHex((rgb[0] + m) * 255, (rgb[1] + m) * 255, (rgb[2] + m) * 255);
}

function hexToHsl(hex) {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHsl(r, g, b);
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

function mix(hexA, hexB, t) {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  return rgbToHex(a.r + (b.r - a.r) * t, a.g + (b.g - a.g) * t, a.b + (b.b - a.b) * t);
}

function rgba(hex, alpha) {
  const { r, g, b } = hexToRgb(hex);
  return "rgba(" + r + "," + g + "," + b + "," + alpha + ")";
}

// Moves the lightness of a colour until it reaches the wanted contrast against "against".
function ensureContrast(hex, against, ratio) {
  if (contrastRatio(hex, against) >= ratio) return hex;
  const { h, s, l } = hexToHsl(hex);
  const darker = luminance(against) > 0.4;
  let cur = l;
  for (let i = 0; i < 40; i++) {
    cur = darker ? cur - 0.02 : cur + 0.02;
    if (cur <= 0.04 || cur >= 0.96) break;
    const candidate = hslToHex(h, s, cur);
    if (contrastRatio(candidate, against) >= ratio) return candidate;
  }
  return darker ? "#111111" : "#ffffff";
}

// --- automatic brand colours ----------------------------------------------

const DEFAULT_PALETTE = ["#1f2a44", "#d4af37"];

// Turns any pair of colours into a usable one: colour 1 carries white text (panels, buttons),
// colour 2 is an accent that stands out next to colour 1.
export function normalizePalette(c1, c2) {
  const ok = (c) => /^#[0-9a-f]{6}$/i.test(String(c || ""));
  let a = ok(c1) ? c1.toLowerCase() : DEFAULT_PALETTE[0];
  let b = ok(c2) ? c2.toLowerCase() : DEFAULT_PALETTE[1];
  a = ensureContrast(a, "#ffffff", 4.5);
  if (contrastRatio(a, b) < 1.9) {
    const hb = hexToHsl(b);
    b = hslToHex(hb.h, Math.max(hb.s, 0.5), luminance(a) < 0.2 ? 0.62 : 0.3);
    if (contrastRatio(a, b) < 1.9) b = luminance(a) < 0.2 ? "#f2c14e" : "#111111";
  }
  return [a, b];
}

// Reads a palette from the product photo: the dominant colour of the product (the plain
// background around it is ignored) and an accent, then makes the pair usable for text.
// "source" is a loaded image or a canvas. Returns [colour1, colour2] as hex strings.
export function extractPalette(source) {
  try {
    const size = 72;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(source, 0, 0, size, size);
    const data = ctx.getImageData(0, 0, size, size).data;
    const px = (x, y) => {
      const i = (y * size + x) * 4;
      return [data[i], data[i + 1], data[i + 2]];
    };

    // Background estimate: the average of the border pixels.
    let br = 0;
    let bg = 0;
    let bb = 0;
    let bn = 0;
    for (let i = 0; i < size; i++) {
      const edge = [px(i, 0), px(i, size - 1), px(0, i), px(size - 1, i)];
      for (let k = 0; k < edge.length; k++) {
        br += edge[k][0];
        bg += edge[k][1];
        bb += edge[k][2];
        bn += 1;
      }
    }
    br /= bn;
    bg /= bn;
    bb /= bn;

    // Hue histogram of the pixels that are not background and carry real colour.
    const BINS = 24;
    const bins = [];
    for (let i = 0; i < BINS; i++) bins.push({ w: 0, r: 0, g: 0, b: 0 });
    let colourful = 0;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const p = px(x, y);
        const dist = Math.abs(p[0] - br) + Math.abs(p[1] - bg) + Math.abs(p[2] - bb);
        if (dist < 60) continue;
        const hsl = rgbToHsl(p[0], p[1], p[2]);
        if (hsl.s < 0.22 || hsl.l < 0.12 || hsl.l > 0.9) continue;
        const centre = 1 - Math.hypot(x / size - 0.5, y / size - 0.5); // the product sits near the centre
        const w = hsl.s * centre;
        const bin = bins[Math.floor(hsl.h / (360 / BINS)) % BINS];
        bin.w += w;
        bin.r += p[0] * w;
        bin.g += p[1] * w;
        bin.b += p[2] * w;
        colourful += 1;
      }
    }
    if (colourful < size * size * 0.015) return normalizePalette(DEFAULT_PALETTE[0], DEFAULT_PALETTE[1]);

    const order = bins.map((b, i) => ({ i, w: b.w })).sort((a, b) => b.w - a.w);
    const colourOf = (i) => {
      const b = bins[i];
      const hsl = rgbToHsl(b.r / b.w, b.g / b.w, b.b / b.w);
      return hslToHex(hsl.h, Math.min(0.85, Math.max(hsl.s, 0.45)), Math.min(0.5, Math.max(hsl.l, 0.3)));
    };
    const main = order[0];
    const c1 = colourOf(main.i);

    // Accent: another real hue of the product, at least 45° away; otherwise an analogous,
    // lighter neighbour of colour 1 on the wheel, which always sits well next to it.
    const hueGap = (a, b) => {
      const d = Math.abs(a - b) * (360 / BINS);
      return Math.min(d, 360 - d);
    };
    const second = order.find((o) => o.w > main.w * 0.07 && hueGap(o.i, main.i) >= 45);
    let c2;
    if (second) {
      const hsl = hexToHsl(colourOf(second.i));
      c2 = hslToHex(hsl.h, Math.max(hsl.s, 0.55), 0.56);
    } else {
      const hsl = hexToHsl(c1);
      c2 = hslToHex((hsl.h + 35) % 360, 0.7, 0.6);
    }
    return normalizePalette(c1, c2);
  } catch (_) {
    return normalizePalette(DEFAULT_PALETTE[0], DEFAULT_PALETTE[1]);
  }
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

// Each string is drawn in its own base direction, so Arabic punctuation and numbers land on the
// right side. Alignment always uses explicit "left" / "right" / "center", never "start" / "end".
function setDir(ctx, text) {
  ctx.direction = isRtlText(text) ? "rtl" : "ltr";
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
  const floor = Math.min(o.minSize, 22);
  for (; size >= floor; size -= 2) {
    setFont(ctx, o.weight, size, o.family);
    setTracking(ctx, o.tracking || 0, size);
    lines = wrapLines(ctx, text, o.maxWidth);
    const widest = Math.max.apply(null, lines.map((l) => ctx.measureText(l).width).concat([0]));
    const height = lines.length * size * o.leading;
    const fits = widest <= o.maxWidth && height <= o.maxHeight;
    // Above the preferred minimum size the line limit applies too; below it only "does it fit".
    if (fits && (lines.length <= o.maxLines || size <= o.minSize)) break;
  }
  size = Math.max(size, floor);
  setFont(ctx, o.weight, size, o.family);
  setTracking(ctx, o.tracking || 0, size);
  lines = wrapLines(ctx, text, o.maxWidth);
  setTracking(ctx, 0, size);
  return { size, lines, height: lines.length * size * o.leading, weight: o.weight, family: o.family, tracking: o.tracking || 0, leading: o.leading };
}

function drawFit(ctx, fit, x, top, align, color) {
  setFont(ctx, fit.weight, fit.size, fit.family);
  setTracking(ctx, fit.tracking, fit.size);
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = "alphabetic";
  fit.lines.forEach((line, i) => {
    // The ascent factor makes "top" the visual top of the first line (Arabic sits taller).
    const ascent = isRtlText(line) ? 1.0 : 0.8;
    setDir(ctx, line);
    ctx.fillText(line, x, top + fit.size * ascent + i * fit.size * fit.leading);
  });
  setTracking(ctx, 0, fit.size);
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

// x position of a block of the given width inside [left, left + width] for an alignment.
function alignX(box, width, align) {
  if (align === "center") return box.x + (box.w - width) / 2;
  if (align === "right") return box.x + box.w - width;
  return box.x;
}

// A real button: shape, padding, label, arrow. measure-only when ctx drawing is skipped.
function buttonMetrics(ctx, label, o) {
  const rtl = isRtlText(label);
  const text = o.uppercase && !rtl ? label.toUpperCase() : label;
  const family = rtl ? FONT_SANS_AR : FONT_SANS;
  const tracking = o.uppercase && !rtl ? 0.08 : 0;
  let size = o.size;
  let textW = 0;
  const arrow = o.size * 0.62;
  const gap = o.size * 0.5;
  for (; size >= 18; size -= 2) {
    setFont(ctx, 700, size, family);
    setTracking(ctx, tracking, size);
    textW = ctx.measureText(text).width;
    if (textW + arrow + gap + o.padX * 2 <= o.maxWidth) break;
  }
  setTracking(ctx, 0, size);
  return { rtl, text, family, tracking, size, textW, arrow, gap, width: textW + arrow + gap + o.padX * 2, height: o.height };
}

function drawButton(ctx, m, x, y, o) {
  ctx.save();
  if (o.shadow) {
    ctx.shadowColor = "rgba(0,0,0,0.22)";
    ctx.shadowBlur = 26;
    ctx.shadowOffsetY = 10;
  }
  roundRectPath(ctx, x, y, m.width, m.height, o.radius);
  if (o.outline) {
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = o.fill;
    ctx.stroke();
  } else {
    ctx.fillStyle = o.fill;
    ctx.fill();
  }
  ctx.restore();

  setFont(ctx, 700, m.size, m.family);
  setTracking(ctx, m.tracking, m.size);
  ctx.fillStyle = o.text;
  ctx.textBaseline = "middle";
  setDir(ctx, m.text);
  const cy = y + m.height / 2 + m.size * 0.04;
  if (m.rtl) {
    ctx.textAlign = "right";
    ctx.fillText(m.text, x + m.width - o.padX, cy);
    drawArrow(ctx, x + o.padX + m.arrow / 2, y + m.height / 2, m.arrow, true, o.text);
  } else {
    ctx.textAlign = "left";
    ctx.fillText(m.text, x + o.padX, cy);
    drawArrow(ctx, x + m.width - o.padX - m.arrow / 2, y + m.height / 2, m.arrow, false, o.text);
  }
  setTracking(ctx, 0, m.size);
}

// Benefit chips: a small check icon and a short label each, flowing in rows.
function chipsLayout(ctx, labels, o) {
  const items = labels.map((label) => {
    const rtl = isRtlText(label);
    setFont(ctx, 600, o.size, rtl ? FONT_SANS_AR : FONT_SANS);
    const textW = Math.min(ctx.measureText(label).width, o.maxWidth - o.height - o.padX);
    return { label, rtl, width: o.height * 0.5 + o.icon + o.size * 0.4 + textW + o.padX };
  });
  const rows = [];
  let row = [];
  let rowW = 0;
  items.forEach((item) => {
    const add = (row.length ? o.gap : 0) + item.width;
    if (row.length && rowW + add > o.maxWidth) {
      rows.push({ items: row, width: rowW });
      row = [];
      rowW = 0;
    }
    rowW += (row.length ? o.gap : 0) + item.width;
    row.push(item);
  });
  if (row.length) rows.push({ items: row, width: rowW });
  return { rows, height: rows.length * o.height + Math.max(0, rows.length - 1) * o.rowGap };
}

function drawChips(ctx, layout, box, top, align, rtlFlow, o, c) {
  layout.rows.forEach((row, r) => {
    let x = alignX(box, row.width, align);
    const y = top + r * (o.height + o.rowGap);
    const ordered = rtlFlow ? row.items.slice().reverse() : row.items;
    ordered.forEach((item) => {
      roundRectPath(ctx, x, y, item.width, o.height, o.radius);
      if (c.bg) {
        ctx.fillStyle = c.bg;
        ctx.fill();
      }
      if (c.border) {
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = c.border;
        ctx.stroke();
      }
      // icon: a filled disc with a check mark, on the start side of the label
      const iconCx = item.rtl ? x + item.width - o.height * 0.5 - o.icon * 0.1 : x + o.height * 0.5 + o.icon * 0.1;
      const cy = y + o.height / 2;
      ctx.beginPath();
      ctx.arc(iconCx, cy, o.icon / 2, 0, Math.PI * 2);
      ctx.fillStyle = c.icon;
      ctx.fill();
      ctx.save();
      ctx.strokeStyle = c.iconMark;
      ctx.lineWidth = Math.max(2, o.icon * 0.13);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(iconCx - o.icon * 0.22, cy + o.icon * 0.02);
      ctx.lineTo(iconCx - o.icon * 0.05, cy + o.icon * 0.19);
      ctx.lineTo(iconCx + o.icon * 0.24, cy - o.icon * 0.16);
      ctx.stroke();
      ctx.restore();

      setFont(ctx, 600, o.size, item.rtl ? FONT_SANS_AR : FONT_SANS);
      ctx.fillStyle = c.text;
      ctx.textBaseline = "middle";
      setDir(ctx, item.label);
      if (item.rtl) {
        ctx.textAlign = "right";
        ctx.fillText(item.label, iconCx - o.icon / 2 - o.size * 0.4, cy + o.size * 0.04, item.width - o.height - o.padX * 0.5);
      } else {
        ctx.textAlign = "left";
        ctx.fillText(item.label, iconCx + o.icon / 2 + o.size * 0.4, cy + o.size * 0.04, item.width - o.height - o.padX * 0.5);
      }
      x += item.width + o.gap;
    });
  });
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

function brandMetrics(ctx, d, maxW, maxH) {
  if (d.logo && (d.logo.naturalWidth || d.logo.width)) {
    const iw = d.logo.naturalWidth || d.logo.width;
    const ih = d.logo.naturalHeight || d.logo.height;
    const scale = Math.min(maxW / iw, maxH / ih);
    return { kind: "logo", width: iw * scale, height: ih * scale };
  }
  if (d.brandName) {
    const rtl = isRtlText(d.brandName);
    const size = Math.round(maxH * (rtl ? 0.6 : 0.42));
    setFont(ctx, 800, size, rtl ? FONT_SANS_AR : FONT_SANS);
    setTracking(ctx, rtl ? 0 : 0.16, size);
    const text = rtl ? d.brandName : d.brandName.toUpperCase();
    const width = Math.min(ctx.measureText(text).width, maxW);
    setTracking(ctx, 0, size);
    return { kind: "name", width, height: size * 1.2, size, text, rtl };
  }
  return { kind: "none", width: 0, height: 0 };
}

// Logo (or the brand name as a wordmark). "backdropHex" is the colour behind it; a logo that
// would not stand out gets a small backing chip. forceChip is used when it sits on the scene.
function drawBrand(ctx, d, m, x, y, backdropHex, ink, forceChip) {
  if (m.kind === "logo") {
    const lum = logoLuminance(d.logo);
    const needsChip = forceChip || (lum !== null && Math.abs(lum - luminance(backdropHex)) < 0.3);
    if (needsChip) {
      const pad = 16;
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.18)";
      ctx.shadowBlur = 20;
      ctx.shadowOffsetY = 6;
      ctx.fillStyle = lum !== null && lum > 0.6 ? "rgba(14,14,16,0.92)" : "rgba(255,255,255,0.96)";
      roundRectPath(ctx, x - pad, y - pad, m.width + pad * 2, m.height + pad * 2, 16);
      ctx.fill();
      ctx.restore();
    }
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(d.logo, x, y, m.width, m.height);
  } else if (m.kind === "name") {
    if (forceChip) {
      ctx.save();
      ctx.fillStyle = "rgba(14,14,16,0.72)";
      roundRectPath(ctx, x - 18, y - 10, m.width + 36, m.height + 16, 12);
      ctx.fill();
      ctx.restore();
    }
    setFont(ctx, 800, m.size, m.rtl ? FONT_SANS_AR : FONT_SANS);
    setTracking(ctx, m.rtl ? 0 : 0.16, m.size);
    ctx.fillStyle = forceChip ? "#ffffff" : ink;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    setDir(ctx, m.text);
    ctx.fillText(m.text, x, y + m.size, m.width + 2);
    setTracking(ctx, 0, m.size);
  }
}

// Offer badge: a round sticker with a short text ("20% OFF"), on the panel/scene boundary.
function drawBadge(ctx, text, cx, cy, r, tk) {
  if (!text) return;
  const rtl = isRtlText(text);
  const label = rtl ? text : text.toUpperCase();
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((tk.badge.rotate * Math.PI) / 180);
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.28)";
  ctx.shadowBlur = 26;
  ctx.shadowOffsetY = 10;
  ctx.beginPath();
  if (tk.badge.burst) {
    // sticker with a scalloped edge
    const points = 18;
    for (let i = 0; i <= points * 2; i++) {
      const rad = i % 2 === 0 ? r : r * 0.9;
      const a = (i / (points * 2)) * Math.PI * 2;
      if (i === 0) ctx.moveTo(Math.cos(a) * rad, Math.sin(a) * rad);
      else ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
    }
    ctx.closePath();
  } else {
    ctx.arc(0, 0, r, 0, Math.PI * 2);
  }
  ctx.fillStyle = tk.badge.fill;
  ctx.fill();
  ctx.restore();
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.8, 0, Math.PI * 2);
  ctx.lineWidth = 2;
  ctx.strokeStyle = tk.badge.ring;
  ctx.stroke();

  const fit = fitText(ctx, label, {
    weight: 800,
    family: rtl ? FONT_SANS_AR : FONT_SANS,
    maxSize: r * 0.62,
    minSize: r * 0.24,
    maxWidth: r * 1.36,
    maxLines: 2,
    maxHeight: r * 1.2,
    leading: rtl ? 1.25 : 1.0,
    tracking: 0,
  });
  drawFit(ctx, fit, 0, -fit.height / 2 + (rtl ? -fit.size * 0.12 : fit.size * 0.06), "center", tk.badge.text);
  ctx.restore();
}

// --- style tokens -----------------------------------------------------------

const EDGE_BY_STYLE = {
  clean_studio: ["straight", "curve", "diagonal"],
  bold_color: ["diagonal", "curve", "diagonal"],
  luxury_dark: ["straight", "curve", "straight"],
  lifestyle_scene: ["curve", "diagonal", "curve"],
};

function styleTokens(style, palette) {
  const c1 = palette[0];
  const c2 = palette[1];
  if (style === "bold_color") {
    // Saturated full-bleed colour, heavy uppercase type, strong shapes.
    const hsl = hexToHsl(c1);
    const bg = ensureContrast(hslToHex(hsl.h, Math.max(hsl.s, 0.72), Math.min(Math.max(hsl.l, 0.36), 0.48)), "#ffffff", 4.5);
    const ink = "#ffffff";
    const pop = contrastRatio(c2, bg) >= 1.9 ? c2 : "#ffffff";
    return {
      panelBg: bg, ink, subInk: "rgba(255,255,255,0.9)", accent: pop, vignette: 0.16,
      headline: { family: FONT_SANS, weight: 800, upper: true, tracking: -0.03, leading: 1.0, boost: 1.22 },
      button: { fill: pop, text: onColor(pop), radius: 12, uppercase: true, outline: false, shadow: true },
      chip: { bg: "rgba(255,255,255,0.16)", border: null, text: ink, icon: pop, iconMark: onColor(pop) },
      badge: { fill: pop, text: onColor(pop), ring: rgba(onColor(pop), 0.45), rotate: -12, burst: true },
      align: "start", strip: { bg: "#0e0e10", ink: "#ffffff", icon: pop }, iconDisc: "rgba(255,255,255,0.16)", iconInk: "#ffffff", rowBg: "rgba(255,255,255,0.10)",
    };
  }
  if (style === "luxury_dark") {
    const gold = contrastRatio(c2, "#0b0b0d") >= 5 ? c2 : "#d4af37";
    return {
      panelBg: "#0b0b0d", ink: "#f6f0e2", subInk: "rgba(246,240,226,0.78)", accent: gold, vignette: 0.42,
      headline: { family: FONT_DISPLAY, weight: 600, upper: false, tracking: 0, leading: 1.06, boost: 1.12 },
      button: { fill: gold, text: gold, radius: 999, uppercase: true, outline: true, shadow: false },
      chip: { bg: null, border: rgba(gold, 0.55), text: "#f6f0e2", icon: gold, iconMark: "#0b0b0d" },
      badge: { fill: "#0b0b0d", text: gold, ring: gold, rotate: 0, burst: false },
      align: "center", strip: { bg: "#16161a", ink: "#f6f0e2", icon: gold }, iconDisc: rgba(gold, 0.14), iconInk: gold, rowBg: rgba(gold, 0.07),
    };
  }
  if (style === "lifestyle_scene") {
    const bg = "#f6f1e7";
    const accent = ensureContrast(c1, bg, 4.5);
    return {
      panelBg: bg, ink: "#1d1b18", subInk: "rgba(29,27,24,0.74)", accent, vignette: 0.14,
      headline: { family: FONT_SANS, weight: 700, upper: false, tracking: -0.02, leading: 1.1, boost: 1.0 },
      button: { fill: accent, text: onColor(accent), radius: 999, uppercase: false, outline: false, shadow: true },
      chip: { bg: rgba(accent, 0.12), border: null, text: "#1d1b18", icon: accent, iconMark: onColor(accent) },
      badge: { fill: c2, text: onColor(c2), ring: rgba(onColor(c2), 0.4), rotate: -10, burst: false },
      align: "start", strip: { bg: accent, ink: onColor(accent), icon: onColor(accent) }, iconDisc: rgba(accent, 0.13), iconInk: accent, rowBg: "rgba(255,255,255,0.62)",
    };
  }
  // clean_studio: airy tint of the brand colour, dark ink, precise shapes.
  const bg = mix("#ffffff", c1, 0.09);
  const accent = ensureContrast(c1, bg, 4.5);
  return {
    panelBg: bg, ink: "#101114", subInk: "rgba(16,17,20,0.7)", accent, vignette: 0.12,
    headline: { family: FONT_SANS, weight: 800, upper: false, tracking: -0.025, leading: 1.08, boost: 1.0 },
    button: { fill: accent, text: onColor(accent), radius: 999, uppercase: false, outline: false, shadow: true },
    chip: { bg: "#ffffff", border: rgba(accent, 0.3), text: "#101114", icon: accent, iconMark: onColor(accent) },
    badge: { fill: accent, text: onColor(accent), ring: rgba(onColor(accent), 0.45), rotate: -8, burst: false },
    align: "start", strip: { bg: accent, ink: onColor(accent), icon: onColor(accent) }, iconDisc: rgba(accent, 0.12), iconInk: accent, rowBg: "rgba(255,255,255,0.8)",
  };
}

// --- geometry ---------------------------------------------------------------
// The scene is one 1024 x 1024 image with the product boxed in its centre. Each region below
// crops it ("cover", centred), so the product box always lands inside the region.
// ⚠️ SCENE_BOX mirrors SCENE_PADDING in backend/adJobs.js (fractions of the scene size).
export const SCENE_BOX = {
  portrait: { x0: 308 / 1024, x1: 716 / 1024, y0: 190 / 1024, y1: 948 / 1024 },
  landscape: { x0: 130 / 1024, x1: 894 / 1024, y0: 300 / 1024, y1: 750 / 1024 },
};

function geometry(format, variant, landscape, rtl, style) {
  const edge = EDGE_BY_STYLE[style][variant % 3];
  if (format === "9:16") {
    const W = 1080;
    const H = 1920;
    // Product above (clear of the 220 px interface zone at the top), panel below (content
    // above the 300 px interface zone at the bottom).
    return {
      W, H, kind: "bottom", edge, mirror: rtl,
      scene: { x: 0, y: 0, w: W, h: 1140 },
      content: { x: 84, y: 1172, w: W - 168, h: 440 },
      brandOnScene: { x: 84, y: 236 },
      badge: { cx: rtl ? 150 : W - 150, cy: 330, r: 92 },
      panel: (ctx) => {
        ctx.beginPath();
        ctx.moveTo(0, H);
        ctx.lineTo(W, H);
        if (edge === "diagonal") {
          ctx.lineTo(W, rtl ? 1080 : 1140);
          ctx.lineTo(0, rtl ? 1140 : 1080);
        } else if (edge === "curve") {
          ctx.lineTo(W, 1140);
          ctx.quadraticCurveTo(W / 2, 1040, 0, 1140);
        } else {
          ctx.lineTo(W, 1110);
          ctx.lineTo(0, 1110);
        }
        ctx.closePath();
      },
      edgeLine: (ctx) => {
        ctx.beginPath();
        if (edge === "diagonal") {
          ctx.moveTo(W, rtl ? 1080 : 1140);
          ctx.lineTo(0, rtl ? 1140 : 1080);
        } else if (edge === "curve") {
          ctx.moveTo(W, 1140);
          ctx.quadraticCurveTo(W / 2, 1040, 0, 1140);
        } else {
          ctx.moveTo(W, 1110);
          ctx.lineTo(0, 1110);
        }
      },
    };
  }

  const W = 1080;
  const H = 1080;
  if (landscape) {
    // Wide product photo: panel on top, a wide scene, and a bar for chips and button below.
    return {
      W, H, kind: "stack", edge, mirror: rtl,
      scene: { x: 0, y: 380, w: W, h: 580 },
      content: { x: 64, y: 52, w: W - 128, h: 318 },
      bar: { x: 64, y: 960, w: W - 128, h: 120 },
      badge: { cx: rtl ? 150 : W - 150, cy: 424, r: 84 },
      panel: (ctx) => {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(W, 0);
        if (edge === "diagonal") {
          ctx.lineTo(W, rtl ? 440 : 388);
          ctx.lineTo(0, rtl ? 388 : 440);
        } else if (edge === "curve") {
          ctx.lineTo(W, 388);
          ctx.quadraticCurveTo(W / 2, 470, 0, 388);
        } else {
          ctx.lineTo(W, 412);
          ctx.lineTo(0, 412);
        }
        ctx.closePath();
        ctx.rect(0, 960, W, 120);
      },
      edgeLine: (ctx) => {
        ctx.beginPath();
        if (edge === "diagonal") {
          ctx.moveTo(W, rtl ? 440 : 388);
          ctx.lineTo(0, rtl ? 388 : 440);
        } else if (edge === "curve") {
          ctx.moveTo(W, 388);
          ctx.quadraticCurveTo(W / 2, 470, 0, 388);
        } else {
          ctx.moveTo(W, 412);
          ctx.lineTo(0, 412);
        }
      },
    };
  }

  // Side panel: text on one side, the product tall on the other. The variant flips the side.
  const panelLeft = (variant % 2 === 0) !== rtl;
  const fx = (x) => (panelLeft ? x : W - x); // mirror helper
  const edgePath = (ctx, move) => {
    if (edge === "diagonal") {
      if (move) ctx.moveTo(fx(540), 0);
      else ctx.lineTo(fx(540), 0);
      ctx.lineTo(fx(462), H);
    } else if (edge === "curve") {
      if (move) ctx.moveTo(fx(468), 0);
      else ctx.lineTo(fx(468), 0);
      ctx.quadraticCurveTo(fx(580), H / 2, fx(468), H);
    } else {
      if (move) ctx.moveTo(fx(500), 0);
      else ctx.lineTo(fx(500), 0);
      ctx.lineTo(fx(500), H);
    }
  };
  return {
    W, H, kind: "side", edge, mirror: !panelLeft, panelLeft,
    scene: { x: panelLeft ? 460 : 0, y: 0, w: 620, h: H },
    content: { x: panelLeft ? 56 : W - 56 - 376, y: 60, w: 376, h: H - 120 },
    badge: { cx: fx(506), cy: 132, r: 92 },
    panel: (ctx) => {
      ctx.beginPath();
      ctx.moveTo(fx(0), 0);
      edgePath(ctx, false);
      ctx.lineTo(fx(0), H);
      ctx.closePath();
    },
    edgeLine: (ctx) => {
      ctx.beginPath();
      edgePath(ctx, true);
    },
  };
}

// --- composition ------------------------------------------------------------

function drawScene(ctx, g, img, tk) {
  const s = g.scene;
  ctx.save();
  ctx.beginPath();
  ctx.rect(s.x, s.y, s.w, s.h);
  ctx.clip();
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (iw && ih) {
    const scale = Math.max(s.w / iw, s.h / ih);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, s.x + (s.w - iw * scale) / 2, s.y + (s.h - ih * scale) / 2, iw * scale, ih * scale);
  }
  // The scene falls off towards its edges so the product reads as the hero.
  const cx = s.x + s.w / 2;
  const cy = s.y + s.h * 0.56;
  const rad = Math.max(s.w, s.h) * 0.78;
  const vig = ctx.createRadialGradient(cx, cy, rad * 0.42, cx, cy, rad);
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(1, "rgba(0,0,0," + tk.vignette + ")");
  ctx.fillStyle = vig;
  ctx.fillRect(s.x, s.y, s.w, s.h);
  ctx.restore();
}

function drawPanel(ctx, g, tk, style, palette) {
  ctx.save();
  g.panel(ctx);
  ctx.fillStyle = tk.panelBg;
  ctx.shadowColor = "rgba(0,0,0,0.28)";
  ctx.shadowBlur = 40;
  ctx.fill();
  ctx.restore();

  // Decorative shapes, clipped to the panel so they never reach the product.
  ctx.save();
  g.panel(ctx);
  ctx.clip();
  const c = g.content;
  if (style === "bold_color") {
    // a big ring and a solid quarter disc in the accent colour
    ctx.lineWidth = g.kind === "side" ? 34 : 44;
    ctx.strokeStyle = "rgba(255,255,255,0.13)";
    ctx.beginPath();
    ctx.arc(g.mirror ? c.x + c.w + 40 : c.x - 40, c.y + c.h + 40, g.kind === "side" ? 210 : 260, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = rgba(tk.accent, 0.9);
    ctx.beginPath();
    ctx.arc(g.mirror ? 0 : g.W, g.kind === "bottom" ? g.H : 0, g.kind === "side" ? 0 : 150, 0, Math.PI * 2);
    ctx.fill();
  } else if (style === "luxury_dark") {
    // hairline frame inside the panel
    ctx.strokeStyle = rgba(tk.accent, 0.5);
    ctx.lineWidth = 1.5;
    const inset = 26;
    if (g.kind === "side") ctx.strokeRect(g.panelLeft ? inset : g.W - 444, inset, 418, g.H - inset * 2);
    else ctx.strokeRect(c.x - 34, c.y - 26, c.w + 68, c.h + 52);
  } else if (style === "lifestyle_scene") {
    ctx.fillStyle = rgba(tk.accent, 0.1);
    ctx.beginPath();
    ctx.arc(g.mirror ? c.x + c.w : c.x, c.y - 20, g.kind === "side" ? 190 : 250, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba(palette[1], 0.16);
    ctx.beginPath();
    ctx.arc(g.mirror ? c.x + 30 : c.x + c.w - 30, c.y + c.h + 30, g.kind === "side" ? 120 : 150, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = rgba(tk.accent, 0.09);
    ctx.beginPath();
    ctx.arc(g.mirror ? c.x + c.w + 30 : c.x - 30, c.y + c.h + 10, g.kind === "side" ? 230 : 280, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = rgba(tk.accent, 0.22);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(g.mirror ? c.x + c.w + 30 : c.x - 30, c.y + c.h + 10, g.kind === "side" ? 290 : 350, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();

  // Accent line along the edge between panel and scene.
  ctx.save();
  g.edgeLine(ctx);
  ctx.strokeStyle = style === "luxury_dark" ? rgba(tk.accent, 0.8) : tk.accent;
  ctx.lineWidth = style === "bold_color" ? 14 : style === "luxury_dark" ? 2 : 5;
  ctx.stroke();
  ctx.restore();
}

// Sizes per layout kind.
function scaleFor(kind) {
  if (kind === "side") return { headMax: 62, headMin: 34, headLines: 5, sub: 25, subLines: 4, chip: 21, chipH: 44, btnH: 66, btn: 24, logoH: 60, logoW: 240, gap: 26 };
  if (kind === "stack") return { headMax: 62, headMin: 34, headLines: 2, sub: 25, subLines: 2, chip: 20, chipH: 42, btnH: 62, btn: 23, logoH: 52, logoW: 220, gap: 18 };
  return { headMax: 76, headMin: 40, headLines: 3, sub: 31, subLines: 2, chip: 25, chipH: 52, btnH: 80, btn: 29, logoH: 84, logoW: 300, gap: 24 };
}

function drawContent(ctx, g, tk, d) {
  const sc = scaleFor(g.kind);
  const box = g.content;
  const rtl = d.rtl;
  const align = tk.align === "center" ? "center" : rtl ? "right" : "left";
  const textX = align === "center" ? box.x + box.w / 2 : align === "right" ? box.x + box.w : box.x;
  const hd = tk.headline;
  const headFamily = rtl ? FONT_SANS_AR : hd.family;
  const headText = hd.upper && !rtl ? d.headline.toUpperCase() : d.headline;

  // Brand: on the panel, except in the "bottom" layout where it sits on the scene's top corner.
  const brand = brandMetrics(ctx, d, sc.logoW, sc.logoH);
  let top = box.y;
  if (g.brandOnScene) {
    const bx = rtl ? g.W - g.brandOnScene.x - brand.width : g.brandOnScene.x;
    drawBrand(ctx, d, brand, bx, g.brandOnScene.y, "#808080", tk.ink, true);
  } else if (brand.kind !== "none") {
    drawBrand(ctx, d, brand, alignX(box, brand.width, align), box.y, tk.panelBg, tk.ink, false);
    top = box.y + brand.height + sc.gap * 1.3;
  }

  // Measure the fixed blocks first, then give the headline what is left.
  const chipOpts = { size: sc.chip, height: sc.chipH, icon: sc.chipH * 0.5, padX: sc.chipH * 0.42, gap: 10, rowGap: 10, radius: 999, maxWidth: box.w };
  const inBar = g.kind === "stack";
  const chips = d.chips.length && !inBar ? chipsLayout(ctx, d.chips, chipOpts) : null;
  const btnOpts = { size: sc.btn, height: sc.btnH, padX: sc.btnH * 0.5, maxWidth: box.w, uppercase: tk.button.uppercase };
  const btn = d.cta && !inBar ? buttonMetrics(ctx, d.cta, btnOpts) : null;

  const subFit = d.subheadline
    ? fitText(ctx, d.subheadline, {
        weight: 500, family: rtl ? FONT_SANS_AR : FONT_SANS, maxSize: sc.sub, minSize: sc.sub - 6,
        maxWidth: box.w, maxLines: sc.subLines, maxHeight: sc.sub * 1.4 * sc.subLines, leading: rtl ? 1.5 : 1.36, tracking: 0,
      })
    : null;

  const footer = g.kind === "side" && brand.kind === "logo" && d.brandName ? sc.chip * 1.5 : 0;
  const bottom = box.y + box.h - footer;
  const subGap = sc.gap * 0.7;
  const fixed = (subFit ? subFit.height + subGap : 0) + (chips ? chips.height + sc.gap : 0) + (btn ? btn.height + sc.gap : 0);
  const headFit = fitText(ctx, headText, {
    weight: hd.weight, family: headFamily,
    maxSize: sc.headMax * hd.boost * (rtl ? 0.9 : 1), minSize: sc.headMin,
    maxWidth: box.w, maxLines: sc.headLines, maxHeight: Math.max(sc.headMin * 1.2, bottom - top - fixed - 12),
    leading: rtl ? 1.3 : hd.leading, tracking: rtl ? 0 : hd.tracking,
  });

  // The text group is centred vertically in the space under the brand (tall panels breathe).
  const groupH = 12 + headFit.height + fixed;
  let y = top + Math.max(0, (bottom - top - groupH) / 2);

  // Accent rule above the headline
  ctx.fillStyle = tk.accent;
  const ruleW = g.kind === "side" ? 56 : 80;
  ctx.fillRect(align === "center" ? textX - ruleW / 2 : align === "right" ? textX - ruleW : textX, y, ruleW, tk.align === "center" ? 2 : 6);
  y += 12 + sc.gap * 0.4;

  drawFit(ctx, headFit, textX, y, align, tk.ink);
  y += headFit.height;
  if (subFit) {
    y += subGap;
    drawFit(ctx, subFit, textX, y, align, tk.subInk);
    y += subFit.height;
  }
  if (chips) {
    y += sc.gap;
    drawChips(ctx, chips, box, y, align, rtl, chipOpts, tk.chip);
    y += chips.height;
  }
  if (btn) {
    y += sc.gap;
    drawButton(ctx, btn, alignX(box, btn.width, align), y, { ...tk.button, padX: btnOpts.padX });
  }

  // "stack" layout: chips and button live in the bar under the scene.
  if (inBar) {
    const bar = g.bar;
    const b = d.cta ? buttonMetrics(ctx, d.cta, { ...btnOpts, maxWidth: bar.w * 0.4 }) : null;
    const chipW = bar.w - (b ? b.width + 28 : 0);
    const barChips = d.chips.length ? chipsLayout(ctx, d.chips, { ...chipOpts, maxWidth: chipW }) : null;
    const chipBox = { x: rtl ? bar.x + bar.w - chipW : bar.x, y: bar.y, w: chipW, h: bar.h };
    if (barChips && barChips.rows.length === 1) {
      drawChips(ctx, barChips, chipBox, bar.y + (bar.h - barChips.height) / 2, rtl ? "right" : "left", rtl, { ...chipOpts, maxWidth: chipW }, tk.chip);
    }
    if (b) drawButton(ctx, b, rtl ? bar.x : bar.x + bar.w - b.width, bar.y + (bar.h - b.height) / 2, { ...tk.button, padX: btnOpts.padX, shadow: false });
  }

  // Footer: the brand name, small, when the logo is at the top.
  if (footer) {
    const frtl = isRtlText(d.brandName);
    setFont(ctx, 600, sc.chip * 0.9, frtl ? FONT_SANS_AR : FONT_SANS);
    setTracking(ctx, frtl ? 0 : 0.12, sc.chip);
    ctx.fillStyle = tk.subInk;
    ctx.textAlign = align;
    ctx.textBaseline = "alphabetic";
    setDir(ctx, d.brandName);
    ctx.fillText(frtl ? d.brandName : d.brandName.toUpperCase(), textX, box.y + box.h, box.w);
    setTracking(ctx, 0, sc.chip);
  }
}

// --- icons ------------------------------------------------------------------
// Small line icons drawn by code. "name" comes from the ad copy (AD_ICONS in backend/server.js).
export const AD_ICON_NAMES = ["drop", "leaf", "shield", "sparkle", "clock", "heart", "star", "sun", "bolt", "check", "flower", "award"];

function drawIcon(ctx, name, cx, cy, r, color) {
  const P = (x, y) => [cx + x * r, cy + y * r];
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(2, r * 0.17);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  const M = (x, y) => ctx.moveTo.apply(ctx, P(x, y));
  const L = (x, y) => ctx.lineTo.apply(ctx, P(x, y));
  const Q = (a, b, x, y) => ctx.quadraticCurveTo.apply(ctx, P(a, b).concat(P(x, y)));
  const B = (a, b, c, d, x, y) => ctx.bezierCurveTo.apply(ctx, P(a, b).concat(P(c, d), P(x, y)));
  const circle = (x, y, rad) => {
    const p = P(x, y);
    ctx.moveTo(p[0] + rad * r, p[1]);
    ctx.arc(p[0], p[1], rad * r, 0, Math.PI * 2);
  };
  switch (name) {
    case "drop":
      M(0, -0.9); B(0.95, 0.1, 0.7, 0.92, 0, 0.92); B(-0.7, 0.92, -0.95, 0.1, 0, -0.9);
      break;
    case "leaf":
      M(-0.72, 0.72); Q(-0.85, -0.75, 0.78, -0.78); Q(0.8, 0.8, -0.72, 0.72); M(-0.72, 0.72); L(0.2, -0.2);
      break;
    case "shield":
      M(0, -0.9); L(0.76, -0.6); L(0.76, 0.05); Q(0.7, 0.66, 0, 0.94); Q(-0.7, 0.66, -0.76, 0.05); L(-0.76, -0.6); ctx.closePath();
      M(-0.3, 0.02); L(-0.05, 0.28); L(0.34, -0.2);
      break;
    case "sparkle":
      M(0, -0.92); Q(0.14, -0.14, 0.92, 0); Q(0.14, 0.14, 0, 0.92); Q(-0.14, 0.14, -0.92, 0); Q(-0.14, -0.14, 0, -0.92);
      break;
    case "clock":
      circle(0, 0, 0.84); M(0, -0.46); L(0, 0); L(0.36, 0.2);
      break;
    case "heart":
      M(0, 0.82); B(-1.15, 0.05, -0.62, -0.95, 0, -0.32); B(0.62, -0.95, 1.15, 0.05, 0, 0.82);
      break;
    case "sun": {
      circle(0, 0, 0.36);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        M(Math.cos(a) * 0.6, Math.sin(a) * 0.6); L(Math.cos(a) * 0.9, Math.sin(a) * 0.9);
      }
      break;
    }
    case "bolt":
      M(0.18, -0.92); L(-0.5, 0.12); L(0, 0.12); L(-0.18, 0.92); L(0.5, -0.12); L(0, -0.12); ctx.closePath();
      break;
    case "flower": {
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
        circle(Math.cos(a) * 0.52, Math.sin(a) * 0.52, 0.3);
      }
      circle(0, 0, 0.16);
      break;
    }
    case "award":
      circle(0, -0.3, 0.5); M(-0.3, 0.14); L(-0.48, 0.92); L(0, 0.62); L(0.48, 0.92); L(0.3, 0.14);
      break;
    case "star": {
      for (let i = 0; i < 10; i++) {
        const rad = i % 2 === 0 ? 0.92 : 0.4;
        const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
        if (i === 0) M(Math.cos(a) * rad, Math.sin(a) * rad);
        else L(Math.cos(a) * rad, Math.sin(a) * rad);
      }
      ctx.closePath();
      break;
    }
    default:
      M(-0.6, 0.05); L(-0.15, 0.5); L(0.66, -0.45);
  }
  ctx.stroke();
  ctx.restore();
}

// --- 4:5 feature poster -----------------------------------------------------

// Clip path of the product card. The variant changes its shape.
// Two labels are "the same" when they match once case, accents, spaces and punctuation are ignored.
function sameKey(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

function cardPath(ctx, x, y, w, h, shape) {
  if (shape === "arch") {
    const r = w / 2;
    ctx.beginPath();
    ctx.moveTo(x, y + h);
    ctx.lineTo(x, y + r);
    ctx.arc(x + r, y + r, r, Math.PI, 0);
    ctx.lineTo(x + w, y + h - 36);
    ctx.arcTo(x + w, y + h, x + w - 36, y + h, 36);
    ctx.lineTo(x + 36, y + h);
    ctx.arcTo(x, y + h, x, y + h - 36, 36);
    ctx.closePath();
  } else {
    roundRectPath(ctx, x, y, w, h, shape === "soft" ? 90 : 40);
  }
}

// "focus" (a SCENE_BOX entry) zooms in on the product box so the product fills more of the
// region, the way it does in the 1:1 format. Without it the scene is cropped "cover", centred.
function drawSceneInto(ctx, img, x, y, w, h, vignette, focus) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (iw && ih) {
    const cover = Math.max(w / iw, h / ih);
    let scale = cover;
    let dx = x + (w - iw * scale) / 2;
    let dy = y + (h - ih * scale) / 2;
    if (focus) {
      const bw = (focus.x1 - focus.x0) * iw;
      const bh = (focus.y1 - focus.y0) * ih;
      // The product box takes up to 86% of the region's height and 82% of its width.
      scale = Math.max(cover, Math.min((h * 0.86) / bh, (w * 0.82) / bw));
      const bcx = ((focus.x0 + focus.x1) / 2) * iw * scale;
      const bcy = ((focus.y0 + focus.y1) / 2) * ih * scale;
      // Centre the box (a little below the middle), without ever showing past the scene's edges.
      dx = Math.min(x, Math.max(x + w - iw * scale, x + w / 2 - bcx));
      dy = Math.min(y, Math.max(y + h - ih * scale, y + h * 0.53 - bcy));
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, dx, dy, iw * scale, ih * scale);
  }
  const cx = x + w / 2;
  const cy = y + h * 0.56;
  const rad = Math.max(w, h) * 0.8;
  const vig = ctx.createRadialGradient(cx, cy, rad * 0.45, cx, cy, rad);
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(1, "rgba(0,0,0," + vignette + ")");
  ctx.fillStyle = vig;
  ctx.fillRect(x, y, w, h);
}

function drawPoster(ctx, tk, d, o) {
  const W = 1080;
  const H = 1350;
  const M = 64;
  const rtl = d.rtl;
  const hd = tk.headline;
  ctx.fillStyle = tk.panelBg;
  ctx.fillRect(0, 0, W, H);

  // Bottom strip: product qualities, minus anything the poster already says (a benefit title,
  // the badge). With nothing new to say there is no strip, and the middle zone takes its place.
  const said = d.chips.concat([d.badge]).map(sameKey).filter(Boolean);
  const stripItems = d.qualities
    .map((label, i) => ({ label, icon: d.qualityIcons[i] || "star", key: sameKey(label) }))
    .filter((it, i, all) => it.key && !said.some((k) => k === it.key || k.includes(it.key) || it.key.includes(k)) && all.findIndex((x) => x.key === it.key) === i)
    .slice(0, 4);
  const stripH = stripItems.length ? 160 : 0;

  // Backdrop shapes from the palette, behind everything.
  ctx.save();
  ctx.fillStyle = rgba(tk.accent, o.style === "bold_color" ? 0.22 : 0.1);
  ctx.beginPath();
  ctx.arc(o.sceneLeft ? 250 : W - 250, 800, 430, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = rgba(tk.accent, o.style === "luxury_dark" ? 0.45 : 0.22);
  ctx.lineWidth = o.style === "bold_color" ? 30 : 2;
  ctx.beginPath();
  ctx.arc(o.sceneLeft ? W - 60 : 60, 120, 210, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  if (o.style === "luxury_dark") {
    ctx.strokeStyle = rgba(tk.accent, 0.5);
    ctx.lineWidth = 1.5;
    ctx.strokeRect(26, 26, W - 52, H - 52 - stripH);
  }

  // ---- header: brand, headline, tagline (centred) ----
  const box = { x: M, y: 54, w: W - M * 2, h: 0 };
  const brand = brandMetrics(ctx, d, 300, 58);
  let y = box.y;
  if (brand.kind !== "none") {
    drawBrand(ctx, d, brand, (W - brand.width) / 2, y, tk.panelBg, tk.ink, false);
    y += brand.height + 22;
  }
  ctx.fillStyle = tk.accent;
  ctx.fillRect(W / 2 - 40, y, 80, tk.align === "center" ? 2 : 6);
  y += 24;
  const headText = hd.upper && !rtl ? d.headline.toUpperCase() : d.headline;
  const subFit = d.subheadline
    ? fitText(ctx, d.subheadline, { weight: 500, family: rtl ? FONT_SANS_AR : FONT_SANS, maxSize: 30, minSize: 24, maxWidth: box.w - 80, maxLines: 2, maxHeight: 92, leading: rtl ? 1.5 : 1.36, tracking: 0 })
    : null;
  const headerBottom = 404;
  const headFit = fitText(ctx, headText, {
    weight: hd.weight, family: rtl ? FONT_SANS_AR : hd.family,
    maxSize: 80 * hd.boost * (rtl ? 0.88 : 1), minSize: 44, maxWidth: box.w, maxLines: 2,
    maxHeight: headerBottom - y - (subFit ? subFit.height + 16 : 0), leading: rtl ? 1.3 : hd.leading, tracking: rtl ? 0 : hd.tracking,
  });
  // centre the headline block in the header space
  const blockH = headFit.height + (subFit ? subFit.height + 16 : 0);
  y += Math.max(0, (headerBottom - y - blockH) / 2);
  drawFit(ctx, headFit, W / 2, y, "center", tk.ink);
  y += headFit.height;
  if (subFit) drawFit(ctx, subFit, W / 2, y + 16, "center", tk.subInk);

  // ---- middle: product card + three benefits ----
  const y0 = 432;
  const y1 = H - stripH - 40 - (stripH ? 0 : 24);
  const benefits = d.chips.map((title, i) => ({ title, detail: d.chipDetails[i] || "", icon: d.chipIcons[i] || "check" }));
  const btnOpts = { size: 27, height: 74, padX: 38, uppercase: tk.button.uppercase };
  let card;
  let badgeAt;

  if (o.landscape) {
    card = { x: M, y: y0, w: W - M * 2, h: 425 + (stripH ? 0 : 110) };
    badgeAt = { cx: rtl ? M + 70 : W - M - 70, cy: y0 + 40, r: 84 };
  } else {
    card = { x: o.sceneLeft ? M : W - M - 520, y: y0, w: 520, h: y1 - y0 };
    badgeAt = { cx: o.sceneLeft ? card.x + card.w - 6 : card.x + 6, cy: y0 + 84, r: 88 };
  }

  // backing shape, then the scene clipped to the card
  ctx.save();
  ctx.translate(card.x + card.w / 2, card.y + card.h / 2);
  ctx.rotate(((o.sceneLeft ? -3 : 3) * Math.PI) / 180);
  ctx.fillStyle = o.style === "luxury_dark" ? rgba(tk.accent, 0.28) : tk.accent;
  roundRectPath(ctx, -card.w / 2 + 6, -card.h / 2 + 10, card.w, card.h, 44);
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.3)";
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 16;
  cardPath(ctx, card.x, card.y, card.w, card.h, o.landscape ? "rect" : o.shape);
  ctx.fillStyle = "#d9d9d9";
  ctx.fill();
  ctx.restore();
  ctx.save();
  cardPath(ctx, card.x, card.y, card.w, card.h, o.landscape ? "rect" : o.shape);
  ctx.clip();
  if (o.scene) drawSceneInto(ctx, o.scene, card.x, card.y, card.w, card.h, tk.vignette, o.landscape ? null : SCENE_BOX.portrait);
  ctx.restore();
  ctx.save();
  cardPath(ctx, card.x, card.y, card.w, card.h, o.landscape ? "rect" : o.shape);
  ctx.lineWidth = o.style === "luxury_dark" ? 2 : 5;
  ctx.strokeStyle = o.style === "luxury_dark" ? tk.accent : "rgba(255,255,255,0.9)";
  ctx.stroke();
  ctx.restore();

  const drawBenefit = (b, bx, by, bw, centered, bh) => {
    const disc = 34;
    const textRtl = isRtlText(b.title);
    if (centered) {
      ctx.fillStyle = tk.iconDisc;
      ctx.beginPath();
      ctx.arc(bx + bw / 2, by + disc, disc, 0, Math.PI * 2);
      ctx.fill();
      drawIcon(ctx, b.icon, bx + bw / 2, by + disc, disc * 0.52, tk.iconInk);
      const tf = fitText(ctx, b.title, { weight: 700, family: textRtl ? FONT_SANS_AR : FONT_SANS, maxSize: 27, minSize: 20, maxWidth: bw, maxLines: 1, maxHeight: 44, leading: 1.2, tracking: 0 });
      drawFit(ctx, tf, bx + bw / 2, by + disc * 2 + 12, "center", tk.ink);
      if (b.detail) {
        const df = fitText(ctx, b.detail, { weight: 500, family: textRtl ? FONT_SANS_AR : FONT_SANS, maxSize: 21, minSize: 17, maxWidth: bw, maxLines: 2, maxHeight: 64, leading: 1.35, tracking: 0 });
        drawFit(ctx, df, bx + bw / 2, by + disc * 2 + 12 + tf.height + 4, "center", tk.subInk);
      }
      return;
    }
    // A row is a card of fixed height (bh); its content is centred in it, so the three
    // benefits always look the same size whatever the length of their texts.
    const pad = 16;
    ctx.fillStyle = tk.rowBg;
    roundRectPath(ctx, bx, by, bw, bh, 22);
    ctx.fill();
    const iconCx = rtl ? bx + bw - pad - disc : bx + pad + disc;
    ctx.fillStyle = tk.iconDisc;
    ctx.beginPath();
    ctx.arc(iconCx, by + bh / 2, disc, 0, Math.PI * 2);
    ctx.fill();
    drawIcon(ctx, b.icon, iconCx, by + bh / 2, disc * 0.52, tk.iconInk);
    const tx = rtl ? bx + bw - pad - disc * 2 - 16 : bx + pad + disc * 2 + 16;
    const tw = bw - pad * 2 - disc * 2 - 16;
    const inner = bh - pad * 2;
    const tf = fitText(ctx, b.title, { weight: 700, family: textRtl ? FONT_SANS_AR : FONT_SANS, maxSize: 27, minSize: 19, maxWidth: tw, maxLines: 2, maxHeight: b.detail ? inner * 0.5 : inner, leading: 1.15, tracking: 0 });
    const df = b.detail
      ? fitText(ctx, b.detail, { weight: 500, family: textRtl ? FONT_SANS_AR : FONT_SANS, maxSize: 21, minSize: 15, maxWidth: tw, maxLines: 2, maxHeight: inner - tf.height - 6, leading: 1.3, tracking: 0 })
      : null;
    const blockH = tf.height + (df ? df.height + 6 : 0);
    const ty = by + (bh - blockH) / 2;
    drawFit(ctx, tf, tx, ty, rtl ? "right" : "left", tk.ink);
    if (df) drawFit(ctx, df, tx, ty + tf.height + 6, rtl ? "right" : "left", tk.subInk);
  };

  if (o.landscape) {
    const top = card.y + card.h + 26;
    const gap = 28;
    const cw = (W - M * 2 - gap * 2) / 3;
    benefits.forEach((b, i) => {
      const col = rtl ? 2 - i : i;
      drawBenefit(b, M + col * (cw + gap), top, cw, true);
    });
    if (d.cta) {
      const btn = buttonMetrics(ctx, d.cta, { ...btnOpts, height: 58, size: 23, maxWidth: 520 });
      drawButton(ctx, btn, (W - btn.width) / 2, y1 - 38, { ...tk.button, padX: btnOpts.padX });
    }
  } else {
    const colX = o.sceneLeft ? card.x + card.w + 44 : M;
    const colW = W - M * 2 - card.w - 44;
    const rowsTop = y0 + (d.badge ? 162 : 8); // the badge sits above the first row
    const rowsBottom = y1 - (d.cta ? btnOpts.height + 52 : 0); // clear air above the button
    const rowGap = 16;
    const n = Math.max(1, benefits.length);
    // Same height for every row, never taller than a comfortable card.
    const rowH = Math.min(168, (rowsBottom - rowsTop - rowGap * (n - 1)) / n);
    const rowsY = rowsTop + (rowsBottom - rowsTop - (rowH * n + rowGap * (n - 1))) / 2;
    benefits.forEach((b, i) => drawBenefit(b, colX, rowsY + i * (rowH + rowGap), colW, false, rowH));
    if (d.cta) {
      const btn = buttonMetrics(ctx, d.cta, { ...btnOpts, maxWidth: colW });
      drawButton(ctx, btn, rtl ? colX + colW - btn.width : colX, y1 - btnOpts.height, { ...tk.button, padX: btnOpts.padX });
    }
    // The badge sits at the top of the benefits column, touching the card: never on the product.
    badgeAt = { cx: o.sceneLeft ? colX + 34 : colX + colW - 34, cy: y0 + 64, r: 84 };
  }
  drawBadge(ctx, d.badge, badgeAt.cx, badgeAt.cy, badgeAt.r, tk);

  // ---- bottom strip: short product qualities with icons ----
  if (!stripH) return;
  const stripY = H - stripH;
  ctx.fillStyle = tk.strip.bg;
  ctx.fillRect(0, stripY, W, stripH);
  if (o.style === "luxury_dark") {
    ctx.fillStyle = tk.accent;
    ctx.fillRect(0, stripY, W, 2);
  }
  const cells = rtl ? stripItems.slice().reverse() : stripItems;
  const cellW = (W - M) / cells.length;
  cells.forEach((it, i) => {
    const cxm = M / 2 + cellW * i + cellW / 2;
    drawIcon(ctx, it.icon, cxm, stripY + 54, 20, tk.strip.icon);
    const lr = isRtlText(it.label);
    const lf = fitText(ctx, lr ? it.label : it.label.toUpperCase(), { weight: 700, family: lr ? FONT_SANS_AR : FONT_SANS, maxSize: 22, minSize: 15, maxWidth: cellW - 24, maxLines: 2, maxHeight: 56, leading: 1.2, tracking: lr ? 0 : 0.08 });
    drawFit(ctx, lf, cxm, stripY + 88, "center", tk.strip.ink);
    if (i > 0) {
      ctx.fillStyle = rgba(tk.strip.ink, 0.25);
      ctx.fillRect(M / 2 + cellW * i, stripY + 40, 1.5, 80);
    }
  });
}

// Draws the finished ad on the canvas at its export size (1080x1350, 1080x1080 or 1080x1920).
//   opts: { format, style, variant, landscape, scene (loaded image), headline, subheadline,
//           badge, highlight, chips [..3], chipDetails, chipIcons, qualities [..4], qualityIcons,
//           cta, brandName, colors [c1, c2], logo (loaded image or null) }
export function drawAd(canvas, opts) {
  const format = AD_FORMATS[opts.format] ? opts.format : "1:1";
  const style = AD_STYLES.includes(opts.style) ? opts.style : "clean_studio";
  const headline = String(opts.headline || "").trim();
  const data = {
    headline,
    subheadline: String(opts.subheadline || "").trim(),
    // Never an empty spot: with no offer, the badge carries the strongest benefit instead.
    badge: String(opts.badge || "").trim() || String(opts.highlight || "").trim(),
    chips: (Array.isArray(opts.chips) ? opts.chips : []).map((c) => String(c || "").trim()).filter(Boolean).slice(0, 3),
    chipDetails: (Array.isArray(opts.chipDetails) ? opts.chipDetails : []).map((c) => String(c || "").trim()),
    chipIcons: Array.isArray(opts.chipIcons) ? opts.chipIcons : [],
    qualities: (Array.isArray(opts.qualities) ? opts.qualities : []).map((c) => String(c || "").trim()).filter(Boolean).slice(0, 4),
    qualityIcons: Array.isArray(opts.qualityIcons) ? opts.qualityIcons : [],
    cta: String(opts.cta || "").trim(),
    brandName: String(opts.brandName || "").trim(),
    logo: opts.logo || null,
    rtl: isRtlText(headline),
  };
  const palette = normalizePalette(opts.colors && opts.colors[0], opts.colors && opts.colors[1]);
  const variant = Number.isFinite(Number(opts.variant)) ? Math.abs(Math.round(Number(opts.variant))) : 0;
  const tk = styleTokens(style, palette);
  if (format === "4:5") {
    canvas.width = 1080;
    canvas.height = 1350;
    drawPoster(canvas.getContext("2d"), tk, data, {
      style,
      scene: opts.scene,
      landscape: Boolean(opts.landscape),
      sceneLeft: (variant % 2 === 0) !== data.rtl,
      shape: ["rect", "arch", "soft"][variant % 3],
    });
    return canvas;
  }
  const g = geometry(format, variant, Boolean(opts.landscape), data.rtl, style);

  canvas.width = g.W;
  canvas.height = g.H;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = tk.panelBg;
  ctx.fillRect(0, 0, g.W, g.H);

  if (opts.scene) drawScene(ctx, g, opts.scene, tk);
  drawPanel(ctx, g, tk, style, palette);
  drawContent(ctx, g, tk, data);
  drawBadge(ctx, data.badge, g.badge.cx, g.badge.cy, g.badge.r, tk);
  return canvas;
}
