import React, { useState } from "react";
import { Link } from "react-router-dom";
import Reveal from "./Reveal";
import "./App.css";

// نظام الألوان — نفس قيم AGENCY_COLORS في App.js و :root في App.css.
const AGENCY_COLORS = {
  navy: "#0A192F",
  pearl: "#F8FAFC",
  gold: "#D97706",
  goldDark: "#B45309",
  metallicGold: "#D4AF37",
  border: "#E2E8F0",
  textMuted: "#64748B",
  textStrong: "#1E293B",
};

// ---------------------------------------------------------------------------
// ⚠️ هذه الأجوبة مكتوبة لتطابق حرفياً ما في /terms و /refund (مدة التسليم تبدأ بعد
// وصول الدفع والبريف كاملاً، عدد التعديلات 1 و 3، مهلة 7 أيام للمطالبة بالتعديل،
// الاسترجاع كامل قبل بدء الإنتاج ولا استرجاع بعده، ولا ضمان لأي نتيجة إعلانية).
//
// أي تعديل هنا يجب أن يُنقل إلى الصفحتين القانونيتين في نفس الوقت: تناقض بين إجابة
// في الأسئلة الشائعة وبين سياسة الاسترجاع هو أول ما يستشهد به العميل — وأول ما يقلب
// نتيجة نزاع الدفع (chargeback) ضدّك.
// ---------------------------------------------------------------------------
const FAQ_ITEMS = [
  {
    id: "turnaround",
    q: "How long does it take?",
    a: (
      <>
        Apex Starter Campaign is delivered within 48 hours and Apex Conversion Pro within 3–5
        days. The clock starts when two things have arrived: your payment has cleared and your
        brief is complete, including any product photos, footage or brand assets we need. If you
        need it sooner, the express and priority options on each package shorten that to 24 or 12
        hours on Starter, and 48 or 24 hours on Pro.
      </>
    ),
  },
  {
    id: "revisions",
    q: "Do I get revisions?",
    a: (
      <>
        Yes — one revision with Starter, three with Pro. A revision covers anything inside the
        brief you approved: pacing, captions, music, the order of scenes, colour, small copy
        changes. Changing the product, the offer, the audience or the whole concept is new work
        and gets quoted separately. Send revision requests within 7 days of delivery.
      </>
    ),
  },
  {
    id: "no-script",
    q: "What if I don't have a script?",
    a: (
      <>
        You don't need one. Writing the script is part of every package — that's what the
        copywriting line covers. Tell us what you sell, who it's for, what you want the viewer to
        do, and anything you already know works. We write the hook and the script from that and
        send it with the first cut.
      </>
    ),
  },
  {
    id: "no-footage",
    q: "What if I don't have any footage?",
    a: (
      <>
        We can work from product photos, your website, or licensed stock. For UGC-style ads,
        simple phone footage of the product in use goes a long way, and we'll tell you exactly
        what to shoot. If we use licensed stock, the licence covers the ads we deliver to you —
        it isn't a separate stock licence for your other projects.
      </>
    ),
  },
  {
    id: "formats",
    q: "What do I actually receive?",
    a: (
      <>
        MP4 video files ready to upload, plus the ad copy as text. Pro is delivered in both 9:16
        and 1:1, so the same campaign runs on TikTok, Reels, Shorts and the Meta feed without
        re-cropping. Starter is delivered in 9:16.
      </>
    ),
  },
  {
    id: "rights",
    q: "Who owns the ads?",
    a: (
      <>
        You do, once payment is complete — full commercial rights, any market, no time limit. We
        keep the project files and our own templates and methods. We may show the finished work
        in our portfolio unless you tell us in writing that you'd rather we didn't.
      </>
    ),
  },
  {
    id: "results",
    q: "Do you guarantee results?",
    a: (
      <>
        No, and be careful with anyone who does. We control the creative; your results also
        depend on your offer, price, landing page, targeting and budget. What we do guarantee is
        that the work matches the brief you approved, and we keep revising until it does.
      </>
    ),
  },
  {
    id: "refunds",
    q: "Can I get a refund?",
    a: (
      <>
        Before production starts, yes — full refund, minus the payment processor's fee. Once
        production has started the sale is final, because the work is made from scratch for you
        and can't be resold. If something is wrong with the delivery, the included revisions are
        how we fix it. Full details are in our{" "}
        <Link to="/refund" style={{ color: AGENCY_COLORS.goldDark, fontWeight: 600 }}>
          Refund Policy
        </Link>
        .
      </>
    ),
  },
  {
    id: "payment",
    q: "How do I pay?",
    a: (
      <>
        PayPal or cryptocurrency, in full, before production begins. Prices are in US dollars.
        Crypto payments can't be reversed once confirmed on-chain, so check the package and
        delivery speed before sending.
      </>
    ),
  },
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
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        flexShrink: 0,
        transform: open ? "rotate(180deg)" : "rotate(0deg)",
        transition: "transform 340ms cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function FaqRow({ item, isOpen, onToggle, index }) {
  const panelId = `faq-panel-${item.id}`;
  const buttonId = `faq-button-${item.id}`;

  return (
    <Reveal delay={index * 60}>
      <div
        className="apex-faq-row"
        style={{
          background: "#FFFFFF",
          border: `1px solid ${isOpen ? AGENCY_COLORS.metallicGold : AGENCY_COLORS.border}`,
          borderRadius: "14px",
          marginBottom: "12px",
          overflow: "hidden",
          transition: "border-color 320ms ease, box-shadow 320ms ease",
          boxShadow: isOpen ? "0 10px 28px rgba(10, 25, 47, 0.10)" : "none",
        }}
      >
        <button
          id={buttonId}
          type="button"
          onClick={onToggle}
          aria-expanded={isOpen}
          aria-controls={panelId}
          className="apex-faq-button"
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
            padding: "18px 20px",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            textAlign: "left",
            font: "inherit",
            fontSize: "16px",
            fontWeight: 700,
            color: AGENCY_COLORS.navy,
            lineHeight: 1.4,
          }}
        >
          {item.q}
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
                padding: "0 20px 20px",
                fontSize: "15px",
                lineHeight: 1.75,
                color: AGENCY_COLORS.textStrong,
              }}
            >
              {item.a}
            </p>
          </div>
        </div>
      </div>
    </Reveal>
  );
}

export default function FAQ() {
  // أكورديون بفتح واحد في كل مرة: يبقي الصفحة قصيرة ويمنع الزائر من فقدان مكانه.
  // إعادة الضغط على نفس السؤال تغلقه (openId = null).
  const [openId, setOpenId] = useState(null);

  return (
    <section
      id="faq"
      style={{ maxWidth: "820px", margin: "4.5rem auto 0", padding: "0 20px" }}
    >
      <style>{`
        .apex-faq-panel {
          display: grid;
          transition: grid-template-rows 380ms cubic-bezier(0.16, 1, 0.3, 1);
        }
        .apex-faq-button:hover { background: rgba(212, 175, 55, 0.06); }
        .apex-faq-button:focus-visible {
          outline: 2px solid #D4AF37;
          outline-offset: -2px;
        }
        @media (prefers-reduced-motion: reduce) {
          .apex-faq-panel { transition: none; }
        }
      `}</style>

      <Reveal>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
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
            Before you order
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
            Questions, answered
          </h2>
          <p
            style={{
              margin: "0 auto",
              maxWidth: "560px",
              fontSize: "1rem",
              lineHeight: 1.6,
              color: AGENCY_COLORS.textMuted,
            }}
          >
            If something here isn't clear, email us before you pay — not after.
          </p>
        </div>
      </Reveal>

      {FAQ_ITEMS.map((item, index) => (
        <FaqRow
          key={item.id}
          item={item}
          index={index}
          isOpen={openId === item.id}
          onToggle={() => setOpenId(openId === item.id ? null : item.id)}
        />
      ))}

      <Reveal delay={120}>
        <p
          style={{
            margin: "26px 0 0",
            textAlign: "center",
            fontSize: "15px",
            color: AGENCY_COLORS.textMuted,
          }}
        >
          Still unsure?{" "}
          <a
            href="mailto:contact@apexstudiopro.com"
            style={{ color: AGENCY_COLORS.goldDark, fontWeight: 600 }}
          >
            contact@apexstudiopro.com
          </a>
        </p>
      </Reveal>
    </section>
  );
}
