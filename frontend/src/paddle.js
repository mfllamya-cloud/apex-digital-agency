// ---------------------------------------------------------------------------
// إعداد Paddle — مكان واحد لكل ما يخص الدفع بالبطاقة/PayPal.
//
// ⚠️ لماذا Paddle.js وليس "رابط دفع مباشر":
// Paddle Billing لا يعطي رابطاً جاهزاً لكل سعر كما تفعل Gumroad أو Lemon Squeezy.
// الطريقة الموثّقة والمدعومة هي فتح نافذة الدفع من المتصفح عبر Paddle.js:
//     Paddle.Initialize({ token }) ثم Paddle.Checkout.open({ items: [{ priceId }] })
// (يوجد أيضاً hosted checkout بصيغة pay.paddle.io/checkout/hsc_... لكنه يحتاج معرّف
// hosted checkout يُنشأ من لوحة التحكم، ولا يقبل أي حقل بيانات مخصّص — أي أنك لن
// تعرفي أي حساب دفع. Paddle.js يقبل customData، وهذا هو الفرق الحاسم أدناه.)
//
// ما يجب ملؤه قبل التفعيل: token فقط. معرّفات الأسعار موجودة ومؤكَّدة أدناه.
// ---------------------------------------------------------------------------
export const PADDLE_CONFIG = {
  // Paddle → Developer Tools → Authentication → Client-side tokens.
  // يبدأ بـ "test_" في الساندبوكس و "live_" بعد تفعيل الحساب.
  // ⚠️ هذا التوكن عام بطبيعته (يظهر في كود المتصفح) — ليس المفتاح السري (API key).
  // لا تضعي مفتاح الـ API هنا إطلاقاً.
  token: "live_d246e5767d8f7d16180be4de4e9",

  // ⚠️ يجب أن يطابق بادئة التوكن: توكن "live_" ← production، وتوكن "test_" ← sandbox.
  // الخلط بينهما يعطي نافذة دفع فارغة أو خطأ "invalid token" بلا سبب ظاهر.
  environment: "production",
};

// ---------------------------------------------------------------------------
// معرّفات الأسعار — مقروءة مباشرة من لوحة Paddle بتاريخ 30 سبتمبر 2026.
//
// ⚠️ ملاحظة مهمة عن خيارات التسليم السريع: الموقع يعرض ستة أسعار لباقات الوكالة
// (150/179/199 و 500/579/649) بينما أنشأتِ في Paddle سعرين فقط (150 و 500).
// الخياران express و priority تُركا فارغين عمداً: الأصح أن تُنشأ في Paddle
// أسعار "إضافة" مستقلة (+$29 / +$49 / +$79 / +$149) وتُمرَّر كعنصر ثانٍ في نفس
// السلة، بدل تكرار أربعة منتجات كاملة. حتى ذلك الحين، خيار البطاقة يظهر معطّلاً
// لتلك السرعتين بدل أن يحصّل السعر العادي ويَعِد بتسليم سريع.
// ---------------------------------------------------------------------------
export const PADDLE_PRICE_IDS = {
  // باقات الوكالة (دفعة واحدة)
  agency: {
    starter: {
      standard: "pri_01m3smvg56bp117ny04ahyda50", // $150 — Apex Starter Campaign
      express: "", // $179
      priority: "", // $199
    },
    pro: {
      standard: "pri_01m3smjeneqywddnfrt73b9w7h", // $500 — Apex Conversion Pro
      express: "", // $579
      priority: "", // $649
    },
  },

  // باقات المولّد (اشتراك شهري)
  generator: {
    pro: "pri_01m3sndmj6tyccjqf8k7xcjmrx", // $29/شهر — Boutique Campaign
    premium: "pri_01m3sn87hy12w4adv58bwzfj34", // $59/شهر — Full Agency Retainer
  },
};

const PADDLE_SCRIPT_SRC = "https://cdn.paddle.com/paddle/v2/paddle.js";

let paddleReady = null;

// تحميل Paddle.js مرة واحدة فقط وعند الحاجة (لا عند فتح الصفحة): لا داعي لتحميل
// سكربت خارجي على كل زائر بينما لا يضغط زر الدفع إلا قلة منهم.
function loadPaddle() {
  if (paddleReady) return paddleReady;

  paddleReady = new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("لا يوجد window — بيئة غير متصفح"));
      return;
    }
    if (window.Paddle) {
      resolve(window.Paddle);
      return;
    }

    const existing = document.querySelector('script[src="' + PADDLE_SCRIPT_SRC + '"]');
    const script = existing || document.createElement("script");
    script.addEventListener("load", () => resolve(window.Paddle));
    script.addEventListener("error", () => {
      // مهم: تصفير الوعد حتى تُعاد المحاولة عند الضغطة التالية بدل أن يبقى
      // الزر معطّلاً إلى الأبد بسبب انقطاع شبكة لحظي.
      paddleReady = null;
      reject(new Error("تعذّر تحميل Paddle.js"));
    });
    if (!existing) {
      script.src = PADDLE_SCRIPT_SRC;
      script.async = true;
      document.head.appendChild(script);
    }
  }).then((Paddle) => {
    if (!Paddle) throw new Error("Paddle.js حُمِّل لكن window.Paddle غير معرَّف");
    if (PADDLE_CONFIG.environment === "sandbox" && Paddle.Environment) {
      Paddle.Environment.set("sandbox");
    }
    Paddle.Initialize({ token: PADDLE_CONFIG.token });
    return Paddle;
  });

  return paddleReady;
}

// هل الدفع بالبطاقة جاهز لهذا السعر؟ تُستعمل لإظهار الخيار معطّلاً بوضوح.
export function isPaddleReady(priceId) {
  return Boolean(PADDLE_CONFIG.token && priceId);
}

// فتح نافذة دفع Paddle.
//
// customData هو ما يحلّ مشكلة الربط: Paddle يحفظه مع المعاملة ويعيده في الويبهوك،
// فتعرفين أي حساب Firebase دفع — بدل مطابقة العمليات بالبريد يدوياً.
export async function openPaddleCheckout({ priceId, uid, email, planLabel }) {
  if (!PADDLE_CONFIG.token) {
    throw new Error("PADDLE_CONFIG.token فارغ — أضيفي الـ client-side token أولاً");
  }
  if (!priceId) {
    throw new Error("لا يوجد priceId لهذه الباقة/السرعة في PADDLE_PRICE_IDS");
  }

  const Paddle = await loadPaddle();

  Paddle.Checkout.open({
    items: [{ priceId: priceId, quantity: 1 }],
    customer: email ? { email: email } : undefined,
    customData: {
      firebase_uid: uid || "",
      plan: planLabel || "",
    },
    settings: { displayMode: "overlay" },
  });
}
