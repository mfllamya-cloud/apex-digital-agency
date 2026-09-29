// ---------------------------------------------------------------------------
// نظام التصميم الداكن (Apex Dark) — مصدر الحقيقة الوحيد لألوان وأنماط الواجهة الجديدة.
//
// قبل هذا الملف كان كل مكوّن يعرّف نسخته الخاصة من AGENCY_COLORS (App.js, History.js,
// SEOTool.js, Pricing.js...)، وكان لا بد من تعديل كل نسخة يدوياً عند أي تغيير — وهو
// سبب اختلاف الألوان بين الأقسام. المكوّنات الجديدة تستورد من هنا فقط.
//
// نفس القيم معرَّفة كمتغيّرات CSS في :root داخل App.css، لأن :hover والـ @keyframes
// وglassmorphism لا يمكن التعبير عنها بأنماط React المضمّنة وحدها. القائمتان يجب أن
// تبقيا متطابقتين: غيّري هنا وفي App.css معاً.
// ---------------------------------------------------------------------------
export const T = {
  // ---- الخلفيات -----------------------------------------------------------
  // أسود مائل للأزرق وليس أسود خالص: الأسود الخالص (#000) مع نص أبيض يُنتج تبايناً
  // قاسياً ويجعل الحواف تهتزّ بصرياً على الشاشات OLED. هذا التدرّج الليلي أهدأ وأغلى مظهراً.
  bg: "#05070D",
  bgSoft: "#0A0E18",
  bgElevated: "#111726",

  // ---- الزجاج (Glassmorphism) --------------------------------------------
  // تُستخدم كخلفية للبطاقات فوق الخلفية الداكنة، مع backdropFilter: "blur(...)".
  glass: "rgba(255, 255, 255, 0.06)",
  glassStrong: "rgba(255, 255, 255, 0.09)",
  glassBorder: "rgba(255, 255, 255, 0.14)",
  glassBorderGold: "rgba(212, 175, 55, 0.45)",
  blur: "blur(18px)",

  // ---- الذهب المعدني ------------------------------------------------------
  gold: "#D4AF37",
  goldLight: "#EBD07A",
  goldDeep: "#9A7B22",
  goldGradient: "linear-gradient(135deg, #EBD07A 0%, #D4AF37 45%, #A8842A 100%)",
  goldGlow: "0 0 28px rgba(212, 175, 55, 0.28)",

  // ---- النصوص -------------------------------------------------------------
  // أبيض دافئ قليلاً (وليس #FFF) — يقلّل الوهج على الخلفية الداكنة ويعطي إحساس الورق الفاخر.
  //
  // الدرجتان الثانية والثالثة رُفعتا: القيم السابقة (#9AA3B2 و #6B7382) كانت خافتة
  // فوق الخلفية الداكنة، والثالثة تحديداً كانت 3.9:1 فقط أي تحت الحد الأدنى
  // WCAG AA — وهي المستعملة في النص المساعد وnص العنصر النائب وسطر الموافقة.
  // القيم الحالية: 18.5 و 11.4 و 8.4 مقابل واحد، مع إبقاء التدرّج واضحاً.
  text: "#F7F5F0",
  textMuted: "#C8CDD8",
  textFaint: "#AAB1BF",

  // ---- الخطوط -------------------------------------------------------------
  // Cormorant Garamond للعناوين: خط سيريفي عالي التباين، هو ما يعطي الإحساس "الغالي".
  // Plus Jakarta Sans للنصوص، وCairo كاحتياطي عربي (كلاهما محمّل أصلاً في public/index.html).
  fontDisplay: '"Cormorant Garamond", "Cairo", Georgia, serif',
  fontSans: '"Plus Jakarta Sans", "Cairo", system-ui, sans-serif',

  // ---- الظلال والحواف ------------------------------------------------------
  radius: "18px",
  radiusSm: "12px",
  shadow: "0 18px 50px rgba(0, 0, 0, 0.55)",
  shadowSoft: "0 18px 44px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.07)",

  // ---- الحركة --------------------------------------------------------------
  ease: "cubic-bezier(0.16, 1, 0.3, 1)",
};

// خلفية زجاجية جاهزة — تُستدعى في style={{ ...glassCard() }} بدل تكرار خمس خصائص كل مرة.
export function glassCard({ gold = false, strong = false } = {}) {
  return {
    background: strong ? T.glassStrong : T.glass,
    border: `1px solid ${gold ? T.glassBorderGold : T.glassBorder}`,
    borderRadius: T.radius,
    backdropFilter: T.blur,
    WebkitBackdropFilter: T.blur,
    boxShadow: T.shadowSoft,
  };
}

// نص بتدرّج ذهبي — للأرقام والعناوين التي يجب أن تلمع.
export const goldTextStyle = {
  background: T.goldGradient,
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  WebkitTextFillColor: "transparent",
  color: T.gold, // احتياط للمتصفحات التي لا تدعم background-clip: text
};
