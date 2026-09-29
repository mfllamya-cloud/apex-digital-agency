import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "./i18n";
import { T } from "./theme";
import Reveal from "./Reveal";
import "./App.css";

// بريد التواصل — نفس العنوان المستعمل في الصفحات القانونية (Legal.js). أي تغيير
// هنا يجب أن يرافقه تغيير هناك، وإلا ظهر للعميل عنوانان مختلفان.
const CONTACT_EMAIL = "contact@apexstudiopro.com";

// ---------------------------------------------------------------------------
// ترتيب الأسئلة. النصوص كلها في i18nAgency.js تحت agency.faq.items.
//
// ⚠️ تلك الأجوبة مكتوبة لتطابق حرفياً ما في /terms و /refund (بدء المدة بعد وصول
// الدفع والبريف، 1 و 3 تعديلات، مهلة 7 أيام، استرجاع كامل قبل بدء الإنتاج ولا
// استرجاع بعده، ولا ضمان لأي نتيجة إعلانية). أي تعديل هنا يجب أن يُنقل إلى
// الصفحتين القانونيتين معاً: تناقض بين الأسئلة الشائعة وسياسة الاسترجاع هو أول
// ما يستشهد به العميل، وأول ما يقلب نتيجة نزاع الدفع ضدّك.
//
// refunds هو السؤال الوحيد الذي ينتهي جوابه برابط سياسة الاسترجاع (linkToRefund).
// ---------------------------------------------------------------------------
const FAQ_ORDER = [
  { id: "turnaround" },
  { id: "revisions" },
  { id: "noScript" },
  { id: "noFootage" },
  { id: "formats" },
  { id: "rights" },
  { id: "results" },
  { id: "refunds", linkToRefund: true },
  { id: "payment" },
];

function Chevron({ open }) {
  return (
    <svg
      aria-hidden="true"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        flexShrink: 0,
        color: T.gold,
        transform: open ? "rotate(180deg)" : "rotate(0deg)",
        transition: "transform 340ms cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function FaqRow({ item, isOpen, onToggle, index }) {
  const { t } = useLanguage();
  const panelId = "faq-panel-" + item.id;
  const buttonId = "faq-button-" + item.id;
  const base = "agency.faq.items." + item.id;

  return (
    <Reveal delay={index * 55}>
      <div
        className={"apex-faq-row" + (isOpen ? " apex-faq-row-open" : "")}
        style={{ marginBottom: "12px" }}
      >
        <button
          id={buttonId}
          type="button"
          onClick={onToggle}
          aria-expanded={isOpen}
          aria-controls={panelId}
          className="apex-faq-button"
        >
          <span>{t(base + ".q")}</span>
          <Chevron open={isOpen} />
        </button>

        <div
          id={panelId}
          role="region"
          aria-labelledby={buttonId}
          className="apex-faq-panel"
          style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
        >
          <div style={{ minHeight: 0, overflow: "hidden" }}>
            <p
              style={{
                margin: 0,
                padding: "0 22px 22px",
                fontSize: "0.95rem",
                lineHeight: 1.8,
                color: T.textMuted,
              }}
            >
              {t(base + ".a")}
              {item.linkToRefund ? (
                <>
                  {" "}
                  <Link to="/refund" style={{ color: T.gold, fontWeight: 600 }}>
                    {t("agency.faq.refundLink")}
                  </Link>
                  .
                </>
              ) : null}
            </p>
          </div>
        </div>
      </div>
    </Reveal>
  );
}

export default function FAQ() {
  const { t } = useLanguage();

  // أكورديون بفتح واحد في كل مرة: يُبقي الصفحة قصيرة ويمنع الزائر من فقدان مكانه.
  // إعادة الضغط على نفس السؤال تغلقه (openId = null).
  const [openId, setOpenId] = useState(null);

  return (
    <section id="faq" style={{ maxWidth: "820px", margin: "4.5rem auto 0", padding: "0 20px" }}>
      <style>{`
        .apex-faq-row {
          background: var(--apex-glass);
          border: 1px solid var(--apex-glass-border);
          border-radius: 14px;
          overflow: hidden;
          backdrop-filter: var(--apex-blur);
          -webkit-backdrop-filter: var(--apex-blur);
          transition: border-color 320ms ease, box-shadow 320ms ease, background 320ms ease;
        }
        .apex-faq-row:hover { border-color: rgba(212, 175, 55, 0.22); }
        .apex-faq-row-open {
          border-color: var(--apex-glass-border-gold);
          background: var(--apex-glass-strong);
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.45);
        }
        .apex-faq-button {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 19px 22px;
          background: transparent;
          border: none;
          cursor: pointer;
          text-align: start;
          font-family: var(--apex-font-sans);
          font-size: 1rem;
          font-weight: 700;
          color: var(--apex-text);
          line-height: 1.45;
        }
        .apex-faq-panel {
          display: grid;
          transition: grid-template-rows 380ms var(--apex-ease);
        }
        @media (prefers-reduced-motion: reduce) {
          .apex-faq-panel { transition: none; }
        }
      `}</style>

      <Reveal>
        <div style={{ textAlign: "center", marginBottom: "38px" }}>
          <span className="apex-eyebrow">{t("agency.faq.eyebrow")}</span>
          <h2 className="apex-display apex-h2" style={{ marginBottom: "0.75rem" }}>
            {t("agency.faq.title")}
          </h2>
          <p className="apex-lede">{t("agency.faq.sub")}</p>
        </div>
      </Reveal>

      {FAQ_ORDER.map((item, index) => (
        <FaqRow
          key={item.id}
          item={item}
          index={index}
          isOpen={openId === item.id}
          onToggle={() => setOpenId(openId === item.id ? null : item.id)}
        />
      ))}

      <Reveal delay={120}>
        <p style={{ margin: "28px 0 0", textAlign: "center", fontSize: "0.95rem", color: T.textFaint }}>
          {t("agency.faq.stillUnsure")}{" "}
          <a href={"mailto:" + CONTACT_EMAIL} style={{ color: T.gold, fontWeight: 600 }}>
            {CONTACT_EMAIL}
          </a>
        </p>
      </Reveal>
    </section>
  );
}
