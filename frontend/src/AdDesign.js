// ---------------------------------------------------------------------------
// Ad design UI: the form fields, the calls to the design endpoints, and the finished designs
// (scene from the server + headline, button and logo drawn in the browser by adTemplates.js).
// Used by App.js (new ads) and History.js (saved designs, redrawn from saved data).
//
// No secret key is used here. The browser only talks to this site's own /api endpoints, with the
// user's Firebase ID token; the fal.ai key stays on the server.
// ---------------------------------------------------------------------------
import React, { useEffect, useRef, useState } from "react";
import { T } from "./theme";
import { AD_FORMATS, drawAd, ensureAdFonts } from "./adTemplates";

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
  photo: null, // { dataUrl, thumb, previewUrl }
  logo: "", // PNG data URL
  brandName: "",
  color1: "#1f5c4d",
  color2: "#d4af37",
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

// Validates the product photo (JPG/PNG, 5 MB, 800 px on the short side) and prepares the two
// copies the server needs. Rejects with err.code = "type" | "size" | "dims" | "read".
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
  const thumb = drawScaled(img, THUMB_MAX_SIDE, "#ffffff").toDataURL("image/jpeg", 0.82);
  return { dataUrl, thumb, previewUrl: objectUrl };
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
//   { status: "passed", scenes, quota } or { status: "failed", reason }
// where reason is "quality" | "unavailable" | an error code from the server.
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
      if (data.status === "passed") return { status: "passed", scenes: data.scenes || [], quota: data.quota || null };
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

export function CopyButton({ text, t, light }) {
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
      {copied ? t("ads.copied") : t("ads.copy")}
    </button>
  );
}

// Form fields shown when "Include ad design" is ticked.
export function DesignFields({ t, value, onChange, allowedStyles, onLockedStyle }) {
  const [photoError, setPhotoError] = useState("");
  const [logoError, setLogoError] = useState("");
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
      set({ photo });
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

      <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        {["color1", "color2"].map((key) => (
          <label key={key} className="agency-form-label" style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: 0 }}>
            <input
              type="color"
              value={value[key]}
              onChange={(e) => set({ [key]: e.target.value })}
              style={{ width: "44px", height: "36px", padding: 0, border: `1px solid ${T.glassBorder}`, borderRadius: "8px", background: "transparent", cursor: "pointer" }}
            />
            {t(key === "color1" ? "ads.color1Label" : "ads.color2Label")}
          </label>
        ))}
      </div>

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

// --- finished designs -------------------------------------------------------

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

function AdDesignCanvas({ user, docId, sceneIndex, scene, design, t, light }) {
  const canvasRef = useRef(null);
  const [state, setState] = useState("loading"); // loading | ready | error
  const { headline, cta, brandName, logo, style } = design;
  const color1 = design.colors && design.colors[0];
  const color2 = design.colors && design.colors[1];

  useEffect(() => {
    let cancelled = false;
    setState("loading");
    (async () => {
      try {
        const [sceneImg, logoImg] = await Promise.all([
          loadSceneImage(user, scene.url, docId, sceneIndex),
          logo ? loadImage(logo).catch(() => null) : Promise.resolve(null),
          ensureAdFonts((headline || "") + " " + (cta || "") + " " + (brandName || "")),
        ]);
        if (cancelled || !canvasRef.current) return;
        drawAd(canvasRef.current, {
          format: scene.format,
          style,
          scene: sceneImg,
          headline,
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
  }, [user, docId, sceneIndex, scene.url, scene.format, style, headline, cta, brandName, color1, color2, logo]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const base = (brandName || "ad").trim().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "") || "ad";
      link.href = url;
      link.download = base + "-" + scene.format.replace(":", "x") + "-" + scene.variation + ".png";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    }, "image/png");
  };

  const size = AD_FORMATS[scene.format] || AD_FORMATS["1:1"];
  const muted = light ? "#64748b" : T.textFaint;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", width: scene.format === "9:16" ? "min(100%, 250px)" : "min(100%, 360px)" }}>
      <div style={{ fontSize: "0.78rem", color: muted, fontWeight: 600 }}>
        {t(scene.format === "9:16" ? "ads.format916" : "ads.format11")} · {t("ads.variation", { n: scene.variation })} · {size.label}
      </div>
      <div
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: size.width + " / " + size.height,
          borderRadius: "12px",
          overflow: "hidden",
          background: light ? "#e2e8f0" : "rgba(255,255,255,0.06)",
          boxShadow: light ? "0 6px 20px rgba(15,23,42,0.12)" : T.shadow,
        }}
      >
        <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: state === "ready" ? "block" : "none" }} />
        {state !== "ready" && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", textAlign: "center", color: muted, fontSize: "0.85rem" }}>
            {state === "error" ? t("ads.sceneExpired") : "…"}
          </div>
        )}
      </div>
      {state === "ready" && (
        <button type="button" onClick={handleDownload} className="apex-btn-gold" style={{ width: "100%", boxSizing: "border-box", padding: "0.8rem 1rem", fontSize: "0.92rem" }}>
          ⬇ {t("ads.downloadImage")}
        </button>
      )}
    </div>
  );
}

// All passing variations of one design (premium: both formats), with the download reminder and
// the link to the done-for-you video packages.
export function DesignGallery({ user, docId, scenes, design, t, light, showVideoLink }) {
  const list = Array.isArray(scenes) ? scenes : [];
  if (list.length === 0) return null;
  // Keep each scene's original index: the server-side image copy is addressed by it.
  const ordered = list
    .map((scene, index) => ({ scene, index }))
    .sort((a, b) => (a.scene.format === b.scene.format ? a.scene.variation - b.scene.variation : a.scene.format === "1:1" ? -1 : 1));

  const scrollToPricing = (e) => {
    const target = document.getElementById("pricing");
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "1.25rem", justifyContent: "center", alignItems: "flex-start" }}>
        {ordered.map(({ scene, index }) => (
          <AdDesignCanvas key={scene.format + "-" + scene.variation} user={user} docId={docId} sceneIndex={index} scene={scene} design={design} t={t} light={light} />
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
