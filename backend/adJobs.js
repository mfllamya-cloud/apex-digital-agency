// ---------------------------------------------------------------------------
// The ad generator: one press, one job.
//
// POST /api/ad/start validates the request, reserves the credits and returns a job id at once.
// The browser then polls GET /api/ad/poll; every poll advances the job by one bounded step
// (write the ad copy -> submit the scene to fal.ai -> wait -> quality check -> save), so no
// HTTP request runs long and nothing depends on a serverless function staying alive.
//
// Credits: an ad with a design reserves one ad and one design; a text-only ad reserves one ad.
// A job that fails for any reason (copy error, fal.ai error, quality rejection, timeout, page
// closed) gives every reserved credit back and saves nothing. One job per user at a time.
//
// The design is built in layers:
//   A. Scene (AI, here): the customer's real product placed in a styled advertising set by
//      fal.ai. The product pixels come from the customer's photo; no text, no logo. One scene
//      per design credit; every format crops the same square scene.
//   B. Text, shapes and logo (code, in the browser): frontend/src/adTemplates.js.
//
// Product photos (up to 5 per ad, kept in the customer's account) and the finished scene are
// stored in Firestore, so photos need not be uploaded again and designs stay downloadable.
//
// Nothing here trusts the browser for the plan, the limits or the counters: they are read from
// Firestore with the Admin SDK inside transactions.
// ---------------------------------------------------------------------------

// The one place the scene model is named. Bria Product Shot cuts the product out of the uploaded
// photo and generates a scene around it, so the product stays the customer's own pixels.
export const FAL_SCENE_ENDPOINT = "fal-ai/bria/product-shot";

// Upscale hook. Bria works at about 1 megapixel and the browser enlarges the scene slightly when
// it draws the ad. To add a real upscale step later, set this
// to a fal.ai upscale endpoint id and implement the call in maybeUpscale() below; nothing else
// needs to change.
export const FAL_UPSCALE_ENDPOINT = null;

const FAL_QUEUE_URL = "https://queue.fal.run/";
const FAL_STORAGE_INITIATE_URL = "https://rest.alpha.fal.ai/storage/upload/initiate?storage_type=fal-cdn-v3";

const LAYOUT_VARIANTS = 6; // see geometry() in frontend/src/adTemplates.js
const IMAGE_DAILY_CAP_DEFAULT = 150;
const MAX_FAILED_ATTEMPTS_PER_DAY = 3;
const JOB_TIMEOUT_MS = 6 * 60 * 1000;
const JOB_LOCK_MS = 100 * 1000; // longer than the slowest single step (writing the copy)
const USER_JOB_LOCK_MS = 7 * 60 * 1000; // a job nobody polls any more is swept after this
const MIN_PRODUCT_SHORT_SIDE = 600; // the browser enforces 800 on the original; this is a floor after downscaling
const MAX_LOGO_CHARS = 260 * 1024;
// Photos live in Firestore documents (1 MB each), so the browser downsizes them to fit.
const MAX_PHOTO_CHARS = 800 * 1024; // photo + thumb must fit one Firestore document (1 MiB)
const MAX_THUMB_CHARS = 60 * 1024;
const MAX_PHOTOS_PER_USER = 20;
const MAX_PHOTOS_PER_AD = 5;
const MAX_PICKS_PER_DAY = 40;
const SCENE_CHUNK_CHARS = 700 * 1024; // the finished scene is stored in chunks of this size
const MAX_SCENE_STORE_BYTES = 3.5 * 1024 * 1024;
const MAX_SCENE_PROXY_BYTES = 4 * 1024 * 1024;

// Cost log. Prices in US dollars: [input, output] per million tokens, and per fal.ai image.
// They only feed the estimate written with each job; change them here if the prices change.
const MODEL_PRICES = { "claude-sonnet-4-5": [3, 15], "claude-haiku-4-5-20251001": [1, 5] };
const FAL_IMAGE_USD = 0.04;

// The scene: one square image, about 1 megapixel as Bria recommends, with the product boxed in
// its centre. padding is [left, right, top, bottom] in scene pixels. Every layout in
// frontend/src/adTemplates.js crops this same square around the product box (side crop for the
// 1:1 panel layout, a card for the 4:5 poster, the upper part of the 9:16), so the box below is
// sized to fit all of them and to leave a band above the product for the offer badge.
// ⚠️ Keep in step with SCENE_BOX in frontend/src/adTemplates.js.
const SCENE_SHOT_SIZE = [1024, 1024];
const SCENE_PADDING = {
  portrait: [308, 308, 190, 76], // product box 408 x 758
  landscape: [130, 130, 300, 274], // wide product photo: box 764 x 450
};

const SCENE_SUFFIX =
  " The product is the hero: sharp, perfectly lit, standing on the surface with a soft realistic contact shadow." +
  " The props are arranged around and behind the product and never cover it." +
  " Professional advertising photography, depth of field, background slightly darker than the product." +
  " No text, no letters, no numbers, no logos, no watermark, no people, no hands, no other packaged products.";

// Used when the ad has no scene ideas of its own (older ads): still a styled set, not a plain backdrop.
const FALLBACK_SCENE_IDEAS = [
  "on a round stone podium, surrounded by natural elements that evoke the product, soft directional light with gentle shadows",
  "on a reflective surface with a few elegant props related to the product arranged behind it, dramatic side light, depth",
  "on layered podiums with draped fabric and small natural details around it, warm light from one side",
];

// Each style sets the mood of the set (surface, backdrop, light). What is IN the set comes from
// the ad itself: sceneIdeas written with the ad copy from what the customer advertises.
const STYLE_SCENES = {
  clean_studio: () =>
    "Bright premium studio set, light neutral backdrop, soft diffused daylight, clean and airy.",
  bold_color: (ctx) =>
    "Vivid colour-block studio set with a saturated " + ctx.colorName + " backdrop and matching podium, punchy light, crisp shadows.",
  luxury_dark: () =>
    "Dark luxurious set, black and charcoal tones, polished stone or glass, dramatic low-key light with a warm rim light and reflections.",
  lifestyle_scene: () =>
    "Real-life setting that suits the product (bathroom shelf, kitchen counter, wooden table or terrace), natural window light, softly blurred background.",
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
  const what = ctx.product ? "The product (" + ctx.product + ")" : "The product";
  const note = ctx.note ? " The client asked for: " + ctx.note + "." : "";
  return (
    what + " in a styled advertising set built around it: " + (ctx.sceneIdea || FALLBACK_SCENE_IDEAS[0]) + ". " +
    recipe(ctx) + note + SCENE_SUFFIX
  );
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
      console.warn("[adJobs] fal storage initiate failed: HTTP " + init.status);
      return null;
    }
    const { upload_url: uploadUrl, file_url: fileUrl } = await init.json();
    if (!uploadUrl || !fileUrl) return null;
    const put = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": mime }, body: buffer });
    if (!put.ok) {
      console.warn("[adJobs] fal storage PUT failed: HTTP " + put.status);
      return null;
    }
    return fileUrl;
  } catch (err) {
    console.warn("[adJobs] fal storage upload error: " + err.message);
    return null;
  }
}

async function submitScene(falKey, imageRef, style, ctx) {
  const res = await fetch(FAL_QUEUE_URL + FAL_SCENE_ENDPOINT, {
    method: "POST",
    headers: falHeaders(falKey, { "Content-Type": "application/json" }),
    body: JSON.stringify({
      image_url: imageRef,
      scene_description: buildSceneDescription(style, ctx),
      placement_type: "manual_padding",
      padding_values: ctx.landscape ? SCENE_PADDING.landscape : SCENE_PADDING.portrait,
      shot_size: SCENE_SHOT_SIZE,
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
async function maybeUpscale(falKey, sceneUrl) {
  if (!FAL_UPSCALE_ENDPOINT) return sceneUrl;
  void falKey;
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

// Returns { pass, reason, usage }. Any error (API, unreadable answer) counts as not passed:
// an unverified scene is never shown. "scene" is { mime, data } (base64), downloaded once by
// the caller, which also stores it when it passes.
async function checkScene(deps, thumbDataUrl, scene) {
  let usage = { inputTokens: 0, outputTokens: 0 };
  try {
    const thumb = parseDataUrl(thumbDataUrl);
    if (!thumb) return { pass: false, reason: "no reference photo", usage };

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
                "It is a styled set: props around the product (ingredients, petals, water, leaves, fabric, podiums) are wanted. " +
                "Text and graphics will be added around it later, on a separate panel.\n\n" +
                "Answer these, true only if clearly satisfied:\n" +
                '- "product_visible": the product is clearly visible, in focus, fully inside the frame and not cropped.\n' +
                '- "product_matches": it is the same product as in Image 1 — same shape, same label, same colours. ' +
                "Text printed on the product's own label is expected and is fine.\n" +
                '- "no_stray_text": apart from the product\'s own label, the scene contains no text, letters, numbers, logos or watermarks.\n' +
                '- "no_distortion": no distorted, melted or impossible objects, no second copy of the product, no other packaged or labelled products, no hands, no people, no prop covering the product, ' +
                "and the product sits naturally in the scene (plausible scale, contact shadow, no visible cut-out halo).\n" +
                '- "product_framed": the whole product stands inside the image with room around it on every side; it does not touch or cross the image borders.\n\n' +
                'Reply with JSON only: {"product_visible": true|false, "product_matches": true|false, "no_stray_text": true|false, ' +
                '"no_distortion": true|false, "product_framed": true|false, "reason": "one short sentence"}',
            },
          ],
        },
      ],
    });

    usage = {
      inputTokens: (response.usage && response.usage.input_tokens) || 0,
      outputTokens: (response.usage && response.usage.output_tokens) || 0,
    };
    const text = response.content.filter((b) => b.type === "text").map((b) => b.text).join("\n");
    const verdict = extractJsonObject(text);
    if (!verdict) return { pass: false, reason: "unreadable verdict", usage };
    const pass =
      verdict.product_visible === true &&
      verdict.product_matches === true &&
      verdict.no_stray_text === true &&
      verdict.no_distortion === true &&
      verdict.product_framed === true;
    return { pass, reason: cleanText(String(verdict.reason || ""), 200), usage };
  } catch (err) {
    console.warn("[adJobs] quality check error: " + err.message);
    return { pass: false, reason: "check error", checkError: true, usage };
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

function sameProduct(a, b) {
  const norm = (v) => String(v || "").toLowerCase().replace(/\s+/g, " ").trim();
  return norm(a) !== "" && norm(a) === norm(b);
}

function estimateUsd(usage) {
  const tokens = (u) => {
    const price = MODEL_PRICES[u.model] || MODEL_PRICES["claude-sonnet-4-5"];
    return (u.inputTokens / 1e6) * price[0] + (u.outputTokens / 1e6) * price[1];
  };
  const calls = [].concat(usage.copy ? [usage.copy] : [], usage.vision || []);
  return Math.round((calls.reduce((sum, u) => sum + tokens(u), 0) + (usage.falImages || 0) * FAL_IMAGE_USD) * 10000) / 10000;
}

// Texts drawn on the design, cleaned the same way wherever they come from.
function cleanDesignTexts(src) {
  const list = (v, max, n, keepEmpty) => {
    const out = (Array.isArray(v) ? v : []).map((c) => cleanText(c, max)).slice(0, n);
    return keepEmpty ? out : out.filter(Boolean);
  };
  return {
    headline: cleanText(src.headline, 120),
    subheadline: cleanText(src.subheadline, 140),
    badge: cleanText(src.badge, 24),
    highlight: cleanText(src.highlight, 24),
    chips: list(src.chips, 32, 3, false),
    chipDetails: list(src.chipDetails, 60, 3, true),
    chipIcons: list(src.chipIcons, 16, 3, true),
    qualities: list(src.qualities, 24, 4, false),
    qualityIcons: list(src.qualityIcons, 16, 4, true),
    cta: cleanText(src.cta, 40),
  };
}

export function registerAdJobRoutes(app, deps) {
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
      console.warn("[adJobs] could not release daily cap reservation: " + err.message);
    }
  }

  // One line per paid call, in the function logs and in the "usage_log" collection, so the real
  // cost per ad can be read back: model, input/output tokens, fal.ai images.
  async function logUsage(db, entry) {
    const row = { ...entry, at: new Date() };
    console.log("[cost] " + JSON.stringify(entry));
    try {
      await db.collection("usage_log").add(row);
    } catch (err) {
      console.warn("[adJobs] usage log write failed: " + err.message);
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

  function quotaPayload(userData, activeJobId) {
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
      maxPhotosPerAd: MAX_PHOTOS_PER_AD,
      activeJobId: activeJobId || null,
    };
  }

  // Ends a job as failed and gives back every credit it reserved. Safe to call twice: the
  // status change happens in a transaction and only the call that makes it refunds.
  async function failJob(db, jobRef, failure) {
    const job = await db.runTransaction(async (tx) => {
      const snap = await tx.get(jobRef);
      if (!snap.exists || snap.data().status !== "running") return null;
      tx.update(jobRef, { status: "failed", failure, finishedAt: Date.now(), lockUntil: 0 });
      return snap.data();
    });
    if (!job) return;
    const userRef = db.collection("users").doc(job.uid);
    const monthKey = deps.currentMonthKey();
    const dayKey = utcDayKey();
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(userRef);
      const data = snap.exists ? snap.data() : {};
      const update = {};
      if (data.activeJob && data.activeJob.id === jobRef.id) update.activeJob = null;
      // Refund only inside the month the credits were taken in; a new month starts at zero anyway.
      if ((data.lastResetMonth || null) === monthKey && job.monthKey === monthKey) {
        update.generationsUsed = Math.max(0, (data.generationsUsed || 0) - 1);
        if (job.includeDesign) update.designsUsed = Math.max(0, (data.designsUsed || 0) - 1);
      }
      // Only a real quality rejection counts towards the customer's daily failed attempts.
      if (failure === "quality") {
        update.designFailDate = dayKey;
        update.designFailCount = failuresToday(data, dayKey) + 1;
      }
      tx.set(userRef, update, { merge: true });
    });
    const usage = job.usage || {};
    console.log("[adJobs] job " + jobRef.id + " failed (" + failure + ") — credits returned. " + JSON.stringify({ usage, estUsd: estimateUsd(usage) }));
  }

  // A job whose page was closed is never polled again. It is ended here, and its credits
  // returned, the next time its owner asks for the quota or starts a job.
  async function sweepStaleJob(db, uid, userData) {
    const active = userData && userData.activeJob;
    if (!active || !active.id) return null;
    const jobRef = db.collection("ad_jobs").doc(active.id);
    const snap = await jobRef.get();
    const job = snap.exists ? snap.data() : null;
    const now = Date.now();
    if (job && job.status === "running" && now - (job.lastPollAt || job.createdAt) < USER_JOB_LOCK_MS && now - job.createdAt < JOB_TIMEOUT_MS + USER_JOB_LOCK_MS) {
      return active.id; // still alive: the browser can resume polling it
    }
    if (job && job.status === "running") await failJob(db, jobRef, "abandoned");
    else await db.collection("users").doc(uid).set({ activeJob: null }, { merge: true });
    return null;
  }

  // ---- GET /api/quota -----------------------------------------------------
  app.get("/api/quota", async (req, res) => {
    const auth = await authenticate(req, res);
    if (!auth) return;
    try {
      const userRef = auth.db.collection("users").doc(auth.uid);
      let snap = await userRef.get();
      if (!snap.exists) return res.status(404).json({ success: false, errorCode: "USER_NOT_FOUND" });
      const activeJobId = await sweepStaleJob(auth.db, auth.uid, snap.data());
      if (snap.data().activeJob && !activeJobId) snap = await userRef.get(); // counters changed by the sweep
      res.json({ success: true, ...quotaPayload(snap.data(), activeJobId) });
    } catch (err) {
      console.error("[adJobs] /api/quota error: " + err.message);
      res.status(500).json({ success: false, errorCode: "SERVER_NOT_READY" });
    }
  });

  // =========================================================================
  // Product photos, kept in the customer's account: users/{uid}/photos/{id}
  // =========================================================================
  const photosCol = (db, uid) => db.collection("users").doc(uid).collection("photos");
  const publicPhoto = (id, p) => ({
    id,
    thumb: p.thumb,
    width: p.width,
    height: p.height,
    palette: p.palette || null,
    usedCount: p.usedCount || 0,
  });

  app.get("/api/photos", async (req, res) => {
    const auth = await authenticate(req, res);
    if (!auth) return;
    try {
      const snap = await photosCol(auth.db, auth.uid).orderBy("createdAt", "desc").limit(MAX_PHOTOS_PER_USER).get();
      res.json({ success: true, photos: snap.docs.map((d) => publicPhoto(d.id, d.data())) });
    } catch (err) {
      console.error("[adJobs] GET /api/photos error: " + err.message);
      res.status(500).json({ success: false, errorCode: "SERVER_NOT_READY" });
    }
  });

  app.post("/api/photos", async (req, res) => {
    const auth = await authenticate(req, res);
    if (!auth) return;
    try {
      const body = req.body || {};
      const userSnap = await auth.db.collection("users").doc(auth.uid).get();
      const limits = deps.getPlanLimits((userSnap.exists && userSnap.data().plan) || "free");
      if (!limits.maxDesignsPerMonth) return res.status(403).json({ success: false, errorCode: "DESIGN_NOT_IN_PLAN" });

      const dataUrl = typeof body.dataUrl === "string" ? body.dataUrl : "";
      const thumb = typeof body.thumb === "string" ? body.thumb : "";
      const photo = dataUrl.length <= MAX_PHOTO_CHARS ? parseDataUrl(dataUrl) : null;
      const size = photo ? readImageSize(photo.buffer, photo.mime) : null;
      if (!photo || !size || Math.min(size.width, size.height) < MIN_PRODUCT_SHORT_SIDE || thumb.length > MAX_THUMB_CHARS || !parseDataUrl(thumb)) {
        return res.status(400).json({ success: false, errorCode: "DESIGN_INVALID_PHOTO" });
      }
      const palette = Array.isArray(body.palette) ? [cleanHex(body.palette[0], "#1f2a44"), cleanHex(body.palette[1], "#d4af37")] : null;

      const col = photosCol(auth.db, auth.uid);
      // Keep the library bounded: the oldest photos make room for new ones.
      const existing = await col.orderBy("createdAt", "desc").limit(MAX_PHOTOS_PER_USER + 5).get();
      const extra = existing.docs.slice(MAX_PHOTOS_PER_USER - 1);
      await Promise.all(extra.map((d) => d.ref.delete()));

      const ref = await col.add({ dataUrl, thumb, mime: photo.mime, width: size.width, height: size.height, palette, usedCount: 0, createdAt: Date.now() });
      res.json({ success: true, photo: publicPhoto(ref.id, { thumb, width: size.width, height: size.height, palette, usedCount: 0 }) });
    } catch (err) {
      console.error("[adJobs] POST /api/photos error: " + err.message);
      res.status(500).json({ success: false, errorCode: "SERVER_NOT_READY" });
    }
  });

  app.post("/api/photos/delete", async (req, res) => {
    const auth = await authenticate(req, res);
    if (!auth) return;
    try {
      const id = cleanText(req.body && req.body.id, 80);
      if (!id) return res.status(400).json({ success: false, errorCode: "DESIGN_INVALID_INPUT" });
      await photosCol(auth.db, auth.uid).doc(id).delete();
      res.json({ success: true });
    } catch (err) {
      console.error("[adJobs] /api/photos/delete error: " + err.message);
      res.status(500).json({ success: false, errorCode: "SERVER_NOT_READY" });
    }
  });

  // ---- POST /api/photos/pick { ids } ---------------------------------------
  // The cheap vision model rates the candidate photos (sharp, well lit, facing the camera,
  // complete in frame). Among acceptable ones, a photo not used yet is preferred, so another
  // design of the same product shows another view. The customer can still choose another.
  app.post("/api/photos/pick", async (req, res) => {
    const auth = await authenticate(req, res);
    if (!auth) return;
    const { db, uid } = auth;
    try {
      const ids = (Array.isArray(req.body && req.body.ids) ? req.body.ids : []).map((x) => cleanText(x, 80)).filter(Boolean).slice(0, MAX_PHOTOS_PER_AD);
      if (ids.length === 0) return res.status(400).json({ success: false, errorCode: "DESIGN_INVALID_INPUT" });
      const snaps = await Promise.all(ids.map((id) => photosCol(db, uid).doc(id).get()));
      const photos = snaps.map((s, i) => (s.exists ? { id: ids[i], ...s.data() } : null)).filter(Boolean);
      if (photos.length === 0) return res.status(404).json({ success: false, errorCode: "DESIGN_INVALID_INPUT" });
      if (photos.length === 1) return res.json({ success: true, bestId: photos[0].id, scores: [{ id: photos[0].id, score: null }] });

      // Fallback when the vision model cannot be used: the least used photo, first in the list.
      const fallback = () => photos.slice().sort((a, b) => (a.usedCount || 0) - (b.usedCount || 0))[0].id;
      if (!deps.hasAnthropicKey()) return res.json({ success: true, bestId: fallback(), scores: [] });

      // Bounded per day and per user: this endpoint costs a little and has no credit of its own.
      const userRef = db.collection("users").doc(uid);
      const dayKey = utcDayKey();
      const allowed = await db.runTransaction(async (tx) => {
        const snap = await tx.get(userRef);
        const data = snap.exists ? snap.data() : {};
        const count = data.pickDate === dayKey && typeof data.pickCount === "number" ? data.pickCount : 0;
        if (count >= MAX_PICKS_PER_DAY) return false;
        tx.set(userRef, { pickDate: dayKey, pickCount: count + 1 }, { merge: true });
        return true;
      });
      if (!allowed) return res.json({ success: true, bestId: fallback(), scores: [] });

      const content = [];
      photos.forEach((p, i) => {
        const t = parseDataUrl(p.thumb);
        content.push({ type: "text", text: "Photo " + (i + 1) + ":" });
        content.push({ type: "image", source: { type: "base64", media_type: t.mime, data: t.buffer.toString("base64") } });
      });
      content.push({
        type: "text",
        text:
          "These are photos of the same product. Rate each one from 0 to 10 as the source photo for an advertising image: " +
          "the product must be sharp, well lit, facing the camera and complete inside the frame, on a background that is easy to cut out. " +
          'Reply with JSON only: {"scores": [{"photo": 1, "score": 0-10}, ...]} with one entry per photo.',
      });
      let scores = [];
      try {
        const response = await deps.anthropic.messages.create({ model: deps.visionModel, max_tokens: 300, messages: [{ role: "user", content }] });
        const text = response.content.filter((b) => b.type === "text").map((b) => b.text).join("\n");
        const parsed = extractJsonObject(text);
        scores = (parsed && Array.isArray(parsed.scores) ? parsed.scores : [])
          .map((s) => ({ index: Number(s.photo) - 1, score: Number(s.score) }))
          .filter((s) => photos[s.index] && Number.isFinite(s.score))
          .map((s) => ({ id: photos[s.index].id, score: s.score, used: photos[s.index].usedCount || 0 }));
        await logUsage(db, {
          kind: "photo_pick", uid, model: deps.visionModel, photos: photos.length,
          inputTokens: (response.usage && response.usage.input_tokens) || 0,
          outputTokens: (response.usage && response.usage.output_tokens) || 0,
        });
      } catch (err) {
        console.warn("[adJobs] photo pick failed, using fallback: " + err.message);
      }
      if (scores.length === 0) return res.json({ success: true, bestId: fallback(), scores: [] });

      const byScore = scores.slice().sort((a, b) => b.score - a.score);
      const top = byScore[0];
      // Prefer a photo not used yet, as long as it is nearly as good as the best one.
      const fresh = byScore.find((s) => s.used === 0 && s.score >= 6 && s.score >= top.score - 2);
      const best = top.used > 0 && fresh ? fresh : top;
      res.json({ success: true, bestId: best.id, scores: scores.map((s) => ({ id: s.id, score: s.score })) });
    } catch (err) {
      console.error("[adJobs] /api/photos/pick error: " + err.message);
      res.status(500).json({ success: false, errorCode: "SERVER_NOT_READY" });
    }
  });

  // =========================================================================
  // The ad job
  // =========================================================================

  // ---- POST /api/ad/start --------------------------------------------------
  // Validates, reserves the credits, creates the job and returns its id at once.
  app.post("/api/ad/start", async (req, res) => {
    const auth = await authenticate(req, res);
    if (!auth) return;
    const { db, uid } = auth;
    const userRef = db.collection("users").doc(uid);
    try {
      const body = req.body || {};
      const description = cleanText(body.businessDescription, 4000);
      if (!description) return res.status(400).json({ success: false, errorCode: "DESCRIPTION_REQUIRED" });
      if (!cleanText(body.product, 120)) return res.status(400).json({ success: false, errorCode: "PRODUCT_REQUIRED" });
      if (!deps.hasAnthropicKey()) return res.status(500).json({ success: false, errorCode: "API_KEY_MISSING" });

      const includeDesign = body.includeDesign === true;
      const style = cleanText(body.style, 40);
      const photoId = cleanText(body.photoId, 80);
      let photo = null;
      if (includeDesign) {
        if (!designServiceReady()) {
          console.warn("[adJobs] design unavailable: FAL_KEY missing on the server.");
          return res.json({ success: false, errorCode: "DESIGN_UNAVAILABLE" });
        }
        const photoSnap = photoId ? await photosCol(db, uid).doc(photoId).get() : null;
        if (!photoSnap || !photoSnap.exists) return res.status(400).json({ success: false, errorCode: "DESIGN_INVALID_PHOTO" });
        photo = photoSnap.data();
      }
      let logo = typeof body.logo === "string" ? body.logo : "";
      if (logo && (!parseDataUrl(logo) || logo.length > MAX_LOGO_CHARS)) logo = "";

      // A job left behind by a closed page is ended first, so its credits are back before the check.
      const before = await userRef.get();
      if (!before.exists) return res.status(404).json({ success: false, errorCode: "USER_NOT_FOUND" });
      const stillRunning = await sweepStaleJob(db, uid, before.data());
      if (stillRunning) return res.status(409).json({ success: false, errorCode: "JOB_IN_PROGRESS", jobId: stillRunning });

      // Plan, both counters, daily failed attempts and "one job at a time", in one transaction.
      const monthKey = deps.currentMonthKey();
      const dayKey = utcDayKey();
      const now = Date.now();
      const jobRef = db.collection("ad_jobs").doc();
      const gate = await db.runTransaction(async (tx) => {
        const snap = await tx.get(userRef);
        if (!snap.exists) return { errorCode: "USER_NOT_FOUND", status: 404 };
        const data = snap.data();
        const plan = data.plan || "free";
        const limits = deps.getPlanLimits(plan);
        if (data.activeJob && data.activeJob.id) return { errorCode: "JOB_IN_PROGRESS", status: 409, jobId: data.activeJob.id };
        const textUsed = effectiveTextUsed(data, monthKey);
        if (textUsed >= limits.maxGenerationsPerMonth) {
          return { errorCode: "QUOTA_EXCEEDED", status: 429, errorParams: { plan, max: limits.maxGenerationsPerMonth } };
        }
        const designsUsed = effectiveDesignsUsed(data, monthKey);
        if (includeDesign) {
          if (!limits.maxDesignsPerMonth) return { errorCode: "DESIGN_NOT_IN_PLAN", status: 403 };
          if (!limits.designStyles.includes(style)) return { errorCode: "DESIGN_STYLE_NOT_IN_PLAN", status: 403 };
          if (designsUsed >= limits.maxDesignsPerMonth) return { errorCode: "DESIGN_QUOTA_EXCEEDED", status: 429 };
          if (failuresToday(data, dayKey) >= MAX_FAILED_ATTEMPTS_PER_DAY) return { errorCode: "DESIGN_ATTEMPTS_EXCEEDED", status: 429 };
        }
        // Credits are reserved now and returned by failJob() if the job does not finish.
        tx.set(
          userRef,
          {
            generationsUsed: textUsed + 1,
            designsUsed: designsUsed + (includeDesign ? 1 : 0),
            lastResetMonth: monthKey,
            activeJob: { id: jobRef.id, startedAt: now },
          },
          { merge: true }
        );
        // Styled sets already used for this product, so the next one is different.
        const avoidScenes = (Array.isArray(data.recentScenes) ? data.recentScenes : [])
          .filter((r) => sameProduct(r.product, body.product))
          .map((r) => r.idea);
        return { plan, limits, avoidScenes };
      });
      if (gate.errorCode) {
        return res.status(gate.status).json({ success: false, errorCode: gate.errorCode, errorParams: gate.errorParams, jobId: gate.jobId });
      }

      let reservedImages = 0;
      if (includeDesign) {
        if (!(await reserveImages(db, 1))) {
          console.warn("[adJobs] daily image cap reached — design refused for uid=" + uid);
          await jobRef.set({ uid, status: "running", includeDesign, monthKey, createdAt: now });
          await failJob(db, jobRef, "unavailable");
          return res.json({ success: false, errorCode: "DESIGN_UNAVAILABLE" });
        }
        reservedImages = 1;
      }

      const colors = photo && photo.palette && body.customColors !== true ? photo.palette : [cleanHex(body.color1, "#1f2a44"), cleanHex(body.color2, "#d4af37")];
      await jobRef.set({
        uid,
        plan: gate.plan,
        status: "running",
        stage: "copy",
        failure: null,
        createdAt: now,
        lastPollAt: now,
        lockUntil: 0,
        monthKey,
        includeDesign,
        description,
        input: {
          product: cleanText(body.product, 120),
          offer: cleanText(body.offer, 120),
          language: cleanText(body.language, 60),
          tone: cleanText(body.tone, 60),
          goal: cleanText(body.goal, 80),
          platform: cleanText(body.platform, 40),
          sourceText: cleanText(body.sourceText, 6000),
          avoidScenes: gate.avoidScenes,
        },
        photoId: includeDesign ? photoId : null,
        formats: includeDesign ? gate.limits.designFormats : [],
        style: includeDesign ? style : null,
        note: cleanText(body.note, 200),
        brand: { brandName: cleanText(body.brandName, 40), colors: [cleanHex(colors[0], "#1f2a44"), cleanHex(colors[1], "#d4af37")], logo },
        reservedImages,
        usage: { copy: null, vision: [], falImages: 0 },
      });
      console.log("[adJobs] job " + jobRef.id + " started: uid=" + uid + " plan=" + gate.plan + " design=" + includeDesign);
      res.json({ success: true, jobId: jobRef.id });
    } catch (err) {
      console.error("[adJobs] /api/ad/start error: " + err.message);
      res.status(500).json({ success: false, errorCode: "GENERATION_FAILED" });
    }
  });

  function scenesForFormats(formats, url) {
    return (formats || []).map((format) => ({ format, variation: 1, url }));
  }

  function publicJob(job, jobId, extra) {
    return {
      success: true,
      jobId,
      status: job.status,
      stage: job.stage || null,
      failure: job.failure || null,
      includeDesign: Boolean(job.includeDesign),
      result: job.status === "done" ? job.result || null : null,
      ...(extra || {}),
    };
  }

  // ---- GET /api/ad/poll?jobId= --------------------------------------------
  // Advances the job by one bounded step and returns where it stands.
  app.get("/api/ad/poll", async (req, res) => {
    const auth = await authenticate(req, res);
    if (!auth) return;
    const { db, uid } = auth;
    const jobId = cleanText(req.query.jobId, 80);
    if (!jobId) return res.status(400).json({ success: false, errorCode: "DESIGN_INVALID_INPUT" });
    const jobRef = db.collection("ad_jobs").doc(jobId);
    const userRef = db.collection("users").doc(uid);
    const withQuota = async (job) => {
      const snap = await userRef.get();
      return publicJob(job, jobId, { quota: quotaPayload(snap.exists ? snap.data() : {}, null) });
    };

    try {
      // A short lock, so two overlapping polls never run the same step twice.
      const now = Date.now();
      const locked = await db.runTransaction(async (tx) => {
        const snap = await tx.get(jobRef);
        if (!snap.exists || snap.data().uid !== uid) return { missing: true };
        const data = snap.data();
        if (data.status !== "running") return { job: data, final: true };
        if (data.lockUntil > now) return { job: data, busy: true };
        tx.update(jobRef, { lockUntil: now + JOB_LOCK_MS, lastPollAt: now });
        return { job: data };
      });
      if (locked.missing) return res.status(404).json({ success: false, errorCode: "DESIGN_INVALID_INPUT" });
      if (locked.final) return res.json(await withQuota(locked.job));
      if (locked.busy) return res.json(publicJob(locked.job, jobId));

      const job = locked.job;
      const usage = { copy: job.usage.copy, vision: (job.usage.vision || []).slice(), falImages: job.usage.falImages || 0 };
      const fail = async (failure, patch) => {
        await jobRef.update({ usage, ...(patch || {}) });
        // An image reserved under the daily cap but never requested is released.
        if (job.reservedImages > usage.falImages) await releaseImages(db, job.reservedImages - usage.falImages);
        await failJob(db, jobRef, failure);
        const snap = await jobRef.get();
        return res.json(await withQuota(snap.data()));
      };
      const keepRunning = async (patch) => {
        await jobRef.update({ ...patch, usage, lockUntil: 0 });
        return res.json(publicJob({ ...job, ...patch }, jobId));
      };
      if (now - job.createdAt > JOB_TIMEOUT_MS) return fail("unavailable", { stageAtFailure: job.stage });

      // ---------------- step 1: write the ad copy ----------------
      if (job.stage === "copy") {
        let copy;
        try {
          copy = await deps.generateAdCopy(job.description, job.input, job.plan);
        } catch (err) {
          console.error("[adJobs] ad copy failed (job " + jobId + "): " + err.message);
          return fail("copy");
        }
        usage.copy = { model: copy.model, ...copy.usage };
        await logUsage(db, { kind: "ad_copy", uid, jobId, model: copy.model, ...copy.usage });
        const patch = { copy: { ad: copy.ad, sceneIdeas: copy.sceneIdeas, clean: copy.clean } };
        if (job.includeDesign) return keepRunning({ ...patch, stage: "scene" });
        return finish({ ...job, ...patch }, null);
      }

      const key = falKey();
      if (!key) return fail("unavailable");

      // ---------------- step 2: send the scene to fal.ai ----------------
      if (job.stage === "scene") {
        const photoSnap = await db.collection("users").doc(uid).collection("photos").doc(job.photoId).get();
        const photo = photoSnap.exists ? photoSnap.data() : null;
        const parsed = photo ? parseDataUrl(photo.dataUrl) : null;
        if (!parsed) return fail("unavailable");
        const ideas = (job.copy.sceneIdeas || []).filter(Boolean);
        const pool = ideas.length ? ideas : FALLBACK_SCENE_IDEAS;
        const variant = Math.floor(Math.random() * LAYOUT_VARIANTS);
        const ctx = {
          colorName: hexToColorName(job.brand.colors[0]),
          note: job.note,
          product: job.input.product,
          sceneIdea: pool[variant % pool.length],
          variant,
          landscape: photo.width / photo.height >= 1.3, // 4:3 and wider
        };
        // fal.ai file upload first; if it fails, the photo is sent inline.
        const productUrl = await uploadToFalStorage(key, parsed.buffer, parsed.mime);
        let slot;
        try {
          slot = await submitScene(key, productUrl || photo.dataUrl, job.style, ctx);
        } catch (err) {
          console.warn("[adJobs] scene submit failed (job " + jobId + "): " + err.message);
          return fail("unavailable");
        }
        usage.falImages += 1;
        return keepRunning({ stage: "wait", sceneContext: ctx, variant, productUrl: productUrl || null, productThumb: photo.thumb, slot: { ...slot, attempt: 1 } });
      }

      // One silent regeneration, if the daily cap still allows it.
      const retry = async (failure) => {
        if (job.slot.attempt === 1 && (await reserveImages(db, 1))) {
          try {
            const photoRef = job.productUrl || (await db.collection("users").doc(uid).collection("photos").doc(job.photoId).get()).data().dataUrl;
            const slot = await submitScene(key, photoRef, job.style, job.sceneContext);
            usage.falImages += 1;
            return keepRunning({ stage: "wait", slot: { ...slot, attempt: 2 }, reservedImages: job.reservedImages + 1 });
          } catch (err) {
            console.warn("[adJobs] retry submit failed (job " + jobId + "): " + err.message);
            await releaseImages(db, 1);
          }
        }
        return fail(failure);
      };

      // ---------------- step 3: wait for fal.ai ----------------
      if (job.stage === "wait") {
        let r;
        try {
          r = await readSceneRequest(key, job.slot);
        } catch (err) {
          r = { state: "pending" };
        }
        if (r.state === "pending") return keepRunning({});
        if (r.state === "error") return retry("unavailable");
        return keepRunning({ stage: "check", sceneUrl: r.url });
      }

      // ---------------- step 4: quality check ----------------
      if (job.stage === "check") {
        const sceneUrl = await maybeUpscale(key, job.sceneUrl);
        let scene;
        try {
          scene = await fetchImageBase64(sceneUrl);
        } catch (err) {
          return retry("unavailable");
        }
        const verdict = await checkScene(deps, job.productThumb, scene);
        usage.vision.push({ model: deps.visionModel, ...verdict.usage });
        await logUsage(db, { kind: "quality_check", uid, jobId, model: deps.visionModel, pass: verdict.pass, ...verdict.usage });
        if (!verdict.pass) {
          console.log("[adJobs] scene rejected (job " + jobId + ", attempt " + job.slot.attempt + "): " + verdict.reason);
          return retry(verdict.checkError ? "unavailable" : "quality");
        }
        return finish(job, { url: sceneUrl, scene });
      }

      return fail("unavailable");

      // ---------------- last step: save and hand over ----------------
      async function finish(doneJob, sceneResult) {
        const ad = doneJob.copy.ad;
        const clean = doneJob.copy.clean;
        const projects = db.collection("generations").doc(uid).collection("projects");
        const projectRef = projects.doc();
        let design = null;
        let stored = { sceneChunks: 0, sceneMime: null };
        if (sceneResult) {
          design = {
            headline: ad.headline,
            subheadline: ad.subheadline,
            badge: ad.offerBadge,
            highlight: ad.highlight,
            chips: ad.benefits,
            chipDetails: ad.benefitDetails,
            chipIcons: ad.benefitIcons,
            qualities: ad.qualities,
            qualityIcons: ad.qualityIcons,
            cta: ad.cta,
            brandName: doneJob.brand.brandName,
            colors: doneJob.brand.colors,
            logo: doneJob.brand.logo,
            style: doneJob.style,
            variant: doneJob.variant,
            landscape: Boolean(doneJob.sceneContext.landscape),
            photoId: doneJob.photoId,
            createdAt: new Date(),
            scenes: scenesForFormats(doneJob.formats, sceneResult.url),
          };
          // The scene itself is copied into Firestore (in chunks: a document holds 1 MB), so the
          // design stays downloadable after the fal.ai link expires.
          const data = sceneResult.scene.data;
          if (data.length * 0.75 <= MAX_SCENE_STORE_BYTES) {
            const n = Math.ceil(data.length / SCENE_CHUNK_CHARS);
            await Promise.all(
              Array.from({ length: n }, (_, i) =>
                projectRef.collection("scene").doc(String(i)).set({ data: data.slice(i * SCENE_CHUNK_CHARS, (i + 1) * SCENE_CHUNK_CHARS) })
              )
            );
            stored = { sceneChunks: n, sceneMime: sceneResult.scene.mime };
          }
        }
        const cost = {
          copy: usage.copy,
          vision: usage.vision,
          falImages: usage.falImages,
          estUsd: estimateUsd(usage),
        };
        await projectRef.set({
          createdAt: new Date(),
          kind: "ad",
          projectDescription: doneJob.description,
          product: clean.product,
          days: 1,
          language: clean.language,
          plan: doneJob.plan,
          ad,
          // Legacy shape, so older 7-day items and new ads list with the same code.
          generatedContent: [{ day: 1, post: ad.caption, platform: clean.platform || "Instagram" }],
          tone: clean.tone || "auto",
          goal: clean.goal || "auto",
          platform: clean.platform || "auto",
          ...(design ? { design, hasDesign: true, ...stored } : { hasDesign: false }),
          cost,
        });

        const result = {
          docId: projectRef.id,
          plan: doneJob.plan,
          content: [{ day: 1, locked: false, idea: ad.headline, ...ad }],
          design: design ? { ...design, logo: "" } : null, // the browser already has the logo
        };
        await jobRef.update({ status: "done", stage: "done", result, usage, cost, lockUntil: 0, finishedAt: Date.now(), productThumb: "", "brand.logo": "" });
        await db.runTransaction(async (tx) => {
          const snap = await tx.get(userRef);
          const data = snap.exists ? snap.data() : {};
          const update = { activeJob: null };
          if (design) {
            const recent = (Array.isArray(data.recentScenes) ? data.recentScenes : []).concat([{ product: clean.product, idea: doneJob.sceneContext.sceneIdea }]);
            update.recentScenes = recent.slice(-8);
          }
          tx.set(userRef, update, { merge: true });
        });
        if (design) {
          await db.collection("users").doc(uid).collection("photos").doc(doneJob.photoId).set({ usedCount: deps.FieldValue.increment(1) }, { merge: true }).catch(() => {});
        }
        console.log("[adJobs] job " + jobId + " done. " + JSON.stringify({ design: Boolean(design), ...cost }));
        return res.json(await withQuota({ ...doneJob, status: "done", stage: "done", result }));
      }
    } catch (err) {
      console.error("[adJobs] /api/ad/poll error: " + err.message);
      await jobRef.update({ lockUntil: 0 }).catch(() => {});
      res.status(500).json({ success: false, errorCode: "GENERATION_FAILED" });
    }
  });

  // ---- POST /api/ad/texts ---------------------------------------------------
  // Saves the customer's edits to the texts of a finished design. The design is redrawn in the
  // browser; nothing is generated, so this costs no credit.
  app.post("/api/ad/texts", async (req, res) => {
    const auth = await authenticate(req, res);
    if (!auth) return;
    try {
      const body = req.body || {};
      const docId = cleanText(body.docId, 80);
      const ref = docId ? auth.db.collection("generations").doc(auth.uid).collection("projects").doc(docId) : null;
      const snap = ref ? await ref.get() : null;
      if (!snap || !snap.exists || !snap.data().design) return res.status(404).json({ success: false, errorCode: "DESIGN_INVALID_INPUT" });
      const texts = cleanDesignTexts(body);
      if (!texts.headline) return res.status(400).json({ success: false, errorCode: "DESIGN_INVALID_INPUT" });
      await ref.set({ design: { ...texts, brandName: cleanText(body.brandName, 40), editedAt: new Date() } }, { merge: true });
      res.json({ success: true });
    } catch (err) {
      console.error("[adJobs] /api/ad/texts error: " + err.message);
      res.status(500).json({ success: false, errorCode: "SERVER_NOT_READY" });
    }
  });

  // ---- GET /api/design/image?docId=&i= -----------------------------------
  // The scene of one of the user's own saved designs: from the copy kept in Firestore, or, for
  // older designs, from the fal.ai link while it still works. Only the user's own project is
  // ever read, so this cannot be used as an open proxy.
  app.get("/api/design/image", async (req, res) => {
    const auth = await authenticate(req, res);
    if (!auth) return;
    try {
      const docId = cleanText(req.query.docId, 80);
      const index = parseInt(req.query.i, 10) || 0;
      const ref = docId ? auth.db.collection("generations").doc(auth.uid).collection("projects").doc(docId) : null;
      const snap = ref ? await ref.get() : null;
      const project = snap && snap.exists ? snap.data() : null;
      const scenes = project && project.design && project.design.scenes;
      const scene = Array.isArray(scenes) ? scenes[index] : null;
      if (!scene) return res.status(404).json({ success: false, errorCode: "DESIGN_INVALID_INPUT" });

      if (project.sceneChunks > 0) {
        const parts = await Promise.all(Array.from({ length: project.sceneChunks }, (_, i) => ref.collection("scene").doc(String(i)).get()));
        if (parts.every((p) => p.exists)) {
          res.setHeader("Content-Type", project.sceneMime || "image/png");
          res.setHeader("Cache-Control", "private, max-age=86400");
          return res.send(Buffer.from(parts.map((p) => p.data().data).join(""), "base64"));
        }
      }
      if (!/^https:\/\//.test(scene.url || "")) return res.status(410).json({ success: false, errorCode: "DESIGN_SCENE_EXPIRED" });
      const upstream = await fetch(scene.url);
      if (!upstream.ok) return res.status(410).json({ success: false, errorCode: "DESIGN_SCENE_EXPIRED" });
      const buffer = Buffer.from(await upstream.arrayBuffer());
      if (buffer.length > MAX_SCENE_PROXY_BYTES) return res.status(413).json({ success: false, errorCode: "DESIGN_UNAVAILABLE" });
      res.setHeader("Content-Type", (upstream.headers.get("content-type") || "image/png").split(";")[0]);
      res.setHeader("Cache-Control", "private, max-age=3600");
      res.send(buffer);
    } catch (err) {
      console.error("[adJobs] /api/design/image error: " + err.message);
      res.status(500).json({ success: false, errorCode: "DESIGN_UNAVAILABLE" });
    }
  });
}
