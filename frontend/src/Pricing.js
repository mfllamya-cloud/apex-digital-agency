import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "./i18n";
import { T, glassCard } from "./theme";
import Reveal from "./Reveal";
import "./App.css";

// ---------------------------------------------------------------------------
// 💳 روابط الدفع — املأي هنا فقط، ولا تعدّلي أي شيء آخر في هذا الملف.
//
// كل باقة لها ثلاث سرعات تسليم (standard / express / priority)، وكل سرعة لها ثمن
// مختلف، إذن كل واحدة تحتاج رابط دفع خاصاً بها عند PayPal وعند مزوّد الكريبتو.
// السعر النهائي لكل مفتاح مكتوب في التعليق بجانبه حتى لا يقع خلط عند إنشاء الروابط.
//
// اتركي "" لأي خيار لم يُنشأ له رابط بعد: الزر يظهر معطّلاً بدل أن يُعيد تحميل
// الصفحة، فلا يضيع أي عميل على رابط فارغ.
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
// الأرقام فقط هنا. كل النصوص (الأسماء، المزايا، تسميات السرعات) تأتي من ملف
// الترجمة i18nAgency.js تحت المفتاح agency.pricing — فلا يوجد نص معروض مكتوب
// مباشرة في هذا الملف، وبالتالي لا يظهر أي نص إنجليزي داخل واجهة عربية أو إسبانية.
// ---------------------------------------------------------------------------
const PACKAGES = [
  {
    id: "starter",
    basePrice: 100,
    featured: false,
    speeds: [
      { id: "standard", extra: 0 },
      { id: "express", extra: 29 },
      { id: "priority", extra: 49 },
    ],
  },
  {
    id: "pro",
    basePrice: 500,
    featured: true,
    speeds: [
      { id: "standard", extra: 0 },
      { id: "express", extra: 79 },
      { id: "priority", extra: 149 },
    ],
  },
];

// زر دفع واحد. الرابط الفارغ ("") يعني "لم يُضبط بعد": نعرض <button> معطّلاً بدل
// <a href=""> الذي كان سيُعيد تحميل الصفحة (ويُسقط بناء CRA على قاعدة
// jsx-a11y/anchor-is-valid لأن CI=true على Vercel يحوّل التحذيرات إلى أخطاء بناء).
function PayButton({ href, label, variant, icon, soonLabel }) {
  const ready = typeof href === "string" && href.trim() !== "";
  const className = variant === "paypal" ? "apex-btn-gold" : "apex-btn-ghost";
  const style = { width: "100%", boxSizing: "border-box" };

  const inner = (
    <>
      <span aria-hidden="true">{icon}</span>
      {label}
    </>
  );

  if (!ready) {
    return (
      <button type="button" disabled className={className} style={style} title={soonLabel}>
        {inner}
      </button>
    );
  }

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className} style={style}>
      {inner}
    </a>
  );
}

function PackageCard({ pkg, index }) {
  const { t } = useLanguage();
  const [speedId, setSpeedId] = useState("standard");

  const speed = pkg.speeds.find((s) => s.id === speedId) || pkg.speeds[0];
  const total = pkg.basePrice + speed.extra;
  const links = (PAYMENT_LINKS[pkg.id] || {})[speed.id] || {};

  const base = "agency.pricing.packages." + pkg.id;
  const features = t(base + ".features");
  const featureList = Array.isArray(features) ? features : [];
  const speedLabel = t("agency.pricing.speeds." + speed.id);

  return (
    <Reveal delay={index * 120} style={{ flex: "1 1 340px", maxWidth: "440px", display: "flex" }}>
      <div
        className="apex-glass-sheen"
        style={{
          ...glassCard({ gold: pkg.featured, strong: pkg.featured }),
          flex: 1,
          display: "flex",
          flexDirection: "column",
          padding: "34px 28px",
          position: "relative",
          boxShadow: pkg.featured
            ? "0 24px 60px rgba(0,0,0,0.6), 0 0 48px rgba(212,175,55,0.10)"
            : T.shadowSoft,
        }}
      >
        {pkg.featured && (
          <span
            style={{
              position: "absolute",
              top: "-13px",
              left: "50%",
              transform: "translateX(-50%)",
              background: T.goldGradient,
              color: "#1A1305",
              padding: "5px 18px",
              borderRadius: "999px",
              fontSize: "11px",
              fontWeight: 800,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
            }}
          >
            {t("agency.pricing.popular")}
          </span>
        )}

        <h3 className="apex-display" style={{ fontSize: "1.6rem", margin: "6px 0 8px" }}>
          {t(base + ".name")}
        </h3>
        <p style={{ margin: "0 0 22px", fontSize: "0.95rem", color: T.textMuted, lineHeight: 1.6 }}>
          {t(base + ".tagline")}
        </p>

        <div style={{ display: "flex", alignItems: "baseline", gap: "10px", marginBottom: "4px" }}>
          <span
            className="apex-gold-text apex-display"
            style={{ fontSize: "3.4rem", fontWeight: 600, lineHeight: 1 }}
          >
            ${total}
          </span>
          <span style={{ fontSize: "0.85rem", color: T.textFaint }}>
            {t("agency.pricing.oneTime")}
          </span>
        </div>
        <p style={{ margin: "0 0 24px", fontSize: "0.8rem", color: T.textFaint, minHeight: "1.2em" }}>
          {speed.extra > 0
            ? t("agency.pricing.basePlus", {
                // المبالغ تُنسَّق هنا بالرمز، لا داخل ملف الترجمة: رمز الدولار متبوعاً بقوس معقوف في سلسلة
                // عادية هناك يُسقط بناء CRA (no-template-curly-in-string).
                base: "$" + pkg.basePrice,
                extra: "$" + speed.extra,
                label: String(speedLabel).toLowerCase(),
              })
            : t("agency.pricing.noRush")}
        </p>

        <ul style={{ listStyle: "none", padding: 0, margin: "0 0 26px" }}>
          {featureList.map((feature) => (
            <li
              key={feature}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "11px",
                padding: "9px 0",
                fontSize: "0.95rem",
                color: T.text,
                lineHeight: 1.55,
                borderBottom: "1px solid rgba(255,255,255,0.05)",
              }}
            >
              <span aria-hidden="true" style={{ color: T.gold, fontWeight: 700, lineHeight: 1.55 }}>
                ✦
              </span>
              {feature}
            </li>
          ))}
        </ul>

        {/* خيارات التسليم السريع — مربوطة فعلياً بالسعر المعروض أعلاه وبرابط الدفع
            المستعمل، حتى لا يدفع العميل ثمن الباقة العادية ثم يطالب بالتسليم السريع. */}
        <fieldset
          style={{
            border: "1px solid " + T.glassBorder,
            borderRadius: T.radiusSm,
            padding: "12px 16px 14px",
            margin: "0 0 24px",
            background: "rgba(0,0,0,0.25)",
          }}
        >
          <legend
            style={{
              padding: "0 8px",
              fontSize: "0.65rem",
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: T.gold,
            }}
          >
            {t("agency.pricing.speedLegend")}
          </legend>

          {pkg.speeds.map((s) => (
            <label
              key={s.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "7px 0",
                fontSize: "0.87rem",
                color: speedId === s.id ? T.text : T.textMuted,
                cursor: "pointer",
              }}
            >
              <input
                type="radio"
                name={"speed-" + pkg.id}
                value={s.id}
                checked={speedId === s.id}
                onChange={() => setSpeedId(s.id)}
                style={{ accentColor: T.gold, width: "15px", height: "15px" }}
              />
              <span style={{ flex: 1 }}>
                {t("agency.pricing.speeds." + s.id)}{" "}
                <span style={{ color: T.textFaint }}>
                  ({t("agency.pricing.details." + pkg.id + "." + s.id)})
                </span>
              </span>
              <span style={{ fontWeight: 700, color: T.gold, whiteSpace: "nowrap" }}>
                {s.extra > 0 ? "+$" + s.extra : t("agency.pricing.included")}
              </span>
            </label>
          ))}
        </fieldset>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "auto" }}>
          <PayButton
            href={links.paypal}
            label={t("agency.pricing.paypal")}
            variant="paypal"
            icon="🅿"
            soonLabel={t("agency.pricing.soon")}
          />
          <PayButton
            href={links.crypto}
            label={t("agency.pricing.crypto")}
            variant="crypto"
            icon="₿"
            soonLabel={t("agency.pricing.soon")}
          />
        </div>

        <p
          style={{
            margin: "16px 0 0",
            fontSize: "0.74rem",
            lineHeight: 1.7,
            color: T.textFaint,
            textAlign: "center",
          }}
        >
          {t("agency.pricing.consent")}{" "}
          <Link to="/refund" style={{ color: T.gold }}>
            {t("agency.pricing.consentLink")}
          </Link>
          .
        </p>
      </div>
    </Reveal>
  );
}

export default function PricingSection() {
  const { t } = useLanguage();

  return (
    <section id="pricing" style={{ maxWidth: "1100px", margin: "4.5rem auto 0", padding: "0 20px" }}>
      <Reveal>
        <div style={{ textAlign: "center", marginBottom: "42px" }}>
          <span className="apex-eyebrow">{t("agency.pricing.eyebrow")}</span>
          <h2 className="apex-display apex-h2" style={{ marginBottom: "0.75rem" }}>
            {t("agency.pricing.title")}
          </h2>
          <p className="apex-lede">{t("agency.pricing.sub")}</p>
        </div>
      </Reveal>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "28px",
          justifyContent: "center",
          alignItems: "stretch",
        }}
      >
        {PACKAGES.map((pkg, index) => (
          <PackageCard key={pkg.id} pkg={pkg} index={index} />
        ))}
      </div>
    </section>
  );
}
