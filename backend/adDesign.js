// ---------------------------------------------------------------------------
// Ad design endpoints.
//
// A design is built in layers:
//   A. Scene (AI, here): the customer's real product placed in an advertising scene by fal.ai.
//      The product pixels come from the uploaded photo; the scene has no text and no logo.
//   B. Text, shapes and logo (code, in the browser): frontend/src/adTemplates.js draws a colour
//      panel with the headline, subheadline, benefit chips, button, offer badge and brand.
//      The panel and the scene are separate zones, so text never covers the product.
//
// One design credit = one scene per format (pro: 1:1; premium: 1:1 and 9:16). A scene that
// fails the quality check (checkScene) is regenerated once, silently. The credit is consumed
// only when a scene passes. Each credit also includes ONE free "redo": the customer can ask
// for a new scene once if they do not like the result.
//
// Nothing here trusts the browser for the plan, the limits or the counters: they are read from
// Firestore with the Admin SDK inside transactions.
// ---------------------------------------------------------------------------

// The one place the scene model is named. Bria Product Shot cuts the product out of the uploaded
// photo and generates a scene around it, so the product stays the customer's own pixels.
export const FAL_SCENE_ENDPOINT = "fal-ai/bria/product-shot";

// Upscale hook. Bria works at about 1 megapixel, so the 9:16 scene (768x1344) is enlarged about
// 1.4x by the browser when it is drawn at 1080x1920. To add a real upscale step later, set this
// to a fal.ai upscale endpoint id and implement the call in maybeUpscale() below; nothing else
// needs to change.
export const FAL_UPSCALE_ENDPOINT = null;

const FAL_QUEUE_URL = "https://queue.fal.run/";
const FAL_STORAGE_INITIATE_URL = "https://rest.alpha.fal.ai/storage/upload/initiate?storage_type=fal-cdn-v3";

const VARIATIONS_PER_CREDIT = 1;
const LAYOUT_VARIANTS = 6; // see geometry() in frontend/src/adTemplates.js
const IMAGE_DAILY_CAP_DEFAULT = 150;
const MAX_FAILED_ATTEMPTS_PER_DAY = 3;
const JOB_TIMEOUT_MS = 6 * 60 * 1000;
const JOB_LOCK_MS = 45 * 1000;
const USER_JOB_LOCK_MS = 7 * 60 * 1000;
const MAX_PRODUCT_BYTES = 3.5 * 1024 * 1024;
const MIN_PRODUCT_SHORT_SIDE = 600; // the browser enforces 800 on the original; this is a floor after downscaling
const MAX_LOGO_CHARS = 260 * 1024;
const MAX_THUMB_CHARS = 330 * 1024;
const MAX_SCENE_PROXY_BYTES = 4 * 1024 * 1024;

// Scene size and product box per layout. The browser draws the scene only inside its own region
// of the ad (the rest is the text panel), so each scene is generated at the shape of that region,
// about 1 megapixel as Bria recommends. padding is [left, right, top, bottom] in scene pixels:
// it boxes the product inside the region, leaves a band for the offer badge and, in 9:16, keeps
// the product clear of the areas that story/reel interfaces cover.
// ⚠️ These must match the scene regions in geometry() in frontend/src/adTemplates.js.
const SCENE_LAYOUTS = {
  side: { shotSize: [784, 1368], padding: [133, 133, 253, 101] }, // 1:1, text panel beside the product
  stack: { shotSize: [1376, 736], padding: [204, 204, 115, 64] }, // 1:1, wide product photo
  top: { shotSize: [1056, 944], padding: [147, 147, 176, 244] }, // 9:16, panel above the product
  bottom: { shotSize: [1008, 1040], padding: [131, 131, 411, 112] }, // 9:16, panel below the product
};

// Same rule as the browser: 1:1 uses "stack" for wide product photos and "side" otherwise;
// 9:16 alternates with the variant.
function sceneLayoutFor(format, variant, landscape) {
  if (format === "9:16") return variant % 2 === 0 ? SCENE_LAYOUTS.top : SCENE_LAYOUTS.bottom;
  return landscape ? SCENE_LAYOUTS.stack : SCENE_LAYOUTS.side;
}

const SCENE_SUFFIX =
  " The product is the hero of the image: sharp, well lit, standing on the surface with a soft realistic contact shadow." +
  " The background is uncluttered, softly out of focus and slightly darker than the product." +
  " No text, no letters, no numbers, no logos, no watermark, no people, no hands, no other products.";

const STYLE_SCENES = {
  clean_studio: () =>
    "placed on a seamless soft light-grey studio surface, minimal premium product photography, " +
    "soft diffused daylight, gentle natural shadow, clean and uncluttered.",
  bold_color: (ctx) =>
    "placed on a smooth matte surface in front of a seamless plain " + ctx.colorName + " backdrop, " +
    "vibrant colour-block advertising photography, crisp clean shadow, minimal composition.",
  luxury_dark: () =>
    "placed on polished black marble in front of a dark charcoal backdrop, dramatic low-key lighting " +
    "with a warm rim light, subtle reflection, premium luxury advertising photography.",
  lifestyle_scene: () =>
    "placed in a real-life setting such as a wooden table, a bathroom shelf, a kitchen counter or " +
    "an outdoor terrace, whichever suits the product, natural window light, softly blurred " +
    "background, authentic lifestyle product photography.",
};

export const DESIGN_STYLES = Object.keys(STYLE_SCENES);

function utcDayKey(d) {
  return (d || new Date()).toISOString().slice(0, 10);
}

function cleanText(value, max) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

function cleanHex(value, fallback) {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value.trim()) ? value.trim().toLowerCase() : fallback;
}

// Rough colour name for the scene description (the scene model takes words, not hex codes).
function hexToColorName(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d < 0.08) return l > 0.85 ? "white" : l < 0.18 ? "black" : "grey";
  let h;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h = (h * 60 + 360) % 360;
  const tone = l < 0.3 ? "deep " : l > 0.72 ? "pastel " : "";
  let name;
  if (h < 15 || h >= 345) name = "red";
  else if (h < 40) name = "orange";
  else if (h < 65) name = "yellow";
  else if (h < 160) name = "green";
  else if (h < 195) name = "teal";
  else if (h < 255) name = "blue";
  else if (h < 290) name = "purple";
  else name = "pink";
  return tone + name;
}

function buildSceneDescription(style, ctx) {
  const recipe = STYLE_SCENES[style] || STYLE_SCENES.clean_studio;
  const what = ctx.product ? "The product (" + ctx.product + ") " : "The product ";
  const note = ctx.note ? " Scene idea from the client: " + ctx.note + "." : "";
  return what + recipe(ctx) + note + SCENE_SUFFIX;
}

// --- image helpers ---------------------------------------------------------

function parseDataUrl(dataUrl) {
  const m = typeof dataUrl === "string" ? dataUrl.match(/^data:(image\/(?:jpeg|png));base64,([A-Za-z0-9+/=]+)$/) : null;
  if (!m) return null;
  return { mime: m[1], buffer: Buffer.from(m[2], "base64") };
}

// Reads width/height from the PNG or JPEG header and checks the magic bytes, so a renamed
// non-image file is rejected without any image library.
function readImageSize(buffer, mime) {
  if (mime === "image/png") {
    if (buffer.length < 24 || buffer.readUInt32BE(0) !== 0x89504e47) return null;
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;
  let i = 2;
  while (i + 9 < buffer.length) {
    if (buffer[i] !== 0xff) {
      i += 1;
      continue;
    }
    const marker = buffer[i + 1];
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      i += 2;
      continue;
    }
    const len = buffer.readUInt16BE(i + 2);
    const isSof = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isSof) {
      return { height: buffer.readUInt16BE(i + 5), width: buffer.readUInt16BE(i + 7) };
    }
    i += 2 + len;
  }
  return null;
}

// --- fal.ai ----------------------------------------------------------------

function falHeaders(falKey, extra) {
  return { Authorization: "Key " + falKey, ...(extra || {}) };
}

// Uploads the product photo to fal.ai file storage and returns its URL. Returns null on any
// failure; the caller then falls back to sending the photo inline as a data URI.
async function uploadToFalStorage(falKey, buffer, mime) {
  try {
    const init = await fetch(FAL_STORAGE_INITIATE_URL, {
      method: "POST",
      headers: falHeaders(falKey, { "Content-Type": "application/json" }),
      body: JSON.stringify({ content_type: mime, file_name: "product." + (mime === "image/png" ? "png" : "jpg") }),
    });
    if (!init.ok) {
      console.warn("[adDesign] fal storage initiate failed: HTTP " + init.status);
      return null;
    }
    const { upload_url: uploadUrl, file_url: fileUrl } = await init.json();
    if (!uploadUrl || !fileUrl) return null;
    const put = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": mime }, body: buffer });
    if (!put.ok) {
      console.warn("[adDesign] fal storage PUT failed: HTTP " + put.status);
      return null;
    }
    return fileUrl;
  } catch (err) {
    console.warn("[adDesign] fal storage upload error: " + err.message);
    return null;
  }
}

async function submitScene(falKey, imageRef, style, format, ctx) {
  const res = await fetch(FAL_QUEUE_URL + FAL_SCENE_ENDPOINT, {
    method: "POST",
    headers: falHeaders(falKey, { "Content-Type": "application/json" }),
    body: JSON.stringify({
      image_url: imageRef,
      scene_description: buildSceneDescription(style, ctx),
      placement_type: "manual_padding",
      padding_values: sceneLayoutFor(format, ctx.variant || 0, Boolean(ctx.landscape)).padding,
      shot_size: sceneLayoutFor(format, ctx.variant || 0, Boolean(ctx.landscape)).shotSize,
      num_results: 1,
      optimize_description: true,
      // Quality over speed and price: use the full model, not the fast one.
      fast: false,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error("fal submit HTTP " + res.status + " " + body.slice(0, 200));
  }
  const data = await res.json();
  if (!data.request_id || !data.status_url || !data.response_url) {
    throw new Error("fal submit returned no request id");
  }
  return { requestId: data.request_id, statusUrl: data.status_url, responseUrl: data.response_url };
}

// Returns { state: "pending" } | { state: "done", url } | { state: "error", reason }.
async function readSceneRequest(falKey, slot) {
  const statusRes = await fetch(slot.statusUrl, { headers: falHeaders(falKey) });
  if (!statusRes.ok) {
    // 4xx on the status URL means the request is gone or was rejected; 5xx may be temporary.
    if (statusRes.status >= 500) return { state: "pending" };
    return { state: "error", reason: "status HTTP " + statusRes.status };
  }
  const status = await statusRes.json();
  if (status.status !== "COMPLETED") return { state: "pending" };
  if (status.error) return { state: "error", reason: String(status.error).slice(0, 200) };

  const resultRes = await fetch(slot.responseUrl, { headers: falHeaders(falKey) });
  if (!resultRes.ok) return { state: "error", reason: "result HTTP " + resultRes.status };
  const result = await resultRes.json();
  const url = result && Array.isArray(result.images) && result.images[0] && result.images[0].url;
  if (!url) return { state: "error", reason: "result has no image" };
  return { state: "done", url };
}

// See FAL_UPSCALE_ENDPOINT above. Today this returns the scene URL unchanged.
async function maybeUpscale(falKey, sceneUrl, format) {
  if (!FAL_UPSCALE_ENDPOINT) return sceneUrl;
  void falKey;
  void format;
  return sceneUrl;
}

// --- quality check ---------------------------------------------------------

async function fetchImageBase64(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("scene download HTTP " + res.status);
  const type = (res.headers.get("content-type") || "").split(";")[0].trim();
  const mime = ["image/png", "image/jpeg", "image/webp"].includes(type) ? type : "image/png";
  const buffer = Buffer.from(await res.arrayBuffer());
  return { mime, data: buffer.toString("base64") };
}

function extractJsonObject(text) {
  try {
    return JSON.parse(text);
  } catch (_) {
    const m = text.match(/\{[\s\S]*\}/);
    return m ? JSON.parse(m[0]) : null;
  }
}

// Returns { pass, reason }. Any error (download, API, unreadable answer) counts as not passed:
// an unverified scene is never shown.
async function checkScene(deps, job, sceneUrl) {
  try {
    const thumb = parseDataUrl(job.productThumb);
    if (!thumb) return { pass: false, reason: "no reference photo" };
    const scene = await fetchImageBase64(sceneUrl);

    const response = await deps.anthropic.messages.create({
      model: deps.visionModel,
      max_tokens: 400,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Image 1 — the client's own product photo:" },
            { type: "image", source: { type: "base64", media_type: thumb.mime, data: thumb.buffer.toString("base64") } },
            { type: "text", text: "Image 2 — an AI-generated advertising scene that must contain that same product:" },
            { type: "image", source: { type: "base64", media_type: scene.mime, data: scene.data } },
            {
              type: "text",
              text:
                "You are the quality controller of an advertising agency. Judge Image 2 strictly. " +
                "Text and graphics will be added around it later, on a separate panel.\n\n" +
                "Answer these, true only if clearly satisfied:\n" +
                '- "product_visible": the product is clearly visible, in focus, fully inside the frame and not cropped.\n' +
                '- "product_matches": it is the same product as in Image 1 — same shape, same label, same colours. ' +
                "Text printed on the product's own label is expected and is fine.\n" +
                '- "no_stray_text": apart from the product\'s own label, the scene contains no text, letters, numbers, logos or watermarks.\n' +
                '- "no_distortion": no distorted, melted, duplicated or impossible objects, no hands, no people, ' +
                "and the product sits naturally in the scene (plausible scale, contact shadow, no visible cut-out halo).\n" +
                '- "product_framed": the whole product stands inside the image with clear background around it on every side; it does not touch or cross the image borders.\n\n' +
                'Reply with JSON only: {"product_visible": true|false, "product_matches": true|false, "no_stray_text": true|false, ' +
                '"no_distortion": true|false, "product_framed": true|false, "reason": "one short sentence"}',
            },
          ],
        },
      ],
    });

    const text = response.content.filter((b) => b.type === "text").map((b) => b.text).join("\n");
    const verdict = extractJsonObject(text);
    if (!verdict) return { pass: false, reason: "unreadable verdict" };
    const pass =
      verdict.product_visible === true &&
      verdict.product_matches === true &&
      verdict.no_stray_text === true &&
      verdict.no_distortion === true &&
      verdict.product_framed === true;
    return { pass, reason: cleanText(String(verdict.reason || ""), 200) };
  } catch (err) {
    console.warn("[adDesign] quality check error: " + err.message);
    return { pass: false, reason: "check error", checkError: true };
  }
}

// --- counters --------------------------------------------------------------

function effectiveDesignsUsed(userData, monthKey) {
  if ((userData.lastResetMonth || null) !== monthKey) return 0;
  return typeof userData.designsUsed === "number" ? userData.designsUsed : 0;
}

function effectiveTextUsed(userData, monthKey) {
  if ((userData.lastResetMonth || null) !== monthKey) return 0;
  return typeof userData.generationsUsed === "number" ? userData.generationsUsed : 0;
}

function failuresToday(userData, dayKey) {
  return userData.designFailDate === dayKey && typeof userData.designFailCount === "number" ? userData.designFailCount : 0;
}

export function registerAdDesignRoutes(app, deps) {
  const falKey = () => deps.loadEnvVar("FAL_KEY");
  const dailyCap = () => {
    const raw = parseInt(deps.loadEnvVar("IMAGE_DAILY_CAP"), 10);
    return Number.isFinite(raw) && raw >= 0 ? raw : IMAGE_DAILY_CAP_DEFAULT;
  };
  const designServiceReady = () => Boolean(falKey()) && deps.hasAnthropicKey();

  // Global daily cap on generated images, across all users, counted per individual image.
  // Reserved in a transaction before any image is requested from fal.ai.
  async function reserveImages(db, count) {
    const ref = db.collection("system_counters").doc("images-" + utcDayKey());
    const cap = dailyCap();
    return db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const used = snap.exists && typeof snap.data().count === "number" ? snap.data().count : 0;
      if (used + count > cap) return false;
      tx.set(ref, { count: used + count, cap, updatedAt: new Date() }, { merge: true });
      return true;
    });
  }

  async function releaseImages(db, count) {
    if (count <= 0) return;
    try {
      await db
        .collection("system_counters")
        .doc("images-" + utcDayKey())
        .set({ count: deps.FieldValue.increment(-count) }, { merge: true });
    } catch (err) {
      console.warn("[adDesign] could not release daily cap reservation: " + err.message);
    }
  }

  async function authenticate(req, res) {
    const db = deps.getDb();
    if (!db) {
      res.status(500).json({ success: false, errorCode: "SERVER_NOT_READY" });
      return null;
    }
    try {
      const uid = await deps.verifyFirebaseToken(req);
      return { db, uid };
    } catch (_) {
      res.status(401).json({ success: false, errorCode: "AUTH_REQUIRED" });
      return null;
    }
  }

  function quotaPayload(userData) {
    const plan = userData.plan || "free";
    const limits = deps.getPlanLimits(plan);
    const monthKey = deps.currentMonthKey();
    return {
      plan,
      textUsed: effectiveTextUsed(userData, monthKey),
      textMax: limits.maxGenerationsPerMonth,
      designsUsed: effectiveDesignsUsed(userData, monthKey),
      designsMax: limits.maxDesignsPerMonth || 0,
      designFormats: limits.designFormats || [],
      designStyles: limits.designStyles || [],
      designFailuresToday: failuresToday(userData, utcDayKey()),
      designMaxFailuresPerDay: MAX_FAILED_ATTEMPTS_PER_DAY,
      designAvailable: designServiceReady(),
    };
  }

  // ---- GET /api/quota -----------------------------------------------------
  app.get("/api/quota", async (req, res) => {
    const auth = await authenticate(req, res);
    if (!auth) return;
    try {
      const snap = await auth.db.collection("users").doc(auth.uid).get();
      if (!snap.exists) return res.status(404).json({ success: false, errorCode: "USER_NOT_FOUND" });
      res.json({ success: true, ...quotaPayload(snap.data()) });
    } catch (err) {
      console.error("[adDesign] /api/quota error: " + err.message);
      res.status(500).json({ success: false, errorCode: "SERVER_NOT_READY" });
    }
  });

  // ---- POST /api/design/start --------------------------------------------
  // Validates everything, reserves the daily cap, submits the scene requests to the fal.ai
  // queue and returns at once with a job id. No credit is consumed here.
  app.post("/api/design/start", async (req, res) => {
    const auth = await authenticate(req, res);
    if (!auth) return;
    const { db, uid } = auth;
    const userRef = db.collection("users").doc(uid);
    let userLocked = false;
    let reserved = 0;
    let redoRef = null; // set when this request uses the free redo of an earlier design
    // Gives the free redo back when a redo could not even start.
    const restoreRedo = async () => {
      if (redoRef) await redoRef.update({ redoUsed: false }).catch(() => {});
    };

    try {
      const body = req.body || {};
      const key = falKey();
      if (!key || !deps.hasAnthropicKey()) {
        console.warn("[adDesign] design unavailable: FAL_KEY or ANTHROPIC_API_KEY missing on the server.");
        return res.json({ success: false, errorCode: "DESIGN_UNAVAILABLE" });
      }

      const docId = cleanText(body.docId, 80);
      const style = cleanText(body.style, 40);
      const headline = cleanText(body.headline, 120);
      if (!docId || !headline) {
        return res.status(400).json({ success: false, errorCode: "DESIGN_INVALID_INPUT" });
      }

      const product = parseDataUrl(body.productImage);
      const size = product ? readImageSize(product.buffer, product.mime) : null;
      if (
        !product ||
        !size ||
        product.buffer.length > MAX_PRODUCT_BYTES ||
        Math.min(size.width, size.height) < MIN_PRODUCT_SHORT_SIDE
      ) {
        return res.status(400).json({ success: false, errorCode: "DESIGN_INVALID_PHOTO" });
      }
      const productThumb = typeof body.productThumb === "string" ? body.productThumb : "";
      if (!parseDataUrl(productThumb) || productThumb.length > MAX_THUMB_CHARS) {
        return res.status(400).json({ success: false, errorCode: "DESIGN_INVALID_PHOTO" });
      }
      let logo = typeof body.logo === "string" ? body.logo : "";
      if (logo && (!parseDataUrl(logo) || logo.length > MAX_LOGO_CHARS)) logo = "";

      const projectSnap = await db.collection("generations").doc(uid).collection("projects").doc(docId).get();
      if (!projectSnap.exists) {
        return res.status(404).json({ success: false, errorCode: "DESIGN_INVALID_INPUT" });
      }

      // Free redo: "redoOf" names the job whose design the customer wants regenerated.
      const redoOf = cleanText(body.redoOf, 80);
      const redoCandidate = redoOf ? db.collection("design_jobs").doc(redoOf) : null;

      // Plan, credits, daily failed attempts and "one job at a time", all in one transaction.
      const monthKey = deps.currentMonthKey();
      const dayKey = utcDayKey();
      const now = Date.now();
      const gate = await db.runTransaction(async (tx) => {
        const snap = await tx.get(userRef);
        if (!snap.exists) return { errorCode: "USER_NOT_FOUND", status: 404 };
        const data = snap.data();
        const plan = data.plan || "free";
        const limits = deps.getPlanLimits(plan);
        if (!limits.maxDesignsPerMonth) return { errorCode: "DESIGN_NOT_IN_PLAN", status: 403 };
        if (!limits.designStyles.includes(style)) return { errorCode: "DESIGN_STYLE_NOT_IN_PLAN", status: 403 };
        let previousVariant = null;
        if (redoCandidate) {
          // One redo per credit: only for a paid-for design of this same ad, never for a redo.
          const old = await tx.get(redoCandidate);
          const o = old.exists ? old.data() : null;
          if (!o || o.uid !== uid || o.docId !== docId || o.status !== "passed" || o.isRedo || o.redoUsed) {
            return { errorCode: "DESIGN_REDO_USED", status: 409 };
          }
          previousVariant = typeof o.variant === "number" ? o.variant : null;
        } else if (effectiveDesignsUsed(data, monthKey) >= limits.maxDesignsPerMonth) {
          return { errorCode: "DESIGN_QUOTA_EXCEEDED", status: 429 };
        }
        if (failuresToday(data, dayKey) >= MAX_FAILED_ATTEMPTS_PER_DAY) {
          return { errorCode: "DESIGN_ATTEMPTS_EXCEEDED", status: 429 };
        }
        if (typeof data.designJobActiveUntil === "number" && data.designJobActiveUntil > now) {
          return { errorCode: "DESIGN_IN_PROGRESS", status: 409 };
        }
        tx.update(userRef, { designJobActiveUntil: now + USER_JOB_LOCK_MS });
        if (redoCandidate) tx.update(redoCandidate, { redoUsed: true });
        return { plan, limits, previousVariant };
      });
      if (gate.errorCode) {
        return res.status(gate.status).json({ success: false, errorCode: gate.errorCode });
      }
      userLocked = true;
      if (redoCandidate) redoRef = redoCandidate;

      const formats = gate.limits.designFormats;
      const wanted = formats.length * VARIATIONS_PER_CREDIT;
      if (!(await reserveImages(db, wanted))) {
        console.warn("[adDesign] daily image cap reached — design refused for uid=" + uid);
        await restoreRedo();
        await userRef.update({ designJobActiveUntil: 0 });
        return res.json({ success: false, errorCode: "DESIGN_UNAVAILABLE" });
      }
      reserved = wanted;

      const colors = [cleanHex(body.color1, "#111111"), cleanHex(body.color2, "#d4af37")];
      // Layout variant: random, and always different from the design being redone, so two ads
      // for the same customer do not look identical. Wide product photos get the wide 1:1 layout.
      let variant = Math.floor(Math.random() * LAYOUT_VARIANTS);
      if (gate.previousVariant !== null && variant % LAYOUT_VARIANTS === gate.previousVariant % LAYOUT_VARIANTS) {
        variant = (variant + 1) % LAYOUT_VARIANTS;
      }
      const landscape = size.width / size.height >= 1.3; // 4:3 and wider
      const ctx = {
        colorName: hexToColorName(colors[0]),
        note: cleanText(body.note, 200),
        product: cleanText(body.product, 120),
        variant,
        landscape,
      };

      // fal.ai file upload first; if it fails, send the photo inline (no silent retry possible then).
      const productUrl = await uploadToFalStorage(key, product.buffer, product.mime);
      const imageRef = productUrl || body.productImage;

      const slots = [];
      for (const format of formats) {
        for (let v = 1; v <= VARIATIONS_PER_CREDIT; v++) {
          slots.push({ id: format + "-" + v, format, variation: v, attempt: 1, state: "pending", sceneUrl: null, reason: null, checked: false });
        }
      }
      const submissions = await Promise.allSettled(slots.map((s) => submitScene(key, imageRef, style, s.format, ctx)));
      let submitted = 0;
      submissions.forEach((r, i) => {
        if (r.status === "fulfilled") {
          Object.assign(slots[i], r.value);
          submitted += 1;
        } else {
          console.warn("[adDesign] scene submit failed (" + slots[i].id + "): " + r.reason.message);
          slots[i].state = "failed";
          slots[i].reason = "submit failed";
        }
      });
      if (submitted < wanted) {
        await releaseImages(db, wanted - submitted);
        reserved = submitted;
      }
      if (submitted === 0) {
        await restoreRedo();
        await userRef.update({ designJobActiveUntil: 0 });
        return res.json({ success: false, errorCode: "DESIGN_UNAVAILABLE" });
      }

      const jobRef = await db.collection("design_jobs").add({
        uid,
        docId,
        plan: gate.plan,
        style,
        formats,
        status: "running",
        createdAt: now,
        lockUntil: 0,
        slots,
        productUrl: productUrl || null,
        productThumb,
        sceneContext: ctx,
        variant,
        isRedo: Boolean(redoRef),
        redoOf: redoRef ? redoRef.id : null,
        redoUsed: false,
        design: {
          headline,
          subheadline: cleanText(body.subheadline, 140),
          badge: cleanText(body.badge, 24),
          chips: (Array.isArray(body.chips) ? body.chips : []).map((c) => cleanText(c, 32)).filter(Boolean).slice(0, 3),
          cta: cleanText(body.cta, 40),
          brandName: cleanText(body.brandName, 40),
          colors,
          logo,
          style,
          variant,
          landscape,
        },
      });
      console.log("[adDesign] job " + jobRef.id + " started: uid=" + uid + " style=" + style + " images=" + submitted);
      res.json({ success: true, jobId: jobRef.id });
    } catch (err) {
      console.error("[adDesign] /api/design/start error: " + err.message);
      if (reserved > 0) await releaseImages(db, reserved);
      await restoreRedo();
      if (userLocked) await userRef.update({ designJobActiveUntil: 0 }).catch(() => {});
      res.json({ success: false, errorCode: "DESIGN_UNAVAILABLE" });
    }
  });

  function publicJob(job, extra) {
    return {
      success: true,
      status: job.status,
      failure: job.failure || null,
      style: job.style,
      variant: job.variant || 0,
      landscape: Boolean(job.sceneContext && job.sceneContext.landscape),
      // The free redo belongs to the original design; a redo cannot be redone.
      redoAvailable: job.status === "passed" && !job.isRedo && !job.redoUsed,
      scenes: (job.slots || [])
        .filter((s) => s.state === "passed")
        .map((s) => ({ format: s.format, variation: s.variation, url: s.sceneUrl })),
      ...(extra || {}),
    };
  }

  // ---- GET /api/design/poll?jobId= ---------------------------------------
  // Advances the job a little on every call and returns its state. Each call does only short
  // work (status reads, at most a few quality checks), so no request runs long.
  app.get("/api/design/poll", async (req, res) => {
    const auth = await authenticate(req, res);
    if (!auth) return;
    const { db, uid } = auth;
    const jobId = cleanText(req.query.jobId, 80);
    if (!jobId) return res.status(400).json({ success: false, errorCode: "DESIGN_INVALID_INPUT" });
    const jobRef = db.collection("design_jobs").doc(jobId);

    try {
      // Take a short lock so two overlapping polls never process the same slot twice.
      const now = Date.now();
      const locked = await db.runTransaction(async (tx) => {
        const snap = await tx.get(jobRef);
        if (!snap.exists || snap.data().uid !== uid) return { missing: true };
        const data = snap.data();
        if (data.status !== "running") return { job: data, final: true };
        if (data.lockUntil > now) return { job: data, busy: true };
        tx.update(jobRef, { lockUntil: now + JOB_LOCK_MS });
        return { job: data };
      });
      if (locked.missing) return res.status(404).json({ success: false, errorCode: "DESIGN_INVALID_INPUT" });
      if (locked.final || locked.busy) return res.json(publicJob(locked.job));

      const job = locked.job;
      const key = falKey();
      const slots = job.slots.map((s) => ({ ...s }));
      const timedOut = now - job.createdAt > JOB_TIMEOUT_MS;

      // One silent regeneration per variation, if the daily cap still allows it.
      const retryOrFail = async (slot, reason) => {
        slot.reason = reason;
        if (slot.attempt === 1 && key && job.productUrl && !timedOut && (await reserveImages(db, 1))) {
          try {
            const sub = await submitScene(key, job.productUrl, job.style, slot.format, job.sceneContext || {});
            Object.assign(slot, sub, { attempt: 2, state: "pending", sceneUrl: null });
            return;
          } catch (err) {
            console.warn("[adDesign] retry submit failed (" + slot.id + "): " + err.message);
            await releaseImages(db, 1);
          }
        }
        slot.state = "failed";
      };

      // 1) fal.ai queue status for pending scenes.
      await Promise.all(
        slots
          .filter((s) => s.state === "pending")
          .map(async (slot) => {
            if (!key) return retryOrFail(slot, "service key missing");
            let r;
            try {
              r = await readSceneRequest(key, slot);
            } catch (err) {
              r = { state: "pending" };
            }
            if (r.state === "done") {
              slot.sceneUrl = await maybeUpscale(key, r.url, slot.format);
              slot.state = "generated";
            } else if (r.state === "error") {
              await retryOrFail(slot, "generation failed");
            } else if (timedOut) {
              slot.state = "failed";
              slot.reason = "timed out";
            }
          })
      );

      // 2) Quality check for generated scenes (a few per call).
      await Promise.all(
        slots
          .filter((s) => s.state === "generated")
          .slice(0, 4)
          .map(async (slot) => {
            const verdict = await checkScene(deps, job, slot.sceneUrl);
            slot.checked = slot.checked || !verdict.checkError;
            if (verdict.pass) {
              slot.state = "passed";
              slot.reason = verdict.reason;
            } else {
              console.log("[adDesign] scene rejected (" + slot.id + ", attempt " + slot.attempt + "): " + verdict.reason);
              await retryOrFail(slot, verdict.reason || "rejected");
            }
          })
      );

      const open = slots.some((s) => s.state === "pending" || s.state === "generated");
      if (open) {
        await jobRef.update({ slots, lockUntil: 0 });
        return res.json(publicJob({ ...job, slots }));
      }

      // 3) Everything is settled: consume the credit only if at least one scene passed.
      const passed = slots.filter((s) => s.state === "passed");
      const userRef = db.collection("users").doc(uid);
      const monthKey = deps.currentMonthKey();
      const dayKey = utcDayKey();
      let status;
      let failure = null;

      if (passed.length > 0) {
        status = "passed";
        if (job.isRedo) {
          // A redo is free: the credit was consumed by the original design.
          await userRef.set({ designJobActiveUntil: 0 }, { merge: true });
        } else {
          await db.runTransaction(async (tx) => {
            const snap = await tx.get(userRef);
            const data = snap.exists ? snap.data() : {};
            const sameMonth = (data.lastResetMonth || null) === monthKey;
            tx.set(
              userRef,
              {
                designsUsed: effectiveDesignsUsed(data, monthKey) + 1,
                designJobActiveUntil: 0,
                ...(sameMonth ? {} : { generationsUsed: 0, lastResetMonth: monthKey }),
              },
              { merge: true }
            );
          });
        }
        // Saved on the project so History can redraw the design from data.
        // NOTE: scene URLs are fal.ai links and may expire. The future fix is to copy each
        // scene into Firebase Storage here and save that permanent URL instead.
        await db
          .collection("generations")
          .doc(uid)
          .collection("projects")
          .doc(job.docId)
          .set(
            {
              design: {
                ...job.design,
                createdAt: new Date(),
                jobId: job.isRedo && job.redoOf ? job.redoOf : jobId,
                scenes: passed.map((s) => ({ format: s.format, variation: s.variation, url: s.sceneUrl })),
              },
            },
            { merge: true }
          );
      } else {
        status = "failed";
        // "quality": at least one scene was actually judged and rejected — counts as one of the
        // user's failed attempts for today. "unavailable": our side (fal.ai, cap, check errors).
        failure = slots.some((s) => s.checked) ? "quality" : "unavailable";
        await db.runTransaction(async (tx) => {
          const snap = await tx.get(userRef);
          const data = snap.exists ? snap.data() : {};
          const update = { designJobActiveUntil: 0 };
          if (failure === "quality") {
            update.designFailDate = dayKey;
            update.designFailCount = failuresToday(data, dayKey) + 1;
          }
          tx.set(userRef, update, { merge: true });
        });
        // A redo that produced nothing is given back: the earlier design stays as it was.
        if (job.isRedo && job.redoOf) {
          await db.collection("design_jobs").doc(job.redoOf).update({ redoUsed: false }).catch(() => {});
        }
      }

      // The reference thumbnail and logo are no longer needed on the job once it is settled.
      await jobRef.update({ slots, status, failure, lockUntil: 0, finishedAt: Date.now(), productThumb: "", "design.logo": "" });
      console.log("[adDesign] job " + jobId + " " + status + (failure ? " (" + failure + ")" : "") + " passed=" + passed.length + "/" + slots.length);

      const userSnap = await userRef.get();
      res.json(publicJob({ ...job, slots, status, failure }, { quota: quotaPayload(userSnap.exists ? userSnap.data() : {}) }));
    } catch (err) {
      console.error("[adDesign] /api/design/poll error: " + err.message);
      await jobRef.update({ lockUntil: 0 }).catch(() => {});
      res.status(500).json({ success: false, errorCode: "DESIGN_UNAVAILABLE" });
    }
  });

  // ---- GET /api/design/image?docId=&i= -----------------------------------
  // Same-origin copy of one of the user's own saved scenes. The browser needs it when the fal.ai
  // link does not allow cross-origin canvas use. Only URLs saved on the user's own project are
  // ever fetched, so this cannot be used as an open proxy.
  app.get("/api/design/image", async (req, res) => {
    const auth = await authenticate(req, res);
    if (!auth) return;
    try {
      const docId = cleanText(req.query.docId, 80);
      const index = parseInt(req.query.i, 10);
      const snap = docId
        ? await auth.db.collection("generations").doc(auth.uid).collection("projects").doc(docId).get()
        : null;
      const scenes = snap && snap.exists && snap.data().design && snap.data().design.scenes;
      const scene = Array.isArray(scenes) ? scenes[index] : null;
      if (!scene || !/^https:\/\//.test(scene.url || "")) {
        return res.status(404).json({ success: false, errorCode: "DESIGN_INVALID_INPUT" });
      }
      const upstream = await fetch(scene.url);
      if (!upstream.ok) return res.status(410).json({ success: false, errorCode: "DESIGN_SCENE_EXPIRED" });
      const buffer = Buffer.from(await upstream.arrayBuffer());
      if (buffer.length > MAX_SCENE_PROXY_BYTES) {
        return res.status(413).json({ success: false, errorCode: "DESIGN_UNAVAILABLE" });
      }
      res.setHeader("Content-Type", (upstream.headers.get("content-type") || "image/png").split(";")[0]);
      res.setHeader("Cache-Control", "private, max-age=3600");
      res.send(buffer);
    } catch (err) {
      console.error("[adDesign] /api/design/image error: " + err.message);
      res.status(500).json({ success: false, errorCode: "DESIGN_UNAVAILABLE" });
    }
  });
}
