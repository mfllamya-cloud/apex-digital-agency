// ---------------------------------------------------------------------------
// Ad design UI: the form fields (product photo library, logo, style), the calls to this site's
// own endpoints, the progress steps, and the finished ad shown as a social post (the design on
// top, the caption and hashtags under it).
// Used by App.js (new ads) and History.js (saved designs, redrawn from saved data).
//
// No secret key is used here. The browser only talks to this site's own /api endpoints, with the
// user's Firebase ID token; the fal.ai key stays on the server.
// ---------------------------------------------------------------------------
import React, { useEffect, useRef, useState } from "react";
import { T } from "./theme";
import { AD_FORMATS, drawAd, ensureAdFonts, extractPalette, normalizePalette } from "./adTemplates";

export const DESIGN_STYLE_KEYS = ["clean_studio", "bold_color", "luxury_dark", "lifestyle_scene"];
export const MAX_PHOTOS_PER_AD = 5;

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const MIN_PHOTO_SHORT_SIDE = 800;
// The photo is kept in the customer's account (one Firestore document, 1 MB), so it is saved as
// a JPEG of at most this many characters. The scene is 1024 px, so 1600 px is plenty.
const PHOTO_MAX_DATAURL_CHARS = 790000;
const THUMB_MAX_DATAURL_CHARS = 58000; // preview + reference copy for the automatic checks
const LOGO_MAX_SIDE = 480;
const LOGO_MAX_DATAURL_CHARS = 250000;
const POLL_INTERVAL_MS = 2500;
const POLL_MAX_MS = 9 * 60 * 1000;
const FORMAT_ORDER = ["4:5", "1:1", "9:16"]; // the 4:5 feature poster comes first and carries the caption

export const EMPTY_DESIGN_FIELDS = {
  photoIds: [], // saved photos offered for this ad (same product, up to 5)
  chosenId: "", // the one the design is built from
  chosenBy: "", // "auto" (picked for the customer) | "user"
  pickedFor: "", // the selection the automatic choice was made for
  logo: "", // PNG data URL
  brandName: "",
  // Brand colours are read from the chosen photo. customColors turns true only when the
  // customer overrides them with "Change colors".
  color1: "#1f2a44",
  color2: "#d4af37",
  customColors: false,
  note: "",
  style: "clean_studio",
};

// --- files ------------------------------------------------------------------

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image load failed"));
    img.src = src;
  });
}

function drawScaled(img, maxSide, background) {
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const scale = Math.min(1, maxSide / Math.max(iw, ih));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(iw * scale));
  canvas.height = Math.max(1, Math.round(ih * scale));
  const ctx = canvas.getContext("2d");
  if (background) {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function fileError(code) {
  const err = new Error(code);
  err.code = code;
  return err;
}

// Validates the product photo (JPG/PNG, 5 MB, 800 px on the short side), prepares the two
// copies kept in the account and reads the brand colours from it.
// Rejects with err.code = "type" | "size" | "dims" | "read".
export async function prepareProductPhoto(file) {
  if (!file || !["image/jpeg", "image/png"].includes(file.type)) throw fileError("type");
  if (file.size > MAX_PHOTO_BYTES) throw fileError("size");
  const objectUrl = URL.createObjectURL(file);
  try {
    let img;
    try {
      img = await loadImage(objectUrl);
    } catch (_) {
      throw fileError("read");
    }
    if (Math.min(img.naturalWidth, img.naturalHeight) < MIN_PHOTO_SHORT_SIDE) throw fileError("dims");
    const fit = (attempts, limit) => {
      let out = "";
      let canvas = null;
      for (let i = 0; i < attempts.length; i++) {
        canvas = drawScaled(img, attempts[i][0], "#ffffff");
        out = canvas.toDataURL("image/jpeg", attempts[i][1]);
        if (out.length <= limit) break;
      }
      return { dataUrl: out, canvas };
    };
    const full = fit([[1600, 0.9], [1600, 0.82], [1400, 0.8], [1200, 0.78], [1024, 0.74], [900, 0.68]], PHOTO_MAX_DATAURL_CHARS);
    const thumb = fit([[512, 0.8], [448, 0.74], [384, 0.7], [320, 0.62]], THUMB_MAX_DATAURL_CHARS);
    if (full.dataUrl.length > PHOTO_MAX_DATAURL_CHARS || thumb.dataUrl.length > THUMB_MAX_DATAURL_CHARS) throw fileError("read");
    return { dataUrl: full.dataUrl, thumb: thumb.dataUrl, palette: extractPalette(thumb.canvas) };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

// The logo is drawn by code on the design, so it is kept as a small PNG (transparency preserved).
export async function prepareLogo(file) {
  if (!file || !["image/png", "image/jpeg"].includes(file.type)) throw fileError("type");
  if (file.size > MAX_PHOTO_BYTES) throw fileError("size");
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(objectUrl);
    let dataUrl = drawScaled(img, LOGO_MAX_SIDE, null).toDataURL("image/png");
    if (dataUrl.length > LOGO_MAX_DATAURL_CHARS) dataUrl = drawScaled(img, 300, null).toDataURL("image/png");
    if (dataUrl.length > LOGO_MAX_DATAURL_CHARS) dataUrl = drawScaled(img, 200, null).toDataURL("image/png");
    return dataUrl;
  } catch (_) {
    throw fileError("read");
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

// --- API --------------------------------------------------------------------

async function authedFetch(user, url, options) {
  const idToken = await user.getIdToken();
  const opts = options || {};
  return fetch(url, {
    ...opts,
    headers: { ...(opts.headers || {}), Authorization: "Bearer " + idToken },
  });
}

// Real plan, counters and limits, straight from the server.
export async function fetchQuota(user) {
  try {
    const res = await authedFetch(user, "/api/quota");
    const data = await res.json();
    return data && data.success ? data : null;
  } catch (_) {
    return null;
  }
}

async function postJson(user, url, body) {
  const res = await authedFetch(user, url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return res.json();
}

// Product photos saved in the account: [{ id, thumb, width, height, palette, usedCount }].
export async function listPhotos(user) {
  try {
    const res = await authedFetch(user, "/api/photos");
    const data = await res.json();
    return data && data.success ? data.photos : [];
  } catch (_) {
    return [];
  }
}

// Saves the customer's edits to the texts of a finished design (no generation, no credit).
export async function saveDesignTexts(user, docId, texts) {
  try {
    const data = await postJson(user, "/api/ad/texts", { docId, ...texts });
    return Boolean(data && data.success);
  } catch (_) {
    return false;
  }
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Starts an ad job on the server (or picks up one that is already running) and follows it.
// One call = the whole ad: copy, scene, quality check, saved result.
//   options: { resumeJobId, onStage(stage, includeDesign), isCancelled() }
// Resolves with
//   { status: "done", result: { docId, plan, content, design }, quota }
//   { status: "failed", reason, quota }      the job ran and failed: no credit was used
//   { status: "rejected", data }             the server refused to start it (limits, input…)
//   { status: "cancelled" }
export async function runAdJob(user, payload, options) {
  const o = options || {};
  let jobId = o.resumeJobId || "";
  if (!jobId) {
    try {
      const data = await postJson(user, "/api/ad/start", payload);
      if (data.success) jobId = data.jobId;
      // Already running (a second tab, a reloaded page): follow that job instead of starting another.
      else if (data.errorCode === "JOB_IN_PROGRESS" && data.jobId) jobId = data.jobId;
      else return { status: "rejected", data };
    } catch (_) {
      return { status: "rejected", data: null };
    }
  }

  const startedAt = Date.now();
  let consecutiveErrors = 0;
  let lastStage = "";
  if (o.onStage) o.onStage("copy");
  while (Date.now() - startedAt < POLL_MAX_MS) {
    if (o.isCancelled && o.isCancelled()) return { status: "cancelled" };
    let delay = POLL_INTERVAL_MS;
    try {
      const res = await authedFetch(user, "/api/ad/poll?jobId=" + encodeURIComponent(jobId));
      const data = await res.json();
      if (!data.success) throw new Error("poll failed");
      consecutiveErrors = 0;
      if (data.status === "done" && data.result) return { status: "done", result: data.result, quota: data.quota || null };
      if (data.status === "failed") return { status: "failed", reason: data.failure || "unavailable", quota: data.quota || null };
      if (data.stage && data.stage !== lastStage) {
        lastStage = data.stage;
        if (o.onStage) o.onStage(data.stage, Boolean(data.includeDesign));
        delay = 500; // a step just finished: ask for the next one straight away
      }
    } catch (_) {
      consecutiveErrors += 1;
      if (consecutiveErrors >= 8) return { status: "failed", reason: "connection" };
    }
    await wait(delay);
  }
  return { status: "failed", reason: "connection" };
}

// Message for a job that ran and failed. Every one of these means: no credit was used.
export function adFailureMessage(reason, t) {
  switch (reason) {
    case "quality":
      return t("ads.designQualityFail");
    case "copy":
      return t("ads.adFailed");
    case "connection":
      return t("ads.connectionLost");
    default:
      return t("ads.designUnavailable");
  }
}

// Message for a start request the server refused, or "" when the code is not one of ours.
export function adRejectMessage(code, t) {
  switch (code) {
    case "DESIGN_ATTEMPTS_EXCEEDED":
      return t("ads.designAttemptsExceeded");
    case "DESIGN_QUOTA_EXCEEDED":
      return t("ads.designQuotaExceeded");
    case "JOB_IN_PROGRESS":
      return t("ads.jobInProgress");
    case "DESIGN_INVALID_PHOTO":
      return t("ads.designInvalidPhoto");
    case "DESIGN_NOT_IN_PLAN":
    case "DESIGN_STYLE_NOT_IN_PLAN":
      return t("ads.designNotInPlan");
    case "DESIGN_UNAVAILABLE":
      return t("ads.designUnavailable");
    case "PRODUCT_REQUIRED":
      return t("ads.productRequired");
    default:
      return "";
  }
}

// --- small UI pieces --------------------------------------------------------

const fieldStyle = {
  width: "100%",
  padding: "0.65rem",
  borderRadius: "8px",
  border: `1px solid ${T.glassBorder}`,
  marginBottom: "1rem",
  fontFamily: "inherit",
  fontSize: "0.95rem",
  boxSizing: "border-box",
  background: T.glass,
};

const hintStyle = { color: T.textFaint, fontSize: "0.8rem", margin: "0.35rem 0 1rem" };

export function CopyButton({ text, t, light, label }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (_) {
      // Clipboard access can be refused by the browser; the text stays selectable on the page.
    }
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      style={{
        padding: "0.3rem 0.85rem",
        borderRadius: "999px",
        border: `1px solid ${light ? "#cbd5e1" : T.glassBorderGold}`,
        background: "transparent",
        color: light ? "#334155" : T.goldLight,
        fontSize: "0.78rem",
        fontWeight: 700,
        cursor: "pointer",
        flexShrink: 0,
      }}
    >
      {copied ? t("ads.copied") : label || t("ads.copy")}
    </button>
  );
}

// Progress of the one-click generation: the steps, the one in progress, and the reminder to
// keep the page open. "stage" is the server's: copy | scene | wait | check | done.
export function GenerationProgress({ t, stage, includeDesign }) {
  const steps = includeDesign ? ["copy", "scene", "check"] : ["copy"];
  const current = stage === "check" ? 2 : stage === "scene" || stage === "wait" ? 1 : stage === "done" ? steps.length : 0;
  const labels = { copy: t("ads.stepCopy"), scene: t("ads.stepScene"), check: t("ads.stepCheck") };
  return (
    <div
      role="status"
      aria-live="polite"
      style={{ marginTop: "1rem", padding: "1rem 1.25rem", borderRadius: "10px", border: `1px solid ${T.glassBorderGold}`, background: "rgba(212,175,55,0.06)" }}
    >
      <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "0.55rem" }}>
        {steps.map((key, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <li key={key} style={{ display: "flex", alignItems: "center", gap: "0.7rem", color: done || active ? T.text : T.textFaint, fontWeight: active ? 700 : 500, fontSize: "0.95rem" }}>
              <span
                aria-hidden="true"
                className={active ? "agency-loading-step" : undefined}
                style={{
                  width: "24px",
                  height: "24px",
                  borderRadius: "50%",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.78rem",
                  fontWeight: 800,
                  background: done ? T.gold : "transparent",
                  color: done ? "#1A1305" : active ? T.goldLight : T.textFaint,
                  border: `2px solid ${done || active ? T.gold : T.glassBorder}`,
                }}
              >
                {done ? "✓" : i + 1}
              </span>
              {labels[key]}
              {active ? "…" : ""}
            </li>
          );
        })}
      </ol>
      <p style={{ margin: "0.9rem 0 0", color: T.goldLight, fontSize: "0.88rem", fontWeight: 600, lineHeight: 1.5 }}>⚠ {t("ads.progressWarning")}</p>
    </div>
  );
}

// Product photos of the account: the customer selects up to 5 photos of the same product, the
// best one is picked for them (they can choose another), and new uploads are saved for next time.
function PhotoLibrary({ user, t, value, set, photos, onPhotos }) {
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [picking, setPicking] = useState(false);
  const input = useRef(null);
  const known = value.photoIds.filter((id) => photos.some((p) => p.id === id));
  const selectionKey = known.join(",");
  const { chosenId, chosenBy, pickedFor, customColors } = value;

  const errorText = (code) =>
    t(code === "type" ? "ads.photoErrType" : code === "size" ? "ads.photoErrSize" : code === "dims" ? "ads.photoErrDims" : "ads.photoErrRead");

  // Keeps the chosen photo in step with the selection. With several photos, the server's cheap
  // vision model picks the best one — unless the customer already chose one of them.
  useEffect(() => {
    const ids = selectionKey ? selectionKey.split(",") : [];
    if (ids.length === 0) {
      if (chosenId) set({ chosenId: "", chosenBy: "", pickedFor: "" });
      return undefined;
    }
    if (ids.includes(chosenId) && (chosenBy === "user" || pickedFor === selectionKey)) return undefined;
    if (ids.length === 1) {
      set({ chosenId: ids[0], chosenBy: "auto", pickedFor: selectionKey });
      return undefined;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setPicking(true);
      let bestId = ids[0];
      try {
        const data = await postJson(user, "/api/photos/pick", { ids });
        if (data && data.success && ids.includes(data.bestId)) bestId = data.bestId;
      } catch (_) {
        // The first selected photo is used when the automatic choice cannot be made.
      }
      if (cancelled) return;
      setPicking(false);
      set({ chosenId: bestId, chosenBy: "auto", pickedFor: selectionKey });
    }, 900);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      setPicking(false);
    };
    // "set" and "user" are stable for the life of the form.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectionKey, chosenId, chosenBy, pickedFor]);

  // Brand colours follow the chosen photo unless the customer set their own.
  const chosen = photos.find((p) => p.id === chosenId) || null;
  const paletteKey = chosen && chosen.palette ? chosen.palette.join(",") : "";
  useEffect(() => {
    if (!paletteKey || customColors) return;
    const pair = paletteKey.split(",");
    set({ color1: pair[0], color2: pair[1] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paletteKey, customColors]);

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || []).slice(0, MAX_PHOTOS_PER_AD);
    e.target.value = "";
    if (files.length === 0) return;
    setUploading(true);
    setError("");
    const added = [];
    for (let i = 0; i < files.length; i++) {
      try {
        const prepared = await prepareProductPhoto(files[i]);
        const data = await postJson(user, "/api/photos", prepared);
        if (data && data.success) added.push(data.photo);
        else setError(t(data && data.errorCode === "DESIGN_INVALID_PHOTO" ? "ads.designInvalidPhoto" : "ads.photoErrRead"));
      } catch (err) {
        setError(errorText(err.code));
      }
    }
    setUploading(false);
    if (added.length === 0) return;
    onPhotos((prev) => added.slice().reverse().concat(prev));
    // New uploads are selected for this ad, up to the limit; the newest take the place of older picks.
    const ids = added.map((p) => p.id).concat(known).slice(0, MAX_PHOTOS_PER_AD);
    set({ photoIds: ids });
  };

  const toggle = (id) => {
    setError("");
    if (known.includes(id)) {
      set({ photoIds: known.filter((x) => x !== id) });
    } else if (known.length >= MAX_PHOTOS_PER_AD) {
      setError(t("ads.photoMax"));
    } else {
      set({ photoIds: known.concat([id]) });
    }
  };

  const remove = async (id) => {
    if (!window.confirm(t("ads.photoDeleteConfirm"))) return;
    onPhotos((prev) => prev.filter((p) => p.id !== id));
    set({ photoIds: known.filter((x) => x !== id) });
    try {
      await postJson(user, "/api/photos/delete", { id });
    } catch (_) {
      // The photo comes back on the next load if the request did not reach the server.
    }
  };

  const tile = 86;
  return (
    <div style={{ marginBottom: "1rem" }}>
      <label className="agency-form-label">
        {t("ads.photosLabel")} <span style={{ color: "#ef4444" }}>*</span>
      </label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.7rem", alignItems: "flex-start" }}>
        {photos.map((p) => {
          const selected = known.includes(p.id);
          const isChosen = selected && p.id === chosenId;
          return (
            <div key={p.id} style={{ width: tile + "px", textAlign: "center" }}>
              <div style={{ position: "relative" }}>
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => toggle(p.id)}
                  style={{
                    display: "block",
                    width: tile + "px",
                    height: tile + "px",
                    padding: 0,
                    borderRadius: "10px",
                    overflow: "hidden",
                    cursor: "pointer",
                    background: "#fff",
                    border: isChosen ? `3px solid ${T.gold}` : selected ? `2px solid ${T.goldLight}` : `1px solid ${T.glassBorder}`,
                    opacity: selected ? 1 : 0.55,
                  }}
                >
                  <img src={p.thumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                </button>
                <button
                  type="button"
                  aria-label={t("ads.photoDelete")}
                  title={t("ads.photoDelete")}
                  onClick={() => remove(p.id)}
                  style={{ position: "absolute", top: "-7px", insetInlineEnd: "-7px", width: "22px", height: "22px", borderRadius: "50%", border: "none", background: "#0f1419", color: "#fff", fontSize: "0.75rem", lineHeight: 1, cursor: "pointer" }}
                >
                  ✕
                </button>
              </div>
              {isChosen ? (
                <span style={{ display: "block", marginTop: "0.3rem", fontSize: "0.72rem", fontWeight: 800, color: T.goldLight }}>★ {t("ads.photoChosenBadge")}</span>
              ) : selected ? (
                <button
                  type="button"
                  onClick={() => set({ chosenId: p.id, chosenBy: "user" })}
                  style={{ marginTop: "0.3rem", background: "none", border: "none", padding: 0, color: T.goldLight, fontSize: "0.72rem", fontWeight: 600, cursor: "pointer", textDecoration: "underline" }}
                >
                  {t("ads.photoUseThis")}
                </button>
              ) : (
                p.usedCount > 0 && <span style={{ display: "block", marginTop: "0.3rem", fontSize: "0.7rem", color: T.textFaint }}>{t("ads.photoUsed", { n: p.usedCount })}</span>
              )}
            </div>
          );
        })}
        <button
          type="button"
          disabled={uploading}
          onClick={() => input.current && input.current.click()}
          style={{
            width: photos.length ? tile + "px" : "auto",
            minHeight: photos.length ? tile + "px" : "auto",
            padding: photos.length ? "0.3rem" : "0.6rem 1.1rem",
            borderRadius: "10px",
            border: `1px dashed ${T.glassBorderGold}`,
            background: "rgba(212,175,55,0.10)",
            color: T.goldLight,
            fontWeight: 700,
            fontSize: "0.82rem",
            cursor: uploading ? "wait" : "pointer",
          }}
        >
          {uploading ? t("ads.photoUploading") : "+ " + t("ads.photosAdd")}
        </button>
        <input ref={input} type="file" accept="image/jpeg,image/png" multiple onChange={handleFiles} style={{ display: "none" }} />
      </div>
      {error && <p style={{ color: "#fca5a5", fontSize: "0.85rem", margin: "0.5rem 0 0" }}>{error}</p>}
      {known.length > 0 && (
        <p style={{ color: T.text, fontSize: "0.85rem", fontWeight: 600, margin: "0.6rem 0 0" }}>
          {picking ? t("ads.photoPicking") : !chosen ? "" : chosenBy === "user" ? t("ads.photoChosenUser") : known.length > 1 ? t("ads.photoChosenAuto") : t("ads.photoChosenSingle")}
        </p>
      )}
      <p style={{ color: T.textFaint, fontSize: "0.8rem", margin: "0.35rem 0 0" }}>{t("ads.photosTip")}</p>
    </div>
  );
}

// Form fields shown when "Include ad design" is ticked.
// onChange receives an updater function (prev => next), like a React state setter.
export function DesignFields({ user, t, value, onChange, photos, onPhotos, allowedStyles, onLockedStyle }) {
  const [logoError, setLogoError] = useState("");
  const [showColors, setShowColors] = useState(false);
  const logoInput = useRef(null);
  const set = (patch) => onChange((prev) => ({ ...prev, ...patch }));
  const chosen = photos.find((p) => p.id === value.chosenId) || null;

  const handleLogo = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    try {
      const logo = await prepareLogo(file);
      setLogoError("");
      set({ logo });
    } catch (err) {
      setLogoError(t(err.code === "type" ? "ads.photoErrType" : err.code === "size" ? "ads.photoErrSize" : "ads.photoErrRead"));
    }
  };

  const resetColors = () => {
    const palette = chosen && chosen.palette ? chosen.palette : [EMPTY_DESIGN_FIELDS.color1, EMPTY_DESIGN_FIELDS.color2];
    set({ color1: palette[0], color2: palette[1], customColors: false });
    setShowColors(false);
  };

  const pickButton = {
    padding: "0.55rem 1.1rem",
    borderRadius: "8px",
    border: `1px solid ${T.glassBorderGold}`,
    background: "rgba(212,175,55,0.10)",
    color: T.goldLight,
    fontWeight: 700,
    fontSize: "0.88rem",
    cursor: "pointer",
  };
  const linkButton = {
    background: "none",
    border: "none",
    padding: 0,
    color: T.goldLight,
    fontWeight: 600,
    fontSize: "0.85rem",
    cursor: "pointer",
    textDecoration: "underline",
  };
  const swatch = (color) => ({
    display: "inline-block",
    width: "26px",
    height: "26px",
    borderRadius: "50%",
    background: color,
    border: "2px solid rgba(255,255,255,0.7)",
  });

  return (
    <div
      style={{
        border: `1px solid ${T.glassBorderGold}`,
        borderRadius: "12px",
        padding: "1.1rem 1.25rem 0.4rem",
        marginBottom: "1.1rem",
        background: "rgba(212,175,55,0.05)",
      }}
    >
      <PhotoLibrary user={user} t={t} value={value} set={set} photos={photos} onPhotos={onPhotos} />

      {/* Brand colours: read from the chosen photo; the pickers only appear on request. */}
      {chosen && (
        <div style={{ marginBottom: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
            <span style={swatch(value.color1)} />
            <span style={swatch(value.color2)} />
            <span style={{ color: T.textMuted, fontSize: "0.85rem" }}>
              {value.customColors ? t("ads.colorsCustom") : t("ads.colorsAuto")}
            </span>
            {!showColors && (
              <button type="button" style={linkButton} onClick={() => setShowColors(true)}>
                {t("ads.changeColors")}
              </button>
            )}
            {value.customColors && (
              <button type="button" style={linkButton} onClick={resetColors}>
                {t("ads.colorsReset")}
              </button>
            )}
          </div>
          {showColors && (
            <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", marginTop: "0.8rem" }}>
              {["color1", "color2"].map((key) => (
                <label key={key} className="agency-form-label" style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: 0 }}>
                  <input
                    type="color"
                    value={value[key]}
                    onChange={(e) => {
                      const next = { ...value, [key]: e.target.value };
                      const pair = normalizePalette(next.color1, next.color2);
                      set({ color1: key === "color1" ? pair[0] : next.color1, color2: key === "color2" ? pair[1] : next.color2, customColors: true });
                    }}
                    style={{ width: "44px", height: "36px", padding: 0, border: `1px solid ${T.glassBorder}`, borderRadius: "8px", background: "transparent", cursor: "pointer" }}
                  />
                  {t(key === "color1" ? "ads.color1Label" : "ads.color2Label")}
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      <label className="agency-form-label">{t("ads.logoLabel")}</label>
      <div style={{ display: "flex", alignItems: "center", gap: "0.9rem", flexWrap: "wrap" }}>
        {value.logo && (
          <img
            src={value.logo}
            alt=""
            style={{ height: "48px", maxWidth: "140px", objectFit: "contain", borderRadius: "8px", background: "rgba(255,255,255,0.9)", padding: "4px" }}
          />
        )}
        <button type="button" style={pickButton} onClick={() => logoInput.current && logoInput.current.click()}>
          {t("ads.logoChoose")}
        </button>
        {value.logo && (
          <button type="button" style={{ ...pickButton, borderColor: T.glassBorder, background: "transparent", color: T.textMuted }} onClick={() => set({ logo: "" })}>
            {t("ads.logoRemove")}
          </button>
        )}
        <input ref={logoInput} type="file" accept="image/png,image/jpeg" onChange={handleLogo} style={{ display: "none" }} />
      </div>
      {logoError && <p style={{ color: "#fca5a5", fontSize: "0.85rem", margin: "0.5rem 0 0" }}>{logoError}</p>}
      <p style={hintStyle}>{t("ads.logoTip")}</p>

      <label className="agency-form-label">{t("ads.brandLabel")}</label>
      <input
        type="text"
        value={value.brandName}
        maxLength={40}
        onChange={(e) => set({ brandName: e.target.value })}
        placeholder={t("ads.brandPlaceholder")}
        style={fieldStyle}
      />

      <label className="agency-form-label">{t("ads.styleLabel")}</label>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "0.6rem", marginBottom: "1rem" }}>
        {DESIGN_STYLE_KEYS.map((key) => {
          const allowed = allowedStyles.includes(key);
          const selected = value.style === key;
          return (
            <button
              key={key}
              type="button"
              aria-pressed={selected}
              onClick={() => (allowed ? set({ style: key }) : onLockedStyle && onLockedStyle())}
              style={{
                padding: "0.7rem 0.75rem",
                borderRadius: "10px",
                border: `1px solid ${selected ? "transparent" : T.glassBorder}`,
                background: selected ? T.goldGradient : "rgba(255,255,255,0.06)",
                color: selected ? "#1A1305" : T.text,
                fontWeight: 700,
                fontSize: "0.88rem",
                cursor: "pointer",
                opacity: allowed ? 1 : 0.6,
                textAlign: "center",
              }}
            >
              {t("ads.styles." + key)}
              {!allowed && (
                <span style={{ display: "block", fontSize: "0.68rem", fontWeight: 700, color: T.goldLight, marginTop: "0.2rem" }}>
                  🔒 {t("ads.styleLocked")}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <label className="agency-form-label">{t("ads.noteLabel")}</label>
      <input
        type="text"
        value={value.note}
        maxLength={200}
        onChange={(e) => set({ note: e.target.value })}
        placeholder={t("ads.notePlaceholder")}
        style={fieldStyle}
      />
    </div>
  );
}

// --- the ad as a social post -------------------------------------------------

// One download per scene, shared by every format drawn from it. Loads it as a same-origin blob
// so the canvas can be exported: the fal.ai link first, then the copy saved on this site's
// server (which is what remains once the fal.ai link has expired).
const sceneCache = new Map();

function loadSceneImage(user, sceneUrl, docId, sceneIndex) {
  const key = (docId || "") + "|" + sceneUrl;
  if (sceneCache.has(key)) return sceneCache.get(key);
  const promise = (async () => {
    let blob = null;
    try {
      const res = await fetch(sceneUrl, { mode: "cors" });
      if (res.ok) blob = await res.blob();
    } catch (_) {
      blob = null;
    }
    if (!blob && user && docId) {
      const res = await authedFetch(user, "/api/design/image?docId=" + encodeURIComponent(docId) + "&i=" + sceneIndex);
      if (res.ok) blob = await res.blob();
    }
    if (!blob) throw new Error("scene unavailable");
    const objectUrl = URL.createObjectURL(blob);
    try {
      return await loadImage(objectUrl);
    } finally {
      // The decoded image stays usable after the object URL is released.
      setTimeout(() => URL.revokeObjectURL(objectUrl), 30000);
    }
  })();
  sceneCache.set(key, promise);
  promise.catch(() => sceneCache.delete(key));
  if (sceneCache.size > 12) sceneCache.delete(sceneCache.keys().next().value);
  return promise;
}

// A social-post frame: profile row, the media, then the caption with its hashtags and the
// action buttons. It makes plain that the customer received both a post and a design.
export function PostShell({ brandName, t, width, media, caption, hashtags, actions }) {
  const name = (brandName || "").trim() || t("ads.postBrandFallback");
  const tags = (hashtags || []).join(" ");
  return (
    <div
      style={{
        width: width || "min(100%, 440px)",
        background: "#ffffff",
        color: "#0f1419",
        borderRadius: "16px",
        overflow: "hidden",
        boxShadow: "0 14px 40px rgba(0,0,0,0.35)",
        textAlign: "start",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.7rem 0.9rem" }}>
        <span
          aria-hidden="true"
          style={{
            width: "34px",
            height: "34px",
            borderRadius: "50%",
            background: "#0f1419",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 800,
            fontSize: "0.9rem",
            flexShrink: 0,
          }}
        >
          {name.charAt(0).toUpperCase()}
        </span>
        <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.2, minWidth: 0 }}>
          <span dir="auto" style={{ fontWeight: 700, fontSize: "0.9rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
          <span style={{ fontSize: "0.72rem", color: "#64748b" }}>{t("ads.postSponsored")}</span>
        </span>
      </div>
      {media}
      {(caption || tags) && (
        <div style={{ padding: "0.8rem 0.9rem 0.2rem" }}>
          {caption && (
            <p dir="auto" style={{ margin: 0, fontSize: "0.92rem", lineHeight: 1.5, whiteSpace: "pre-wrap", color: "#0f1419" }}>
              <b>{name}</b> {caption}
            </p>
          )}
          {tags && (
            <p dir="auto" style={{ margin: "0.4rem 0 0", fontSize: "0.88rem", lineHeight: 1.5, color: "#1d4ed8" }}>
              {tags}
            </p>
          )}
        </div>
      )}
      {actions && <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", padding: "0.8rem 0.9rem 0.9rem" }}>{actions}</div>}
    </div>
  );
}

const postButton = (primary) => ({
  flex: "1 1 140px",
  padding: "0.7rem 0.8rem",
  borderRadius: "10px",
  border: primary ? "none" : "1px solid #cbd5e1",
  background: primary ? "#0f1419" : "#ffffff",
  color: primary ? "#ffffff" : "#0f1419",
  fontWeight: 700,
  fontSize: "0.88rem",
  cursor: "pointer",
});

function CopyCaptionButton({ text, t }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      style={postButton(false)}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        } catch (_) {
          // Clipboard access can be refused; the caption stays selectable above.
        }
      }}
    >
      {copied ? t("ads.copied") : t("ads.copyCaption")}
    </button>
  );
}

// --- downloads ----------------------------------------------------------------

function fileBase(brandName) {
  return (brandName || "ad").trim().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "") || "ad";
}

function saveBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

const canvasToPng = (canvas) => new Promise((resolve) => canvas.toBlob(resolve, "image/png"));

let crcTable = null;
function crc32(bytes) {
  if (!crcTable) {
    crcTable = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) crc = crcTable[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

// A plain ZIP archive (files stored as they are: PNGs are already compressed), built in the
// browser. files: [{ name, bytes: Uint8Array }].
export function makeZip(files) {
  const encoder = new TextEncoder();
  const parts = [];
  const central = [];
  let offset = 0;
  files.forEach((file) => {
    const name = encoder.encode(file.name);
    const crc = crc32(file.bytes);
    const size = file.bytes.length;
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(6, 0x0800, true); // file names are UTF-8
    local.setUint16(8, 0, true); // stored
    local.setUint16(10, 0, true);
    local.setUint16(12, 0x21, true); // 1980-01-01
    local.setUint32(14, crc, true);
    local.setUint32(18, size, true);
    local.setUint32(22, size, true);
    local.setUint16(26, name.length, true);
    local.setUint16(28, 0, true);
    parts.push(new Uint8Array(local.buffer), name, file.bytes);

    const entry = new DataView(new ArrayBuffer(46));
    entry.setUint32(0, 0x02014b50, true);
    entry.setUint16(4, 20, true);
    entry.setUint16(6, 20, true);
    entry.setUint16(8, 0x0800, true);
    entry.setUint16(10, 0, true);
    entry.setUint16(12, 0, true);
    entry.setUint16(14, 0x21, true);
    entry.setUint32(16, crc, true);
    entry.setUint32(20, size, true);
    entry.setUint32(24, size, true);
    entry.setUint16(28, name.length, true);
    entry.setUint32(42, offset, true);
    central.push(new Uint8Array(entry.buffer), name);
    offset += 30 + name.length + size;
  });
  const centralSize = central.reduce((sum, part) => sum + part.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, files.length, true);
  end.setUint16(10, files.length, true);
  end.setUint32(12, centralSize, true);
  end.setUint32(16, offset, true);
  return new Blob(parts.concat(central, [new Uint8Array(end.buffer)]), { type: "application/zip" });
}

function AdPost({ user, docId, sceneIndex, scene, design, post, t, onCanvas }) {
  const canvasRef = useRef(null);
  const [assets, setAssets] = useState(null); // { scene, logo } once loaded
  const [state, setState] = useState("loading"); // loading | ready | error
  const { headline, subheadline, badge, highlight, cta, brandName, logo, style, variant, landscape } = design;
  const color1 = design.colors && design.colors[0];
  const color2 = design.colors && design.colors[1];
  // Lists are joined into strings so the effects below only rerun when their content changes.
  const list = (v) => (Array.isArray(v) ? v : []).join("\n");
  const chipsKey = list(design.chips);
  const detailsKey = list(design.chipDetails);
  const iconsKey = list(design.chipIcons);
  const qualitiesKey = list(design.qualities);
  const qualityIconsKey = list(design.qualityIcons);
  const format = scene.format;

  // The scene and the logo are loaded once…
  useEffect(() => {
    let cancelled = false;
    setState("loading");
    setAssets(null);
    Promise.all([loadSceneImage(user, scene.url, docId, sceneIndex), logo ? loadImage(logo).catch(() => null) : Promise.resolve(null)])
      .then(([sceneImg, logoImg]) => {
        if (!cancelled) setAssets({ scene: sceneImg, logo: logoImg });
      })
      .catch(() => {
        if (!cancelled) setState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [user, docId, sceneIndex, scene.url, logo]);

  // …then the design is redrawn in the browser whenever a text changes: instant, and free.
  useEffect(() => {
    if (!assets) return undefined;
    let cancelled = false;
    const split = (key) => (key ? key.split("\n") : []);
    ensureAdFonts([headline, subheadline, badge, highlight, cta, brandName, chipsKey, detailsKey, qualitiesKey].join(" "))
      .catch(() => null)
      .then(() => {
        if (cancelled || !canvasRef.current) return;
        drawAd(canvasRef.current, {
          format,
          style,
          variant,
          landscape,
          scene: assets.scene,
          headline,
          subheadline,
          badge,
          highlight,
          chips: split(chipsKey),
          chipDetails: split(detailsKey),
          chipIcons: split(iconsKey),
          qualities: split(qualitiesKey),
          qualityIcons: split(qualityIconsKey),
          cta,
          brandName,
          colors: [color1, color2],
          logo: assets.logo,
        });
        setState("ready");
      });
    return () => {
      cancelled = true;
    };
  }, [assets, format, style, variant, landscape, headline, subheadline, badge, highlight, chipsKey, detailsKey, iconsKey, qualitiesKey, qualityIconsKey, cta, brandName, color1, color2]);

  // The gallery needs the finished canvases for "Download all formats".
  useEffect(() => {
    if (!onCanvas) return undefined;
    onCanvas(format, state === "ready" ? canvasRef.current : null);
    return () => onCanvas(format, null);
  }, [onCanvas, format, state]);

  const handleDownload = async () => {
    if (!canvasRef.current) return;
    const blob = await canvasToPng(canvasRef.current);
    if (blob) saveBlob(blob, fileBase(brandName) + "-" + format.replace(":", "x") + ".png");
  };

  const size = AD_FORMATS[format] || AD_FORMATS["1:1"];
  const story = format === "9:16";
  const captionText = post ? [post.caption, (post.hashtags || []).join(" ")].filter(Boolean).join("\n\n") : "";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", alignItems: "center", width: story ? "min(100%, 300px)" : "min(100%, 440px)" }}>
      <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "#94a3b8" }}>
        {t(story ? "ads.format916" : format === "4:5" ? "ads.format45" : "ads.format11")} · {size.label}
      </div>
      <PostShell
        brandName={brandName}
        t={t}
        width="100%"
        caption={post ? post.caption : ""}
        hashtags={post ? post.hashtags : []}
        media={
          <div style={{ position: "relative", width: "100%", aspectRatio: size.width + " / " + size.height, background: "#e2e8f0" }}>
            <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: state === "ready" ? "block" : "none" }} />
            {state !== "ready" && (
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", textAlign: "center", color: "#64748b", fontSize: "0.85rem" }}>
                {state === "error" ? t("ads.sceneExpired") : "…"}
              </div>
            )}
          </div>
        }
        actions={
          <>
            {state === "ready" && (
              <button type="button" style={postButton(true)} onClick={handleDownload}>
                ⬇ {t("ads.downloadImage")}
              </button>
            )}
            {captionText && <CopyCaptionButton text={captionText} t={t} />}
          </>
        }
      />
    </div>
  );
}

// The finished ad: one post per format (4:5 poster, 1:1, and 9:16 on premium), all drawn from
// the same scene. The caption sits under the first. Below: "Download all formats" (one ZIP with
// every image and the caption), and the link to the done-for-you video packages.
export function DesignGallery({ user, docId, scenes, design, post, t, light, showVideoLink, footer }) {
  const canvases = useRef({});
  const [readyCount, setReadyCount] = useState(0);
  const [zipping, setZipping] = useState(false);
  // Stable across renders, so the posts do not re-register on every keystroke.
  const onCanvas = useRef((format, canvas) => {
    if (canvas) canvases.current[format] = canvas;
    else delete canvases.current[format];
    setReadyCount(Object.keys(canvases.current).length);
  }).current;

  const list = Array.isArray(scenes) ? scenes : [];
  if (list.length === 0) return null;
  // Keep each scene's original index: the server-side image copy is addressed by it.
  const ordered = list
    .map((scene, index) => ({ scene, index }))
    .sort((a, b) => FORMAT_ORDER.indexOf(a.scene.format) - FORMAT_ORDER.indexOf(b.scene.format));

  const handleDownloadAll = async () => {
    if (zipping) return;
    setZipping(true);
    try {
      const base = fileBase(design.brandName);
      const files = [];
      for (let i = 0; i < FORMAT_ORDER.length; i++) {
        const canvas = canvases.current[FORMAT_ORDER[i]];
        if (!canvas) continue;
        const blob = await canvasToPng(canvas);
        if (blob) files.push({ name: base + "-" + FORMAT_ORDER[i].replace(":", "x") + ".png", bytes: new Uint8Array(await blob.arrayBuffer()) });
      }
      const captionText = post ? [post.caption, (post.hashtags || []).join(" ")].filter(Boolean).join("\n\n") : "";
      if (captionText) files.push({ name: base + "-caption.txt", bytes: new TextEncoder().encode(captionText) });
      if (files.length) saveBlob(makeZip(files), base + "-all-formats.zip");
    } finally {
      setZipping(false);
    }
  };

  const scrollToPricing = (e) => {
    const target = document.getElementById("pricing");
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "1.5rem", justifyContent: "center", alignItems: "flex-start" }}>
        {ordered.map(({ scene, index }, i) => (
          <AdPost key={scene.format + "-" + scene.url} user={user} docId={docId} sceneIndex={index} scene={scene} design={design} post={i === 0 ? post : null} t={t} onCanvas={onCanvas} />
        ))}
      </div>
      {readyCount > 0 && (
        <div style={{ textAlign: "center", marginTop: "1.2rem" }}>
          <button
            type="button"
            onClick={handleDownloadAll}
            disabled={zipping || readyCount < ordered.length}
            style={{
              padding: "0.8rem 1.6rem",
              borderRadius: "10px",
              border: "none",
              background: light ? "#0f1419" : T.goldGradient,
              color: light ? "#ffffff" : "#1A1305",
              fontWeight: 800,
              fontSize: "0.95rem",
              cursor: zipping || readyCount < ordered.length ? "wait" : "pointer",
              opacity: zipping || readyCount < ordered.length ? 0.6 : 1,
            }}
          >
            ⬇ {t("ads.downloadAll")}
          </button>
        </div>
      )}
      <p style={{ textAlign: "center", fontSize: "0.82rem", margin: "0.9rem 0 0", color: light ? "#64748b" : T.textFaint }}>
        {t("ads.downloadHint")}
      </p>
      {footer}
      {showVideoLink && (
        <p style={{ textAlign: "center", margin: "0.5rem 0 0" }}>
          <a href="/#pricing" onClick={scrollToPricing} style={{ color: light ? "#b45309" : T.goldLight, fontSize: "0.88rem", fontWeight: 600 }}>
            {t("ads.videoLink")}
          </a>
        </p>
      )}
    </div>
  );
}
