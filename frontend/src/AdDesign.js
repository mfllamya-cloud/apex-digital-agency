// ---------------------------------------------------------------------------
// Ad design UI: the form fields, the calls to the design endpoints, and the finished ad shown
// as a social post (the design on top, the caption and hashtags under it).
// Used by App.js (new ads) and History.js (saved designs, redrawn from saved data).
//
// No secret key is used here. The browser only talks to this site's own /api endpoints, with the
// user's Firebase ID token; the fal.ai key stays on the server.
// ---------------------------------------------------------------------------
import React, { useEffect, useRef, useState } from "react";
import { T } from "./theme";
import { AD_FORMATS, drawAd, ensureAdFonts, extractPalette, normalizePalette } from "./adTemplates";

export const DESIGN_STYLE_KEYS = ["clean_studio", "bold_color", "luxury_dark", "lifestyle_scene"];

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const MIN_PHOTO_SHORT_SIDE = 800;
const PHOTO_MAX_SIDE = 2048; // sent to the server; keeps the request under Vercel's body limit
const PHOTO_MAX_DATAURL_CHARS = 3200000;
const THUMB_MAX_SIDE = 768; // reference copy used by the automatic quality check
const LOGO_MAX_SIDE = 480;
const LOGO_MAX_DATAURL_CHARS = 250000;
const POLL_INTERVAL_MS = 3500;
const POLL_MAX_MS = 8 * 60 * 1000;

export const EMPTY_DESIGN_FIELDS = {
  photo: null, // { dataUrl, thumb, previewUrl, palette }
  logo: "", // PNG data URL
  brandName: "",
  // Brand colours are read from the product photo. customColors turns true only when the
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
// copies the server needs and reads the brand colours from it.
// Rejects with err.code = "type" | "size" | "dims" | "read".
export async function prepareProductPhoto(file) {
  if (!file || !["image/jpeg", "image/png"].includes(file.type)) throw fileError("type");
  if (file.size > MAX_PHOTO_BYTES) throw fileError("size");
  const objectUrl = URL.createObjectURL(file);
  let img;
  try {
    img = await loadImage(objectUrl);
  } catch (_) {
    URL.revokeObjectURL(objectUrl);
    throw fileError("read");
  }
  if (Math.min(img.naturalWidth, img.naturalHeight) < MIN_PHOTO_SHORT_SIDE) {
    URL.revokeObjectURL(objectUrl);
    throw fileError("dims");
  }
  let dataUrl = "";
  const attempts = [
    [PHOTO_MAX_SIDE, 0.92],
    [PHOTO_MAX_SIDE, 0.82],
    [1600, 0.82],
  ];
  for (let i = 0; i < attempts.length; i++) {
    dataUrl = drawScaled(img, attempts[i][0], "#ffffff").toDataURL("image/jpeg", attempts[i][1]);
    if (dataUrl.length <= PHOTO_MAX_DATAURL_CHARS) break;
  }
  const thumbCanvas = drawScaled(img, THUMB_MAX_SIDE, "#ffffff");
  return {
    dataUrl,
    thumb: thumbCanvas.toDataURL("image/jpeg", 0.82),
    previewUrl: objectUrl,
    palette: extractPalette(thumbCanvas),
  };
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

// Starts a design job and waits for it. Resolves with
//   { status: "passed", jobId, scenes, variant, landscape, redoAvailable, quota }
//   or { status: "failed", reason } where reason is "quality" | "unavailable" | a server code.
// payload.redoOf (a job id) asks for the free redo of an earlier design.
export async function runDesignJob(user, payload, isCancelled) {
  let jobId;
  try {
    const res = await authedFetch(user, "/api/design/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!data.success) return { status: "failed", reason: data.errorCode || "unavailable" };
    jobId = data.jobId;
  } catch (_) {
    return { status: "failed", reason: "unavailable" };
  }

  const startedAt = Date.now();
  let consecutiveErrors = 0;
  while (Date.now() - startedAt < POLL_MAX_MS) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    if (isCancelled && isCancelled()) return { status: "cancelled" };
    try {
      const res = await authedFetch(user, "/api/design/poll?jobId=" + encodeURIComponent(jobId));
      const data = await res.json();
      if (!data.success) throw new Error("poll failed");
      consecutiveErrors = 0;
      if (data.status === "passed") {
        return {
          status: "passed",
          jobId,
          scenes: data.scenes || [],
          variant: data.variant || 0,
          landscape: Boolean(data.landscape),
          redoAvailable: Boolean(data.redoAvailable),
          quota: data.quota || null,
        };
      }
      if (data.status === "failed") return { status: "failed", reason: data.failure || "unavailable", quota: data.quota || null };
    } catch (_) {
      consecutiveErrors += 1;
      if (consecutiveErrors >= 6) return { status: "failed", reason: "unavailable" };
    }
  }
  return { status: "failed", reason: "unavailable" };
}

// Maps a failure reason to the message shown in the design area.
export function designFailureMessage(reason, t) {
  switch (reason) {
    case "quality":
      return t("ads.designQualityFail");
    case "DESIGN_ATTEMPTS_EXCEEDED":
      return t("ads.designAttemptsExceeded");
    case "DESIGN_QUOTA_EXCEEDED":
      return t("ads.designQuotaExceeded");
    case "DESIGN_IN_PROGRESS":
      return t("ads.designInProgress");
    case "DESIGN_INVALID_PHOTO":
      return t("ads.designInvalidPhoto");
    case "DESIGN_REDO_USED":
      return t("ads.redoUsed");
    case "DESIGN_NOT_IN_PLAN":
    case "DESIGN_STYLE_NOT_IN_PLAN":
      return t("ads.designNotInPlan");
    default:
      return t("ads.designUnavailable");
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

// Form fields shown when "Include ad design" is ticked.
export function DesignFields({ t, value, onChange, allowedStyles, onLockedStyle }) {
  const [photoError, setPhotoError] = useState("");
  const [logoError, setLogoError] = useState("");
  const [showColors, setShowColors] = useState(false);
  const photoInput = useRef(null);
  const logoInput = useRef(null);
  const set = (patch) => onChange({ ...value, ...patch });

  const errorText = (code) =>
    t(code === "type" ? "ads.photoErrType" : code === "size" ? "ads.photoErrSize" : code === "dims" ? "ads.photoErrDims" : "ads.photoErrRead");

  const handlePhoto = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    try {
      const photo = await prepareProductPhoto(file);
      if (value.photo && value.photo.previewUrl) URL.revokeObjectURL(value.photo.previewUrl);
      setPhotoError("");
      // Colours follow the photo unless the customer chose their own.
      set(value.customColors ? { photo } : { photo, color1: photo.palette[0], color2: photo.palette[1] });
    } catch (err) {
      setPhotoError(errorText(err.code));
    }
  };

  const handleLogo = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    try {
      const logo = await prepareLogo(file);
      setLogoError("");
      set({ logo });
    } catch (err) {
      setLogoError(errorText(err.code === "dims" ? "read" : err.code));
    }
  };

  const resetColors = () => {
    const palette = value.photo ? value.photo.palette : [EMPTY_DESIGN_FIELDS.color1, EMPTY_DESIGN_FIELDS.color2];
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
      <label className="agency-form-label">
        {t("ads.photoLabel")} <span style={{ color: "#ef4444" }}>*</span>
      </label>
      <div style={{ display: "flex", alignItems: "center", gap: "0.9rem", flexWrap: "wrap" }}>
        {value.photo && (
          <img
            src={value.photo.previewUrl}
            alt=""
            style={{ width: "72px", height: "72px", objectFit: "cover", borderRadius: "10px", border: `1px solid ${T.glassBorder}` }}
          />
        )}
        <button type="button" style={pickButton} onClick={() => photoInput.current && photoInput.current.click()}>
          {value.photo ? t("ads.photoChange") : t("ads.photoChoose")}
        </button>
        <input ref={photoInput} type="file" accept="image/jpeg,image/png" onChange={handlePhoto} style={{ display: "none" }} />
      </div>
      {photoError && <p style={{ color: "#fca5a5", fontSize: "0.85rem", margin: "0.5rem 0 0" }}>{photoError}</p>}
      <p style={hintStyle}>{t("ads.photoTip")}</p>

      {/* Brand colours: read from the photo; the pickers only appear on request. */}
      {value.photo && (
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

// Loads the scene as a same-origin blob so the canvas can be exported. Tries the fal.ai link
// first; if the browser is not allowed to read it cross-origin, asks this site's server for a copy.
async function loadSceneImage(user, sceneUrl, docId, sceneIndex) {
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

function AdPost({ user, docId, sceneIndex, scene, design, post, t }) {
  const canvasRef = useRef(null);
  const [state, setState] = useState("loading"); // loading | ready | error
  const { headline, subheadline, badge, cta, brandName, logo, style, variant, landscape } = design;
  const color1 = design.colors && design.colors[0];
  const color2 = design.colors && design.colors[1];
  const chipsKey = (Array.isArray(design.chips) ? design.chips : []).join("\n");

  useEffect(() => {
    let cancelled = false;
    setState("loading");
    (async () => {
      try {
        const [sceneImg, logoImg] = await Promise.all([
          loadSceneImage(user, scene.url, docId, sceneIndex),
          logo ? loadImage(logo).catch(() => null) : Promise.resolve(null),
          ensureAdFonts([headline, subheadline, badge, cta, brandName, chipsKey].join(" ")),
        ]);
        if (cancelled || !canvasRef.current) return;
        drawAd(canvasRef.current, {
          format: scene.format,
          style,
          variant,
          landscape,
          scene: sceneImg,
          headline,
          subheadline,
          badge,
          chips: chipsKey ? chipsKey.split("\n") : [],
          cta,
          brandName,
          colors: [color1, color2],
          logo: logoImg,
        });
        setState("ready");
      } catch (_) {
        if (!cancelled) setState("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, docId, sceneIndex, scene.url, scene.format, style, variant, landscape, headline, subheadline, badge, chipsKey, cta, brandName, color1, color2, logo]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const base = (brandName || "ad").trim().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "") || "ad";
      link.href = url;
      link.download = base + "-" + scene.format.replace(":", "x") + ".png";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    }, "image/png");
  };

  const size = AD_FORMATS[scene.format] || AD_FORMATS["1:1"];
  const story = scene.format === "9:16";
  const captionText = post ? [post.caption, (post.hashtags || []).join(" ")].filter(Boolean).join("\n\n") : "";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", alignItems: "center", width: story ? "min(100%, 300px)" : "min(100%, 440px)" }}>
      <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "#94a3b8" }}>
        {t(story ? "ads.format916" : "ads.format11")} · {size.label}
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

// The finished ad: one post per format (premium: 1:1 and 9:16), the caption under the first,
// the download reminder and the link to the done-for-you video packages.
export function DesignGallery({ user, docId, scenes, design, post, t, light, showVideoLink }) {
  const list = Array.isArray(scenes) ? scenes : [];
  if (list.length === 0) return null;
  // Keep each scene's original index: the server-side image copy is addressed by it.
  const ordered = list
    .map((scene, index) => ({ scene, index }))
    .sort((a, b) => (a.scene.format === b.scene.format ? 0 : a.scene.format === "1:1" ? -1 : 1));

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
          <AdPost key={scene.format + "-" + scene.url} user={user} docId={docId} sceneIndex={index} scene={scene} design={design} post={i === 0 ? post : null} t={t} />
        ))}
      </div>
      <p style={{ textAlign: "center", fontSize: "0.82rem", margin: "0.9rem 0 0", color: light ? "#64748b" : T.textFaint }}>
        {t("ads.downloadHint")}
      </p>
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
