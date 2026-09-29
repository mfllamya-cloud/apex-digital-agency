import React from "react";
import { useLanguage } from "./i18n";
import { T } from "./theme";
import Reveal from "./Reveal";
import "./App.css";

// ---------------------------------------------------------------------------
// 🎬 أعمالك — املئي هذه القائمة فقط.
//
//   key    : مفتاح الترجمة في i18nAgency.js تحت agency.portfolio.items (العنوان والصيغة).
//   poster : رابط صورة الغلاف (ضعي الملف في frontend/public/ ثم "/mon-image.jpg").
//   video  : رابط ملف mp4 اختياري — إن وُجد يُشغَّل صامتاً عند مرور الفأرة.
//   result : ⚠️ اتركيه فارغاً حتى تحصلي على رقم حقيقي من حساب إعلانات العميل.
//
// ⚠️ بخصوص result تحديداً: لا تكتبي أي نسبة أو رقم أداء لم يحدث فعلاً. رقم مثل
// "+340% ROAS" مخترع على صفحة تبيع بـ $500 هو ادعاء تجاري كاذب: سبب مباشر لخسارة
// أي نزاع دفع (chargeback)، ولإغلاق حساب PayPal، ومخالفة لقواعد الإعلان في الأسواق
// التي تستهدفينها. البطاقة مصمَّمة لتبدو كاملة بدون هذا الحقل.
//
// البطاقة بلا poster ولا video تظهر كخانة فارغة أنيقة مكتوب عليها "Sample slot"
// بلغة الزائر — أنيقة بصرياً، وصادقة: لا توهم بعمل غير موجود.
// ---------------------------------------------------------------------------
const PORTFOLIO_ITEMS = [
  { id: "hookDemo", poster: "", video: "", result: "" },
  { id: "ugc", poster: "", video: "", result: "" },
  { id: "problem", poster: "", video: "", result: "" },
  { id: "offer", poster: "", video: "", result: "" },
];

function PlayGlyph() {
  return (
    <span
      aria-hidden="true"
      style={{
        width: "48px",
        height: "48px",
        borderRadius: "999px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(212, 175, 55, 0.12)",
        border: "1px solid rgba(212, 175, 55, 0.45)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        color: T.goldLight,
        fontSize: "15px",
        paddingLeft: "3px",
      }}
    >
      ▶
    </span>
  );
}

function WorkCard({ item, index }) {
  const { t } = useLanguage();
  const hasMedia = Boolean(item.poster) || Boolean(item.video);
  const title = t("agency.portfolio.items." + item.id + ".title");

  return (
    <Reveal delay={index * 110}>
      <figure className="apex-work-card apex-glass-sheen" style={{ margin: 0 }}>
        <div className="apex-work-media">
          {item.video ? (
            <video
              className="apex-work-video"
              src={item.video}
              poster={item.poster || undefined}
              muted
              loop
              playsInline
              preload="metadata"
              onMouseEnter={(e) => {
                const p = e.currentTarget.play();
                if (p && typeof p.catch === "function") p.catch(() => {});
              }}
              onMouseLeave={(e) => e.currentTarget.pause()}
            />
          ) : item.poster ? (
            <img className="apex-work-video" src={item.poster} alt={title} loading="lazy" />
          ) : (
            <div className="apex-work-empty">
              <PlayGlyph />
              <span
                style={{
                  marginTop: "14px",
                  fontSize: "0.62rem",
                  fontWeight: 700,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: T.textFaint,
                }}
              >
                {t("agency.portfolio.sampleSlot")}
              </span>
            </div>
          )}

          {hasMedia && (
            <div className="apex-work-play">
              <PlayGlyph />
            </div>
          )}

          {item.result ? <span className="apex-work-result">{item.result}</span> : null}

          <figcaption className="apex-work-caption">
            <span
              className="apex-display"
              style={{ fontSize: "1.15rem", color: T.text, display: "block", lineHeight: 1.25 }}
            >
              {title}
            </span>
            <span
              style={{
                marginTop: "7px",
                display: "inline-block",
                fontSize: "0.62rem",
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: T.gold,
              }}
            >
              {t("agency.portfolio.items." + item.id + ".format")}
            </span>
          </figcaption>
        </div>
      </figure>
    </Reveal>
  );
}

export default function Portfolio() {
  const { t } = useLanguage();

  return (
    <section id="work" style={{ maxWidth: "1100px", margin: "4.5rem auto 0", padding: "0 20px" }}>
      <style>{`
        .apex-work-card {
          border-radius: 18px;
          overflow: hidden;
          border: 1px solid var(--apex-glass-border);
          box-shadow: 0 14px 40px rgba(0, 0, 0, 0.45);
          transition: transform 420ms var(--apex-ease), box-shadow 420ms var(--apex-ease),
                      border-color 420ms var(--apex-ease);
        }
        .apex-work-card:hover {
          transform: translateY(-7px);
          border-color: var(--apex-glass-border-gold);
          box-shadow: 0 28px 60px rgba(0, 0, 0, 0.65), 0 0 40px rgba(212, 175, 55, 0.10);
        }
        .apex-work-media {
          position: relative;
          aspect-ratio: 9 / 16;
          background:
            radial-gradient(120% 70% at 50% 0%, rgba(212, 175, 55, 0.14) 0%, transparent 62%),
            linear-gradient(165deg, #131A29 0%, #05070D 100%);
          overflow: hidden;
        }
        .apex-work-video {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          transition: transform 620ms var(--apex-ease);
        }
        .apex-work-card:hover .apex-work-video { transform: scale(1.05); }
        .apex-work-empty {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background-image:
            linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px);
          background-size: 30px 30px;
        }
        .apex-work-play {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          opacity: 0;
          transition: opacity 320ms ease;
          pointer-events: none;
        }
        .apex-work-card:hover .apex-work-play { opacity: 1; }
        .apex-work-result {
          position: absolute;
          top: 12px;
          inset-inline-start: 12px;
          padding: 5px 12px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.04em;
          color: #1A1305;
          background: var(--apex-gold-gradient);
        }
        .apex-work-caption {
          position: absolute;
          inset-inline: 0;
          bottom: 0;
          padding: 46px 18px 18px;
          background: linear-gradient(to top, rgba(3, 6, 12, 0.95) 28%, rgba(3, 6, 12, 0) 100%);
          text-align: start;
        }
        @media (prefers-reduced-motion: reduce) {
          .apex-work-card:hover { transform: none; }
          .apex-work-card:hover .apex-work-video { transform: none; }
        }
      `}</style>

      <Reveal>
        <div style={{ textAlign: "center", marginBottom: "42px" }}>
          <span className="apex-eyebrow">{t("agency.portfolio.eyebrow")}</span>
          <h2 className="apex-display apex-h2" style={{ marginBottom: "0.75rem" }}>
            {t("agency.portfolio.title")}
          </h2>
          <p className="apex-lede">{t("agency.portfolio.sub")}</p>
        </div>
      </Reveal>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          gap: "22px",
        }}
      >
        {PORTFOLIO_ITEMS.map((item, index) => (
          <WorkCard key={item.id} item={item} index={index} />
        ))}
      </div>
    </section>
  );
}
