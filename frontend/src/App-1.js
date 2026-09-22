import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./firebase";
import { ensureUserProfile, getUserProfile } from "./firestoreUser";
import Auth from "./Auth";
import SEOTool from "./SEOTool";
import History from "./History";
import { LanguageProvider, LanguageSwitcher, useLanguage, renderWithBold } from "./i18n";
import "./App.css";

// نظام ألوان "الوكالة الرقمية الفاخرة" (Apex Digital Agency) — يُستخدم في الأنماط المضمّنة
// (inline styles) أدناه جنباً إلى جنب مع الفئات (classes) المعرَّفة في App.css (التي تتكفّل
// بما لا يمكن التعبير عنه عبر style وحده: hover وanimations). قيم مطابقة تماماً لمتغيرات
// CSS المعرَّفة في :root داخل App.css، حتى يبقى اللونان متطابقين دائماً من مصدر واحد فعلياً.
const AGENCY_COLORS = {
  navy: "#0A192F",
  navyLight: "#172A45",
  pearl: "#F8FAFC",
  gold: "#D97706",
  goldDark: "#B45309",
  // metallicGold: ذهب معدني فاتح مخصَّص لحدود شريط "الإفصاح الفاخر" وأيقونة القفل في البطاقات
  // المقفلة (لون مختلف عمداً عن gold/goldDark الأكثر دفئاً، المستخدمين في أزرار الفعل CTA).
  metallicGold: "#D4AF37",
  border: "#E2E8F0",
  textMuted: "#64748B",
};

// حدود الباقات — تُستخدم هنا فقط لضبط واجهة المستخدم (حجم شريط الأيام مثلاً).
// التحقق الحقيقي والملزم يتم في الباكند اعتماداً على الباقة الفعلية المخزّنة في Firestore،
// وليس على أي قيمة يختارها المستخدم في هذه الواجهة.
const PLAN_MAX_DAYS = { free: 1, pro: 30, premium: 90 };
const PLAN_MAX_GENERATIONS = { free: 1, pro: 5, premium: 10 };

// خيارات "لغة المحتوى" الصريحة (ميزة PRO/PREMIUM) — منفصلة تماماً عن لغة الواجهة (i18n).
// القيمة "" تعني: بدون إجبار، والخادم يكتشف لغة وصف المشروع تلقائياً كما كان يفعل دائماً.
// أي قيمة أخرى تُرسل حرفياً للخادم لتُدرَج في تعليمة "CRITICAL: You MUST write..." الموجَّهة لـ Claude.
const CONTENT_LANGUAGE_OPTIONS = [
  { value: "", label: null }, // label يُحسب من t("pro.languageAuto") عند العرض
  { value: "English", label: "English" },
  { value: "French", label: "Français" },
  { value: "Spanish", label: "Español" },
  { value: "Arabic", label: "العربية" },
  { value: "Moroccan Darija (Arabic script)", label: "الدارجة المغربية" },
];

// خيارات "نبرة الكتابة" و"هدف المحتوى" و"المنصة المستهدفة" — ميزة PRO/PREMIUM إضافية.
// القيمة "" تعني: بدون إجبار، اترك Claude يختار بنفسه بناءً على وصف المشروع فقط (كما كان دائماً).
// النصوص المعروضة تأتي من ملف الترجمة (pro.toneOptions / pro.goalOptions / pro.platformOptions)،
// أما القيمة المرسلة فعلياً للخادم فهي بالإنجليزية دائماً لتبقى تعليمات النظام (system prompt) متسقة.
const CONTENT_TONE_OPTIONS = [
  { value: "", key: "" },
  { value: "Professional", key: "professional" },
  { value: "Friendly and casual", key: "friendly" },
  { value: "Humorous and fun", key: "humorous" },
  { value: "Luxury and premium", key: "luxury" },
  { value: "Inspirational", key: "inspirational" },
  { value: "Bold and direct", key: "bold" },
];
const CONTENT_GOAL_OPTIONS = [
  { value: "", key: "" },
  { value: "Increase sales", key: "sales" },
  { value: "Boost engagement", key: "engagement" },
  { value: "Build brand awareness", key: "awareness" },
  { value: "Educate the audience", key: "education" },
  { value: "Promote an offer or event", key: "promotion" },
];
const CONTENT_PLATFORM_OPTIONS = [
  { value: "", key: "" },
  { value: "Instagram", key: "instagram" },
  { value: "Facebook", key: "facebook" },
  { value: "TikTok", key: "tiktok" },
  { value: "LinkedIn", key: "linkedin" },
  { value: "X (Twitter)", key: "twitter" },
];

// يحوّل استجابة خطأ من الباكند (data من /api/generate-content) إلى رسالة مترجمة بلغة الواجهة
// الحالية، بدل عرض نص عربي ثابت دائماً كما كان الحال سابقاً. يعتمد على errorCode الذي أصبح
// الخادم يرسله الآن (مثل "QUOTA_EXCEEDED"، "AUTH_REQUIRED"...) ويترجمه عبر مساحة الأسماء
// apiErrors في i18n.js. إن كان الكود غير معروف أو مفقود (خادم قديم مثلاً)، تعود الدالة إلى
// نص data.error الخام القادم من الخادم، ثم إلى رسالة عامة مترجمة كحل أخير.
function getBackendErrorMessage(data, t) {
  const code = data && data.errorCode;
  if (code) {
    const rawParams = (data && data.errorParams) || {};
    // اسم الباقة (plan) يصل من الخادم كمعرّف خام (free/pro/premium) — نترجمه هنا عبر مساحة
    // أسماء "plans" نفسها المستخدمة في باقي الواجهة، بدل تكرار ترجمة أسماء الباقات في كل رسالة.
    const params = { ...rawParams };
    if (params.plan) {
      params.plan = t("plans." + params.plan) || params.plan;
    }
    const translated = t("apiErrors." + code, params);
    // translate() في i18n.js يعيد المفتاح نفسه حرفياً إن لم يجده في أي لغة — نعتمد هذا كإشارة
    // على أن الكود غير معروف في ملف الترجمة، ونتراجع عندها إلى رسالة الخادم الخام.
    if (translated !== "apiErrors." + code) {
      return translated;
    }
  }
  return (data && data.error) || t("app.alertGenericError");
}

// يحوّل خانة CSV إلى نص آمن: يضيف علامات اقتباس حول أي قيمة تحتوي فاصلة أو سطراً جديداً
// أو علامة اقتباس، ويُضاعف علامات الاقتباس الداخلية حسب معيار CSV القياسي (RFC 4180).
function escapeCsvField(value) {
  const str = String(value == null ? "" : value);
  if (/[",\n]/.test(str)) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

// يحوّل نتائج التوليد (مصفوفة الأيام) إلى ملف .csv وينزّله مباشرة في المتصفح —
// متاح فقط للباقات المدفوعة (PRO/PREMIUM). يتجاهل بطاقات الأيام "المقفلة" لأنها بلا محتوى فعلي.
function downloadCSV(items) {
  const rows = (items || []).filter((item) => !item.locked);
  const headers = ["Day", "Idea", "Caption", "Hashtags", "Best Time", "Image Suggestion", "Creative Direction"];
  const lines = [headers.map(escapeCsvField).join(",")];

  rows.forEach((item) => {
    lines.push(
      [
        item.day,
        item.idea,
        item.caption,
        Array.isArray(item.hashtags) ? item.hashtags.join(" ") : "",
        item.bestTime,
        item.imageIdea || "",
        item.imagePrompt || "",
      ]
        .map(escapeCsvField)
        .join(",")
    );
  });

  // ﻿ (BOM) في البداية يضمن فتح إكسل للملف بترميز UTF-8 صحيح بدل حروف مشوّهة
  // (مهم جداً هنا لأن المحتوى قد يكون بالعربية أو الفرنسية أو أي لغة أخرى).
  const csvContent = "﻿" + lines.join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", "content-calendar.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// أيقونة قفل ذهبية بصيغة SVG (بدل الإيموجي 🔒 السابق) — رسم متجهي بسيط ومحايد (ليس شعاراً أو
// شخصية لأي طرف ثالث)، يُستخدَم في البطاقات المقفلة (Locked Feature Cards) أدناه ليعطي إحساساً
// تنفيذياً أكثر دقة من إيموجي عادي، وقابل لتغيير المقاس/اللون عبر props دون أي ملف صورة خارجي.
function LockIcon({ size = 26, color = AGENCY_COLORS.metallicGold }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
      <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" fill={color} />
      <path
        d="M7.5 10.5V7.75a4.5 4.5 0 1 1 9 0v2.75"
        stroke={color}
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
      <circle cx="12" cy="15.5" r="1.6" fill={AGENCY_COLORS.navy} />
    </svg>
  );
}

// نافذة "VIP Lead Capture" — تظهر بدل التوجيه الفعلي لصفحة دفع Lemon Squeezy عند الضغط على
// أي زر ترقية (راجع handleUpgradeClick في AppContent أدناه). بدل بيع مباشر، نسجّل اهتمام
// العميل في مجموعة Firestore جديدة (vip_leads) — لأغراض تصنيف/تسويق (Segmentation) — ثم نعرض
// له رسالة "قائمة الانتظار" الفاخرة. روابط Lemon Squeezy (REACT_APP_LEMON_PRO_URL/PREMIUM_URL)
// تبقى محفوظة كما هي في frontend/.env دون أي حذف، جاهزة لإعادة تفعيل التوجيه الفعلي لاحقاً.
//
// مكوّن مستقل بحالته الداخلية الخاصة (submitting/submitted/error) بنفس نمط ProjectDetailsModal
// في History.js، حتى لا نُثقل AppContent بحالة إضافية لا تخصّه مباشرة.
function VipModal({ open, planType, user, t, onClose }) {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  // يعيد ضبط حالة النافذة الداخلية في كل مرة تُفتح فيها من جديد، حتى لا تظهر رسالة نجاح أو
  // خطأ متبقّية من طلب ترقية سابق (ربما لباقة مختلفة) قبل أن يضغط المستخدم على أي شيء هذه المرة.
  useEffect(() => {
    if (open) {
      setSubmitting(false);
      setSubmitted(false);
      setError("");
    }
  }, [open]);

  if (!open) return null;

  const handleJoinWaitlist = async () => {
    if (!user) {
      setError(t("vip.loginRequired"));
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      // تسجيل الطلب في Firestore — مجموعة مستقلة (vip_leads) عن generations/users، بقصد
      // الفصل الواضح بين "من طلب توليد محتوى" و"من أبدى اهتماماً بالترقية" لأغراض تسويقية.
      await addDoc(collection(db, "vip_leads"), {
        uid: user.uid,
        email: user.email,
        requestedPlan: planType,
        timestamp: serverTimestamp(),
      });
      setSubmitted(true);
    } catch (e) {
      console.error("[App.js] فشل تسجيل طلب VIP في Firestore:", e.code || "", e.message);
      setError(t("vip.submitError"));
    }
    setSubmitting(false);
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(10, 25, 47, 0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 3000,
        padding: "1rem",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="agency-card"
        style={{
          background: "white",
          borderRadius: "16px",
          padding: "2.25rem 2rem",
          maxWidth: "460px",
          width: "100%",
          textAlign: "center",
        }}
      >
        {!submitted ? (
          <>
            <div
              aria-hidden="true"
              style={{
                width: "52px",
                height: "52px",
                borderRadius: "50%",
                background: AGENCY_COLORS.navy,
                color: AGENCY_COLORS.gold,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.4rem",
                margin: "0 auto 1.25rem",
              }}
            >
              ★
            </div>
            <h2 style={{ margin: "0 0 0.85rem", color: AGENCY_COLORS.navy, fontWeight: "800", letterSpacing: "-0.01em" }}>
              {t("vip.headline")}
            </h2>
            <p style={{ color: AGENCY_COLORS.textMuted, lineHeight: 1.6, marginBottom: "1.5rem" }}>{t("vip.body")}</p>

            {error && <p style={{ color: "#dc2626", fontSize: "0.9rem", marginBottom: "1rem" }}>{error}</p>}

            <button
              onClick={handleJoinWaitlist}
              disabled={submitting}
              className="agency-btn-primary"
              style={{
                width: "100%",
                padding: "0.9rem",
                borderRadius: "8px",
                fontSize: "1rem",
                marginBottom: "0.75rem",
                cursor: submitting ? "not-allowed" : "pointer",
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? t("vip.sending") : t("vip.button")}
            </button>
            <button
              onClick={onClose}
              className="agency-btn-outline"
              style={{ width: "100%", padding: "0.75rem", borderRadius: "8px", fontSize: "0.9rem" }}
            >
              {t("vip.closeBtn")}
            </button>
          </>
        ) : (
          <>
            <div
              aria-hidden="true"
              style={{
                width: "52px",
                height: "52px",
                borderRadius: "50%",
                background: "#22c55e",
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.6rem",
                margin: "0 auto 1.25rem",
              }}
            >
              ✓
            </div>
            <h2 style={{ margin: "0 0 0.85rem", color: AGENCY_COLORS.navy, fontWeight: "800" }}>{t("vip.headline")}</h2>
            <p style={{ color: AGENCY_COLORS.textMuted, lineHeight: 1.6, marginBottom: "1.5rem" }}>{t("vip.success")}</p>
            <button
              onClick={onClose}
              className="agency-btn-primary"
              style={{ width: "100%", padding: "0.9rem", borderRadius: "8px", fontSize: "1rem" }}
            >
              {t("vip.closeBtn")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// المكوّن الجذري: يضبط التوجيه (Routing) بين التطبيق الرئيسي المحمي بتسجيل الدخول،
// وصفحات "الأدوات المصغّرة" العامة (/tools/:category) المخصّصة لجلب زيارات من محركات
// البحث — هذه الصفحات الأخيرة لا تتطلب تسجيل دخول ولا تمر عبر شاشة المصادقة إطلاقاً.
// LanguageProvider يبقى فوق الجميع حتى يعمل زر تبديل اللغة في كل مكان بما فيها شاشة Auth.
//
// ⚠️ يتطلب هذا حزمة react-router-dom (أُضيفت إلى package.json) — نفّذ npm install
// داخل مجلد frontend قبل تشغيل التطبيق وإلا فشل الاستيراد أعلاه.
export default function App() {
  return (
    <BrowserRouter>
      <LanguageProvider>
        <Routes>
          <Route path="/tools/:category" element={<SEOTool />} />
          {/* /history: شاشة "My Projects" — مكوّن مستقل بذاته (History.js) يستمع بنفسه
              لحالة تسجيل الدخول عبر onAuthStateChanged، تماماً كـ AppContent أدناه، لذا لا
              يحتاج أي بيانات مُمرَّرة إليه هنا. */}
          <Route path="/history" element={<History />} />
          <Route path="*" element={<AppContent />} />
        </Routes>
      </LanguageProvider>
    </BrowserRouter>
  );
}

function AppContent() {
  const { t } = useLanguage();

  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [days, setDays] = useState("5");
  const [tier, setTier] = useState("free");
  const [businessDescription, setBusinessDescription] = useState("");
  const [language, setLanguage] = useState(""); // لغة محتوى صريحة (PRO/PREMIUM) — "" = كشف تلقائي من وصف المشروع
  const [tone, setTone] = useState(""); // نبرة الكتابة (PRO/PREMIUM) — "" = يختار Claude تلقائياً
  const [goal, setGoal] = useState(""); // هدف المحتوى (PRO/PREMIUM) — "" = يختار Claude تلقائياً
  const [platform, setPlatform] = useState(""); // المنصة المستهدفة (PRO/PREMIUM) — "" = عام لكل المنصات
  const [sourceText, setSourceText] = useState(""); // نص "إعادة تدوير المحتوى" (PREMIUM فقط)
  const [loading, setLoading] = useState(false);
  // loadingStepIndex: يتقدّم كل 2.5 ثانية أثناء التحميل فقط، لعرض "تجربة الوكالة النفسية
  // متعددة المراحل" (Strategy Directors are analyzing... ثم Senior Copywriters...، إلخ)
  // بدل مؤشر تحميل عام بلا معنى — أربع رسائل ثابتة معرَّفة في i18n.js (app.loadingStep1..4).
  const [loadingStepIndex, setLoadingStepIndex] = useState(0);
  const [results, setResults] = useState([]);
  const [quotaInfo, setQuotaInfo] = useState(null); // {plan, generationsUsed, maxGenerationsPerMonth} من آخر رد ناجح من الباكند
  // quotaExceeded: يصبح true فور استلام errorCode="QUOTA_EXCEEDED" من الخادم (بعد الفحص المسبق
  // الصارم في server.js — الطلب يُرفض هناك قبل أي استدعاء لـ Claude API). يبقى true ليعطّل زر
  // التوليد باستمرار (بدل السماح بإعادة المحاولة والحصول على نفس الرفض في كل مرة)، إلى أن ينجح
  // المستخدم في توليد جديد (مثلاً بعد ترقية باقته وتحديث الصفحة) أو يُعاد تحميل الصفحة.
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [quotaErrorMessage, setQuotaErrorMessage] = useState(""); // رسالة نفاد الرصيد مترجمة بلغة الواجهة الحالية

  // حالة نافذة "VIP Lead Capture" — showVipModal يتحكم في ظهورها، وvipRequestedPlan يحفظ
  // الباقة التي ضغط المستخدم على زر ترقيتها ("pro" أو "premium") لتُسجَّل مع الطلب في Firestore.
  const [showVipModal, setShowVipModal] = useState(false);
  const [vipRequestedPlan, setVipRequestedPlan] = useState("pro");

  // يستمع لحالة تسجيل الدخول، وينشئ/يقرأ وثيقة المستخدم في Firestore
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        try {
          // ينشئ الوثيقة فقط إذا لم تكن موجودة (تسجيل جديد بالبريد أو بجوجل)
          await ensureUserProfile(currentUser);
          const data = await getUserProfile(currentUser.uid);
          setProfile(data);
        } catch (e) {
          console.error("FIRESTORE ERROR:", e.code, e.message);
          setProfile(null);
        }
      } else {
        setProfile(null);
      }

      setAuthChecked(true);
    });
    return unsubscribe;
  }, []);

  // يُشغِّل "تجربة الوكالة النفسية متعددة المراحل": كل 2.5 ثانية، أثناء التحميل فقط، يتقدّم
  // للرسالة التالية من بين 4 رسائل ثابتة (app.loadingStep1..4)، ويعيد الفهرس للصفر بمجرد
  // انتهاء التحميل حتى تبدأ من جديد من أول رسالة في المرة القادمة. التنظيف (clearInterval)
  // ضروري لتفادي تسريب المؤقّت إذا تغيّر loading أو أُزيل المكوّن قبل انتهاء الدورة.
  useEffect(() => {
    if (!loading) {
      setLoadingStepIndex(0);
      return;
    }
    const intervalId = setInterval(() => {
      setLoadingStepIndex((prev) => (prev + 1) % 4);
    }, 2500);
    return () => clearInterval(intervalId);
  }, [loading]);

  const handleLogout = async () => {
    await signOut(auth);
  };

  const handleSelectTier = (nextTier) => {
    setTier(nextTier);
    setResults([]);
  };

  // targetTier اختياري (افتراضياً "pro") — تستخدمها كل أزرار "الترقية" الحقيقية في الصفحة
  // (زر الترقية العام، قفل تجربة الباقة المجانية، صندوق مقارنة القهوة، وصندوقا upsell.free/pro)
  // بإعادة استخدام نفس الدالة بدل تكرار المنطق.
  //
  // ⚠️ "VIP Lead Capture" (قرار عمل جديد): بدل التوجيه الفعلي الفوري لصفحة دفع Lemon Squeezy،
  // هذه الدالة الآن تفتح نافذة VipModal فقط، وتُسجَّل نية الترقية في Firestore (vip_leads) من
  // داخل تلك النافذة عند ضغط المستخدم على "الانضمام لقائمة كبار الشخصيات". منطق بناء رابط الدفع
  // (checkoutUrl + custom_data uid بصيغة Lemon Squeezy الموثَّقة) والويبهوك في backend/server.js
  // (POST /api/webhook/lemonsqueezy) يبقيان كما هما تماماً دون أي حذف — فقط غير مُستخدَمين مؤقتاً
  // من هنا — وroutine إعادة التفعيل موثَّقة أدناه لو احتجنا الرجوع للتوجيه المباشر لاحقاً:
  //
  //   const checkoutUrl =
  //     targetTier === "premium" ? process.env.REACT_APP_LEMON_PREMIUM_URL : process.env.REACT_APP_LEMON_PRO_URL;
  //   const separator = checkoutUrl.includes("?") ? "&" : "?";
  //   const finalUrl = checkoutUrl + separator + "checkout[custom][uid]=" + encodeURIComponent(user.uid);
  //   window.location.href = finalUrl;
  //
  // متغيرات .env (REACT_APP_LEMON_PRO_URL / REACT_APP_LEMON_PREMIUM_URL) تبقى محفوظة كما هي
  // في frontend/.env دون أي حذف أو تغيير. زر معاينة الباقات الثلاث في الأعلى (handleSelectTier
  // مباشرة) يبقى كما هو دون أي تغيير — لا يزال يُستخدَم فقط لمعاينة شكل الواجهة محلياً.
  const handleUpgradeClick = (targetTier) => {
    // احتياطي دفاعي بحت: عملياً هذه الأزرار لا تظهر أصلاً إلا بعد تسجيل الدخول (AppContent
    // تعرض شاشة Auth بدل كل هذا لو !user)، لكن نتحقق هنا أيضاً تحسباً لأي استدعاء غير متوقَّع
    // (مثلاً أثناء لحظة انتقالية قبل اكتمال onAuthStateChanged).
    if (!user) {
      alert(t("app.alertLoginRequiredForUpgrade"));
      return;
    }

    setVipRequestedPlan(targetTier || "pro");
    setShowVipModal(true);
  };

  const isDescriptionValid = businessDescription.trim().length > 0;

  const handleGenerate = async () => {
    if (!isDescriptionValid) {
      alert(t("app.alertDescribeFirst"));
      return;
    }
    // حماية إضافية: الزر أصلاً معطّل (disabled) بمجرد quotaExceeded=true، لكن نتحقق هنا أيضاً
    // تحسباً لأي استدعاء غير مباشر لهذه الدالة، لتفادي طلب شبكة لن يُقبل من الخادم على أي حال.
    if (quotaExceeded) {
      return;
    }

    setLoading(true);
    try {
      // الباكند يتحقق من الهوية والباقة الحقيقية والحد الشهري بنفسه اعتماداً على هذا التوكن —
      // لا يكفي إرسال userTier من هنا، لأنه لا يُعتمد عليه في التحقق (يمكن التلاعب به من المتصفح).
      const idToken = await user.getIdToken();

      const res = await fetch("/api/generate-content", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + idToken,
        },
        body: JSON.stringify({
          days: tier === "free" ? 1 : parseInt(days),
          userTier: tier,
          // لغة المحتوى المولَّد منفصلة تماماً عن لغة الواجهة: نرسل نص المستخدم كما كتبه
          // بأي لغة اختارها، والخادم يطلب من Claude الرد بنفس تلك اللغة (راجع server.js) —
          // إلا إذا اختار المستخدم لغة صريحة أدناه (ميزة PRO/PREMIUM)، فهي تتغلّب على الكشف التلقائي.
          businessDescription: businessDescription.trim(),
          // ميزات PRO/PREMIUM — الخادم هو من يفرض فعلياً من يحق له استخدامها (realPlan من Firestore)،
          // إرسالها هنا دائماً غير ضار حتى للباقة المجانية لأن الخادم يتجاهلها إن كانت isFree.
          language: tier === "free" ? "" : language,
          tone: tier === "free" ? "" : tone,
          goal: tier === "free" ? "" : goal,
          platform: tier === "free" ? "" : platform,
          sourceText: tier === "premium" ? sourceText.trim() : "",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setResults(data.content);
        setQuotaInfo({
          plan: data.plan,
          generationsUsed: data.generationsUsed,
          maxGenerationsPerMonth: data.maxGenerationsPerMonth,
        });
        // نجح التوليد -> أي حالة "رصيد منتهٍ" سابقة لم تعد صالحة (مثلاً بعد ترقية الباقة).
        setQuotaExceeded(false);
        setQuotaErrorMessage("");
      } else if (data.errorCode === "QUOTA_EXCEEDED") {
        // الخادم رفض الطلب فوراً قبل أي استدعاء لـ Claude API (الفحص المسبق الصارم في
        // server.js) — نعطّل زر التوليد بشكل دائم ونعرض رسالة واضحة مترجمة بدل تنبيه (alert)
        // عابر، حتى لا يستمر المستخدم بمحاولات لا طائل منها.
        const message = getBackendErrorMessage(data, t);
        setQuotaErrorMessage(message);
        setQuotaExceeded(true);
        // نحدّث أيضاً عرض الاستهلاك (quotaInfo) اعتماداً على المعطيات المرفقة مع رفض 429،
        // حتى لو لم ينجح أي توليد بعد في هذه الجلسة.
        if (data.errorParams) {
          setQuotaInfo({
            plan: data.errorParams.plan,
            generationsUsed: data.errorParams.max,
            maxGenerationsPerMonth: data.errorParams.max,
          });
        }
      } else {
        // بقية أنواع الأخطاء (تسجيل الدخول، وصف مفقود، خطأ خادم عام...) تبقى كتنبيه فوري كما
        // كانت، مترجمة عبر errorCode أيضاً (راجع getBackendErrorMessage أعلاه).
        alert(getBackendErrorMessage(data, t));
      }
    } catch (e) {
      alert(t("app.alertBackendDown"));
    }
    setLoading(false);
  };

  // شاشة تحميل بسيطة أثناء التحقق من حالة تسجيل الدخول
  if (!authChecked) {
    return (
      <>
        <LanguageSwitcher />
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(135deg, #667eea, #764ba2)",
            color: "white",
            fontFamily: "system-ui",
            fontSize: "1.1rem",
          }}
        >
          {t("app.loading")}
        </div>
      </>
    );
  }

  // لا يوجد مستخدم مسجّل الدخول -> عرض صفحة الدخول / التسجيل
  if (!user) {
    return (
      <>
        <LanguageSwitcher />
        <Auth />
      </>
    );
  }

  return (
    <>
      <LanguageSwitcher />
      <div style={{ minHeight: "100vh", background: AGENCY_COLORS.pearl, padding: "2rem", fontFamily: "system-ui" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          {/* الترويسة الملاحية: شريط "Midnight Navy" غامق يحتضن شارة الثقة (Trust Badge) —
              نقطة خضراء نابضة + "Agency Strategy Team: Online" — وأزرار الحساب. */}
          <div
            className="agency-card"
            style={{
              background: AGENCY_COLORS.navy,
              borderRadius: "14px",
              padding: "1rem 1.5rem",
              marginBottom: "1.5rem",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "0.75rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
              <span className="agency-status-dot" aria-hidden="true"></span>
              <span style={{ color: "white", fontSize: "0.85rem", fontWeight: "600" }}>{t("app.statusOnline")}</span>
              <span style={{ color: "rgba(255,255,255,0.5)" }}>•</span>
              <span style={{ color: "rgba(255,255,255,0.85)", fontSize: "0.85rem" }}>{user.email}</span>
              {profile && (
                <span style={{ padding: "0.25rem 0.75rem", borderRadius: "999px", background: "rgba(255,255,255,0.15)", color: "white", fontSize: "0.8rem", fontWeight: "600" }}>
                  {t("app.planBadge", { plan: t("plans." + profile.plan) || profile.plan })}
                </span>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <Link
                to="/history"
                style={{
                  padding: "0.5rem 1.25rem",
                  borderRadius: "8px",
                  border: "1px solid rgba(255,255,255,0.35)",
                  background: "rgba(255,255,255,0.1)",
                  color: "white",
                  fontWeight: "600",
                  textDecoration: "none",
                }}
              >
                {t("app.myProjects")}
              </Link>
              <button onClick={handleLogout} style={{ padding: "0.5rem 1.25rem", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.35)", background: "rgba(255,255,255,0.1)", color: "white", fontWeight: "600", cursor: "pointer" }}>
                {t("app.logout")}
              </button>
            </div>
          </div>

          <h1 style={{ fontSize: "2.5rem", color: AGENCY_COLORS.navy, textAlign: "center", fontWeight: "800", letterSpacing: "-0.02em" }}>{t("app.title")}</h1>
          <p style={{ color: AGENCY_COLORS.textMuted, textAlign: "center", marginBottom: "2rem", fontSize: "1.05rem" }}>{t("app.subtitle")}</p>
          <div className="agency-card" style={{ borderRadius: "16px", padding: "2rem", marginBottom: "2rem" }}>
            <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem" }}>
              {["free", "pro", "premium"].map((tierId) => (
                <button
                  key={tierId}
                  onClick={() => handleSelectTier(tierId)}
                  style={{ padding: "0.5rem 1.5rem", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "600", background: tier === tierId ? AGENCY_COLORS.navy : "#e5e7eb", color: tier === tierId ? "white" : "#374151" }}
                >
                  {t("tiers." + tierId)}
                </button>
              ))}
            </div>

            {/* "Luxury Structured Tier Cards" — بدل السطر النصي القديم (إيموجي + جملة مفصولة
                بفواصل)، تُعرض ميزات الباقة المدفوعة كبنود مستقلة سهلة المسح (scannable)، كل
                بند بعلامة ذهبية بسيطة (◆) بدل الإيموجي (✨/🚀) السابق. الأرقام داخل كل بند
                (30/5 لـ Pro، 90/10 لـ Premium) نصوص مترجمة جاهزة من planFeatures.*.features
                في i18n.js، مطابقة تماماً لحدود PLAN_MAX_DAYS/PLAN_MAX_GENERATIONS أعلاه
                (المأخوذة أصلاً من PLAN_LIMITS في backend/server.js) — لا حساب أو منطق جديد
                هنا، فقط عرض. الباقة المجانية تبقى سطراً وصفياً واحداً لأنها ميزة واحدة فقط. */}
            {(() => {
              const accentColor =
                tier === "premium" ? AGENCY_COLORS.navy : tier === "pro" ? AGENCY_COLORS.metallicGold : AGENCY_COLORS.border;
              const features = t(`planFeatures.${tier}.features`);
              const featureList = Array.isArray(features) ? features : [];
              return (
                <div
                  className="agency-card"
                  style={{
                    marginTop: "15px",
                    marginBottom: "20px",
                    padding: "1.1rem 1.35rem",
                    borderRadius: "12px",
                    background: "white",
                    borderInlineStart: `4px solid ${accentColor}`,
                    transition: "0.3s",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: tier === "free" ? 0 : "0.85rem" }}>
                    <span aria-hidden="true" style={{ color: AGENCY_COLORS.metallicGold, fontSize: "1.05rem", lineHeight: 1 }}>
                      ◆
                    </span>
                    <b style={{ color: AGENCY_COLORS.navy, fontSize: "0.95rem" }}>{t(`planFeatures.${tier}.label`)}</b>
                  </div>

                  {tier === "free" ? (
                    <p style={{ margin: "0.4rem 0 0 1.55rem", color: "#475569", fontSize: "0.88rem", textAlign: "start" }}>
                      {t("planFeatures.free.description")}
                    </p>
                  ) : (
                    <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "0.5rem" }}>
                      {featureList.map((feature, i) => (
                        <li
                          key={i}
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: "0.5rem",
                            fontSize: "0.88rem",
                            color: "#334155",
                            textAlign: "start",
                          }}
                        >
                          <span aria-hidden="true" style={{ color: AGENCY_COLORS.metallicGold, marginTop: "0.15em", flexShrink: 0 }}>
                            ◆
                          </span>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })()}

            {/* شريط الأيام يظهر فقط للباقات المدفوعة — الباقة المجانية = فكرة واحدة ليوم واحد بدون شريط.
                الحد الأقصى للشريط مبني على الباقة الحقيقية للحساب (من Firestore)، وليس على الزر المختار هنا —
                الباكند هو من يفرض الحد فعلياً على أي حال. */}
            {tier !== "free" && (
              <>
                <label style={{ display: "block", fontWeight: "600", marginBottom: "0.5rem" }}>
                  {t("app.daysLabel", { days })}
                </label>
                <input
                  type="range"
                  min="5"
                  max={Math.max(PLAN_MAX_DAYS[profile?.plan] || 30, 5)}
                  value={days}
                  onChange={(e) => setDays(e.target.value)}
                  style={{ width: "100%", marginBottom: "0.4rem" }}
                />
                <p style={{ color: "#6b7280", fontSize: "0.8rem", marginTop: 0, marginBottom: "1.5rem" }}>
                  {t("app.planLimitNote", {
                    plan: t("plans." + (profile?.plan || "free")),
                    maxDays: PLAN_MAX_DAYS[profile?.plan] || 1,
                    maxGenerations: PLAN_MAX_GENERATIONS[profile?.plan] || 1,
                  })}
                </p>
              </>
            )}

            <label style={{ display: "block", fontWeight: "600", marginBottom: "0.5rem" }}>
              {t("app.describeLabel")} <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <textarea
              value={businessDescription}
              onChange={(e) => setBusinessDescription(e.target.value)}
              placeholder={t("app.describePlaceholder")}
              required
              rows={3}
              style={{
                width: "100%",
                padding: "0.75rem",
                borderRadius: "8px",
                border: isDescriptionValid ? "1px solid #d1d5db" : "1px solid #fca5a5",
                marginBottom: "0.4rem",
                fontFamily: "inherit",
                fontSize: "1rem",
                resize: "vertical",
                boxSizing: "border-box",
              }}
            />
            {!isDescriptionValid ? (
              <p style={{ color: "#ef4444", fontSize: "0.85rem", marginTop: 0, marginBottom: "1rem" }}>
                {t("app.describeRequired")}
              </p>
            ) : (
              <div style={{ marginBottom: "1rem" }} />
            )}

            {/* لغة المحتوى الصريحة — ميزة PRO/PREMIUM، منفصلة تماماً عن لغة الواجهة (i18n).
                القيمة الافتراضية "" تعني: اترك الخادم يكتشف اللغة تلقائياً من وصف المشروع كما كان دائماً. */}
            {tier !== "free" && (
              <>
                <label style={{ display: "block", fontWeight: "600", marginBottom: "0.5rem" }}>
                  {t("pro.languageLabel")}
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.65rem",
                    borderRadius: "8px",
                    border: "1px solid #d1d5db",
                    marginBottom: "1rem",
                    fontFamily: "inherit",
                    fontSize: "0.95rem",
                    boxSizing: "border-box",
                    background: "white",
                  }}
                >
                  {CONTENT_LANGUAGE_OPTIONS.map((opt) => (
                    <option key={opt.value || "auto"} value={opt.value}>
                      {opt.value === "" ? t("pro.languageAuto") : opt.label}
                    </option>
                  ))}
                </select>
              </>
            )}

            {/* نبرة الكتابة، هدف المحتوى، والمنصة المستهدفة — ميزات PRO/PREMIUM إضافية، منفصلة
                عن لغة المحتوى أعلاه. القيمة الافتراضية "" في كل واحدة تعني: اترك Claude يختار
                تلقائياً بناءً على وصف المشروع فقط، تماماً كما كان يحدث دائماً قبل إضافة هذه الميزة. */}
            {tier !== "free" && (
              <>
                <label style={{ display: "block", fontWeight: "600", marginBottom: "0.5rem" }}>
                  {t("pro.toneLabel")}
                </label>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.65rem",
                    borderRadius: "8px",
                    border: "1px solid #d1d5db",
                    marginBottom: "1rem",
                    fontFamily: "inherit",
                    fontSize: "0.95rem",
                    boxSizing: "border-box",
                    background: "white",
                  }}
                >
                  {CONTENT_TONE_OPTIONS.map((opt) => (
                    <option key={opt.key || "auto"} value={opt.value}>
                      {opt.key === "" ? t("pro.toneAuto") : t("pro.toneOptions." + opt.key)}
                    </option>
                  ))}
                </select>

                <label style={{ display: "block", fontWeight: "600", marginBottom: "0.5rem" }}>
                  {t("pro.goalLabel")}
                </label>
                <select
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.65rem",
                    borderRadius: "8px",
                    border: "1px solid #d1d5db",
                    marginBottom: "1rem",
                    fontFamily: "inherit",
                    fontSize: "0.95rem",
                    boxSizing: "border-box",
                    background: "white",
                  }}
                >
                  {CONTENT_GOAL_OPTIONS.map((opt) => (
                    <option key={opt.key || "auto"} value={opt.value}>
                      {opt.key === "" ? t("pro.goalAuto") : t("pro.goalOptions." + opt.key)}
                    </option>
                  ))}
                </select>

                <label style={{ display: "block", fontWeight: "600", marginBottom: "0.5rem" }}>
                  {t("pro.platformLabel")}
                </label>
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.65rem",
                    borderRadius: "8px",
                    border: "1px solid #d1d5db",
                    marginBottom: "1rem",
                    fontFamily: "inherit",
                    fontSize: "0.95rem",
                    boxSizing: "border-box",
                    background: "white",
                  }}
                >
                  {CONTENT_PLATFORM_OPTIONS.map((opt) => (
                    <option key={opt.key || "auto"} value={opt.value}>
                      {opt.key === "" ? t("pro.platformAuto") : t("pro.platformOptions." + opt.key)}
                    </option>
                  ))}
                </select>
              </>
            )}

            {/* إعادة تدوير المحتوى — ميزة PREMIUM فقط: يلصق المستخدم مقالاً أو سكريبت فيديو
                فيبني الخادم المنشورات من هذا النص بدل الاكتفاء بوصف المشروع القصير. */}
            {tier === "premium" && (
              <>
                <label style={{ display: "block", fontWeight: "600", marginBottom: "0.5rem" }}>
                  {t("pro.sourceTextLabel")}
                </label>
                <textarea
                  value={sourceText}
                  onChange={(e) => setSourceText(e.target.value)}
                  placeholder={t("pro.sourceTextPlaceholder")}
                  rows={4}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    borderRadius: "8px",
                    border: "1px solid #d1d5db",
                    marginBottom: "1rem",
                    fontFamily: "inherit",
                    fontSize: "1rem",
                    resize: "vertical",
                    boxSizing: "border-box",
                  }}
                />
              </>
            )}

            <button
              onClick={handleGenerate}
              disabled={loading || !isDescriptionValid || quotaExceeded}
              className="agency-btn-primary"
              style={{
                width: "100%",
                padding: "1rem",
                borderRadius: "8px",
                fontSize: "1rem",
                cursor: loading || !isDescriptionValid || quotaExceeded ? "not-allowed" : "pointer",
                opacity: loading || !isDescriptionValid || quotaExceeded ? 0.6 : 1,
              }}
            >
              {loading ? t("app.generating") : t("app.generateBtn")}
            </button>

            {/* "تجربة الوكالة النفسية متعددة المراحل": أثناء التحميل فقط، تُستبدل لوحة الانتظار
                العامة برسائل نصية متتالية توحي بفريق بشري حقيقي يعمل خلف الكواليس (مدراء
                استراتيجية، ثم كتّاب محتوى، ثم مسؤولو إبداع، ثم لمسة أخيرة) — كل رسالة تظهر
                لمدة 2.5 ثانية (loadingStepIndex أعلاه)، مع تأثير تلاشٍ (agency-loading-step في
                App.css) يُعاد تشغيله في كل تبديل بفضل key={loadingStepIndex} (تغيير الـ key
                يجعل React يعامل العنصر كعنصر جديد فيعيد تشغيل حركة CSS من الصفر). */}
            {loading && (
              <div
                style={{
                  marginTop: "1rem",
                  padding: "1rem 1.25rem",
                  borderRadius: "10px",
                  background: AGENCY_COLORS.pearl,
                  border: `1px solid ${AGENCY_COLORS.border}`,
                  textAlign: "center",
                }}
              >
                <p
                  key={loadingStepIndex}
                  className="agency-loading-step"
                  style={{
                    margin: 0,
                    color: AGENCY_COLORS.navy,
                    fontWeight: "600",
                    fontSize: "0.95rem",
                  }}
                >
                  {t(`app.loadingStep${loadingStepIndex + 1}`)}
                </p>
              </div>
            )}

            {/* رسالة نفاد الرصيد — تظهر فور رفض الخادم للطلب بـ QUOTA_EXCEEDED (قبل أي استدعاء
                لـ Claude API)، وتبقى ظاهرة طالما quotaExceeded=true لتوضح للمستخدم سبب تعطّل
                الزر أعلاه، مع دعوة للترقية (إلا في PREMIUM، حيث لا باقة أعلى للترقية إليها). */}
            {quotaExceeded && (
              <div
                style={{
                  marginTop: "0.85rem",
                  padding: "0.9rem 1rem",
                  borderRadius: "8px",
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  textAlign: "center",
                }}
              >
                <p style={{ margin: 0, color: "#b91c1c", fontSize: "0.9rem", fontWeight: "600" }}>
                  {quotaErrorMessage}
                </p>
                {tier !== "premium" && (
                  <button
                    onClick={() => handleUpgradeClick(tier === "free" ? "pro" : "premium")}
                    style={{
                      marginTop: "0.6rem",
                      padding: "0.5rem 1.25rem",
                      borderRadius: "999px",
                      border: "none",
                      background: "#ef4444",
                      color: "white",
                      fontWeight: "700",
                      fontSize: "0.85rem",
                      cursor: "pointer",
                    }}
                  >
                    {t("common.upgrade")}
                  </button>
                )}
              </div>
            )}

            {quotaInfo && (
              <p style={{ textAlign: "center", color: "#6b7280", fontSize: "0.85rem", marginTop: "0.75rem", marginBottom: 0 }}>
                {t("app.quotaUsed", {
                  used: quotaInfo.generationsUsed,
                  max: quotaInfo.maxGenerationsPerMonth,
                  plan: t("plans." + quotaInfo.plan) || quotaInfo.plan,
                })}
              </p>
            )}
          </div>

          {/* عرض خاص للباقة المجانية: منشور واحد احترافي كامل التفاصيل + تجربة تشويقية عالية
              التحويل (بطاقات هيكلية مموّهة مقفلة + صندوق مقارنة تسويقي) بدل خطة كاملة. */}
          {results.length > 0 && tier === "free" && (() => {
            const freeIdea = results.find((r) => !r.locked) || results[0];
            return (
              <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
                <h2
                  style={{
                    color: AGENCY_COLORS.navy,
                    fontWeight: "800",
                    letterSpacing: "-0.01em",
                    marginBottom: "1.25rem",
                    textAlign: "center",
                  }}
                >
                  {t("app.outputHeading")}
                </h2>

                {/* "Executive Teaser Banner" (Glassmorphism) — يضبط توقعات العميل بوضوح قبل أن
                    يرى النتيجة المجانية: badge بارز (pill شبه شفاف) + شرح أسفله. خلفية شبه
                    شفافة + backdrop-filter blur لإحساس "زجاج فاخر" (glassmorphism) بدل الخلفية
                    الصلبة السابقة، مع حدّ ذهبي خفيف (rgba metallicGold) وظل ناعم. */}
                <div
                  style={{
                    position: "relative",
                    background: "rgba(10, 25, 47, 0.85)",
                    backdropFilter: "blur(12px)",
                    WebkitBackdropFilter: "blur(12px)",
                    border: "1px solid rgba(212, 175, 55, 0.3)",
                    borderRadius: "14px",
                    padding: "1.5rem 1.75rem",
                    marginBottom: "1.75rem",
                    maxWidth: "820px",
                    marginInline: "auto",
                    textAlign: "center",
                    boxShadow: "0 20px 40px -12px rgba(10, 25, 47, 0.45)",
                  }}
                >
                  <div
                    style={{
                      display: "inline-block",
                      background: "rgba(212, 175, 55, 0.15)",
                      border: "1px solid rgba(212, 175, 55, 0.4)",
                      color: AGENCY_COLORS.metallicGold,
                      fontSize: "0.72rem",
                      fontWeight: "700",
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      padding: "0.4rem 1rem",
                      borderRadius: "999px",
                      marginBottom: "0.9rem",
                    }}
                  >
                    {t("freeUpsell.disclaimer.badge")}
                  </div>
                  <p
                    style={{
                      margin: 0,
                      color: "rgba(248, 250, 252, 0.9)",
                      fontSize: "0.92rem",
                      lineHeight: 1.75,
                      letterSpacing: "0.01em",
                    }}
                  >
                    {t("freeUpsell.disclaimer.body")}
                  </p>
                </div>

                <div style={{ maxWidth: "620px", margin: "0 auto" }}>
                  <div className="agency-card" style={{ background: "white", borderRadius: "12px", padding: "2rem", marginBottom: "1rem" }}>
                    <div style={{ background: AGENCY_COLORS.navy, color: "white", padding: "0.4rem 1rem", borderRadius: "8px", display: "inline-block", fontWeight: "bold", marginBottom: "1rem" }}>
                      {t("free.yourIdea")}
                    </div>
                    <h3 style={{ marginBottom: "0.75rem" }}>{freeIdea.idea}</h3>

                    {freeIdea.shotAngle && (
                      <div style={{ background: "#eef2ff", padding: "0.75rem", borderRadius: "8px", marginBottom: "1rem" }}>
                        {t("free.shotAngle", { value: freeIdea.shotAngle })}
                      </div>
                    )}

                    <p style={{ background: "#f3f4f6", padding: "0.75rem", borderRadius: "8px", marginBottom: "1rem", whiteSpace: "pre-wrap" }}>
                      {freeIdea.caption}
                    </p>

                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1rem" }}>
                      {freeIdea.hashtags.map((tag, j) => (
                        <span key={j} style={{ background: "#ddd6fe", color: "#6d28d9", padding: "0.25rem 0.75rem", borderRadius: "999px", fontSize: "0.85rem" }}>
                          {tag}
                        </span>
                      ))}
                    </div>

                    {freeIdea.imageIdea && (
                      <div style={{ background: "#fef3c7", padding: "0.75rem", borderRadius: "8px", marginBottom: "1rem" }}>
                        {t("content.imageIdea", { value: freeIdea.imageIdea })}
                      </div>
                    )}

                    <div style={{ background: "#f3f4f6", padding: "0.75rem", borderRadius: "8px" }}>
                      {t("content.bestTime", { time: freeIdea.bestTime })}
                    </div>
                  </div>

                </div>

                {/* 3 بطاقات ميزات مقفلة (Locked Feature Cards) — تُسمّي بوضوح ما هو محجوب عمداً
                    عن الباقة المجانية (بدل الاكتفاء بالبطاقات الهيكلية المموّهة أدناه فقط)، لكل
                    بطاقة عنوان حقيقي ومقروء + شارة الباقة المطلوبة، مع قفل ذهبي وطبقة تعتيم فوق
                    محتوى زخرفي مموّه. الضغط على أي بطاقة يفتح نافذة "VIP Lead Capture" (نفس
                    showVipModal المستخدمة في أزرار الترقية الأخرى) بدل أي توجيه مباشر لصفحة دفع. */}
                <h4
                  style={{
                    textAlign: "center",
                    color: AGENCY_COLORS.navy,
                    fontWeight: "700",
                    fontSize: "1rem",
                    marginTop: "2rem",
                    marginBottom: "1.1rem",
                  }}
                >
                  {t("freeUpsell.lockedCards.sectionTitle")}
                </h4>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: "1.25rem",
                  }}
                >
                  {["conversionArchitecture", "competitorGap", "brandRetainer"].map((cardKey) => (
                    <div
                      key={cardKey}
                      onClick={() => setShowVipModal(true)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") setShowVipModal(true);
                      }}
                      className="agency-card locked-feature-card"
                      style={{
                        position: "relative",
                        overflow: "hidden",
                        borderRadius: "12px",
                        background: "white",
                        padding: "1.75rem 1.25rem",
                        cursor: "pointer",
                        textAlign: "center",
                        minHeight: "170px",
                      }}
                    >
                      {/* محتوى زخرفي مموّه (blur) — لا يمثل أي بيانات حقيقية، فقط إيحاء بصري
                          بوجود تفاصيل غنية خلف القفل. */}
                      <div
                        aria-hidden="true"
                        style={{ filter: "blur(3px)", opacity: 0.6, pointerEvents: "none", userSelect: "none" }}
                      >
                        <div style={{ width: "55%", height: "13px", borderRadius: "4px", background: AGENCY_COLORS.border, margin: "0 auto 0.75rem" }} />
                        <div style={{ width: "85%", height: "9px", borderRadius: "4px", background: "#f1f5f9", margin: "0 auto 0.5rem" }} />
                        <div style={{ width: "70%", height: "9px", borderRadius: "4px", background: "#f1f5f9", margin: "0 auto 0.5rem" }} />
                        <div style={{ width: "45%", height: "9px", borderRadius: "4px", background: "#f1f5f9", margin: "0 auto" }} />
                      </div>

                      {/* طبقة تعتيم زجاجية (frosted glass overlay) — نصف شفافة + backdrop-filter
                          blur فوق المحتوى المموّه أعلاه، بدل تعتيم صلب سابقاً، لإحساس "زجاج
                          فاخر" متناسق مع شريط الإفصاح أعلى الصفحة. */}
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          background: "rgba(10, 25, 47, 0.82)",
                          backdropFilter: "blur(8px)",
                          WebkitBackdropFilter: "blur(8px)",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "0.55rem",
                          padding: "1.25rem",
                        }}
                      >
                        <LockIcon size={26} />
                        <p style={{ margin: 0, color: "white", fontWeight: "700", fontSize: "0.92rem", lineHeight: 1.4 }}>
                          {t(`freeUpsell.lockedCards.${cardKey}.title`)}
                        </p>
                        <span
                          style={{
                            color: AGENCY_COLORS.metallicGold,
                            fontSize: "0.72rem",
                            fontWeight: "700",
                            letterSpacing: "0.04em",
                            textTransform: "uppercase",
                          }}
                        >
                          {t(`freeUpsell.lockedCards.${cardKey}.tier`)}
                        </span>
                      </div>

                      {/* مسح ذهبي لامع (shimmer sweep) — طبقة زخرفية إضافية فوق كل شيء، غير
                          مرئية إلا عند :hover/:focus-visible (راجع .locked-feature-card في
                          App.css)؛ aria-hidden لأنها بصرية بحتة ولا تحمل أي معنى دلالي. */}
                      <div className="shimmer-sweep" aria-hidden="true" />
                    </div>
                  ))}
                </div>

                {/* تجربة تشويقية عالية التحويل: 3 بطاقات هيكلية وهمية (Skeleton) — بيانات مزيّفة
                    ثابتة، وليست من lockedDays القادمة من الخادم — بتأثير ضبابي خفيف (blur)، وفوقها
                    قفل مع عبارة توضّح أن باقي الخطة جاهزة بانتظار الترقية. */}
                <div style={{ position: "relative", marginTop: "1.5rem", borderRadius: "12px", overflow: "hidden" }}>
                  <div
                    aria-hidden="true"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                      gap: "1.25rem",
                      filter: "blur(3px)",
                      pointerEvents: "none",
                      userSelect: "none",
                    }}
                  >
                    {[0, 1, 2].map((i) => (
                      <div key={i} style={{ background: "white", borderRadius: "12px", padding: "1.5rem" }}>
                        <div style={{ width: "72px", height: "22px", borderRadius: "6px", background: AGENCY_COLORS.navy, marginBottom: "1rem" }} />
                        <div style={{ width: "80%", height: "16px", borderRadius: "4px", background: "#d1d5db", marginBottom: "0.85rem" }} />
                        <div style={{ width: "100%", height: "56px", borderRadius: "8px", background: "#f3f4f6", marginBottom: "1rem" }} />
                        <div style={{ display: "flex", gap: "0.4rem" }}>
                          <div style={{ width: "48px", height: "18px", borderRadius: "999px", background: "#ddd6fe" }} />
                          <div style={{ width: "48px", height: "18px", borderRadius: "999px", background: "#ddd6fe" }} />
                          <div style={{ width: "48px", height: "18px", borderRadius: "999px", background: "#ddd6fe" }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: "rgba(15, 23, 42, 0.5)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.85rem",
                      padding: "1.5rem",
                      textAlign: "center",
                    }}
                  >
                    <div style={{ fontSize: "2.2rem" }}>🔒</div>
                    <p
                      style={{
                        margin: 0,
                        color: "white",
                        fontWeight: "700",
                        fontSize: "1.05rem",
                        maxWidth: "440px",
                        textShadow: "0 2px 10px rgba(0,0,0,0.5)",
                      }}
                    >
                      {t("freeUpsell.lockOverlayText")}
                    </p>
                    <button
                      onClick={() => handleUpgradeClick("pro")}
                      style={{
                        background: "white",
                        color: AGENCY_COLORS.goldDark,
                        border: "none",
                        borderRadius: "999px",
                        padding: "0.6rem 1.5rem",
                        fontSize: "0.9rem",
                        fontWeight: "700",
                        cursor: "pointer",
                      }}
                    >
                      {t("freeUpsell.unlockButton")}
                    </button>
                  </div>
                </div>

                {/* صندوق المقارنة التسويقي (القهوة) — زر الترقية هنا أخضر بارز مع تأثير hover
                    (عبر كلاس CSS مُعرَّف أدناه في <style>، لأن أنماط hover لا تُكتب inline في React). */}
                <div style={{ background: "white", borderRadius: "12px", padding: "1.75rem", marginTop: "1.5rem", textAlign: "center" }}>
                  <h4 style={{ margin: "0 0 0.75rem 0", color: "#1f2937", fontSize: "1.15rem" }}>
                    {t("freeUpsell.coffee.title")}
                  </h4>
                  <p style={{ margin: "0 0 0.75rem 0", color: "#4b5563", fontSize: "0.95rem", lineHeight: 1.6 }}>
                    {t("freeUpsell.coffee.description")}
                  </p>
                  <p style={{ margin: "0 0 1.25rem 0", color: "#374151", fontSize: "0.95rem", fontWeight: "600" }}>
                    {t("freeUpsell.coffee.cta")}
                  </p>
                  <button
                    className="free-upsell-cta-btn"
                    onClick={() => handleUpgradeClick("pro")}
                    style={{
                      padding: "0.85rem 2.25rem",
                      border: "none",
                      borderRadius: "999px",
                      color: "white",
                      fontWeight: "700",
                      fontSize: "1rem",
                      cursor: "pointer",
                    }}
                  >
                    {t("freeUpsell.coffee.button")}
                  </button>
                </div>

                {/* أنماط hover للزر الأخضر أعلاه — مُضمَّنة هنا محلياً (بدل ملف CSS منفصل) لأن
                    App.js لا يستورد أي ورقة أنماط خارجية حالياً؛ تُضاف للصفحة فقط عند عرض هذا
                    القسم (تجربة الباقة المجانية)، ولا تؤثر على أي عنصر آخر في التطبيق. */}
                <style>{`
                  .free-upsell-cta-btn {
                    background: #10b981;
                    transition: background 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;
                  }
                  .free-upsell-cta-btn:hover {
                    background: #059669;
                    transform: translateY(-2px);
                    box-shadow: 0 10px 24px rgba(16, 185, 129, 0.45);
                  }
                `}</style>
              </div>
            );
          })()}

          {/* عرض الشبكة المعتاد للباقات المدفوعة (بدون تغيير في المنطق، فقط النصوص أصبحت مترجمة) */}
          {results.length > 0 && tier !== "free" && (
            <>
              <h2
                style={{
                  color: AGENCY_COLORS.navy,
                  fontWeight: "800",
                  letterSpacing: "-0.01em",
                  marginBottom: "1.25rem",
                  textAlign: "center",
                }}
              >
                {t("app.outputHeading")}
              </h2>

              {/* زر تصدير CSV — متاح لأي باقة غير مجانية بعد ظهور النتيجة. يبني الملف محلياً في
                  المتصفح من مصفوفة results نفسها، بدون أي طلب إضافي للخادم. */}
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1rem" }}>
                <button
                  onClick={() => downloadCSV(results)}
                  className="agency-btn-outline"
                  style={{
                    padding: "0.6rem 1.25rem",
                    borderRadius: "8px",
                    cursor: "pointer",
                  }}
                >
                  {t("pro.downloadCsv")}
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem" }}>
                {results.map((item, i) => (
                  <div key={i} className="agency-card" style={{ background: "white", borderRadius: "12px", padding: "1.5rem" }}>
                    <div style={{ background: AGENCY_COLORS.navy, color: "white", padding: "0.4rem 1rem", borderRadius: "8px", display: "inline-block", fontWeight: "bold", marginBottom: "1rem" }}>
                      {t("common.dayLabel", { n: item.day })}
                    </div>
                    <h3 style={{ marginBottom: "0.5rem" }}>{item.idea}</h3>
                    <p style={{ background: "#f3f4f6", padding: "0.75rem", borderRadius: "8px", marginBottom: "1rem" }}>{item.caption}</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1rem" }}>
                      {item.hashtags.map((tag, j) => <span key={j} style={{ background: "#ddd6fe", color: "#6d28d9", padding: "0.25rem 0.75rem", borderRadius: "999px", fontSize: "0.85rem" }}>{tag}</span>)}
                    </div>
                    <div style={{ background: "#f3f4f6", padding: "0.75rem", borderRadius: "8px", marginBottom: "1rem" }}>
                      {t("content.bestTime", { time: item.bestTime })}
                    </div>
                    {item.imageIdea && (
                      <div style={{ background: "#fef3c7", padding: "0.75rem", borderRadius: "8px", fontSize: "0.9rem", marginBottom: "0.5rem" }}>
                        {t("content.imageIdea", { value: item.imageIdea })}
                      </div>
                    )}
                    {item.videoIdea && (
                      <div style={{ background: "#fef3c7", padding: "0.75rem", borderRadius: "8px", fontSize: "0.9rem", marginBottom: "0.5rem" }}>
                        {t("content.video", { value: item.videoIdea })}
                      </div>
                    )}
                    {/* أمر توليد الصورة بالذكاء الاصطناعي — PREMIUM فقط (imagePrompt فارغ لغير بريميوم) */}
                    {item.imagePrompt && (
                      <div style={{ background: "#ede9fe", color: "#5b21b6", padding: "0.75rem", borderRadius: "8px", fontSize: "0.85rem" }}>
                        {t("pro.imagePrompt", { value: item.imagePrompt })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* قسم التشويق (Upsell Teaser) — يظهر مباشرة بعد النتيجة، ويختلف حسب الباقة الحالية:
              FREE تُشوَّق لـ PRO، و PRO تُشوَّق لـ PREMIUM. لا يظهر أي شيء لباقة PREMIUM. */}
          {results.length > 0 && (tier === "free" || tier === "pro") && (
            <div style={{ maxWidth: "1100px", margin: "30px auto 0" }}>
              {tier === "free" && (
                <div
                  style={{
                    padding: "20px",
                    backgroundColor: "#f1f5f9",
                    borderRadius: "8px",
                    border: "2px dashed #94a3b8",
                    textAlign: "center",
                  }}
                >
                  <h4 style={{ margin: "0 0 10px 0", color: "#334155" }}>
                    {t("upsell.free.title")}
                  </h4>
                  <p style={{ margin: "0 0 15px 0", fontSize: "15px", color: "#475569" }}>
                    {renderWithBold(t("upsell.free.description"))}
                  </p>
                  <button
                    onClick={() => handleUpgradeClick("pro")}
                    style={{
                      backgroundColor: "#10b981",
                      color: "white",
                      padding: "10px 20px",
                      border: "none",
                      borderRadius: "5px",
                      fontWeight: "bold",
                      cursor: "pointer",
                    }}
                  >
                    {t("upsell.free.button")}
                  </button>
                </div>
              )}
              {tier === "pro" && (
                <div
                  style={{
                    padding: "20px",
                    backgroundColor: "#fdf4ff",
                    borderRadius: "8px",
                    border: "2px dashed #d946ef",
                    textAlign: "center",
                  }}
                >
                  <h4 style={{ margin: "0 0 10px 0", color: "#701a75" }}>
                    {t("upsell.pro.title")}
                  </h4>
                  <p style={{ margin: "0 0 15px 0", fontSize: "15px", color: "#86198f" }}>
                    {renderWithBold(t("upsell.pro.description"))}
                  </p>
                  <button
                    onClick={() => handleUpgradeClick("premium")}
                    style={{
                      backgroundColor: "#d946ef",
                      color: "white",
                      padding: "10px 20px",
                      border: "none",
                      borderRadius: "5px",
                      fontWeight: "bold",
                      cursor: "pointer",
                    }}
                  >
                    {t("upsell.pro.button")}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <VipModal
        open={showVipModal}
        planType={vipRequestedPlan}
        user={user}
        t={t}
        onClose={() => setShowVipModal(false)}
      />
    </>
  );
}
