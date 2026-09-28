import React, { useState } from "react";
import { Link } from "react-router-dom";
import "./App.css";

// نظام الألوان — نفس القيم المعرَّفة في App.js (AGENCY_COLORS) وفي :root داخل App.css،
// مكرَّرة هنا محلياً لأن Pricing.js مكوّن مستقل تماماً ولا يستورد أي شيء من App.js
// (نفس أسلوب History.js و SEOTool.js). يجب إبقاء القيم متطابقة يدوياً عند أي تعديل.
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
// 💳 روابط الدفع — املأي هنا فقط، ولا تعدّلي أي شيء آخر في هذا الملف.
//
// كل باقة لها ثلاث سرعات تسليم (standard / express / priority)، وكل سرعة لها ثمن مختلف،
// إذن كل واحدة كتحتاج رابط دفع خاص بيها عند PayPal وعند مزوّد الكريبتو.
// السعر النهائي لكل مفتاح مكتوب في التعليق بجانبه حتى لا يقع خلط عند إنشاء الروابط.
//
// اتركي "" لأي خيار لم تُنشئ له رابطاً بعد: الزر يظهر معطّلاً (غير قابل للضغط) بدل أن
// يُعيد تحميل الصفحة، فلا يضيع أي عميل على رابط فارغ.
// ---------------------------------------------------------------------------
export const PAYMENT_LINKS = {
  starter: {
    standard: { paypal: "", crypto: "" }, // $100
    express: { paypal: "", crypto: "" }, // $129  ($100 + $29)
    priority: { paypal: "", crypto: "" }, // $149  ($100 + $49)
  },
  pro: {
    standard: { paypal: "", crypto: "" }, // $500
    express: { paypal: "", crypto: "" }, // $579  ($500 + $79)
    priority: { paypal: "", crypto: "" }, // $649  ($500 + $149)
  },
};

// ---------------------------------------------------------------------------
// تعريف الباقتين. كل حقل هنا هو مصدر الحقيقة الوحيد للنص المعروض — لا تتكرر أي قيمة
// في الـ JSX أسفله، حتى لا يختلف السعر المعروض عن السعر المستعمل في الحساب.
// ---------------------------------------------------------------------------
const PACKAGES = [
  {
    id: "starter",
    name: "Apex Starter Campaign",
    tagline: "Test your offer with a single high-converting ad.",
    basePrice: 100,
    featured: false,
    features: [
      "1 Hook-optimized Video Ad (15–30s)",
      "1 Retargeting Ad Creative",
      "Persuasive Copywriting",
      "Premium Studio Voiceover & Music",
      "1 Revision",
      "48-hour delivery",
    ],
    speeds: [
      { id: "standard", label: "Standard delivery", detail: "48 hours", extra: 0 },
      { id: "express", label: "Express delivery", detail: "24 hours", extra: 29 },
      { id: "priority", label: "Priority delivery", detail: "12 hours", extra: 49 },
    ],
  },
  {
    id: "pro",
    name: "Apex Conversion Pro",
    tagline: "A full testing suite built to find your winning creative.",
    basePrice: 500,
    featured: true,
    features: [
      "5 A/B Testing-Ready Video Ads",
      "3 Advanced Ad Creatives",
      "Deep Market Copywriting & VFX",
      "Multi-Format (9:16 & 1:1)",
      "3 Revisions",
      "3–5 days delivery",
    ],
    speeds: [
      { id: "standard", label: "Standard delivery", detail: "3–5 days", extra: 0 },
      { id: "express", label: "Express delivery", detail: "48 hours", extra: 79 },
      {
        id: "priority",
        label: "Priority delivery",
        detail: "24 hours, full team",
        extra: 149,
      },
    ],
  },
];

// زر دفع واحد. الرابط الفارغ ("") يعني "لم يُضبط بعد": في تلك الحالة نعرض <button>
// معطّلاً بدل <a href=""> الذي كان سيُعيد تحميل الصفحة ويبدو للعميل وكأن الموقع معطّل
// (ويُسقط أيضاً بناء CRA على قاعدة jsx-a11y/anchor-is-valid لأن CI=true على Vercel
// يحوّل تحذيرات ESLint إلى أخطاء بناء).
function PayButton({ href, label, variant, icon }) {
  const ready = typeof href === "string" && href.trim() !== "";
  const isPrimary = variant === "paypal";

  const sharedStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    width: "100%",
    boxSizing: "border-box",
    padding: "14px 18px",
    borderRadius: "10px",
    fontWeight: 700,
    fontSize: "15px",
    textDecoration: "none",
    border: isPrimary ? "none" : `1.5px solid ${AGENCY_COLORS.navy}`,
    backgroundColor: isPrimary ? AGENCY_COLORS.gold : "transparent",
    color: isPrimary ? "#FFFFFF" : AGENCY_COLORS.navy,
    cursor: ready ? "pointer" : "not-allowed",
    opacity: ready ? 1 : 0.45,
    transition: "transform 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease",
    fontFamily: "inherit",
  };

  const inner = (
    <>
      <span aria-hidden="true">{icon}</span>
      {label}
    </>
  );

  if (!ready) {
    return (
      <button
        type="button"
        disabled
        className="apex-pay-btn"
        style={sharedStyle}
        title="Payment link coming soon"
      >
        {inner}
      </button>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="apex-pay-btn"
      style={sharedStyle}
    >
      {inner}
    </a>
  );
}

function PackageCard({ pkg }) {
  const [speedId, setSpeedId] = useState("standard");
  const speed = pkg.speeds.find((s) => s.id === speedId) || pkg.speeds[0];
  const total = pkg.basePrice + speed.extra;
  const links = (PAYMENT_LINKS[pkg.id] || {})[speed.id] || {};

  return (
    <div
      style={{
        flex: "1 1 340px",
        maxWidth: "440px",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#FFFFFF",
        borderRadius: "16px",
        padding: "32px 28px",
        border: pkg.featured
          ? `2px solid ${AGENCY_COLORS.metallicGold}`
          : `1px solid ${AGENCY_COLORS.border}`,
        boxShadow: pkg.featured
          ? "0 18px 45px rgba(10, 25, 47, 0.16)"
          : "0 6px 20px rgba(10, 25, 47, 0.07)",
        position: "relative",
      }}
    >
      {pkg.featured && (
        <span
          style={{
            position: "absolute",
            top: "-14px",
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: AGENCY_COLORS.navy,
            color: AGENCY_COLORS.metallicGold,
            padding: "6px 18px",
            borderRadius: "999px",
            fontSize: "12px",
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            whiteSpace: "nowrap",
          }}
        >
          Most Popular
        </span>
      )}

      <h3
        style={{
          margin: "8px 0 6px",
          fontSize: "22px",
          color: AGENCY_COLORS.navy,
          letterSpacing: "-0.01em",
        }}
      >
        {pkg.name}
      </h3>
      <p style={{ margin: "0 0 20px", fontSize: "14px", color: AGENCY_COLORS.textMuted }}>
        {pkg.tagline}
      </p>

      <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginBottom: "4px" }}>
        <span style={{ fontSize: "44px", fontWeight: 800, color: AGENCY_COLORS.navy }}>
          ${total}
        </span>
        <span style={{ fontSize: "14px", color: AGENCY_COLORS.textMuted }}>one-time</span>
      </div>
      <p style={{ margin: "0 0 22px", fontSize: "13px", color: AGENCY_COLORS.textMuted }}>
        {speed.extra > 0
          ? `$${pkg.basePrice} base + $${speed.extra} ${speed.label.toLowerCase()}`
          : "No rush fee — standard turnaround"}
      </p>

      <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px" }}>
        {pkg.features.map((feature) => (
          <li
            key={feature}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "10px",
              padding: "8px 0",
              fontSize: "15px",
              color: AGENCY_COLORS.textStrong,
              lineHeight: 1.5,
            }}
          >
            <span aria-hidden="true" style={{ color: AGENCY_COLORS.gold, fontWeight: 700 }}>
              ✓
            </span>
            {feature}
          </li>
        ))}
      </ul>

      {/* خيارات التسليم السريع (Upsells) — ظاهرة تحت البطاقة مباشرة كما طُلب، ومربوطة
          فعلياً بالسعر المعروض أعلاه وبرابط الدفع المستعمل، حتى لا يدفع العميل ثمن
          الباقة العادية ثم يطالب بالتسليم السريع. */}
      <fieldset
        style={{
          border: `1px solid ${AGENCY_COLORS.border}`,
          borderRadius: "12px",
          padding: "14px 16px 16px",
          margin: "0 0 22px",
          backgroundColor: AGENCY_COLORS.pearl,
        }}
      >
        <legend
          style={{
            padding: "0 8px",
            fontSize: "12px",
            fontWeight: 700,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: AGENCY_COLORS.textMuted,
          }}
        >
          Delivery speed
        </legend>

        {pkg.speeds.map((s) => (
          <label
            key={s.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "7px 0",
              fontSize: "14px",
              color: AGENCY_COLORS.textStrong,
              cursor: "pointer",
            }}
          >
            <input
              type="radio"
              name={`speed-${pkg.id}`}
              value={s.id}
              checked={speedId === s.id}
              onChange={() => setSpeedId(s.id)}
              style={{ accentColor: AGENCY_COLORS.gold, width: "16px", height: "16px" }}
            />
            <span style={{ flex: 1 }}>
              {s.label} <span style={{ color: AGENCY_COLORS.textMuted }}>({s.detail})</span>
            </span>
            <span style={{ fontWeight: 700, color: AGENCY_COLORS.navy, whiteSpace: "nowrap" }}>
              {s.extra > 0 ? `+$${s.extra}` : "Included"}
            </span>
          </label>
        ))}
      </fieldset>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "auto" }}>
        <PayButton href={links.paypal} label="Pay with PayPal" variant="paypal" icon="🅿" />
        <PayButton href={links.crypto} label="Pay with Crypto" variant="crypto" icon="₿" />
      </div>

      <p
        style={{
          margin: "14px 0 0",
          fontSize: "12px",
          lineHeight: 1.6,
          color: AGENCY_COLORS.textMuted,
          textAlign: "center",
        }}
      >
        By paying you confirm that production may begin immediately and that you have read our{" "}
        <Link to="/refund" style={{ color: AGENCY_COLORS.goldDark }}>
          Refund Policy
        </Link>
        .
      </p>
    </div>
  );
}

export default function PricingSection() {
  return (
    <section
      id="pricing"
      style={{
        maxWidth: "1100px",
        margin: "4rem auto 0",
        padding: "0 20px",
      }}
    >
      <style>{`
        .apex-pay-btn[disabled]:hover { transform: none; box-shadow: none; }
        a.apex-pay-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 24px rgba(10, 25, 47, 0.18);
        }
      `}</style>

      {/* عنوان القسم الثاني: خدمة الإنتاج الكاملة. نفس نمط العنوان المستعمل فوق قسم
          المولّد في App.js (شارة + عنوان + سطر شرح) حتى يقرأ الزائر الصفحة كمسارين
          واضحين لا كقائمة أسعار واحدة متضاربة. */}
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
          Full Agency Service
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
          Done-For-You Video Ads
        </h2>
        <p
          style={{
            margin: 0,
            fontSize: "16px",
            color: AGENCY_COLORS.textMuted,
            maxWidth: "620px",
            marginLeft: "auto",
            marginRight: "auto",
            lineHeight: 1.6,
          }}
        >
          We produce the ads for you from scratch — scripting, editing, voiceover and copy
          included. One-time payment, no subscription. Pick your delivery speed at checkout.
        </p>
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "28px",
          justifyContent: "center",
          alignItems: "stretch",
        }}
      >
        {PACKAGES.map((pkg) => (
          <PackageCard key={pkg.id} pkg={pkg} />
        ))}
      </div>
    </section>
  );
}
