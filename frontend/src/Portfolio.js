import React from "react";
import Reveal from "./Reveal";
import "./App.css";

// نظام الألوان — نفس قيم AGENCY_COLORS في App.js و :root في App.css (مكرَّرة محلياً لأن
// هذا الملف مستقل، تماماً كما في History.js و SEOTool.js و Pricing.js و Legal.js).
const AGENCY_COLORS = {
  navy: "#0A192F",
  navyLight: "#172A45",
  pearl: "#F8FAFC",
  gold: "#D97706",
  goldDark: "#B45309",
  metallicGold: "#D4AF37",
  border: "#E2E8F0",
  textMuted: "#64748B",
  textStrong: "#1E293B",
};

// ---------------------------------------------------------------------------
// 🎬 أعمالك — املئي هذه القائمة فقط، والباقي يشتغل وحده.
//
// كل بطاقة:
//   title   : اسم الإعلان كما تريدين عرضه.
//   format  : المنصة والنسبة، تظهر كشارة صغيرة (مثال: "TikTok · 9:16").
//   poster  : رابط صورة الغلاف (ضعي الملف في frontend/public/ ثم "/mon-image.jpg").
//   video   : رابط ملف mp4 اختياري — إن وُجد يُشغَّل صامتاً في حلقة عند مرور الفأرة.
//   result  : ⚠️ اتركيه فارغاً حتى تحصلي على رقم حقيقي من حساب إعلانات العميل.
//
// ⚠️ بخصوص result تحديداً: لا تكتبي أي نسبة أو رقم أداء لم يحدث فعلاً. أرقام مثل
// "+340% ROAS" مخترعة على صفحة تبيع بـ $500 تُعتبر ادعاءً تجارياً كاذباً: هي سبب
// مباشر لخسارة أي نزاع دفع (chargeback)، ولإغلاق حساب PayPal، وهي مخالفة صريحة
// لقواعد الإعلان في الأسواق التي تستهدفينها. البطاقة مصمَّمة لتبدو كاملة وأنيقة
// بدون هذا الحقل، فلا حاجة لملئه قبل أوانه.
//
// البطاقة التي لا تحتوي poster ولا video تظهر كخانة فارغة أنيقة مكتوب عليها
// "Sample slot" — محترمة بصرياً، وصادقة: لا توهم الزائر بعمل غير موجود.
// ---------------------------------------------------------------------------
const PORTFOLIO_ITEMS = [
  {
    id: "hook-demo",
    title: "Hook-first product demo",
    format: "TikTok · 9:16",
    poster: "",
    video: "",
    result: "",
  },
  {
    id: "ugc-testimonial",
    title: "UGC testimonial style",
    format: "Reels · 9:16",
    poster: "",
    video: "",
    result: "",
  },
  {
    id: "problem-solution",
    title: "Problem → solution",
    format: "Meta Feed · 1:1",
    poster: "",
    video: "",
    result: "",
  },
  {
    id: "offer-close",
    title: "Offer & urgency close",
    format: "Shorts · 9:16",
    poster: "",
    video: "",
    result: "",
  },
];

function PlayGlyph() {
  return (
    <span
      aria-hidden="true"
      style={{
        width: "46px",
        height: "46px",
        borderRadius: "999px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(255, 255, 255, 0.16)",
        border: "1px solid rgba(255, 255, 255, 0.45)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        color: "#FFFFFF",
        fontSize: "15px",
        paddingLeft: "3px",
      }}
    >
      ▶
    </span>
  );
}

function WorkCard({ item, index }) {
  const hasMedia = Boolean(item.poster) || Boolean(item.video);

  return (
    <Reveal delay={index * 110}>
      <figure className="apex-work-card" style={{ margin: 0 }}>
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
            <img className="apex-work-video" src={item.poster} alt={item.title} loading="lazy" />
          ) : (
            // خانة فارغة: تدرّج + شبكة خفيفة، بلا أي ادعاء بوجود عمل.
            <div className="apex-work-empty">
              <PlayGlyph />
              <span
                style={{
                  marginTop: "12px",
                  fontSize: "11px",
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "rgba(255, 255, 255, 0.55)",
                }}
              >
                Sample slot
              </span>
            </div>
          )}

          {hasMedia && (
            <div className="apex-work-play">
              <PlayGlyph />
            </div>
          )}

          {item.result ? (
            <span className="apex-work-result">{item.result}</span>
          ) : null}

          <figcaption className="apex-work-caption">
            <span
              style={{
                fontSize: "15px",
                fontWeight: 700,
                color: "#FFFFFF",
                lineHeight: 1.35,
                display: "block",
              }}
            >
              {item.title}
            </span>
            <span
              style={{
                marginTop: "6px",
                display: "inline-block",
                fontSize: "11px",
                fontWeight: 600,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: AGENCY_COLORS.metallicGold,
              }}
            >
              {item.format}
            </span>
          </figcaption>
        </div>
      </figure>
    </Reveal>
  );
}

export default function Portfolio() {
  return (
    <section
      id="work"
      style={{ maxWidth: "1100px", margin: "4.5rem auto 0", padding: "0 20px" }}
    >
      <style>{`
        .apex-work-card {
          border-radius: 18px;
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(10, 25, 47, 0.10);
          transition: transform 420ms cubic-bezier(0.16, 1, 0.3, 1),
                      box-shadow 420ms cubic-bezier(0.16, 1, 0.3, 1);
        }
        .apex-work-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 22px 48px rgba(10, 25, 47, 0.22);
        }
        .apex-work-media {
          position: relative;
          aspect-ratio: 9 / 16;
          background:
            radial-gradient(120% 80% at 50% 0%, #21395c 0%, rgba(33, 57, 92, 0) 60%),
            linear-gradient(160deg, #172A45 0%, #0A192F 100%);
          overflow: hidden;
        }
        .apex-work-video {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          transition: transform 620ms cubic-bezier(0.16, 1, 0.3, 1);
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
            linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px);
          background-size: 28px 28px;
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
          left: 12px;
          padding: 5px 12px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.04em;
          color: #0A192F;
          background: #D4AF37;
        }
        .apex-work-caption {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          padding: 40px 16px 16px;
          background: linear-gradient(to top, rgba(6, 16, 30, 0.92) 30%, rgba(6, 16, 30, 0) 100%);
          text-align: left;
        }
        @media (prefers-reduced-motion: reduce) {
          .apex-work-card,
          .apex-work-video,
          .apex-work-play { transition: none; }
          .apex-work-card:hover { transform: none; }
          .apex-work-card:hover .apex-work-video { transform: none; }
        }
      `}</style>

      <Reveal>
        <div style={{ textAlign: "center", marginBottom: "36px" }}>
          <span
            style={{
              display: "inline-block",
              background: "rgba(212, 175, 55, 0.15)",
              border: "1px solid rgba(212, 175, 55, 0.4)",
              color: AGENCY_COLORS.goldDark,
              fontSize: "0.72rem",
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              padding: "0.35rem 0.95rem",
              borderRadius: "999px",
              marginBottom: "0.85rem",
            }}
          >
            Recent Work
          </span>
          <h2
            style={{
              margin: "0 0 10px",
              fontSize: "1.75rem",
              fontWeight: 800,
              color: AGENCY_COLORS.navy,
              letterSpacing: "-0.02em",
            }}
          >
            The formats we build
          </h2>
          <p
            style={{
              margin: "0 auto",
              maxWidth: "620px",
              fontSize: "1rem",
              lineHeight: 1.6,
              color: AGENCY_COLORS.textMuted,
            }}
          >
            Short-form ads written and edited to stop the scroll in the first two seconds, then
            carry the viewer to the offer.
          </p>
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
