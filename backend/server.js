import express from "express";
import cors from "cors";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto"; // مدمجة في Node.js (لا تحتاج npm install) — جاهزة لاستخدامها لاحقاً في التحقق من توقيع HMAC لويبهوك Paddle.
import Anthropic from "@anthropic-ai/sdk";
// نستخدم واجهة firebase-admin الحديثة (modular imports من الحزم الفرعية) بدل الواجهة
// القديمة المجمّعة (namespace) عبر import * as admin from "firebase-admin" مباشرة. السبب: في
// بعض إصدارات/تنصيبات firebase-admin الحديثة، يعيد ذلك الاستيراد كائناً لا يحتوي على
// admin.credential أو admin.firestore كخصائص جاهزة (فيظهر خطأ "Cannot read properties
// of undefined (reading 'cert')")، بينما المسارات الفرعية أدناه ثابتة ومضمونة الوجود
// طالما أن الحزمة مثبّتة فعلياً، وهي الطريقة الموصى بها رسمياً من Firebase حالياً.
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { registerAdJobRoutes } from "./adJobs.js";

// ---------------------------------------------------------------------------
// تحويل CommonJS → ES Modules: بعد ضبط package.json على "type": "module"، لم يعد __dirname
// و__filename متوفّرين تلقائياً كما في CommonJS (Node يرمي "ReferenceError: __dirname is not
// defined in ES module scope" فور أول استخدام لهما أدناه في loadAnthropicApiKey/loadEnvVar/
// SERVICE_ACCOUNT_PATH). هذا هو المكافئ القياسي الصحيح: import.meta.url يعطي رابط هذا الملف
// نفسه كـ "file://..."، وfileURLToPath يحوّله إلى مسار نظام ملفات عادي، ثم path.dirname يستخرج
// مجلده — بالضبط نفس القيمة التي كان __dirname يعطيها سابقاً.
//
// ⚠️ لم أستخدم process.cwd() كبديل رغم كونه اقتراحاً شائعاً: process.cwd() يُعيد "مجلد العمل
// الحالي الذي شُغِّل منه أمر node"، وهو ليس بالضرورة مجلد هذا الملف نفسه — قد يختلفان فعلياً
// لو شُغِّل الخادم مستقبلاً بأمر مثل "npm --prefix backend start" من جذر المشروع، أو عبر pm2/
// Docker بمجلد عمل مختلف. في تلك الحالات كان .env وserviceAccountKey.json سيُعتبَران "غير
// موجودَين" بصمت رغم وجودهما فعلياً بجانب server.js. fileURLToPath(import.meta.url) يعمل
// بشكل صحيح ومضمون بصرف النظر عن مكان تشغيل الأمر.
// ---------------------------------------------------------------------------
import { fileURLToPath } from "node:url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 5000;

// السماح لمنافذ الفرونت إند المحلية المعروفة (3001 القديم و 3002 الحالي)، بالإضافة إلى دومين
// الإنتاج الفعلي على Vercel، وأي دومين معاينة (preview) تلقائي يولّده Vercel لهذا المشروع.
// ملاحظة: بما أن الفرونت إند والباكند الآن يُخدَّمان من نفس الدومين على Vercel (بعد توحيدهما
// في مشروع واحد)، فإن معظم الطلبات الحقيقية ستكون "same-origin" أصلاً، لكن المتصفح لا يزال
// يرسل ترويسة Origin معها، وكانت هذه القائمة (قبل هذا الإصلاح) تحتوي فقط على عنواني localhost
// المحليين — ما كان يعني رفض CORS (403) لكل طلب حقيقي قادم من الموقع المنشور فعلياً، وهو
// السبب الجذري وراء فشل نموذج "ابدأ مشروعك" وأداة توليد المحتوى في بيئة الإنتاج.
const allowedOrigins = [
  "http://localhost:3001",
  "http://localhost:3002",
  "https://apex-digital-agency-dqir.vercel.app",
];
// VERCEL_URL متغيّر بيئة يُحقنه Vercel تلقائياً بعنوان *هذا التنفيذ (deployment)* بالذات (بدون
// https://) — إضافته هنا تجعل CORS يعمل تلقائياً على كل معاينة (preview) جديدة ينشئها Vercel
// لكل Pull Request/فرع، دون الحاجة لتحديث هذه القائمة يدوياً في كل مرة.
if (process.env.VERCEL_URL) {
  allowedOrigins.push("https://" + process.env.VERCEL_URL);
}

app.use(cors());

// ===========================================================================
// ويبهوك Paddle
//
// ⚠️ موضع هذا المسار مقصود: قبل app.use(express.json()) بالضبط.
// التحقق من توقيع Paddle يُحسب على الجسم الخام (raw body) بايتاً ببايت. لو مرّ
// express.json() أولاً فسيحلّل الجسم ويرمي النص الأصلي، ويصبح التحقق مستحيلاً —
// وأي إعادة بناء للنص من الكائن المحلَّل تغيّر ترتيب المفاتيح أو المسافات فيفشل
// التوقيع دائماً. express.raw() هنا يسلّمنا Buffer كما وصل.
//
// ما الذي يحميه هذا التوقيع فعلياً: بدونه يستطيع أي شخص يعرف الرابط أن يرسل
// {"event_type":"subscription.activated","custom_data":{"firebase_uid":"..."}}
// ويمنح نفسه باقة بريميوم مجاناً. التوقيع هو الفرق بين "ويبهوك" و"واجهة عامة
// لترقية أي حساب".
// ===========================================================================

// نافذة التسامح الزمني. وثائق Paddle توصي بخمس ثوانٍ، وهو رقم مناسب لخادم دائم
// التشغيل لكنه ضيّق على دالة بلا خادم (serverless): بدء التشغيل البارد على Vercel
// وحده قد يستغرق أكثر من ذلك، فتُرفض إشعارات صحيحة تماماً. خمس دقائق تبقى حماية
// كافية ضد إعادة التشغيل (replay) لأن الحارس الحقيقي ضدها هو فحص التكرار
// (idempotency) أدناه: كل event_id يُعالَج مرة واحدة فقط ولو أُرسل ألف مرة.
const PADDLE_SIGNATURE_TOLERANCE_SECONDS = 300;

// معرّفات الأسعار ← الباقة. ⚠️ يجب أن تطابق PADDLE_PRICE_IDS في frontend/src/paddle.js.
// أي اختلاف هنا يعني أن العميل يدفع ثمن باقة ويحصل على أخرى.
const PADDLE_SUBSCRIPTION_PRICE_TO_PLAN = {
  pri_01m3sndmj6tyccjqf8k7xcjmrx: "pro", // $29/شهر — Boutique Campaign
  pri_01m3sn87hy12w4adv58bwzfj34: "premium", // $59/شهر — Full Agency Retainer
};

// أسعار خدمات الوكالة (دفعة واحدة). هذه تُسجَّل كطلبات ولا تغيّر باقة المولّد
// إطلاقاً: من يشتري إنتاج فيديو بـ 150$ لم يشترِ اشتراكاً شهرياً في الأداة.
const PADDLE_AGENCY_PRICES = {
  pri_01m3smvg56bp117ny04ahyda50: { name: "Apex Starter Campaign", amountUsd: 150 },
  pri_01m3smjeneqywddnfrt73b9w7h: { name: "Apex Conversion Pro", amountUsd: 500 },
};

let cachedPaddleSecret;

// يُقرأ عند أول طلب لا عند تحميل الملف: loadEnvVar مُعرَّفة أسفل هذا الموضع، والقراءة
// الكسولة تتجنّب الاعتماد على ترتيب التعريفات داخل الملف.
function getPaddleWebhookSecret() {
  if (cachedPaddleSecret === undefined) {
    cachedPaddleSecret = loadEnvVar("PADDLE_WEBHOOK_SECRET");
  }
  return cachedPaddleSecret;
}

// ترويسة Paddle-Signature بالشكل: "ts=1671552777;h1=<توقيع hex>"
function parsePaddleSignature(header) {
  const out = { ts: null, h1: null };
  String(header || "")
    .split(";")
    .forEach((part) => {
      const idx = part.indexOf("=");
      if (idx === -1) return;
      const key = part.slice(0, idx).trim();
      const value = part.slice(idx + 1).trim();
      if (key === "ts") out.ts = value;
      if (key === "h1") out.h1 = value;
    });
  return out;
}

function verifyPaddleSignature(rawBody, signatureHeader, secret) {
  // كل مسار فشل هنا يعيد "hint": جملة واحدة تقول ما الذي يُصلحه. سبب وجودها:
  // رفض التوقيع يظهر في السجل كسطر واحد، وبدون هذا التلميح يصعب التمييز بين
  // "السر خاطئ" و"ساعة الخادم منحرفة" و"الجسم عُدِّل في الطريق" — وهي أسباب
  // علاجها مختلف تماماً.
  //
  // ⚠️ لا يوجد في أي فرع هنا مسار يقبل الحدث عند الفشل، وهذا مقصود: أي رجوع
  // إلى JSON.parse عند فشل التحقق يحوّل هذا المسار إلى واجهة عامة يمنح بها أي
  // شخص نفسه أي باقة، ويصبح التوقيع زينة لا أكثر.
  const { ts, h1 } = parsePaddleSignature(signatureHeader);
  if (!ts || !h1) {
    return {
      ok: false,
      reason: "ترويسة Paddle-Signature ناقصة أو غير مفهومة",
      hint: signatureHeader
        ? "الترويسة وصلت لكن بصيغة غير متوقَّعة (المنتظَر: ts=...;h1=...)."
        : "لا توجد ترويسة إطلاقاً — الطلب على الأرجح ليس من Paddle، أو وسيط أزال الترويسة.",
    };
  }

  const timestamp = Number(ts);
  if (!Number.isFinite(timestamp)) {
    return { ok: false, reason: "طابع زمني غير صالح", hint: "قيمة ts ليست رقماً." };
  }

  const ageSeconds = Math.abs(Math.floor(Date.now() / 1000) - timestamp);
  if (ageSeconds > PADDLE_SIGNATURE_TOLERANCE_SECONDS) {
    return {
      ok: false,
      reason: "الطابع الزمني قديم جداً (" + ageSeconds + " ثانية)",
      hint:
        "إمّا إعادة إرسال قديمة من Paddle (طبيعي ومرفوض عن حق)، أو فارق " +
        "كبير في ساعة الخادم. الحد الحالي " + PADDLE_SIGNATURE_TOLERANCE_SECONDS + " ثانية.",
    };
  }

  const signedPayload = ts + ":" + rawBody.toString("utf8");
  const expected = crypto.createHmac("sha256", secret).update(signedPayload).digest("hex");

  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(h1, "utf8");
  // المقارنة بطول ثابت: المقارنة العادية (===) تتوقف عند أول حرف مختلف، وزمن
  // التوقف نفسه يسرّب معلومات تسمح ببناء التوقيع حرفاً حرفاً.
  if (a.length !== b.length) {
    return {
      ok: false,
      reason: "طول التوقيع غير متطابق (وصل " + h1.length + " حرفاً، المنتظَر " + expected.length + ")",
      hint: "قيمة h1 مبتورة أو ليست hex — تحقّقي أن الترويسة تصل كاملة.",
    };
  }
  if (!crypto.timingSafeEqual(a, b)) {
    return {
      ok: false,
      reason: "التوقيع غير مطابق",
      // أول ستة أحرف فقط من كل جانب: تكفي لتمييز "سر مختلف كلياً" عن "جسم
      // مُعدَّل"، ولا تكشف التوقيع الصحيح لمن يحاول تخمينه.
      hint:
        "المنتظَر يبدأ بـ " + expected.slice(0, 6) + "… والواصل يبدأ بـ " + h1.slice(0, 6) + "…. " +
        "السبب الأكثر شيوعاً: PADDLE_WEBHOOK_SECRET لا يطابق سر هذا الـ destination " +
        "بالذات (لكل destination سرّه)، أو نُسخ بمسافة زائدة، أو ضُبط في مشروع Vercel الآخر.",
    };
  }

  return { ok: true };
}

// فحص التكرار: Paddle يعيد إرسال الإشعار عند أي فشل أو مهلة، وقد يصل نفس الحدث
// عدة مرات. المعاملة (transaction) تضمن أن أول من ينجح في إنشاء الوثيقة هو وحده
// من يعالج الحدث، حتى لو وصلت نسختان في اللحظة نفسها.
async function claimPaddleEvent(eventId, eventType) {
  const ref = db.collection("paddle_events").doc(eventId);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists) return false;
    tx.set(ref, { eventType: eventType, receivedAt: FieldValue.serverTimestamp() });
    return true;
  });
}

function extractPaddlePriceIds(data) {
  const items = Array.isArray(data && data.items) ? data.items : [];
  return items
    .map((item) => (item && item.price && item.price.id) || (item && item.price_id) || null)
    .filter(Boolean);
}

app.post(
  "/api/webhook/paddle",
  express.raw({ type: "*/*" }),
  async (req, res) => {
    const secret = getPaddleWebhookSecret();
    if (!secret) {
      console.error(
        "[server.js] [paddle] PADDLE_WEBHOOK_SECRET غير مضبوط — كل الإشعارات مرفوضة. " +
          "أضيفيه في متغيرات البيئة (يبدأ بـ pdl_ntfset_) ثم أعيدي النشر."
      );
      // 500 وليس 200: نريد أن يعيد Paddle المحاولة بعد ضبط السر، لا أن يعتبر
      // الإشعار مستلَماً ويرميه.
      return res.status(500).send("webhook secret not configured");
    }
    if (!db) {
      console.error("[server.js] [paddle] Firebase Admin غير مهيأ — تعذّر معالجة الإشعار.");
      return res.status(500).send("database not ready");
    }

    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(String(req.body || ""));
    const check = verifyPaddleSignature(rawBody, req.headers["paddle-signature"], secret);
    if (!check.ok) {
      console.warn(
        "[server.js] [paddle] ❌ رُفض إشعار: " + check.reason +
          (check.hint ? "\n                     ↳ " + check.hint : "") +
          "\n                     ↳ السر مضبوط: نعم (طوله " + secret.length + " حرفاً، يبدأ بـ " +
          secret.slice(0, 11) + "…)"
      );
      // 400 لا 500: التوقيع الخاطئ لن يصلح بإعادة المحاولة.
      return res.status(400).send("invalid signature");
    }

    let event;
    try {
      event = JSON.parse(rawBody.toString("utf8"));
    } catch (err) {
      console.error("[server.js] [paddle] تعذّر تحليل جسم الإشعار: " + err.message);
      return res.status(400).send("invalid json");
    }

    const eventId = event.event_id || event.notification_id;
    const eventType = event.event_type;
    const data = event.data || {};

    if (!eventId || !eventType) {
      console.warn("[server.js] [paddle] إشعار بلا event_id أو event_type — تجاهُل.");
      return res.status(400).send("missing event id or type");
    }

    try {
      const isNew = await claimPaddleEvent(eventId, eventType);
      if (!isNew) {
        console.log("[server.js] [paddle] ↩️ إشعار مكرّر (" + eventId + ") — تم تجاهله.");
        return res.status(200).send("duplicate ignored");
      }

      const uid = (data.custom_data && data.custom_data.firebase_uid) || "";
      const priceIds = extractPaddlePriceIds(data);
      const subscriptionPriceId = priceIds.find((id) => PADDLE_SUBSCRIPTION_PRICE_TO_PLAN[id]);
      const agencyPriceId = priceIds.find((id) => PADDLE_AGENCY_PRICES[id]);

      console.log(
        "[server.js] [paddle] 📨 " + eventType + " (" + eventId + ") uid=" + (uid || "غير ممرَّر") +
          " prices=" + (priceIds.join(",") || "لا شيء")
      );

      // ---- شراء خدمة وكالة (دفعة واحدة) -----------------------------------
      // يُسجَّل كطلب فقط. لا يغيّر باقة المولّد إطلاقاً.
      if (eventType === "transaction.completed" && agencyPriceId) {
        const pkg = PADDLE_AGENCY_PRICES[agencyPriceId];
        await db.collection("agency_orders").doc(String(data.id || eventId)).set({
          eventId: eventId,
          transactionId: data.id || null,
          firebaseUid: uid || null,
          customerId: data.customer_id || null,
          packageName: pkg.name,
          priceId: agencyPriceId,
          amountUsd: pkg.amountUsd,
          status: "paid",
          createdAt: FieldValue.serverTimestamp(),
        });
        console.log("[server.js] [paddle] 🧾 طلب وكالة مسجَّل: " + pkg.name);
        return res.status(200).send("ok");
      }

      // ---- اشتراكات المولّد ------------------------------------------------
      const subscriptionEvents = [
        "subscription.activated",
        "subscription.created",
        "subscription.updated",
        "subscription.canceled",
        "subscription.paused",
        "subscription.past_due",
        "subscription.resumed",
      ];

      if (!subscriptionEvents.includes(eventType)) {
        console.log("[server.js] [paddle] نوع غير معالَج (" + eventType + ") — استُلم وتُجوهل.");
        return res.status(200).send("ignored");
      }

      if (!uid) {
        // لا نُسقط الحدث بصمت: نحفظه ليُطابَق يدوياً، وإلا دفع العميل ولم يحصل على شيء
        // ولا أثر لذلك في أي مكان.
        await db.collection("paddle_unmatched").doc(eventId).set({
          eventType: eventType,
          subscriptionId: data.id || null,
          customerId: data.customer_id || null,
          customerEmail: (data.customer && data.customer.email) || null,
          priceIds: priceIds,
          receivedAt: FieldValue.serverTimestamp(),
        });
        console.error(
          "[server.js] [paddle] ⚠️ اشتراك بلا firebase_uid في custom_data — حُفظ في " +
            "paddle_unmatched للمطابقة اليدوية. تحقّقي أن customData تُمرَّر في openPaddleCheckout."
        );
        return res.status(200).send("stored for manual matching");
      }

      const userRef = db.collection("users").doc(uid);
      const nowKey = currentMonthKey();

      const cancelLike =
        eventType === "subscription.canceled" || eventType === "subscription.paused";

      if (cancelLike) {
        await userRef.set(
          {
            plan: "free",
            subscriptionStatus: data.status || "canceled",
            paddleSubscriptionId: data.id || null,
            planUpdatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
        console.log("[server.js] [paddle] ⬇️ " + uid + " أُرجع إلى الباقة المجانية (" + eventType + ")");
        return res.status(200).send("ok");
      }

      if (!subscriptionPriceId) {
        console.warn(
          "[server.js] [paddle] " + eventType + " بلا سعر معروف في PADDLE_SUBSCRIPTION_PRICE_TO_PLAN " +
            "(" + priceIds.join(",") + ") — لم تُغيَّر أي باقة."
        );
        return res.status(200).send("unknown price");
      }

      const plan = PADDLE_SUBSCRIPTION_PRICE_TO_PLAN[subscriptionPriceId];
      const isFirstActivation =
        eventType === "subscription.activated" || eventType === "subscription.created";

      const update = {
        plan: plan,
        subscriptionStatus: data.status || "active",
        paddleSubscriptionId: data.id || null,
        paddleCustomerId: data.customer_id || null,
        paddlePriceId: subscriptionPriceId,
        planUpdatedAt: FieldValue.serverTimestamp(),
      };

      // تصفير العدّاد عند بداية الاشتراك فقط. لو صُفِّر عند كل subscription.updated
      // لصار بإمكان المشترك استرجاع حصته كاملة بأي تعديل بسيط على اشتراكه.
      if (isFirstActivation) {
        update.generationsUsed = 0;
        update.designsUsed = 0;
        update.lastResetMonth = nowKey;
      }

      await userRef.set(update, { merge: true });
      console.log(
        "[server.js] [paddle] ⬆️ " + uid + " → باقة " + plan +
          (isFirstActivation ? " (اشتراك جديد، صُفِّر العدّاد)" : " (تحديث)")
      );
      return res.status(200).send("ok");
    } catch (err) {
      console.error("[server.js] [paddle] ❌ خطأ أثناء المعالجة: " + err.message);
      // 500 يجعل Paddle يعيد المحاولة — وفحص التكرار أعلاه يمنع المعالجة المزدوجة.
      return res.status(500).send("processing error");
    }
  }
);

// Saving a product photo and starting an ad (which may carry a logo) need a larger JSON limit.
// Everything else keeps the Express default (100kb). The limit stays
// under Vercel's 4.5 MB request body cap.
const jsonDefault = express.json();
const jsonLarge = express.json({ limit: "2mb" });
const LARGE_JSON_PATHS = ["/api/photos", "/api/ad/start"]; // a product photo, or a logo
app.use((req, res, next) =>
  LARGE_JSON_PATHS.includes(req.path) ? jsonLarge(req, res, next) : jsonDefault(req, res, next)
);

// معالج أخطاء CORS: يعيد رسالة JSON واضحة بدل صفحة خطأ HTML افتراضية من Express
app.use((err, req, res, next) => {
  if (err && err.message && err.message.startsWith("CORS:")) {
    return res.status(403).json({ success: false, errorCode: "CORS_FORBIDDEN", error: err.message });
  }
  next(err);
});

// ---------------------------------------------------------------------------
// نموذج تواصل الوكالة (Agency Inquiry Form) — يستقبل بيانات نموذج "تواصل معنا" من الواجهة
// الأمامية عبر نفس الباكند الموجود على Vercel (بدل خدمة Firebase Functions منفصلة، حتى يبقى
// كل شيء تحت دومين واحد بدون مشاكل CORS). حالياً يكتفي بتسجيل البيانات في السجلات (logs)؛
// الحفظ في Firestore معلَّق أدناه كتعليق (TODO) جاهز للتفعيل عند الحاجة.
// ---------------------------------------------------------------------------
app.post("/api/submit-form", async (req, res) => {
  try {
    const formData = req.body;

    if (!formData || typeof formData !== "object" || Object.keys(formData).length === 0) {
      return res.status(400).json({
        success: false,
        errorCode: "EMPTY_FORM",
        error: "لم يتم استلام أي بيانات من النموذج.",
      });
    }

    console.log("[server.js] بيانات نموذج تواصل الوكالة المستلمة:", formData);

    // TODO: فعّل هذا عندما تريد حفظ الطلبات في Firestore (db وFieldValue مُهيَّآن أعلاه بالفعل):
    // if (db) {
    //   await db.collection("agencyInquiries").add({
    //     ...formData,
    //     receivedAt: FieldValue.serverTimestamp(),
    //   });
    // }

    res.status(200).json({
      success: true,
      message: "تم استلام البيانات بنجاح، السيرفر يعمل!",
    });
  } catch (error) {
    console.error("[server.js] خطأ أثناء معالجة نموذج تواصل الوكالة: " + error.message);
    res.status(500).json({
      success: false,
      errorCode: "FORM_SUBMISSION_FAILED",
      error: "حدث خطأ أثناء معالجة النموذج. حاول مرة أخرى.",
    });
  }
});

// ---------------------------------------------------------------------------
// قراءة يدوية لملف .env (بدون dotenv) — تدعم UTF-8 (مع/بدون BOM) و UTF-16 LE/BE
// (مع/بدون BOM)، وتنظّف الأحرف غير المرئية التي قد يضيفها محرر نصوص على ويندوز.
// ---------------------------------------------------------------------------

function decodeEnvBuffer(buffer) {
  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
    return buffer.slice(2).toString("utf16le");
  }
  if (buffer.length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff) {
    const body = buffer.slice(2);
    const swapped = Buffer.alloc(body.length);
    for (let i = 0; i + 1 < body.length; i += 2) {
      swapped[i] = body[i + 1];
      swapped[i + 1] = body[i];
    }
    return swapped.toString("utf16le");
  }
  if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    return buffer.slice(3).toString("utf8");
  }
  const sampleLen = Math.min(buffer.length, 200);
  if (sampleLen >= 4) {
    let zeroCount = 0;
    for (let i = 1; i < sampleLen; i += 2) {
      if (buffer[i] === 0x00) zeroCount++;
    }
    if (zeroCount / (sampleLen / 2) > 0.6) {
      return buffer.toString("utf16le");
    }
  }
  return buffer.toString("utf8");
}

function cleanEnvToken(token) {
  return token
    .replace(/﻿/g, "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/\r/g, "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .trim();
}

function loadAnthropicApiKey() {
  // على Vercel لا يوجد ملف .env في الحزمة المنشورة (مستبعد عبر .gitignore عمداً) — المتغيرات
  // هناك تُحقن مباشرة في process.env من خلال "Environment Variables" في إعدادات المشروع على
  // Vercel. لذلك نتحقق من process.env أولاً، ونرجع فقط عند غيابه إلى قراءة ملف .env محلياً
  // (وهو ما يحدث أثناء التطوير المحلي على جهاز المستخدم).
  if (process.env.ANTHROPIC_API_KEY) {
    console.log("[server.js] [1/4] تم العثور على ANTHROPIC_API_KEY في process.env (مثلاً من إعدادات Vercel).");
    return cleanEnvToken(process.env.ANTHROPIC_API_KEY);
  }

  const envPath = path.join(__dirname, ".env");
  console.log("[server.js] [1/4] البحث عن ملف .env في: " + envPath);

  if (!fs.existsSync(envPath)) {
    console.error(
      "[server.js] [1/4] فشل: لم يتم العثور على ملف .env.\n" +
      "تأكد من إنشاء ملف اسمه \".env\" بالضبط (وليس \".env.txt\") داخل مجلد backend، " +
      "يحتوي على سطر مثل:\nANTHROPIC_API_KEY=sk-ant-..."
    );
    return null;
  }
  console.log("[server.js] [1/4] تم العثور على ملف .env.");

  let text;
  try {
    const buffer = fs.readFileSync(envPath);
    text = decodeEnvBuffer(buffer);
    console.log("[server.js] [2/4] تم قراءة الملف بنجاح (" + buffer.length + " بايت).");
  } catch (err) {
    console.error("[server.js] [2/4] فشل: تعذّرت قراءة ملف .env: " + err.message);
    return null;
  }

  const lines = text.split(/\r?\n/);
  console.log("[server.js] [3/4] البحث عن متغير ANTHROPIC_API_KEY داخل الملف (" + lines.length + " سطر)...");

  for (const rawLine of lines) {
    const line = cleanEnvToken(rawLine);
    if (!line || line.startsWith("#")) continue;

    const eqIndex = line.indexOf("=");
    if (eqIndex === -1) {
      console.warn("[server.js] [3/4] تجاهل سطر لا يحتوي على علامة \"=\": \"" + line.slice(0, 20) + (line.length > 20 ? "..." : "") + "\"");
      continue;
    }

    const key = cleanEnvToken(line.slice(0, eqIndex));
    if (key !== "ANTHROPIC_API_KEY") continue;

    const value = cleanEnvToken(line.slice(eqIndex + 1));
    if (value) {
      console.log("[server.js] [3/4] تم العثور على متغير ANTHROPIC_API_KEY.");
      return value;
    }
  }

  console.error(
    "[server.js] [3/4] فشل: ملف .env موجود لكن لا يحتوي على سطر صالح بالشكل:\n" +
    "ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxxxxxx\n" +
    "(تحقق أن الملف لا يحتوي فقط على قيمة المفتاح بدون اسم المتغير وعلامة \"=\")"
  );
  return null;
}

const ANTHROPIC_API_KEY = loadAnthropicApiKey();

if (ANTHROPIC_API_KEY) {
  const preview = ANTHROPIC_API_KEY.slice(0, 12);
  console.log(
    "[server.js] [4/4] تم تحميل ANTHROPIC_API_KEY بنجاح (أول 12 حرفاً فقط للتأكيد): " + preview + "..."
  );
} else {
  console.error(
    "[server.js] [4/4] تحذير: لم يتم تحميل ANTHROPIC_API_KEY. طلبات التوليد ستفشل حتى يتم إصلاح ملف .env."
  );
}

const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY || undefined });

// ---------------------------------------------------------------------------
// loadEnvVar(keyName) — قراءة أي متغيّر بيئة: من process.env أولاً (كما تحقنه Vercel)، ثم من
// ملف .env محلياً كاحتياطي (نفس آلية decodeEnvBuffer + cleanEnvToken المستخدمة أعلاه في
// loadAnthropicApiKey). عامّة وقابلة لإعادة الاستخدام لأي متغيّر مستقبلي (مثل سر ويبهوك
// Paddle القادم).
// ---------------------------------------------------------------------------
function loadEnvVar(keyName) {
  // نفس منطق process.env-أولاً المستخدم في loadAnthropicApiKey() أعلاه — ضروري لأن .env
  // لا يوجد إطلاقاً على Vercel (مستبعد عبر .gitignore)، والقيم هناك تأتي من متغيرات البيئة
  // المضبوطة في لوحة تحكم Vercel.
  if (process.env[keyName]) {
    return cleanEnvToken(process.env[keyName]);
  }

  const envPath = path.join(__dirname, ".env");
  if (!fs.existsSync(envPath)) return null;

  let text;
  try {
    text = decodeEnvBuffer(fs.readFileSync(envPath));
  } catch (_) {
    return null;
  }

  for (const rawLine of text.split(/\r?\n/)) {
    const line = cleanEnvToken(rawLine);
    if (!line || line.startsWith("#")) continue;
    const eqIndex = line.indexOf("=");
    if (eqIndex === -1) continue;
    const key = cleanEnvToken(line.slice(0, eqIndex));
    if (key !== keyName) continue;
    const value = cleanEnvToken(line.slice(eqIndex + 1));
    return value || null;
  }
  return null;
}

// PADDLE_WEBHOOK_SECRET سيُقرأ هنا لاحقاً عبر نفس loadEnvVar("PADDLE_WEBHOOK_SECRET") أعلاه،
// بمجرد إضافة تكامل Paddle الفعلي وويبهوكه.

// ---------------------------------------------------------------------------
// Firebase Admin SDK — ضروري للتحقق من هوية المستخدم (verifyIdToken) وللقراءة/
// الكتابة الموثوقة في Firestore من الخادم (يتجاوز قواعد الأمان، بخلاف العميل).
// يتطلب ملف مفتاح حساب خدمة (service account) لا يجب رفعه أبداً إلى git:
// 1. اذهب إلى Firebase Console → أيقونة الترس (إعدادات المشروع) → تبويب
//    "Service accounts" → اضغط "Generate new private key".
// 2. احفظ الملف الذي يُنزَّل باسم "serviceAccountKey.json" داخل مجلد backend
//    (بجانب server.js، بنفس مستوى .env).
// ---------------------------------------------------------------------------
const SERVICE_ACCOUNT_PATH = path.join(__dirname, "serviceAccountKey.json");
let db = null;
let firebaseAuth = null;

// serviceAccountKey.json مستبعد عبر .gitignore ولن يوجد أبداً في الحزمة المنشورة على Vercel.
// البديل هناك: إضافة متغير بيئة اسمه FIREBASE_SERVICE_ACCOUNT_JSON في إعدادات مشروع Vercel،
// قيمته هي محتوى ملف serviceAccountKey.json كاملاً كنص JSON واحد (نسخ/لصق مباشر من الملف).
// نتحقق من هذا المتغير أولاً، ونرجع فقط عند غيابه إلى قراءة الملف محلياً (التطوير على الجهاز).
let rawServiceAccountJson = null;
let serviceAccountSource = null;

if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
  rawServiceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  serviceAccountSource = "process.env.FIREBASE_SERVICE_ACCOUNT_JSON";
} else if (fs.existsSync(SERVICE_ACCOUNT_PATH)) {
  try {
    // تحويل ESM: require(SERVICE_ACCOUNT_PATH) القديم كان يعتمد على قدرة CommonJS التلقائية
    // على قراءة وتحليل ملفات JSON مباشرة عبر require(). لا يوجد مكافئ لهذا بنفس البساطة في
    // import العادي (يتطلب صياغة "import assertion" خاصة، مختلفة بين إصدارات Node، وغير
    // ضرورية أصلاً هنا) — البديل الأبسط والمضمون العمل في كل إصدارات Node: قراءة الملف كنص
    // عبر fs (مستوردة أعلاه على أي حال) ثم JSON.parse يدوياً، بنفس النتيجة النهائية تماماً.
    rawServiceAccountJson = fs.readFileSync(SERVICE_ACCOUNT_PATH, "utf8");
    serviceAccountSource = SERVICE_ACCOUNT_PATH;
  } catch (err) {
    console.error("[server.js] ❌ تعذّرت قراءة serviceAccountKey.json: " + err.message);
  }
}

if (rawServiceAccountJson) {
  try {
    const serviceAccount = JSON.parse(rawServiceAccountJson);
    initializeApp({ credential: cert(serviceAccount) });
    db = getFirestore();
    firebaseAuth = getAuth();
    console.log(
      "[server.js] ✅ تم تهيئة Firebase Admin SDK بنجاح (المصدر: " + serviceAccountSource + ") والاتصال بـ Firestore وAuth " +
      "(مشروع Firebase: " + (serviceAccount.project_id || "غير معروف") + ")."
    );
  } catch (err) {
    console.error(
      "[server.js] ❌ فشلت تهيئة Firebase Admin SDK: " + err.name + ": " + err.message + "\n" +
      "تحقق من: 1) أن قيمة FIREBASE_SERVICE_ACCOUNT_JSON (أو serviceAccountKey.json محلياً) هي JSON صالح " +
      "ومُنزَّل فعلاً من Firebase Console (Project settings → Service accounts → Generate new private key)، " +
      "2) أن حزمة firebase-admin مثبتة بنسخة سليمة (جرّب: npm ls firebase-admin ثم عند الشك " +
      "npm uninstall firebase-admin ثم npm install firebase-admin من جديد داخل مجلد backend)."
    );
  }
} else {
  console.error(
    "[server.js] لم يتم العثور على بيانات اعتماد Firebase — لا FIREBASE_SERVICE_ACCOUNT_JSON في " +
    "متغيرات البيئة، ولا ملف serviceAccountKey.json في مجلد backend.\n" +
    "بدون هذا لا يمكن التحقق من هوية المستخدم ولا تطبيق حدود الباقات من الخادم — " +
    "كل طلبات التوليد ستُرفض حتى تضيفه (راجع التعليق أعلاه لمعرفة كيفية الحصول عليه)."
  );
}

// حدود كل باقة: أقصى عدد أيام لكل توليد ("سبرنت/حملة أسبوعية")، وأقصى عدد توليدات مسموح بها
// شهرياً. بنية "Weekly Sprint" (قرار عمل): pro/premium لم يعودا يسمحان بمخطط متصل لمدة
// 30/90 يوماً في الطلب الواحد — الحد الأقصى لكل توليد أصبح 7 أيام للاثنين معاً (سبرنت أسبوعي
// واحد)، والفرق بين الباقتين هو عدد مرات التوليد المسموح بها شهرياً (maxGenerationsPerMonth):
// 5 لـ Pro (= تغطية 5 أسابيع تقريباً شهرياً)، 12 لـ Premium (بدل 10 سابقاً؛ تغطية "360 درجة"
// أوسع). ⚠️ هذا هو مصدر الحقيقة الوحيد والملزم فعلياً لهذه الحدود — ثوابت frontend/src/App.js
// (PLAN_MAX_DAYS/PLAN_MAX_GENERATIONS) واجهة مستخدم فقط ويجب أن تبقى مطابقة لهذه القيم يدوياً.
const PLAN_LIMITS = {
  // 2026 "one generation = one complete ad" model. maxDays is 1 on every plan.
  //   maxGenerationsPerMonth = text ads per month (counter: users/{uid}.generationsUsed)
  //   maxDesignsPerMonth     = ad designs per month (separate counter: users/{uid}.designsUsed)
  //   designFormats/designStyles = what one design credit produces on that plan
  // A design ad uses one of each; a text-only ad uses one ad credit. These values are the binding
  // ones: backend/adJobs.js reads them inside Firestore transactions. frontend/src/App.js
  // only mirrors them for display.
  free: { maxDays: 1, maxGenerationsPerMonth: 1, maxDesignsPerMonth: 0, designFormats: [], designStyles: [], label: "المجانية" },
  pro: {
    maxDays: 1,
    maxGenerationsPerMonth: 5, // ads per month…
    maxDesignsPerMonth: 4, // …of which this many can have a design
    designFormats: ["4:5", "1:1"],
    designStyles: ["clean_studio", "bold_color"],
    label: "برو",
  },
  premium: {
    maxDays: 1,
    maxGenerationsPerMonth: 10,
    maxDesignsPerMonth: 10,
    designFormats: ["4:5", "1:1", "9:16"],
    designStyles: ["clean_studio", "bold_color", "luxury_dark", "lifestyle_scene"],
    label: "بريميوم",
  },
};

function getPlanLimits(plan) {
  return PLAN_LIMITS[plan] || PLAN_LIMITS.free;
}

// أقصى عدد توكنز للرد (max_tokens) لكل باقة.
//
// max_tokens سقف وليس فاتورة: لا يُدفع إلا عمّا استُهلك فعلاً. رفعه لا يزيد التكلفة
// من تلقاء نفسه، لكن خفضه أكثر من اللازم يقطع الرد في منتصفه — وحينها يفشل تحليل
// الـ JSON، فيدفع صاحب الموقع ثمن الاستدعاء كاملاً ولا يصل العميل شيء إطلاقاً.
//
// ⚠️ free: رُفع من 1000 إلى 2200. رد الباقة المجانية عنصر JSON واحد (idea، shotAngle،
// caption، 5 هاشتاغات، imageIdea، bestTime). بالإنجليزية يكفيه ~300 توكن، لكن العربية
// والدارجة تستهلكان ضعفين إلى ثلاثة أضعاف لكل كلمة، فكان السقف 1000 قريباً من الحافة
// وأحياناً تحتها — وهو سبب الردود التي تبدو "مبتورة". النموذج هنا Haiku (الأرخص)،
// فالفرق في التكلفة الفعلية بين السقفين مهمل، ومردوده أن الفكرة المجانية — وهي أداة
// التحويل الأولى — تصل كاملة دائماً.
//
// premium: عاد إلى 25000 بعد رجوع سقف الأيام إلى 7.
// One ad per generation on every plan since the 2026 model, so one ceiling fits all.
const PLAN_MAX_TOKENS = { free: 2600, pro: 2600, premium: 2600 };

function getPlanMaxTokens(plan) {
  return PLAN_MAX_TOKENS[plan] || PLAN_MAX_TOKENS.free;
}

// مفتاح الشهر الحالي بصيغة "YYYY-MM" لمقارنته بـ lastResetMonth المخزّن في Firestore.
function currentMonthKey(d) {
  const date = d || new Date();
  return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0");
}

// يتحقق من رمز Firebase ID Token المرسل في ترويسة Authorization: Bearer <token>
// ويعيد uid المستخدم الحقيقي. لا نثق إطلاقاً بأي هوية أو باقة يرسلها العميل في body الطلب.
async function verifyFirebaseToken(req) {
  const authHeader = req.headers.authorization || "";
  const match = authHeader.match(/^Bearer\s+(.+)$/);
  if (!match) {
    const err = new Error("لا يوجد رمز تسجيل دخول (Authorization header مفقود).");
    err.code = "NO_TOKEN";
    throw err;
  }
  try {
    const decoded = await firebaseAuth.verifyIdToken(match[1]);
    return decoded.uid;
  } catch (err) {
    const e = new Error("رمز تسجيل الدخول غير صالح أو منتهي الصلاحية: " + err.message);
    e.code = "INVALID_TOKEN";
    throw e;
  }
}

// النماذج المدفوعة تبقى على Sonnet للحفاظ على جودة خطة السبرنت الأسبوعي (حتى 7 أيام).
const MODEL_PAID = "claude-sonnet-4-5";

// نموذج الباقة المجانية — تاريخ التحديثات والسبب في كل مرة:
// 1. "claude-3-haiku-20240307" (الأصلي) → 404 (النموذج مُتقاعَد/Retired رسمياً).
// 2. "claude-3-5-haiku-20241022" → 404 أيضاً (مُتقاعَد رسمياً هو الآخر).
// 3. طُلب استخدام "claude-3-haiku-20240303" — تحققت من الوثائق الرسمية لـ Anthropic قبل
//    تطبيقه: هذا المعرّف غير موجود أصلاً (لا يوجد نموذج بتاريخ 03-03-2024)؛ الأقرب له هو
//    نفس معرّف الخطوة 1 أعلاه بفارق يوم واحد في التاريخ ("07" وليس "03")، وهو نفسه متقاعَد
//    كما ورد أعلاه. تطبيق هذا المعرّف كان سيُعيد نفس خطأ 404 للمرة الثالثة.
// الوضع الرسمي الحالي (تحقّقت منه في وثائق Anthropic مباشرة): كل من claude-3-haiku-20240307
// و claude-3-5-haiku-20241022 تم تقاعدهما رسمياً بالكامل (Retired) ولم يعودا يعملان إطلاقاً —
// أي طلب لهما يفشل بـ 404 بغض النظر عن حساب/مفتاح API المستخدم؛ هذه ليست مشكلة خاصة بحسابك.
// البديل الرسمي الموصى به من Anthropic نفسها لكل نماذج Haiku القديمة هو: claude-haiku-4-5-20251001
// (نموذج Haiku الحالي والوحيد المتوفر حالياً على الإطلاق) — وهو ما استخدمته أدناه، لأنه يحقق
// هدفك الأصلي فعلياً: تكلفة أقل بكثير من Sonnet (المستخدم مؤقتاً في الجولة السابقة)، مع جودة
// كتابة تسويقية جيدة تكفي لمنشور واحد مقنع للباقة المجانية.
const MODEL_FREE = "claude-haiku-4-5-20251001";
console.log("[server.js] النموذج المستخدم للباقة المجانية: " + MODEL_FREE);
console.log("[server.js] النموذج المستخدم للباقات المدفوعة (PRO/PREMIUM): " + MODEL_PAID);

// ---------------------------------------------------------------------------
// تقويم المناسبات المغربية والإسلامية المهمة للتسويق: رمضان، عيد الفطر،
// عيد الأضحى، رأس السنة الهجرية، عاشوراء، المولد النبوي، رأس السنة الأمازيغية
// (ناير)، والدخول المدرسي.
//
// ملاحظة مهمة: التواريخ الهجرية هنا تقديرية (حسابات فلكية) وقد تختلف يوماً
// واحداً حسب رؤية الهلال الفعلية في المغرب، كما أنها تتحرك للوراء نحو 10-11
// يوماً كل سنة ميلادية. تاريخ "الدخول المدرسي" تقريبي أيضاً (يُحدَّد رسمياً من
// وزارة التربية الوطنية كل سنة، وعادة يكون بين آخر غشت وبداية شتنبر).
// يجب مراجعة هذا الجدول وتحديثه/إضافة سنوات جديدة دورياً (مرة كل سنة على الأقل).
// ---------------------------------------------------------------------------
const MOROCCAN_OCCASIONS = [
  // 1446 هـ / 2025
  { name: "رمضان", date: "2025-03-01" },
  { name: "عيد الفطر", date: "2025-03-30" },
  { name: "عيد الأضحى", date: "2025-06-06" },
  { name: "رأس السنة الهجرية", date: "2025-06-26" },
  { name: "عاشوراء", date: "2025-07-05" },
  { name: "الدخول المدرسي", date: "2025-09-01" },
  { name: "المولد النبوي", date: "2025-09-04" },
  // 1447 هـ / 2026
  { name: "رأس السنة الأمازيغية (ناير)", date: "2026-01-13" },
  { name: "رمضان", date: "2026-02-18" },
  { name: "عيد الفطر", date: "2026-03-20" },
  { name: "عيد الأضحى", date: "2026-05-27" },
  { name: "رأس السنة الهجرية", date: "2026-06-16" },
  { name: "عاشوراء", date: "2026-06-25" },
  { name: "الدخول المدرسي", date: "2026-09-01" },
  { name: "المولد النبوي", date: "2026-08-25" },
  // 1448 هـ / 2027 (تقديري، لتغطية بداية السنة التالية)
  { name: "رأس السنة الأمازيغية (ناير)", date: "2027-01-13" },
  { name: "رمضان", date: "2027-02-08" },
  { name: "عيد الفطر", date: "2027-03-09" },
  { name: "عيد الأضحى", date: "2027-05-16" },
  { name: "الدخول المدرسي", date: "2027-09-01" },
  { name: "المولد النبوي", date: "2027-08-15" },
];

// نافذة "القرب": مناسبة تبعد 21 يوماً أو أقل تُعتبر قريبة بما يكفي لربط المحتوى بها.
const OCCASION_LOOKAHEAD_DAYS = 21;

// يبحث عن أقرب مناسبة قادمة (وليست ماضية) خلال maxDaysAhead يوماً من تاريخ اليوم.
function findUpcomingOccasion(referenceDate, maxDaysAhead) {
  const ref = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
  let closest = null;

  for (const occ of MOROCCAN_OCCASIONS) {
    const occDate = new Date(occ.date + "T00:00:00");
    const diffDays = Math.round((occDate.getTime() - ref.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays >= 0 && diffDays <= maxDaysAhead) {
      if (!closest || diffDays < closest.daysUntil) {
        closest = { name: occ.name, date: occ.date, daysUntil: diffDays };
      }
    }
  }
  return closest;
}

// نص تنبيه يُضاف للـ prompt عند وجود مناسبة قريبة — يختلف حسب الباقة (فكرة واحدة أو خطة كاملة).
function buildOccasionNote(occasion, isFree) {
  if (!occasion) return "";

  const when = occasion.daysUntil === 0 ? "اليوم" : "خلال " + occasion.daysUntil + " يوم";
  const intro = `\n\nتنبيه بخصوص التوقيت: مناسبة "${occasion.name}" قادمة ${when} (بتاريخ ${occasion.date}).`;

  if (isFree) {
    return (
      intro +
      ` إذا كانت هذه المناسبة تناسب طبيعة هذا المشروع بشكل منطقي وطبيعي، اجعل الفكرة الوحيدة مرتبطة بها مباشرة (في الفكرة والكابشن والهاشتاغات). وإن لم تكن مناسبة لطبيعة المشروع، تجاهل هذا التنبيه تماماً ولا تفتعل الربط.`
    );
  }

  return (
    intro +
    ` إذا كانت هذه المناسبة تناسب طبيعة هذا المشروع، خصّص يوماً واحداً على الأقل (وليس كل الأيام) من الخطة ليكون مرتبطاً بها بشكل طبيعي. وإن لم تكن مناسبة لطبيعة المشروع، تجاهل هذا التنبيه تماماً ولا تفتعل الربط.`
  );
}

function extractJson(text) {
  try {
    return JSON.parse(text);
  } catch (_) {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    throw new Error("تعذّر تحليل رد النموذج كـ JSON صالح");
  }
}

// يبني كتلة "تعليمات إضافية" اختيارية خاصة بميزات PRO/PREMIUM ويُدرجها داخل الـ prompt
// الأساسي قبل استدعاء Claude مباشرة. كل ميزة مستقلة ومُفعَّلة فقط إذا زُوِّدت قيمتها:
// - language: يفرض لغة كتابة صريحة تتجاوز الكشف التلقائي لِلغة وصف المشروع (PRO/PREMIUM).
// - tone: يفرض نبرة كتابة محددة (احترافية، ودّية، فكاهية...) بدل ترك Claude يختارها تلقائياً (PRO/PREMIUM).
// - goal: يوجّه المحتوى نحو هدف تسويقي محدد (مبيعات، تفاعل، وعي بالعلامة...) (PRO/PREMIUM).
// - platform: يكيّف أسلوب المحتوى وطوله مع منصة تواصل اجتماعي محددة بدل نمط عام (PRO/PREMIUM).
// - sourceText: "إعادة تدوير المحتوى" — يطلب بناء المنشورات من نص مصدر بدل الوصف فقط (PREMIUM).
// - visualStyle: "التوجيه الفني للصور" (Visual Direction) — حصري لباقة Premium فقط (بخلاف بقية
//   الحقول أعلاه المتاحة لـ PRO أيضاً)، محسوم من realPlan في الخادم فقط، بغض النظر عمّا يرسله
//   العميل. أي طلب من Free أو Pro يحاول تمرير قيمة مخصّصة يُعاد فرضها إلى "auto" قبل الوصول
//   لهذه الدالة أصلاً (راجع منطق cleanVisualStyle في المعالج أدناه) — لذلك وصول قيمة غير فارغة
//   هنا يعني بالضرورة أن الطلب من باقة Premium حقيقية.
// - includeImagePrompt: يطلب أمر توليد صورة (Midjourney-style) لكل يوم (PREMIUM فقط، محسوم من realPlan في الخادم).
function buildExtraInstructions({ language, tone, goal, platform, sourceText, visualStyle, includeImagePrompt }) {
  const parts = [];

  if (language) {
    parts.push(
      "CRITICAL: You MUST write the final content entirely in " + language + ". " +
      "This language choice overrides any other language instruction elsewhere in this prompt " +
      "(including the instruction to match the business description's own language) — use " +
      language + " for every text field, for every day, no exceptions."
    );
  }

  if (tone) {
    parts.push(
      "TONE OF VOICE: Write every post in a " + tone + " tone of voice. Keep this tone consistent " +
      "across all days and all fields (idea, caption, hashtags)."
    );
  }

  if (goal) {
    parts.push(
      "CONTENT GOAL: The primary goal of this content plan is to " + goal + ". Frame every post's " +
      "idea and caption so it clearly serves this goal, not just generic engagement."
    );
  }

  if (platform) {
    parts.push(
      "TARGET PLATFORM: Tailor the content specifically for " + platform + " — match the caption " +
      "length, hashtag style, and content format conventions that perform best on that platform."
    );
  }

  if (sourceText) {
    parts.push(
      'CONTENT REPURPOSING: Base all your posts strictly on the information provided in this text: "' +
      sourceText + '". Treat it as your primary source material instead of inventing unrelated ideas.'
    );
  }

  if (visualStyle) {
    parts.push(
      'VISUAL DIRECTION (PREMIUM-EXCLUSIVE): The client has specifically requested a "' + visualStyle +
      '" visual style for this campaign. Make sure the "imageIdea" field (and the "imagePrompt" field, ' +
      "if present) for every single day explicitly reflects this visual direction — describe the scene, " +
      "composition, and styling in a way that clearly matches it, instead of a generic visual suggestion."
    );
  }

  if (includeImagePrompt) {
    parts.push(
      "AI IMAGE PROMPTS: For each post, also generate a detailed 2-sentence English prompt for an AI " +
      'image generator (like Midjourney) that perfectly matches the post\'s visual concept, and put it ' +
      'in a field called "imagePrompt".'
    );
  }

  if (parts.length === 0) return "";

  return (
    "\n\nتعليمات إضافية إلزامية (ميزات PRO/PREMIUM — يجب تطبيقها بدقة):\n" +
    parts.map((p, i) => (i + 1) + ". " + p).join("\n")
  );
}

// ---------------------------------------------------------------------------
// One generation = one complete ad (all plans). The same copy feeds the post (caption and
// hashtags) and the ad design (headline, subheadline, offer badge, benefit chips, button), so
// the image and the post tell the same story.
// The word limits below are also enforced in code by normalizeAd(), because these texts are
// later drawn on the ad design and must fit its templates.
// ---------------------------------------------------------------------------
const AD_HEADLINE_MAX_WORDS = 8;
const AD_SUBHEADLINE_MAX_WORDS = 10;
const AD_CAPTION_MAX_WORDS = 40;
const AD_CTA_MAX_WORDS = 4;
const AD_BADGE_MAX_WORDS = 3;
const AD_BENEFIT_MAX_WORDS = 3;
const AD_BENEFIT_DETAIL_MAX_WORDS = 7;
const AD_QUALITY_MAX_WORDS = 2;
// Icons the ad design can draw (frontend/src/adTemplates.js). The copy picks one per item.
const AD_ICONS = ["drop", "leaf", "shield", "sparkle", "clock", "heart", "star", "sun", "bolt", "check", "flower", "award"];

function buildAdPrompt(businessDescription, occasion, options) {
  const opts = options || {};
  const extraInstructions = opts.extraInstructions || "";
  const offer = opts.offer || "";
  const product = opts.product || "";
  const occasionNote = occasion
    ? "\nUpcoming occasion you may tie the ad to, only if it fits naturally: " + occasion.name + " (" + occasion.date + ").\n"
    : "";
  const productNote = product
    ? '\nWhat this ad advertises (the product and what it does): "' + product + '". The whole ad is about this product.\n'
    : "";
  const avoid = (opts.avoidScenes || []).filter(Boolean).slice(0, 4);
  const avoidNote = avoid.length
    ? "\nStyled sets already used for this product — the new sceneIdeas must be clearly different from all of them (other props, other surface, other light):\n" +
      avoid.map((a) => "- " + a).join("\n") + "\n"
    : "";
  const offerNote = offer
    ? '\nThe business wants this offer / call to action featured: "' + offer + '". Build the ad around it, base the "cta" on it and write the "offerBadge" from it.\n'
    : '\nNo offer was given: "offerBadge" must be an empty string. Do not invent a discount.\n';

  return `You are a senior advertising copywriter at a performance marketing agency. You write one complete, ready-to-run social media ad: the text printed on the ad image and the post that goes with it. Both must tell the same story.

The business (as described by its owner):
"${businessDescription}"
${productNote}${occasionNote}${offerNote}${avoidNote}
LANGUAGE (mandatory): detect the language the business description is written in and write every field in that same language and script. If it is in Moroccan Darija, answer in Darija in the same script. Never switch language unless an instruction below says so.

Write exactly ONE ad with these fields:
- "headline": the main line printed on the ad image. At most ${AD_HEADLINE_MAX_WORDS} words. Punchy, specific to this product, no hashtags, no emojis, no quotation marks, no final period.
- "subheadline": one supporting line printed under the headline. At most ${AD_SUBHEADLINE_MAX_WORDS} words. Says what the product is or does; does not repeat the headline. No emojis.
- "offerBadge": the offer as a sticker, ${AD_BADGE_MAX_WORDS} words at most (for example "20% OFF" or "Free delivery"). Empty string when no offer was given.
- "benefits": exactly 3 benefits, each an object {"title": 1 to ${AD_BENEFIT_MAX_WORDS} words (for example "24h hydration"), "detail": one short line of explanation, ${AD_BENEFIT_DETAIL_MAX_WORDS} words at most, "icon": one of ${AD_ICONS.join(", ")}}. Concrete, true to the description, no emojis, no punctuation at the end.
- "highlight": the single strongest benefit as a sticker, ${AD_BADGE_MAX_WORDS} words at most. It is shown where the offer badge would be when there is no offer. Never a price or a discount.
- "qualities": 3 or 4 short product qualities for a strip at the bottom of the image, each an object {"label": 1 to ${AD_QUALITY_MAX_WORDS} words, "icon": one of the icons above}. Use ONLY qualities stated in or directly implied by the description. Never invent certifications, tests, awards, origins or percentages.
- "sceneIdeas": exactly 3 different descriptions, always in English, 25 to 35 words each, of a styled advertising set for the product photo: props chosen from what the product is made of or evokes (for example petals, water splash, cream swirl, leaves, fruit slices, fabric, stones), a podium or surface, and the lighting. Each idea must be clearly different from the others. No people, no hands, no text, no other packaged products.
- "caption": the ready-to-post text that goes with the image. At most ${AD_CAPTION_MAX_WORDS} words. Opens with a hook, uses the same benefits as the chips, ends by leading into the call to action.
- "cta": the call-to-action button label. ${AD_CTA_MAX_WORDS} words at most (for example "Shop now"). No emojis.
- "hashtags": exactly 5 hashtags specific to this business, each starting with #.
${extraInstructions}

Answer with valid JSON only, no text before or after, no Markdown code fences, exactly in this shape:

{"ad": {"headline": "...", "subheadline": "...", "offerBadge": "...", "highlight": "...", "benefits": [{"title": "...", "detail": "...", "icon": "..."}, {"title": "...", "detail": "...", "icon": "..."}, {"title": "...", "detail": "...", "icon": "..."}], "qualities": [{"label": "...", "icon": "..."}, {"label": "...", "icon": "..."}, {"label": "...", "icon": "..."}], "caption": "...", "cta": "...", "hashtags": ["#...", "#...", "#...", "#...", "#..."], "sceneIdeas": ["...", "...", "..."]}}`;
}

function limitWords(text, maxWords) {
  const words = String(text || "").trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return words.join(" ");
  return words.slice(0, maxWords).join(" ");
}

// Caption over the limit: prefer cutting at the last sentence end inside the limit, so the
// text never stops mid-sentence unless there is no sentence boundary at all.
function limitCaption(text, maxWords) {
  const words = String(text || "").trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return words.join(" ");
  const cut = words.slice(0, maxWords).join(" ");
  const lastEnd = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "), cut.lastIndexOf("? "), cut.lastIndexOf("؟ "));
  if (lastEnd > cut.length * 0.5) return cut.slice(0, lastEnd + 1);
  return cut;
}

function normalizeAd(raw) {
  const headline = limitWords(String(raw.headline || raw.idea || "").replace(/["“”«»]/g, "").replace(/[.\s]+$/, ""), AD_HEADLINE_MAX_WORDS);
  const caption = limitCaption(raw.caption, AD_CAPTION_MAX_WORDS);
  const cta = limitWords(raw.cta || raw.callToAction || "", AD_CTA_MAX_WORDS);
  const subheadline = limitWords(String(raw.subheadline || "").replace(/[.\s]+$/, ""), AD_SUBHEADLINE_MAX_WORDS);
  const offerBadge = limitWords(String(raw.offerBadge || raw.badge || "").replace(/[.\s]+$/, ""), AD_BADGE_MAX_WORDS);
  const tidy = (v, max) => limitWords(String(v || "").replace(/[.,;!\s]+$/, ""), max);
  const icon = (v, fallback) => (AD_ICONS.includes(String(v || "").trim().toLowerCase()) ? String(v).trim().toLowerCase() : fallback);
  // Benefits arrive as {title, detail, icon}; a plain string is accepted as a title.
  const benefitItems = (Array.isArray(raw.benefits) ? raw.benefits : [])
    .map((b) => (b && typeof b === "object" ? b : { title: b }))
    .map((b) => ({ title: tidy(b.title, AD_BENEFIT_MAX_WORDS), detail: tidy(b.detail, AD_BENEFIT_DETAIL_MAX_WORDS), icon: icon(b.icon, "check") }))
    .filter((b) => b.title)
    .slice(0, 3);
  const benefits = benefitItems.map((b) => b.title);
  const benefitDetails = benefitItems.map((b) => b.detail);
  const benefitIcons = benefitItems.map((b) => b.icon);
  const highlight = tidy(raw.highlight, AD_BADGE_MAX_WORDS) || benefits[0] || "";
  const qualityItems = (Array.isArray(raw.qualities) ? raw.qualities : [])
    .map((q) => (q && typeof q === "object" ? q : { label: q }))
    .map((q) => ({ label: tidy(q.label, AD_QUALITY_MAX_WORDS), icon: icon(q.icon, "star") }))
    .filter((q) => q.label)
    .slice(0, 4);
  const sceneIdeas = (Array.isArray(raw.sceneIdeas) ? raw.sceneIdeas : [])
    .map((x) => String(x || "").replace(/\s+/g, " ").trim().slice(0, 320))
    .filter(Boolean)
    .slice(0, 3);
  const hashtags = (Array.isArray(raw.hashtags) ? raw.hashtags : [])
    .map((h) => String(h || "").trim())
    .filter(Boolean)
    .map((h) => (h.startsWith("#") ? h : "#" + h))
    .slice(0, 5);
  return {
    headline, subheadline, offerBadge, highlight, benefits, benefitDetails, benefitIcons,
    qualities: qualityItems.map((q) => q.label), qualityIcons: qualityItems.map((q) => q.icon),
    caption, cta, hashtags, sceneIdeas,
  };
}


// ---------------------------------------------------------------------------
// Ad copy. Writes one complete ad with the stronger model on paid plans (Sonnet) and the
// cheaper one on the free plan (Haiku). Called by the ad job (backend/adJobs.js), which owns
// credits, the one-job-at-a-time lock and the polling flow; nothing here touches Firestore.
//
// Returns { ad, sceneIdeas, model, usage: { inputTokens, outputTokens }, clean: {...} }.
// Throws when the model reply cannot be used.
// ---------------------------------------------------------------------------
async function generateAdCopy(description, input, realPlan) {
  const isFree = realPlan === "free";
  const str = (v, max) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : "");
  const upcomingOccasion = findUpcomingOccasion(new Date(), OCCASION_LOOKAHEAD_DAYS);

  // Paid-only writing options. The real plan (from Firestore) decides, never the client.
  const clean = {
    language: isFree ? "" : str(input.language, 60),
    tone: isFree ? "" : str(input.tone, 60),
    goal: isFree ? "" : str(input.goal, 80),
    platform: isFree ? "" : str(input.platform, 40),
    sourceText: realPlan === "premium" ? str(input.sourceText, 6000) : "",
    offer: str(input.offer, 120),
    // "What are you advertising?" — the product name and what it does (all plans).
    product: str(input.product, 120),
  };
  const extraInstructions = isFree
    ? ""
    : buildExtraInstructions({
        language: clean.language,
        tone: clean.tone,
        goal: clean.goal,
        platform: clean.platform,
        sourceText: clean.sourceText,
        visualStyle: "",
        includeImagePrompt: false,
      });

  const model = isFree ? MODEL_FREE : MODEL_PAID;
  const prompt = buildAdPrompt(description, upcomingOccasion, {
    extraInstructions,
    offer: clean.offer,
    product: clean.product,
    avoidScenes: Array.isArray(input.avoidScenes) ? input.avoidScenes : [],
  });
  const response = await anthropic.messages.create({
    model,
    max_tokens: getPlanMaxTokens(realPlan),
    messages: [{ role: "user", content: prompt }],
  });
  const usage = {
    inputTokens: (response.usage && response.usage.input_tokens) || 0,
    outputTokens: (response.usage && response.usage.output_tokens) || 0,
  };

  const rawText = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n");
  const parsed = extractJson(rawText);
  const rawAd = parsed && (parsed.ad || (Array.isArray(parsed.content) ? parsed.content[0] : null));
  if (!rawAd || typeof rawAd !== "object") {
    throw new Error(
      response.stop_reason === "max_tokens"
        ? "model reply was cut off (max_tokens) before the JSON was complete"
        : "model reply does not contain a valid ad object"
    );
  }
  const { sceneIdeas, ...ad } = normalizeAd(rawAd);
  if (!clean.offer) ad.offerBadge = ""; // never show a discount the customer did not give
  if (!ad.headline || !ad.caption) {
    throw new Error("model reply is missing the headline or the caption");
  }
  return { ad, sceneIdeas, model, usage, clean };
}

// ---------------------------------------------------------------------------
// أداة SEO مجانية مصغّرة (Micro-Tool) — الهدف منها جلب زيارات من محركات البحث عبر
// صفحات هبوط مستقلة (مثلاً /tools/instagram، /tools/restaurant...). هذا المسار
// مستقل تماماً عن نظام الحسابات والباقات: لا Firebase ID Token، لا قراءة/كتابة في
// Firestore (لا يستهلك أي حصة generationsUsed من أي مستخدم)، ويستخدم نموذجاً أرخص
// وأسرع بحد أقصى منخفض من التوكنز لأن المطلوب منشور واحد فقط في كل مرة.
// ---------------------------------------------------------------------------

// نفس معرّف Haiku الحالي والصالح رسمياً المستخدم في MODEL_FREE أعلاه (راجع تعليقه المفصّل):
// claude-3-haiku-20240307 و claude-3-5-haiku-20241022 كلاهما متقاعَد (Retired) رسمياً من
// Anthropic ولا يعملان إطلاقاً بعد الآن. claude-haiku-4-5-20251001 هو البديل الرسمي الحالي.
const MICRO_TOOL_MODEL = "claude-haiku-4-5-20251001";
const MICRO_TOOL_MAX_TOKENS = 300;

// تعليمات مخصّصة لكل نوع أداة (toolType) — كل واحدة تحدد "شخصية" الذكاء الاصطناعي
// ونوع المنشور المطلوب. أضف مفتاحاً جديداً هنا لإضافة أداة جديدة لاحقاً (مثلاً "gym"، "salon"...)
// دون الحاجة لتغيير أي شيء آخر في هذا المسار.
const MICRO_TOOL_PROMPTS = {
  instagram:
    "You are a social media expert. Write ONE single ready-to-publish Instagram caption based on the description below. Use emojis naturally within the text.",
  "real-estate":
    "You are a real estate marketing expert. Write ONE single scroll-stopping social media post advertising the property described below. Use emojis naturally within the text.",
  restaurant:
    "You are a restaurant social media marketing expert. Write ONE single mouth-watering social media post promoting the dish, offer, or event described below. Use emojis naturally within the text.",
  linkedin:
    "You are a LinkedIn content strategist. Write ONE single professional LinkedIn post based on the update described below. Use a professional tone, with at most 1-2 tasteful emojis.",
};

function buildMicroToolPrompt(toolType, businessDescription) {
  const roleInstruction =
    MICRO_TOOL_PROMPTS[toolType] ||
    "You are a social media expert. Write ONE single ready-to-publish social media post based on the description below. Use emojis naturally within the text.";

  return `${roleInstruction}

Description provided by the user:
"${businessDescription}"

Rules:
- Write ONLY one single post — not a list, not multiple options, not variations.
- Write the post in the same language as the description above.
- End the post with exactly 5 relevant hashtags, each starting with #.
- Output the post text only — no explanation, no preamble, no Markdown formatting.`;
}

app.post("/api/micro-tool", async (req, res) => {
  const origin = req.headers.origin || "(بدون origin)";
  console.log("[server.js] === طلب جديد /api/micro-tool من: " + origin + " ===");

  try {
    if (!ANTHROPIC_API_KEY) {
      console.error("[server.js] [micro-tool] إيقاف الطلب: ANTHROPIC_API_KEY غير محمّل.");
      return res.status(500).json({ success: false, errorCode: "SERVER_NOT_READY", error: "الخادم غير جاهز حالياً. حاول لاحقاً." });
    }

    const { businessDescription, toolType } = req.body;
    const description = typeof businessDescription === "string" ? businessDescription.trim() : "";
    const cleanToolType = typeof toolType === "string" ? toolType.trim() : "";

    if (!description) {
      return res.status(400).json({ success: false, errorCode: "DESCRIPTION_REQUIRED", error: "الرجاء كتابة وصف قبل التوليد." });
    }

    // حماية بسيطة من إساءة الاستخدام: حد أقصى لطول الوصف حتى في هذه الأداة المجانية بدون حساب.
    const trimmedDescription = description.slice(0, 1000);
    const prompt = buildMicroToolPrompt(cleanToolType, trimmedDescription);

    console.log(
      "[server.js] [micro-tool] toolType=" + (cleanToolType || "(غير محدد — استُخدمت تعليمة عامة)") +
      " model=" + MICRO_TOOL_MODEL + " max_tokens=" + MICRO_TOOL_MAX_TOKENS
    );

    const response = await anthropic.messages.create({
      model: MICRO_TOOL_MODEL,
      max_tokens: MICRO_TOOL_MAX_TOKENS,
      messages: [{ role: "user", content: prompt }],
    });

    if (response.usage) {
      console.log(
        "[server.js] [micro-tool] 💰 input_tokens=" + (response.usage.input_tokens ?? 0) +
        " output_tokens=" + (response.usage.output_tokens ?? 0) +
        " | stop_reason=" + (response.stop_reason || "غير متوفر")
      );
    }

    const text = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n")
      .trim();

    // لا تحقق من هوية ولا أي كتابة إلى Firestore هنا عمداً — أداة تسويقية مجانية بالكامل
    // (بدون حساب)، لا يجب أن تستهلك حصة generationsUsed الخاصة بأي مستخدم مسجَّل.
    res.json({ result: text });
  } catch (error) {
    console.error(
      "[server.js] [micro-tool] CLAUDE GENERATION ERROR: " +
        (error.name || "") +
        " " +
        (error.status ? "(status " + error.status + ") " : "") +
        error.message
    );
    res.status(500).json({ success: false, errorCode: "GENERATION_FAILED", error: "حدث خطأ أثناء التوليد. حاول مرة أخرى." });
  }
});

// على Vercel يتم استدعاء التطبيق كدالة استجابة serverless عبر @vercel/node (انظر
// "export default app" أدناه)؛ استدعاء app.listen() هناك غير ضروري (Vercel لا يستخدم منفذاً
// طويل الأمد) وقد يسبب مشاكل مع إعادة استخدام الدالة (lambda) بين الطلبات. process.env.VERCEL
// يُضبط تلقائياً بالقيمة "1" بواسطة منصة Vercel نفسها في كل بيئة تشغيل هناك.
// The ad generator (/api/quota, /api/ad/*, /api/photos, /api/design/image) lives in backend/adJobs.js.
// Models: the stronger one (MODEL_PAID) only writes the ad copy on paid plans; every vision
// call (photo choice, scene quality check) uses the cheapest suitable one (MODEL_FREE, Haiku).
registerAdJobRoutes(app, {
  getDb: () => db,
  verifyFirebaseToken,
  anthropic,
  hasAnthropicKey: () => Boolean(ANTHROPIC_API_KEY),
  loadEnvVar,
  getPlanLimits,
  currentMonthKey,
  FieldValue,
  generateAdCopy,
  visionModel: MODEL_FREE,
});

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log("Backend running on http://localhost:" + PORT);
  });
}

// مطلوب من أداة البناء @vercel/node لاستخدام تطبيق Express هذا كمعالج طلبات (request handler)
// مباشرة، دون تشغيل خادم HTTP فعلي بأنفسنا.
export default app;
