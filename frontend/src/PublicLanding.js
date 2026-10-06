import React from "react";

// ---------------------------------------------------------------------------
// Public (logged-out) landing content.
//
// Before this file existed, a visitor who was not signed in saw only the login
// form: no product description, no prices and no links to the legal pages.
// Payment providers review the site without an account, so the description,
// the three packages and the Terms / Privacy / Refund links must be visible
// here, above and below the sign-in form (see the `if (!user)` branch in App.js).
//
// English only on purpose, like the legal pages it links to.
// The numbers below must stay in step with Pricing.js and public/pricing/index.html.
// ---------------------------------------------------------------------------

const C = {
  bg: "#07080c",
  panel: "#0c0e14",
  panelStrong: "#131620",
  border: "rgba(255,255,255,0.10)",
  gold: "#d4b56a",
  goldLight: "#e6cf9a",
  text: "#f7f5f0",
  muted: "#c8cdd8",
  faint: "#aab1bf",
};

const TIERS = [
  {
    name: "Apex Single Hook",
    price: "$49",
    line: "1 raw video ad (1 hook, 15–20 seconds), delivered by download link.",
    featured: false,
  },
  {
    name: "Apex Conversion Funnel",
    price: "$200",
    line: "2 video ads, 2 social ad designs, full ad copy and 1 hosted landing page.",
    featured: true,
  },
  {
    name: "Apex Multi-Product Scaler",
    price: "$500",
    line: "For 2 products: 4 video ads, 4 social ad designs, 2 hosted landing pages and a competitor strategy summary.",
    featured: false,
  },
];

const STEPS = [
  {
    title: "1. Upload your product photos",
    body: "Add one or more photos of your product, its name, the voiceover language and an optional offer.",
  },
  {
    title: "2. The software does the creative work",
    body: "Our automated pipeline writes the hook and script, builds the scenes around your real product and records the voiceover.",
  },
  {
    title: "3. Receive your assets",
    body: "Your files are delivered digitally, by download link or hosted URL. Nothing is shipped.",
  },
];

const LEGAL_LINKS = [
  { href: "/pricing", label: "Pricing" },
  { href: "/terms", label: "Terms of Service" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/refund", label: "Refund Policy" },
];

const linkStyle = { color: C.muted, textDecoration: "none", fontSize: "14px" };

export default function PublicLanding() {
  return (
    <div dir="ltr" style={{ background: C.bg, color: C.text, fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif' }}>
      <header style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div
          style={{
            maxWidth: "1100px",
            margin: "0 auto",
            padding: "22px 20px",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: "12px 28px",
          }}
        >
          <span style={{ color: C.gold, fontWeight: 700, fontSize: "14px", letterSpacing: "0.25em" }}>
            APEX STUDIO PRO
          </span>
          <nav style={{ display: "flex", flexWrap: "wrap", gap: "8px 22px" }}>
            {LEGAL_LINKS.map((l) => (
              <a key={l.href} href={l.href} style={linkStyle}>
                {l.label}
              </a>
            ))}
            <a href="#sign-in" style={{ ...linkStyle, color: C.goldLight, fontWeight: 600 }}>
              Sign in
            </a>
          </nav>
        </div>
      </header>

      <section style={{ maxWidth: "860px", margin: "0 auto", padding: "64px 20px 28px", textAlign: "center" }}>
        <p
          style={{
            margin: 0,
            color: C.gold,
            fontSize: "12px",
            fontWeight: 700,
            letterSpacing: "0.25em",
            textTransform: "uppercase",
          }}
        >
          Professional Video Ads
        </p>
        <h1 style={{ margin: "14px 0 0", fontSize: "clamp(2rem, 5vw, 3rem)", lineHeight: 1.15, fontWeight: 700 }}>
          Product video ads, generated automatically from your photos
        </h1>
        <p style={{ margin: "18px auto 0", maxWidth: "640px", color: C.muted, fontSize: "17px", lineHeight: 1.7 }}>
          Apex Studio Pro is an automated software service for online sellers. Upload your product
          photos, choose a package, and the software produces your ad assets: short video ads, and on
          the larger packages ad designs, ad copy and hosted landing pages.
        </p>
        <div style={{ marginTop: "28px", display: "flex", flexWrap: "wrap", gap: "12px", justifyContent: "center" }}>
          <a
            href="/pricing"
            style={{
              background: C.gold,
              color: "#07080c",
              fontWeight: 700,
              fontSize: "15px",
              textDecoration: "none",
              padding: "12px 22px",
              borderRadius: "10px",
            }}
          >
            See pricing
          </a>
          <a
            href="#sign-in"
            style={{
              border: "1px solid rgba(255,255,255,0.18)",
              color: C.text,
              fontWeight: 600,
              fontSize: "15px",
              textDecoration: "none",
              padding: "12px 22px",
              borderRadius: "10px",
            }}
          >
            Sign in
          </a>
        </div>
      </section>

      <section style={{ maxWidth: "1100px", margin: "0 auto", padding: "28px 20px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "18px" }}>
          {STEPS.map((s) => (
            <div
              key={s.title}
              style={{
                flex: "1 1 260px",
                background: C.panel,
                border: "1px solid " + C.border,
                borderRadius: "16px",
                padding: "22px",
              }}
            >
              <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: C.text }}>{s.title}</h2>
              <p style={{ margin: "10px 0 0", fontSize: "14.5px", lineHeight: 1.7, color: C.muted }}>{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={{ maxWidth: "1100px", margin: "0 auto", padding: "28px 20px 56px" }}>
        <h2 style={{ margin: 0, textAlign: "center", fontSize: "26px", fontWeight: 700 }}>
          One-time packages
        </h2>
        <p style={{ margin: "10px 0 0", textAlign: "center", color: C.faint, fontSize: "14.5px" }}>
          Prices in US dollars. Taxes are calculated at checkout. Payments are processed by Paddle.
        </p>
        <div style={{ marginTop: "26px", display: "flex", flexWrap: "wrap", gap: "18px" }}>
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              style={{
                flex: "1 1 280px",
                background: tier.featured ? C.panelStrong : C.panel,
                border: "1px solid " + (tier.featured ? "rgba(212,181,106,0.6)" : C.border),
                borderRadius: "16px",
                padding: "24px",
              }}
            >
              {tier.featured ? (
                <span
                  style={{
                    display: "inline-block",
                    marginBottom: "10px",
                    background: C.gold,
                    color: "#07080c",
                    fontSize: "11px",
                    fontWeight: 700,
                    padding: "4px 10px",
                    borderRadius: "999px",
                  }}
                >
                  Most popular
                </span>
              ) : null}
              <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: C.text }}>{tier.name}</h3>
              <p style={{ margin: "10px 0 0", fontSize: "34px", fontWeight: 700, color: C.text }}>
                {tier.price}{" "}
                <span style={{ fontSize: "13px", fontWeight: 400, color: C.faint }}>one-time</span>
              </p>
              <p style={{ margin: "10px 0 0", fontSize: "14.5px", lineHeight: 1.7, color: C.muted }}>{tier.line}</p>
            </div>
          ))}
        </div>
        <p style={{ margin: "22px 0 0", textAlign: "center" }}>
          <a href="/pricing" style={{ color: C.goldLight, fontSize: "15px", fontWeight: 600 }}>
            Full package details
          </a>
        </p>
      </section>
    </div>
  );
}

export function PublicFooter() {
  return (
    <footer dir="ltr" style={{ background: C.bg, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
          padding: "26px 20px",
          display: "flex",
          flexWrap: "wrap",
          gap: "10px 26px",
          alignItems: "center",
          justifyContent: "space-between",
          fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
        }}
      >
        <p style={{ margin: 0, color: C.faint, fontSize: "13px", lineHeight: 1.6 }}>
          © 2026 Apex Studio Pro. Operated by Lamyae Marhfoul, Laayoune, Morocco.{" "}
          <a href="mailto:contact@apexstudiopro.com" style={{ color: C.muted }}>
            contact@apexstudiopro.com
          </a>
        </p>
        <nav style={{ display: "flex", flexWrap: "wrap", gap: "8px 22px" }}>
          {LEGAL_LINKS.map((l) => (
            <a key={l.href} href={l.href} style={{ ...linkStyle, fontSize: "13px" }}>
              {l.label}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}
