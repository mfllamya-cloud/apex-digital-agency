import React, { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { auth } from "./firebase";
import { useLanguage } from "./i18n";
import { T, glassCard } from "./theme";
import "./App.css";

// ---------------------------------------------------------------------------
// PaymentModal — نافذة اختيار وسيلة الدفع، مشتركة بين مساري البيع.
//
// لماذا نافذة أصلاً بدل زرّين على البطاقة: ضغطة واحدة لا يمكن أن تذهب إلى بوابتين
// مختلفتين. النافذة تفصل "أريد هذه الباقة" عن "سأدفع بهذه الطريقة"، وهي أيضاً آخر
// نقطة يرى فيها العميل الاسم والسعر قبل مغادرة الموقع — أي آخر فرصة لاكتشاف خطأ
// قبل أن يصبح نزاع دفع.
//
// مكوّن واحد يخدم الطرفين (باقات المولّد في App.js وباقات الوكالة في Pricing.js)
// حتى لا تتفرّع نسختان من منطق الدفع وتختلفا عند أول تعديل.
//
// معرّف المستخدم (uid) يُقرأ من auth.currentUser مباشرة بدل تمريره كخاصية، لأن
// المكوّن يُستدعى من ملفين لا يملك أحدهما نفس السياق. غير مسجّل الدخول → لا يُضاف
// شيء إلى الرابط.
//
// props:
//   open        عرض/إخفاء
//   onClose     إغلاق
//   planName    اسم الباقة كما يُعرض ("Apex Starter Campaign" / "حملة مخصصة")
//   priceLabel  السعر جاهزاً للعرض ("$150" / "$29/mo")
//   links       { paddle, crypto } — أي رابط فارغ يجعل خياره معطّلاً
//   uidParam    اسم حقل تمرير uid إلى صفحة الدفع ("" = لا تُضِف شيئاً)
// ---------------------------------------------------------------------------
export default function PaymentModal({ open, onClose, planName, priceLabel, links, uidParam }) {
  const { t } = useLanguage();
  const closeRef = useRef(null);

  // Esc للإغلاق + منع تمرير الصفحة خلف النافذة. التنظيف في دالة العودة ضروري:
  // بدونه يبقى overflow: hidden على <body> بعد الإغلاق فتتجمّد الصفحة كلها.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    if (closeRef.current) closeRef.current.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  const safeLinks = links || {};

  const go = (rawUrl) => {
    const url = (rawUrl || "").trim();
    if (!url) return;
    let finalUrl = url;
    const uid = auth.currentUser ? auth.currentUser.uid : "";
    if (uidParam && uid) {
      const separator = finalUrl.includes("?") ? "&" : "?";
      finalUrl = finalUrl + separator + uidParam + "=" + encodeURIComponent(uid);
    }
    window.location.href = finalUrl;
  };

  const renderOption = ({ id, url, label, hint, icon, primary }) => {
    const ready = Boolean((url || "").trim());
    return (
      <button
        key={id}
        type="button"
        disabled={!ready}
        onClick={() => go(url)}
        className={primary ? "apex-btn-gold" : "apex-btn-ghost"}
        title={ready ? undefined : t("agency.checkout.soon")}
        style={{
          width: "100%",
          boxSizing: "border-box",
          display: "flex",
          alignItems: "center",
          gap: "14px",
          textAlign: "start",
          padding: "16px 18px",
        }}
      >
        <span aria-hidden="true" style={{ fontSize: "1.3rem", lineHeight: 1 }}>
          {icon}
        </span>
        <span style={{ display: "flex", flexDirection: "column", gap: "2px", flex: 1 }}>
          <span style={{ fontWeight: 800, fontSize: "0.98rem" }}>{label}</span>
          <span style={{ fontWeight: 500, fontSize: "0.76rem", opacity: 0.82 }}>
            {ready ? hint : t("agency.checkout.soon")}
          </span>
        </span>
        <span aria-hidden="true" style={{ fontSize: "1.1rem", opacity: ready ? 0.7 : 0.3 }}>
          ↗
        </span>
      </button>
    );
  };

  return (
    <div
      role="presentation"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2000,
        background: "rgba(3, 6, 12, 0.78)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("agency.checkout.title")}
        className="apex-glass-sheen"
        // إيقاف انتشار النقرة: بدونه تُغلق النافذة عند النقر داخلها أيضاً.
        onClick={(e) => e.stopPropagation()}
        style={{
          ...glassCard({ gold: true, strong: true }),
          width: "100%",
          maxWidth: "440px",
          padding: "30px 26px 26px",
          position: "relative",
          background: "rgba(14, 17, 26, 0.96)",
        }}
      >
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label={t("agency.checkout.close")}
          style={{
            position: "absolute",
            top: "12px",
            insetInlineEnd: "12px",
            width: "32px",
            height: "32px",
            borderRadius: "999px",
            border: `1px solid ${T.glassBorder}`,
            background: "transparent",
            color: T.textMuted,
            cursor: "pointer",
            fontSize: "1rem",
            lineHeight: 1,
          }}
        >
          ✕
        </button>

        <p
          style={{
            margin: "0 0 4px",
            fontSize: "0.66rem",
            fontWeight: 700,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: T.gold,
          }}
        >
          {t("agency.checkout.eyebrow")}
        </p>

        <h2 className="apex-display" style={{ fontSize: "1.55rem", margin: "0 0 2px" }}>
          {planName}
        </h2>

        <p
          className="apex-gold-text apex-display"
          style={{ margin: "0 0 20px", fontSize: "2.1rem", fontWeight: 600, lineHeight: 1.1 }}
        >
          {priceLabel}
        </p>

        <p style={{ margin: "0 0 18px", fontSize: "0.88rem", lineHeight: 1.65, color: T.textMuted }}>
          {t("agency.checkout.subtitle")}
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {renderOption({
            id: "paddle",
            url: safeLinks.paddle,
            label: t("agency.checkout.card"),
            hint: t("agency.checkout.cardHint"),
            icon: "💳",
            primary: true,
          })}
          {renderOption({
            id: "crypto",
            url: safeLinks.crypto,
            label: t("agency.checkout.crypto"),
            hint: t("agency.checkout.cryptoHint"),
            icon: "₿",
            primary: false,
          })}
        </div>

        <p
          style={{
            margin: "18px 0 0",
            fontSize: "0.72rem",
            lineHeight: 1.7,
            color: T.textFaint,
            textAlign: "center",
          }}
        >
          {t("agency.checkout.consent")}{" "}
          <Link to="/refund" onClick={onClose} style={{ color: T.gold }}>
            {t("agency.checkout.consentLink")}
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
