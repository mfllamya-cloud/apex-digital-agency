import React from "react";
import { Link } from "react-router-dom";
import "./App.css";

// نظام الألوان — نفس قيم AGENCY_COLORS في App.js و :root في App.css (مكرَّرة محلياً لأن
// هذا الملف مستقل تماماً، تماماً كما في History.js و SEOTool.js و Pricing.js).
const AGENCY_COLORS = {
  navy: "#0A192F",
  pearl: "#F8FAFC",
  gold: "#D97706",
  goldDark: "#B45309",
  border: "#E2E8F0",
  textMuted: "#64748B",
  textStrong: "#1E293B",
};

// ---------------------------------------------------------------------------
// بيانات الشركة — المكان الوحيد الذي تُعرَّف فيه، وتُستعمل في الصفحات القانونية الثلاث.
//
// ⚠️ address مضبوط حالياً على "Marrakesh, Morocco" فقط (مدينة وبلد). معظم الولايات
// القضائية تطلب عنواناً بريدياً كاملاً في الصفحات القانونية، ومعالجات الدفع تطلبه عند أي
// نزاع (dispute). أكمليه بالشارع والرقم والرمز البريدي قبل أول عملية بيع.
//
// ⚠️ email لن يعمل إلا بعد إنشاء صندوق بريد فعلي على النطاق (contact@apexstudiopro.com).
// عنوان بريد لا يصل هو أسرع طريقة لخسارة أي chargeback.
// ---------------------------------------------------------------------------
const COMPANY = {
  legalName: "Apex Digital Agency",
  tradeName: "Apex Studio Pro",
  site: "apexstudiopro.com",
  address: "Marrakesh, Morocco",
  email: "contact@apexstudiopro.com",
  jurisdiction: "Morocco",
  effectiveDate: "28 September 2026",
};

function LegalLayout({ title, subtitle, children }) {
  return (
    <div style={{ backgroundColor: AGENCY_COLORS.pearl, minHeight: "100vh", padding: "48px 20px" }}>
      <article
        style={{
          maxWidth: "820px",
          margin: "0 auto",
          backgroundColor: "#FFFFFF",
          border: `1px solid ${AGENCY_COLORS.border}`,
          borderRadius: "16px",
          padding: "44px 40px",
          boxShadow: "0 6px 24px rgba(10, 25, 47, 0.06)",
          color: AGENCY_COLORS.textStrong,
          lineHeight: 1.75,
          fontSize: "16px",
        }}
      >
        <Link
          to="/"
          style={{
            display: "inline-block",
            marginBottom: "22px",
            fontSize: "14px",
            fontWeight: 600,
            color: AGENCY_COLORS.goldDark,
            textDecoration: "none",
          }}
        >
          ← Back to {COMPANY.tradeName}
        </Link>

        <h1 style={{ margin: "0 0 6px", fontSize: "32px", color: AGENCY_COLORS.navy }}>{title}</h1>
        <p style={{ margin: "0 0 4px", color: AGENCY_COLORS.textMuted, fontSize: "14px" }}>
          {subtitle}
        </p>
        <p style={{ margin: "0 0 32px", color: AGENCY_COLORS.textMuted, fontSize: "14px" }}>
          Effective date: {COMPANY.effectiveDate}
        </p>

        {children}

        <hr
          style={{ margin: "40px 0 20px", border: "none", borderTop: `1px solid ${AGENCY_COLORS.border}` }}
        />
        <p style={{ fontSize: "14px", color: AGENCY_COLORS.textMuted, margin: 0 }}>
          {COMPANY.legalName} (trading as {COMPANY.tradeName}) · {COMPANY.address} ·{" "}
          {COMPANY.email}
        </p>
      </article>
    </div>
  );
}

function H2({ children }) {
  return (
    <h2
      style={{
        margin: "34px 0 10px",
        fontSize: "20px",
        color: AGENCY_COLORS.navy,
        letterSpacing: "-0.01em",
      }}
    >
      {children}
    </h2>
  );
}

function Callout({ children }) {
  return (
    <div
      style={{
        margin: "22px 0",
        padding: "18px 20px",
        backgroundColor: "#FFFBEB",
        borderLeft: `4px solid ${AGENCY_COLORS.gold}`,
        borderRadius: "0 10px 10px 0",
        fontSize: "15px",
      }}
    >
      {children}
    </div>
  );
}

// ===========================================================================
// TERMS OF SERVICE
// ===========================================================================
export function TermsOfService() {
  return (
    <LegalLayout title="Terms of Service" subtitle={`The agreement between you and ${COMPANY.tradeName}.`}>
      <p>
        These Terms govern your use of {COMPANY.site} and any production services you order from{" "}
        {COMPANY.legalName} (“we”, “us”). By placing an order you accept these Terms in full. If you
        do not accept them, do not place an order.
      </p>

      <H2>1. What we provide</H2>
      <p>
        We produce custom advertising creative — video ads, static ad creatives, copywriting,
        voiceover and related assets — to your brief, in the packages described on our pricing page.
        Each order is produced specifically for you and is not resold or reused for another client.
      </p>

      <H2>2. Orders and payment</H2>
      <p>
        Prices are in US dollars and payable in full before production begins. We accept PayPal and
        cryptocurrency. Cryptocurrency payments are final once confirmed on-chain and cannot be
        reversed by us. Your order is confirmed only once payment has cleared and you have supplied
        the brief and any materials we need.
      </p>

      <H2>3. Turnaround times</H2>
      <p>
        Stated delivery times (48 hours, 24 hours, 3–5 days, and any express or priority option you
        purchase) run from the moment we have received <em>both</em> cleared payment and a complete
        brief, including any assets, logos, product footage or access we have asked for. Delays
        caused by missing materials, slow feedback or incomplete briefs extend the delivery window by
        the same amount of time. Express and priority fees buy a faster production slot; they are not
        refundable if a delay is caused on your side.
      </p>

      <H2>4. Revisions</H2>
      <p>
        Each package includes a set number of revisions (1 for Apex Starter Campaign, 3 for Apex
        Conversion Pro). A revision means an adjustment within the scope of the original brief —
        pacing, captions, music, ordering, colour, minor copy edits. A change of product, offer,
        audience, concept or format is new work and is quoted separately. Revision requests must be
        submitted within 7 days of delivery; after that the order is treated as accepted.
      </p>

      <H2>5. Your materials and your warranties</H2>
      <p>
        You confirm that any footage, images, logos, music, trademarks, testimonials or product
        claims you send us are yours to use, and that the claims you ask us to make about your
        product are accurate and lawful in the markets you advertise in. You are responsible for
        compliance with advertising rules on the platforms you run the ads on. You indemnify us
        against any third-party claim arising from material you supplied or claims you instructed us
        to make.
      </p>

      <H2>6. Ownership of the work</H2>
      <p>
        On full payment, you receive full commercial rights to use the final delivered assets for
        your business, in any market, with no time limit. We retain ownership of project files,
        working files and our underlying methods and templates unless a separate written agreement
        says otherwise. Unless you tell us in writing that you would rather we did not, we may show
        the delivered work in our portfolio and marketing.
      </p>

      <H2>7. Stock, music and licences</H2>
      <p>
        Where we use licensed stock footage, images or music, the licence is granted for use in the
        delivered assets. It does not transfer a standalone licence to you for other projects. If
        your campaign needs an extended or broadcast licence, tell us before production starts so we
        can quote it.
      </p>

      <H2>8. Acceptable use</H2>
      <p>
        We do not produce creative for adult content, gambling where it is unlawful, weapons, illegal
        substances, counterfeit goods, financial or medical claims we consider misleading, or any
        campaign designed to deceive consumers. We may decline or stop an order on these grounds; if
        we stop an order for this reason before production starts, we refund you in full.
      </p>

      <H2>9. Accounts</H2>
      <p>
        Some features require an account. You are responsible for keeping your login secure and for
        activity under your account. We may suspend accounts used for abuse, fraud or attempts to
        disrupt the service.
      </p>

      <H2>10. Limitation of liability</H2>
      <p>
        We deliver creative assets. We do not guarantee any particular advertising result — no
        specific return on ad spend, click-through rate, conversion rate, revenue or approval by any
        ad platform. Advertising performance depends on your offer, pricing, landing page, targeting
        and budget, none of which we control. To the fullest extent permitted by law, our total
        liability for any claim connected to an order is limited to the amount you paid for that
        order, and we are not liable for indirect or consequential loss, including lost profit or lost
        ad spend.
      </p>

      <H2>11. Refunds</H2>
      <p>
        Refunds are governed by our{" "}
        <Link to="/refund" style={{ color: AGENCY_COLORS.goldDark }}>
          Refund Policy
        </Link>
        , which forms part of these Terms.
      </p>

      <H2>12. Changes</H2>
      <p>
        We may update these Terms. The version in force for your order is the version published on
        this page at the time you paid. Material changes take effect for new orders only.
      </p>

      <H2>13. Governing law</H2>
      <p>
        These Terms are governed by the laws of {COMPANY.jurisdiction}, and the courts of{" "}
        {COMPANY.jurisdiction} have jurisdiction, without prejudice to any mandatory consumer
        protection rights you have in your own country of residence.
      </p>

      <H2>14. Contact</H2>
      <p>
        {COMPANY.legalName}, {COMPANY.address}. Email: {COMPANY.email}.
      </p>
    </LegalLayout>
  );
}

// ===========================================================================
// PRIVACY POLICY
// ===========================================================================
export function PrivacyPolicy() {
  return (
    <LegalLayout title="Privacy Policy" subtitle="What we collect, why, and who else sees it.">
      <p>
        This policy explains how {COMPANY.legalName} (“we”) handles personal data on {COMPANY.site}.
        We are the data controller for that data.
      </p>

      <H2>1. What we collect</H2>
      <ul>
        <li>
          <strong>Account data</strong> — your email address, display name and profile photo when you
          sign in, including via Google sign-in. Passwords are never visible to us.
        </li>
        <li>
          <strong>Project content</strong> — the business descriptions, briefs and preferences you
          submit, and the content generated for you.
        </li>
        <li>
          <strong>Order and enquiry data</strong> — the package you chose, your brief, and details you
          submit through our contact or waitlist forms.
        </li>
        <li>
          <strong>Technical data</strong> — IP address, browser type and request logs, generated
          automatically by our hosting provider and kept for security and debugging.
        </li>
      </ul>
      <p>
        We do not collect card numbers, bank details or crypto wallet keys. Payments are handled
        entirely on the payment provider's own systems.
      </p>

      <H2>2. Why we use it</H2>
      <p>
        To create and secure your account, to produce and deliver what you ordered, to answer your
        messages, to keep records required for accounting and tax, and to detect fraud and abuse.
        Our legal bases are performance of a contract with you, our legitimate interest in running and
        securing the service, and legal obligation for records we must keep.
      </p>

      <H2>3. Who we share it with</H2>
      <ul>
        <li>
          <strong>Google Firebase</strong> (Google LLC) — authentication and database hosting for
          accounts, profiles and saved projects.
        </li>
        <li>
          <strong>Anthropic</strong> — the briefs you submit to our generation tool are sent to the
          Claude API to produce content. They are not used to train models.
        </li>
        <li>
          <strong>Vercel</strong> — hosting and request logs.
        </li>
        <li>
          <strong>PayPal</strong> and our cryptocurrency payment provider — they process your payment
          under their own privacy policies and we receive only the confirmation and the details we
          need for our records.
        </li>
      </ul>
      <p>
        We do not sell personal data and we do not share it for advertising. Some of these providers
        are outside your country; transfers rely on the providers' standard contractual clauses or
        equivalent safeguards.
      </p>

      <H2>4. How long we keep it</H2>
      <p>
        Account and project data are kept while your account is open and for 12 months after you close
        it. Records connected to a paid order are kept for as long as tax and accounting law requires.
        Server logs are kept for a short technical retention period set by our hosting provider.
      </p>

      <H2>5. Your rights</H2>
      <p>
        You can ask us for a copy of your data, to correct it, to delete it, to restrict or object to
        how we use it, and to receive it in a portable format. Write to {COMPANY.email} and we will
        respond within 30 days. If you are in the EU, UK or a country with a data protection
        authority, you also have the right to complain to it.
      </p>

      <H2>6. Cookies and local storage</H2>
      <p>
        We use only what the site needs to work: a session token so you stay signed in, and local
        storage for your interface language. We do not use advertising or tracking cookies.
      </p>

      <H2>7. Children</H2>
      <p>
        The service is for business use and is not directed at anyone under 18. We do not knowingly
        collect data from children.
      </p>

      <H2>8. Security</H2>
      <p>
        Traffic is encrypted in transit, access to production data is restricted, and authentication
        is handled by Firebase rather than by us storing passwords. No system is perfectly secure; if
        a breach affects you we will notify you and, where required, the relevant authority.
      </p>

      <H2>9. Changes and contact</H2>
      <p>
        We will post any update on this page with a new effective date. Questions: {COMPANY.email}.
      </p>
    </LegalLayout>
  );
}

// ===========================================================================
// REFUND POLICY
// ===========================================================================
export function RefundPolicy() {
  return (
    <LegalLayout
      title="Refund Policy"
      subtitle="Custom production work — please read before you pay."
    >
      <Callout>
        <strong>In short:</strong> you can cancel for a full refund any time before we start
        producing. Once production has started, the sale is final and non-refundable, because every
        order is made from scratch for you and cannot be resold or reused.
      </Callout>

      <H2>1. Why this policy is strict</H2>
      <p>
        We do not sell a stock product. Each order is bespoke creative work — scripted, filmed or
        assembled, edited, voiced and written specifically for your offer and your brand. Once that
        work has started, the cost is incurred and the output has no value to anyone else. This is
        why all sales are final once production has begun.
      </p>

      <H2>2. Your consent to immediate production</H2>
      <p>
        When you pay, you are asking us to begin producing custom digital content immediately, before
        the end of any statutory cancellation period that would otherwise apply to a consumer
        purchase. By completing payment you expressly request that immediate start and you acknowledge
        that you therefore lose any right of withdrawal or cooling-off period that would otherwise
        apply to custom-made goods and digital content supplied to order.
      </p>
      <p>
        If you are not comfortable with that, do not pay — contact us first and we will hold the slot
        without taking payment.
      </p>

      <H2>3. Cancelling before production starts</H2>
      <p>
        “Production starts” means the moment we begin work on your brief — scripting, sourcing,
        editing or writing — or, at the latest, 24 hours after we have received both your payment and
        a complete brief. Before that point you may cancel by emailing {COMPANY.email} and we will
        refund you in full, minus any non-recoverable payment processing fee charged to us by PayPal
        or the crypto processor. After that point, no refund is due.
      </p>

      <H2>4. Revisions are the remedy, not refunds</H2>
      <p>
        If the delivered work does not match the brief, we fix it. Each package includes revisions (1
        for Apex Starter Campaign, 3 for Apex Conversion Pro) and we will use them to get the work
        right. Dissatisfaction with a creative direction that matches the brief you approved, a change
        of mind about your product or campaign, or a decision not to run the ads are not grounds for a
        refund.
      </p>

      <H2>5. Advertising results are not guaranteed</H2>
      <p>
        We deliver creative assets, not results. No refund is available on the basis of ad
        performance, ad spend, conversion rate, or a platform rejecting or restricting your ad
        account. Those outcomes depend on your offer, pricing, targeting, landing page and budget.
      </p>

      <H2>6. Express and priority fees</H2>
      <p>
        Express and priority fees reserve a faster production slot and are non-refundable once that
        slot is reserved. If we miss a delivery deadline for a reason entirely within our control, we
        refund the express or priority fee — that is the rush fee itself, not the package price.
      </p>

      <H2>7. When we do refund</H2>
      <ul>
        <li>You cancel before production starts (section 3).</li>
        <li>We are unable to deliver the order at all and cannot agree a replacement with you.</li>
        <li>We decline your order under the acceptable-use section of our Terms.</li>
        <li>A duplicate or clearly erroneous charge was taken.</li>
      </ul>
      <p>
        Approved refunds are returned by the original payment method within 10 business days. Where
        payment was made in cryptocurrency, we refund the equivalent amount in the same
        cryptocurrency; we are not responsible for changes in exchange rate between payment and
        refund.
      </p>

      <H2>8. Disputes and chargebacks</H2>
      <p>
        If something is wrong, email {COMPANY.email} first — we answer every message and we would
        rather fix the work than argue about it. Please raise any issue within 7 days of delivery.
      </p>
      <p>
        Filing a payment dispute or chargeback without contacting us first is a breach of these terms.
        Where a dispute is filed for work that was delivered as briefed, we will respond to the
        payment provider with the order record, the approved brief, the delivery timestamps, the
        delivered files and this policy as accepted at checkout, and we reserve the right to suspend
        the account and withdraw the licence to use the delivered assets until the matter is resolved.
      </p>

      <H2>9. Your statutory rights</H2>
      <p>
        Nothing in this policy removes rights you have under mandatory consumer law in your country of
        residence that cannot lawfully be excluded. Where such a right applies, it prevails over this
        policy to the extent of the conflict.
      </p>

      <H2>10. Contact</H2>
      <p>
        {COMPANY.legalName}, {COMPANY.address}. Email: {COMPANY.email}.
      </p>
    </LegalLayout>
  );
}
