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

// ---------------------------------------------------------------------------
// تمت إزالة تكامل Lemon Squeezy بالكامل (قرار عمل: التحويل الحصري إلى Paddle). مكان
// ويبهوك الدفع القادم من Paddle سيكون هنا — يُعرَّف بنفس الترتيب (قبل app.use(express.json())
// أدناه مباشرة) لو احتاج Paddle أيضاً الجسم الخام (raw body) للتحقق من توقيع HMAC، تماماً
// كما كان الحال مع Lemon Squeezy.
// ---------------------------------------------------------------------------

app.use(express.json());

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
  free: { maxDays: 1, maxGenerationsPerMonth: 1, label: "المجانية" },
  pro: { maxDays: 7, maxGenerationsPerMonth: 5, label: "برو" },
  premium: { maxDays: 7, maxGenerationsPerMonth: 12, label: "بريميوم" },
};

function getPlanLimits(plan) {
  return PLAN_LIMITS[plan] || PLAN_LIMITS.free;
}

// أقصى عدد توكنز للرد (max_tokens) لكل باقة — قيم ثابتة متفق عليها لكل مستوى.
// الباقة المجانية منخفضة لأنها فكرة واحدة فقط، أما الباقات المدفوعة فأعلى بكثير لتغطية
// سبرنت أسبوعي كامل (حتى 7 أيام، راجع PLAN_LIMITS.maxDays أعلاه) دون انقطاع رد الـ JSON
// قبل اكتماله. القيم لم تُخفَّض رغم أن الحد الأقصى للأيام صار 7 بدل 30/90 سابقاً — هامش
// إضافي متعمَّد، غير ضار (max_tokens سقف أقصى فقط ولا يُدفع عنه إن لم يُستخدم بالكامل).
const PLAN_MAX_TOKENS = { free: 1000, pro: 10000, premium: 25000 };

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

function buildPrompt(limit, businessDescription, occasion, options) {
  const opts = options || {};
  const extraInstructions = opts.extraInstructions || "";
  const includeImagePrompt = !!opts.includeImagePrompt;

  // حقل "imagePrompt" الإضافي (PREMIUM فقط) — يُضاف بشرط لوصف الحقل ولقالب JSON معاً
  // حتى يبقى الاثنان متزامنين ولا ننسى أحدهما عند تفعيل/تعطيل الميزة.
  const imagePromptFieldDoc = includeImagePrompt
    ? '\n- "imagePrompt": أمر (prompt) تفصيلي بالإنجليزية من جملتين بالضبط لأداة توليد صور بالذكاء الاصطناعي (مثل Midjourney)، يطابق تماماً المشهد البصري المقترح لهذا اليوم'
    : "";
  const imagePromptJsonField = includeImagePrompt ? ', "imagePrompt": "..."' : "";

  return `أنت خبير تسويق عبر وسائل التواصل الاجتماعي متخصص في إنستغرام لأصحاب الأعمال الصغيرة والمتوسطة.

وصف المشروع الذي تكتب له خطة المحتوى (كما أدخله صاحب المشروع):
"${businessDescription}"

المطلوب: أنشئ خطة محتوى إنستغرام لعدد ${limit} يوم متتالي، مخصصة لهذا المشروع تحديداً. استفد من تفاصيل الوصف أعلاه في الأفكار كلما أمكن بدل الاكتفاء بأفكار عامة تصلح لأي مشروع.${buildOccasionNote(occasion, false)}

تعليمات إلزامية بخصوص اللغة (مهم جداً — اقرأها بعناية): اكتشف اللغة التي كُتب بها "وصف المشروع" أعلاه بالضبط، واكتب كل النصوص في ردّك (idea، caption، الهاشتاغات، imageIdea، bestTime) بنفس تلك اللغة تحديداً — سواء كانت عربية أو إنجليزية أو فرنسية أو إسبانية أو أي لغة أخرى. لا تُترجم وصف المشروع ولا تُبدّل لغته أبداً، ولا تلتزم بلغة هذه التعليمات نفسها (فهي مكتوبة بالعربية لأسباب داخلية فقط ولا علاقة لها بلغة الرد المطلوب). (إن وُجدت تعليمة لغة صريحة أدناه ضمن "تعليمات إضافية إلزامية"، فهي التي تُطبَّق بدل هذا الكشف التلقائي.)

تعليمات إلزامية بخصوص طول كل يوم (مهم جداً):
لكل يوم: عنوان قصير، نص منشور بين 40 و60 كلمة، 5 هاشتاغات، سطر لاقتراح الصورة، ووقت النشر. حافظ على هذا الطول في كل الأيام لضمان اكتمال التقويم.

لكل يوم، أعطني فكرة محتوى تحتوي بالضبط على الحقول التالية:
- "idea": عنوان قصير وجذاب لفكرة المحتوى (بنفس لغة وصف المشروع)
- "caption": نص منشور جاهز للنشر يشرح الفكرة (بنفس لغة وصف المشروع)، يجب أن يكون طوله بين 40 و60 كلمة بالضبط تقريباً — لا تقل عن 40 كلمة ولا تتجاوز 60 كلمة
- "hashtags": مصفوفة من 5 هاشتاغات بالضبط مناسبة (كل هاشتاغ يبدأ بالرمز #، وبنفس لغة وصف المشروع كلما كان ذلك طبيعياً)
- "imageIdea": سطر واحد يقترح صورة مناسبة لمرافقة المنشور (وصف مختصر لمشهد أو تكوين الصورة، بنفس لغة وصف المشروع)
- "bestTime": أفضل وقت مقترح للنشر بصيغة نصية مثل "9:00 AM"${imagePromptFieldDoc}
${extraInstructions}

نوّع بين أنواع محتوى فعالة مثل: عرض منتج، كواليس العمل، مشكلة وحل، قصة نجاح أو شهادة عميل، عرض محدود، نصيحة مفيدة، وتفاعل مع المتابعين. لا تكرر نفس فكرة المحتوى في يومين متتاليين. حافظ بدقة على طول كل حقل كما هو محدد أعلاه في كل الأيام الـ ${limit} دون استثناء، لضمان اكتمال الرد بصيغة JSON صالحة دون انقطاع.

أجب حصراً بصيغة JSON صالحة، بدون أي نص قبلها أو بعدها، وبدون استخدام Markdown code fences، بالشكل التالي بالضبط:

{"content": [{"idea": "...", "caption": "...", "hashtags": ["#...", "#...", "#...", "#...", "#..."], "imageIdea": "...", "bestTime": "..."${imagePromptJsonField}}, ...]}

يجب أن تحتوي مصفوفة "content" على ${limit} عنصر بالضبط، بنفس الترتيب من اليوم 1 إلى اليوم ${limit}.`;
}

function buildFreeTierPrompt(businessDescription, occasion) {
  return `أنت استراتيجي محتوى إنستغرام مبدع، متخصص في أفكار محددة جداً وليس نصائح عامة.

المشروع: "${businessDescription}"

أعطني فكرة محتوى واحدة فقط، استثنائية الجودة، ومحددة جداً لهذا المشروع بالذات — استخدم تفاصيل ملموسة من وصفه (نوع المنتج، المكان، الطابع الخاص). ممنوع أي فكرة عامة مستهلكة مثل "كواليس المنتج" أو "كواليس العمل" أو "شهادة عميل" أو "قصة نجاح" أو أي فكرة تصلح لأي مشروع آخر بنفس الشكل.${buildOccasionNote(occasion, true)}

تعليمات إلزامية بخصوص اللغة (مهم جداً — اقرأها بعناية): اكتشف اللغة التي كُتب بها "المشروع" أعلاه بالضبط، واكتب كل النصوص في ردّك (idea، shotAngle، caption، الهاشتاغات، imageIdea، bestTime) بنفس تلك اللغة تحديداً — سواء كانت عربية أو إنجليزية أو فرنسية أو إسبانية أو أي لغة أخرى. لا تُترجم وصف المشروع ولا تُبدّل لغته أبداً، ولا تلتزم بلغة هذه التعليمات نفسها (فهي مكتوبة بالعربية لأسباب داخلية فقط ولا علاقة لها بلغة الرد المطلوب).

تنبيه بخصوص الطول (مهم): النص الكامل ("caption") يجب أن يكون بين 40 و60 كلمة بالضبط تقريباً.

الحقول المطلوبة بالضبط:
- "idea": عنوان قصير لجوهر الفكرة (بنفس لغة وصف المشروع)
- "shotAngle": زاوية التصوير أو طريقة التنفيذ، بدقة كافية ليصوّرها صاحب المشروع بهاتفه (بنفس لغة وصف المشروع)
- "caption": النص الكامل الجاهز للنشر مباشرة (وليس ملخصاً)، بين 40 و60 كلمة، بنفس لغة وصف المشروع
- "hashtags": 5 هاشتاغات بالضبط مخصصة لهذا المشروع تحديداً (بنفس لغة وصف المشروع كلما كان ذلك طبيعياً)
- "imageIdea": سطر واحد يقترح صورة ثابتة مناسبة لمرافقة المنشور (بالإضافة إلى زاوية التصوير أعلاه، بنفس لغة وصف المشروع)
- "bestTime": أفضل وقت للنشر مثل "9:00 AM"

أجب بصيغة JSON صالحة فقط، بدون أي نص إضافي ولا Markdown code fences، بعنصر واحد بالضبط:

{"content": [{"idea": "...", "shotAngle": "...", "caption": "...", "hashtags": ["#...", "#...", "#...", "#...", "#..."], "imageIdea": "...", "bestTime": "..."}]}`;
}

// عناصر "مقفلة" ثابتة (بدون أي استدعاء لـ Claude) لتمثيل باقي أيام الشهر في الباقة المجانية.
// الحماية هنا حقيقية على مستوى الخادم: لا يتم توليد أي محتوى فعلي لهذه الأيام إطلاقاً،
// فقط رقم اليوم يُرسل للواجهة لعرضه كبطاقة مقفلة — هذا يوفر تكلفة استدعاء API أيضاً.
function buildLockedDayStubs(fromDay, toDay) {
  const stubs = [];
  for (let d = fromDay; d <= toDay; d++) {
    stubs.push({
      day: d,
      locked: true,
      title: "اليوم " + d,
    });
  }
  return stubs;
}

// ---------------------------------------------------------------------------
// حجز محاولة توليد ذرّياً من Firestore (Transaction) — يُنفَّذ إلزامياً قبل أي استدعاء
// لواجهة Claude API مباشرة، لأي باقة كانت (Free/Pro/Premium) دون استثناء.
//
// لماذا معاملة (transaction) وليس مجرد "اقرأ ثم تحقق ثم حدّث لاحقاً" كما كان سابقاً؟
// لأن القراءة والتحديث المنفصلين يفتحان ثغرة سباق حقيقية (race condition/TOCTOU): لو أرسل
// نفس المستخدم طلبين متزامنين تقريباً (نقرة مزدوجة سريعة على الزر، أو تبويبين مفتوحين لنفس
// الحساب)، فقد يقرأ الطلبان نفس القيمة القديمة لـ generationsUsed معاً، فيجتاز كلاهما فحص
// "هل تجاوز الحد؟" رغم أن تنفيذ الاثنين معاً يتجاوز الحصة فعلياً. معاملة Firestore تضمن أن
// القراءة والتحديث يحدثان كوحدة واحدة غير قابلة للتجزئة (atomic) من منظور الخادم، فإما ينجح
// طلب واحد فقط في "حجز" الفتحة الأخيرة من الحصة، أو تُعاد المعاملة تلقائياً عند التعارض.
//
// الحجز نفسه (زيادة العداد) يحدث هنا فوراً بمجرد اجتياز الفحص — وليس بعد نجاح التوليد كما
// كان سابقاً — تحديداً لسدّ ثغرة السباق أعلاه. الثمن: لو فشل التوليد لاحقاً (خطأ من Claude
// API، انقطاع شبكة، JSON غير صالح...) يجب إرجاع هذه المحاولة يدوياً (rollback) حتى لا يخسر
// المستخدم من رصيده بسبب خطأ ليس من طرفه — راجع كتلة catch في نهاية المسار أدناه.
//
// عند تجاوز الحصة: يرمي خطأً بخاصية code = "QUOTA_EXCEEDED" (مع realPlan وlimits المرفقين)
// دون أي كتابة على المستند إطلاقاً — الطلب يُرفض فوراً قبل الوصول لأي استدعاء لـ Claude API.
async function reserveGenerationSlot(uid) {
  const userRef = db.collection("users").doc(uid);
  const nowKey = currentMonthKey();

  return db.runTransaction(async (transaction) => {
    const userSnap = await transaction.get(userRef);
    if (!userSnap.exists) {
      const err = new Error("لا توجد وثيقة Firestore لهذا المستخدم");
      err.code = "USER_NOT_FOUND";
      throw err;
    }

    const userData = userSnap.data();
    const realPlan = userData.plan || "free";
    const limits = getPlanLimits(realPlan);
    const lastResetMonth = userData.lastResetMonth || null;

    // تصفير تلقائي للعداد الشهري إن كنا في شهر جديد — يحدث هنا داخل نفس المعاملة أيضاً
    // (وليس كخطوة منفصلة قبلها) لضمان أن الفحص التالي مباشرة يعتمد على القيمة الصحيحة دائماً.
    let generationsUsed = typeof userData.generationsUsed === "number" ? userData.generationsUsed : 0;
    const wasReset = lastResetMonth !== nowKey;
    if (wasReset) {
      generationsUsed = 0;
    }

    // *** الفحص الحاسم: يجب أن يحدث قبل أي استدعاء لـ Claude API، وهو ما تضمنه بنية
    // الدالة هذه أصلاً — الدالة بأكملها تُستدعى وتُنتظر (await) قبل أي شيء آخر في المسار. ***
    if (generationsUsed >= limits.maxGenerationsPerMonth) {
      const err = new Error("تم تجاوز الحصة الشهرية المسموح بها لهذه الباقة");
      err.code = "QUOTA_EXCEEDED";
      err.realPlan = realPlan;
      err.limits = limits;
      throw err;
    }

    const reservedGenerationsUsed = generationsUsed + 1;
    transaction.update(userRef, {
      generationsUsed: reservedGenerationsUsed,
      lastResetMonth: nowKey,
    });

    return { realPlan, limits, generationsUsed: reservedGenerationsUsed, wasReset };
  });
}

app.post("/api/generate-content", async (req, res) => {
  const origin = req.headers.origin || "(بدون origin)";
  console.log("[server.js] === طلب جديد /api/generate-content من: " + origin + " ===");

  // ⚠️ السبب الحقيقي لخطأ "ReferenceError: uid is not defined" الذي كان يظهر في الـ catch
  // الخارجي أسفل هذه الدالة: كان "let uid;" مُعرَّفاً داخل كتلة try الخارجية (try { ... })، بينما
  // كتلة catch (error) { ... } المقابلة لها هي نطاق (scope) منفصل تماماً في JavaScript — أي
  // متغيّر بـ let/const مُعرَّف داخل try {} لا يكون مرئياً تلقائياً داخل catch {} الخاصة بها،
  // حتى لو كانتا جزءاً من نفس جملة try/catch. لذلك رفعت التعريف إلى هنا، قبل try الخارجية
  // مباشرة، ليصبح uid مرئياً داخل try وداخل catch معاً (وهو ما يحتاجه كود الـ rollback في
  // الـ catch الخارجي لاستدعاء db.collection("users").doc(uid)...).
  let uid = null;

  try {
    if (!db) {
      console.error("[server.js] إيقاف الطلب: Firebase Admin SDK غير مهيأ (serviceAccountKey.json مفقود أو غير صالح).");
      return res.status(500).json({
        success: false,
        errorCode: "SERVER_NOT_READY",
        error: "الخادم غير مهيأ للتحقق من حسابك حالياً. راجع console الخادم للتفاصيل.",
      });
    }

    // 1) التحقق من هوية المستخدم عبر Firebase ID Token — لا نثق بأي شيء يرسله العميل عن نفسه.
    try {
      uid = await verifyFirebaseToken(req);
    } catch (err) {
      console.warn("[server.js] رفض الطلب (401): " + err.message);
      return res.status(401).json({
        success: false,
        errorCode: "AUTH_REQUIRED",
        error: "الرجاء تسجيل الدخول أولاً قبل توليد المحتوى.",
      });
    }

    const { days, businessDescription, language, tone, goal, platform, sourceText, visualStyle } = req.body;

    const description = typeof businessDescription === "string" ? businessDescription.trim() : "";
    if (!description) {
      console.warn("[server.js] رفض الطلب: لم يتم إرسال وصف المشروع (businessDescription فارغ).");
      return res.status(400).json({
        success: false,
        errorCode: "DESCRIPTION_REQUIRED",
        error: "الرجاء وصف مشروعك أولاً قبل توليد المحتوى.",
      });
    }

    if (!ANTHROPIC_API_KEY) {
      console.error("[server.js] إيقاف الطلب: ANTHROPIC_API_KEY غير محمّل.");
      return res.status(500).json({
        success: false,
        errorCode: "API_KEY_MISSING",
        error:
          "لم يتم إعداد مفتاح Claude API على الخادم بعد (تعذّرت قراءته من backend/.env). راجع console الخادم للتفاصيل، ثم أعد تشغيله.",
      });
    }

    // 2) حجز محاولة توليد ذرّياً من Firestore عبر معاملة (transaction) — يتحقق من الباقة
    //    الحقيقية وحد الحصة الشهرية ويزيد العداد فوراً كـ "حجز"، بشكل آمن ضد سباق الطلبات
    //    المتزامنة. يُطبَّق هذا الفحص إلزامياً على جميع الباقات دون استثناء (راجع الدالة أعلاه
    //    لشرح تفصيلي لسبب استخدام معاملة بدل قراءة/تحديث منفصلين).
    let realPlan, limits, generationsUsed, wasReset;
    try {
      const reservation = await reserveGenerationSlot(uid);
      realPlan = reservation.realPlan;
      limits = reservation.limits;
      generationsUsed = reservation.generationsUsed;
      wasReset = reservation.wasReset;
    } catch (err) {
      if (err.code === "USER_NOT_FOUND") {
        console.warn("[server.js] رفض الطلب (404): لا توجد وثيقة Firestore للمستخدم " + uid);
        return res.status(404).json({
          success: false,
          errorCode: "USER_NOT_FOUND",
          error: "لم يتم العثور على ملف حسابك. حاول تسجيل الخروج والدخول من جديد.",
        });
      }
      if (err.code === "QUOTA_EXCEEDED") {
        console.warn(
          "[server.js] رفض الطلب (429): المستخدم " + uid + " تجاوز حد التوليد الشهري لباقة " + err.realPlan +
          " — تم الرفض قبل أي استدعاء لـ Claude API (لا تكلفة API على هذا الطلب)."
        );
        return res.status(429).json({
          success: false,
          errorCode: "QUOTA_EXCEEDED",
          // errorParams.plan هو معرّف الباقة (free/pro/premium) وليس تسمية عربية جاهزة، لأن الواجهة
          // هي من تترجم اسم الباقة عبر مساحة أسماء "plans" الخاصة بها حسب لغة المستخدم الحالية.
          errorParams: { plan: err.realPlan, max: err.limits.maxGenerationsPerMonth },
          error:
            "لقد استنفدت عدد التوليدات المسموح بها هذا الشهر لباقتك (" + err.limits.label + ": " +
            err.limits.maxGenerationsPerMonth + " توليد/شهر). سيُجدَّد رصيدك تلقائياً في بداية الشهر القادم، " +
            "أو يمكنك الترقية للحصول على رصيد أكبر.",
        });
      }
      // أي خطأ آخر غير متوقع أثناء الوصول إلى Firestore (شبكة، صلاحيات، إلخ) — نرفض الطلب
      // بأمان بدل المتابعة دون تحقق فعلي من الحصة.
      console.error("[server.js] خطأ غير متوقع أثناء حجز محاولة التوليد (uid=" + uid + "): " + err.message);
      return res.status(500).json({
        success: false,
        errorCode: "SERVER_NOT_READY",
        error: "تعذّر التحقق من رصيدك حالياً. حاول مرة أخرى بعد قليل.",
      });
    }

    if (wasReset) {
      console.log("[server.js] 🔄 تصفير تلقائي لعداد التوليد الشهري — uid=" + uid + " (شهر جديد)");
    }

    console.log(
      "[server.js] المستخدم=" + uid + " الباقة الحقيقية (من Firestore)=" + realPlan +
      " الاستهلاك الشهري بعد حجز هذه المحاولة=" + generationsUsed + "/" + limits.maxGenerationsPerMonth
    );

    // 5) الباقة الحقيقية (من Firestore) هي وحدها التي تحدد عدد الأيام المسموح به — وليس أي قيمة من العميل.
    const isFree = realPlan === "free";
    const limit = isFree ? 1 : Math.min(parseInt(days) || 5, limits.maxDays);

    // TASK 3 ("PREMIUM-EXCLUSIVE UPSELL FIELD") — اعتراض صريح لأي محاولة من باقة Free أو Pro
    // لتمرير visualStyle مخصّص. هذا التحقق مستقل تماماً عن أي حجب في الواجهة (App.js): حتى لو
    // تلاعب عميل مباشرة بالطلب المُرسل (Postman، fetch من console المتصفح...)، الخادم هنا هو من
    // يحسم الأمر فعلياً ويتجاهل القيمة، مع تسجيل محاولة كهذه في اللوج لأغراض المراقبة/الأمان.
    if (
      realPlan !== "premium" &&
      typeof visualStyle === "string" &&
      visualStyle.trim() &&
      visualStyle.trim().toLowerCase() !== "auto"
    ) {
      console.warn(
        '[server.js] ⚠️ تجاهل visualStyle مخصّص ("' + visualStyle.trim().slice(0, 60) + '") من طلب بباقة ' +
        realPlan + " (uid=" + uid + ") — هذا الحقل حصري لباقة Premium فقط، تم إجباره على \"auto\"."
      );
    }
    console.log(
      "[server.js] البيانات المستلمة: realPlan=" + realPlan + " limit=" + limit + "/" + limits.maxDays +
      " وصف المشروع (أول 40 حرفاً): \"" + description.slice(0, 40) + (description.length > 40 ? "..." : "") + "\""
    );

    // التحقق من وجود مناسبة مغربية/إسلامية قريبة (خلال OCCASION_LOOKAHEAD_DAYS يوماً) لربط الفكرة بها إن كانت مناسبة.
    const upcomingOccasion = findUpcomingOccasion(new Date(), OCCASION_LOOKAHEAD_DAYS);
    console.log(
      "[server.js] المناسبة القادمة القريبة: " +
        (upcomingOccasion
          ? upcomingOccasion.name + " (خلال " + upcomingOccasion.daysUntil + " يوم، بتاريخ " + upcomingOccasion.date + ")"
          : "لا توجد مناسبة خلال " + OCCASION_LOOKAHEAD_DAYS + " يوماً القادمة")
    );

    // ميزات PRO/PREMIUM: لغة كتابة صريحة، إعادة تدوير محتوى من نص مصدر، وأوامر صور تلقائية.
    // كلها مقيَّدة بالباقة الحقيقية من Firestore (realPlan) وليس بأي قيمة يرسلها العميل عن نفسه:
    // - language و sourceText: متاحان لأي باقة غير مجانية (PRO أو PREMIUM).
    // - includeImagePrompt: PREMIUM فقط.
    // الباقة المجانية (isFree) تبقى معزولة تماماً عن كل هذا — buildFreeTierPrompt لا يستقبلها إطلاقاً.
    const includeImagePrompt = !isFree && realPlan === "premium";

    let extraInstructions = "";
    // مُعرَّفة هنا (بدل داخل كتلة if (!isFree) فقط) لأنها تُستخدم لاحقاً أيضاً عند حفظ وثيقة
    // هذا التوليد في Firestore (راجع حفظ collections/generations أدناه) — نحتاج نفس القيم
    // النظيفة هناك، وليس فقط عند بناء الـ prompt.
    let cleanLanguage = "";
    let cleanTone = "";
    let cleanGoal = "";
    let cleanPlatform = "";
    let cleanSourceText = "";
    // القيمة الافتراضية "auto" (وليس "" كبقية الحقول أعلاه) لأنها تُحفظ لاحقاً في Firestore
    // (راجع أدناه) بنفس اصطلاح tone/goal/platform ("auto" حين لا يوجد اختيار صريح)، وتبقى
    // "auto" دائماً لأي باقة غير Premium بصرف النظر عمّا أُرسل فعلياً (راجع فحص الاعتراض أعلاه).
    let cleanVisualStyle = "auto";
    if (!isFree) {
      // حماية بسيطة من إساءة الاستخدام: نحدّ طول القيم المُرسلة قبل حقنها في الـ prompt
      // (تفادياً لتضخيم input_tokens بشكل غير متوقع أو محاولة حقن تعليمات مفرطة الطول).
      cleanLanguage =
        typeof language === "string" && language.trim() ? language.trim().slice(0, 60) : "";
      cleanTone =
        typeof tone === "string" && tone.trim() ? tone.trim().slice(0, 60) : "";
      cleanGoal =
        typeof goal === "string" && goal.trim() ? goal.trim().slice(0, 80) : "";
      cleanPlatform =
        typeof platform === "string" && platform.trim() ? platform.trim().slice(0, 40) : "";
      cleanSourceText =
        typeof sourceText === "string" && sourceText.trim() ? sourceText.trim().slice(0, 6000) : "";

      // التوجيه الفني للصور (visualStyle) — حصري لباقة Premium فقط، خلافاً لبقية الحقول أعلاه
      // المتاحة لأي باقة غير مجانية (realPlan !== "free"). طلب من Pro يصل إلى هنا (لأن الشرط
      // المحيط هو !isFree فقط) لكن realPlan === "premium" يفشل، فتبقى القيمة "auto" كما هي.
      if (realPlan === "premium" && typeof visualStyle === "string" && visualStyle.trim() && visualStyle.trim().toLowerCase() !== "auto") {
        cleanVisualStyle = visualStyle.trim().slice(0, 60);
      }

      extraInstructions = buildExtraInstructions({
        language: cleanLanguage,
        tone: cleanTone,
        goal: cleanGoal,
        platform: cleanPlatform,
        sourceText: cleanSourceText,
        // "auto" لا يجب أن يُحقَن كتعليمة صريحة في الـ prompt — فقط قيمة مختارة فعلياً تُمرَّر.
        visualStyle: cleanVisualStyle !== "auto" ? cleanVisualStyle : "",
        includeImagePrompt,
      });

      if (cleanLanguage || cleanTone || cleanGoal || cleanPlatform || cleanSourceText || cleanVisualStyle !== "auto" || includeImagePrompt) {
        console.log(
          "[server.js] ميزات PRO/PREMIUM مُفعَّلة لهذا الطلب — " +
          "لغة مخصّصة=" + (cleanLanguage || "لا") +
          " | نبرة=" + (cleanTone || "لا") +
          " | هدف=" + (cleanGoal || "لا") +
          " | منصة=" + (cleanPlatform || "لا") +
          " | إعادة تدوير محتوى=" + (cleanSourceText ? "نعم (" + cleanSourceText.length + " حرف)" : "لا") +
          " | التوجيه الفني للصور (Premium فقط)=" + (cleanVisualStyle !== "auto" ? cleanVisualStyle : "لا") +
          " | أوامر صور تلقائية=" + (includeImagePrompt ? "نعم" : "لا")
        );
      }
    }

    // max_tokens هو سقف أقصى فقط (لا يُدفع عنه إن لم يُستخدم بالكامل)، لكنه مضبوط بقيمة ثابتة
    // لكل باقة (FREE=1000, PRO=10000, PREMIUM=25000) بدل الحساب الديناميكي السابق، لضمان توفّر
    // هامش كافٍ حتى لأطول سبرنت (7 أيام كحد أقصى، راجع PLAN_LIMITS.maxDays) دون انقطاع رد
    // الـ JSON قبل اكتماله.
    const model = isFree ? MODEL_FREE : MODEL_PAID;
    const maxTokens = getPlanMaxTokens(realPlan);
    const prompt = isFree
      ? buildFreeTierPrompt(description, upcomingOccasion)
      : buildPrompt(limit, description, upcomingOccasion, { extraInstructions, includeImagePrompt });
    console.log(
      "[server.js] إرسال الطلب إلى Claude API (model=" + model + ", max_tokens=" + maxTokens +
      ", الباقة=" + realPlan + ", عدد الأفكار المطلوبة من النموذج=" + limit + ")..."
    );

    const response = await anthropic.messages.create({
      model: model,
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    });
    console.log("[server.js] تم استلام رد من Claude API.");

    // --- تتبّع استهلاك التوكنز والتكلفة الفعلية لهذا الاستدعاء ---
    if (response.usage) {
      const inTok = response.usage.input_tokens ?? 0;
      const outTok = response.usage.output_tokens ?? 0;
      const cacheRead = response.usage.cache_read_input_tokens ?? 0;
      const cacheCreate = response.usage.cache_creation_input_tokens ?? 0;

      console.log(
        "[server.js] 💰 استهلاك التوكنز — input_tokens=" + inTok +
        " output_tokens=" + outTok +
        " (الإجمالي=" + (inTok + outTok) + ")" +
        (cacheRead || cacheCreate ? " [cache_read=" + cacheRead + " cache_creation=" + cacheCreate + "]" : "") +
        " | الباقة=" + realPlan + " | model=" + model
      );

      // معادلة التكلفة: (input_tokens ÷ 1,000,000 × 3) + (output_tokens ÷ 1,000,000 × 15)
      // تنبيه مهم: هذه تسعيرة Sonnet ($3 لكل مليون input، $15 لكل مليون output). الباقة المجانية
      // تستخدم Haiku، وهو أرخص بكثير من هذا — لذا الرقم المطبوع لطلبات الباقة المجانية هو سقف
      // تقديري أعلى من التكلفة الحقيقية فعلياً، وليس التكلفة الدقيقة لـ Haiku.
      const costUSD = (inTok / 1000000) * 3 + (outTok / 1000000) * 15;
      console.log(
        "[server.js] 💵 التكلفة التقديرية بتسعيرة Sonnet ($3/$15 لكل مليون توكن): $" +
        costUSD.toFixed(6) +
        (isFree ? "  (تنبيه: هذا الطلب استخدم Haiku الأرخص فعلياً — التكلفة الحقيقية أقل من هذا الرقم)" : "")
      );

      console.log("[server.js] 🛑 stop_reason: " + (response.stop_reason || "غير متوفر"));
    } else {
      console.warn("[server.js] تحذير: رد Claude API لا يحتوي على حقل usage — لا يمكن تتبع التوكنز أو التكلفة لهذا الطلب.");
      console.log("[server.js] 🛑 stop_reason: " + (response.stop_reason || "غير متوفر"));
    }

    const rawText = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n");
    console.log("[server.js] طول نص الرد: " + rawText.length + " حرف. جارٍ تحليل JSON...");

    const parsed = extractJson(rawText);

    if (!parsed || !Array.isArray(parsed.content)) {
      throw new Error("رد النموذج لا يحتوي على مصفوفة content صالحة");
    }
    console.log("[server.js] تم تحليل JSON بنجاح. عدد الأفكار المستلمة: " + parsed.content.length);

    if (isFree && parsed.content.length > 1) {
      console.warn(
        "[server.js] تنبيه: الباقة مجانية لكن النموذج أعاد " + parsed.content.length +
        " فكرة بدل فكرة واحدة فقط (تم تجاهل الباقي، لكن تكلفة توليدها دُفعت بالفعل ضمن output_tokens أعلاه)."
      );
    }

    const realContent = parsed.content.slice(0, limit).map((item, idx) => ({
      day: idx + 1,
      locked: false,
      idea: item.idea || "",
      caption: item.caption || "",
      hashtags: Array.isArray(item.hashtags) ? item.hashtags : [],
      bestTime: item.bestTime || "",
      imageIdea: item.imageIdea || "",
      imagePrompt: item.imagePrompt || "",
      videoIdea: item.videoIdea || "",
      shotAngle: item.shotAngle || "",
    }));

    let content = realContent;
    if (isFree) {
      // لا نستدعي Claude أبداً لباقي الأيام (2 إلى 30) — فقط عناوين ثابتة كبطاقات مقفلة.
      const lockedStubs = buildLockedDayStubs(2, 30);
      content = realContent.concat(lockedStubs);
      console.log(
        "[server.js] الباقة مجانية: فكرة حقيقية واحدة (يوم 1) + " + lockedStubs.length +
        " بطاقة مقفلة (بدون أي استدعاء Claude لها، توفيراً لتكلفة API)."
      );
    }

    // 6) عداد التوليد الشهري تمت زيادته بالفعل عند "حجز" هذه المحاولة في reserveGenerationSlot
    //    أعلاه (قبل استدعاء Claude API)، وليس هنا — هذا مقصود لسدّ ثغرة سباق الطلبات المتزامنة
    //    (راجع تعليق الدالة). لا حاجة لأي تحديث إضافي على Firestore في حالة النجاح.
    console.log(
      "[server.js] ✅ التوليد نجح — العداد الشهري (محجوز مسبقاً)=" +
      generationsUsed + "/" + limits.maxGenerationsPerMonth + " (باقة " + realPlan + ")"
    );

    // 7) حفظ نسخة كاملة من هذا التوليد في Firestore تحت المسار:
    //    collections/generations/{uid}/projects/{docId} — أرشيف/سجل توليدات المستخدم.
    //
    //    ⚠️ لم أُضِف "const { getFirestore } = require('firebase-admin/firestore'); const db =
    //    getFirestore();" هنا كما ورد حرفياً في الطلب: db مُعرَّف ومُهيَّأ مرة واحدة فقط أعلى
    //    الملف (getFirestore() نفسها، عند نجاح تهيئة Firebase Admin SDK). إعادة الإعلان عنه بنفس
    //    الاسم "db" في هذا النطاق كانت ستُسبب خطأ JavaScript حقيقي عند تشغيل الخادم
    //    ("SyntaxError: Identifier 'db' has already been declared") ويمنعه من الإقلاع كلياً —
    //    لذلك استخدمت نفس db الموجود فعلاً بدل تكرار تعريفه.
    //
    //    نحفظ فقط الأيام الحقيقية المولَّدة فعلياً من Claude (realContent) وليس بطاقات الباقة
    //    المجانية المقفلة (buildLockedDayStubs) — لا يوجد محتوى فعلي فيها لتستحق الأرشفة.
    const generatedContentForStorage = realContent.map((item) => ({
      day: item.day,
      post: item.caption,
      platform: cleanPlatform || "Instagram",
    }));

    // الحفظ والرد على الواجهة معاً داخل try/catch واحد فقط، ولا يوجد أي try/catch آخر يخفي
    // فشل الحفظ: نجاح الحفظ ينتهي بـ res.json() مباشرة، وفشله ينتهي بـ res.status(500) مباشرة —
    // لا مسار وسيط "ينجح رغم فشل الحفظ" كما كان في نسخة سابقة من هذا الكود.
    try {
      const docRef = await db.collection("generations").doc(uid).collection("projects").add({
        createdAt: new Date(),
        projectDescription: description,
        days: limit,
        language: cleanLanguage,
        plan: realPlan,
        generatedContent: generatedContentForStorage,
        tone: cleanTone || "auto",
        goal: cleanGoal || "auto",
        platform: cleanPlatform || "auto",
        visualStyle: cleanVisualStyle,
      });
      console.log(`✅ محفوظ في Firestore: ${docRef.id}`);

      // الرد للفرونتاند يأتي مباشرة بعد نجاح الحفظ، ضمن نفس كتلة try — وليس بعدها كخطوة منفصلة.
      console.log("[server.js] نجح التوليد. إرسال " + content.length + " عنصر إلى الواجهة.");
      res.json({
        success: true,
        docId: docRef.id,
        content,
        plan: realPlan,
        generationsUsed,
        maxGenerationsPerMonth: limits.maxGenerationsPerMonth,
      });
    } catch (err) {
      // الخطأ يُطبع بوضوح هنا ولا يُخفى إطلاقاً، كما طُلب صراحة: إن فشل الحفظ، الطلب بأكمله
      // يُعتبر فاشلاً (500) ولا يصل أي محتوى للواجهة، حتى لو كان Claude قد ولّد محتوى صالحاً فعلاً.
      console.error("❌ خطأ الحفظ:", err.message);

      // بما أن الطلب يُعتبر فاشلاً بالكامل الآن، نُرجع (rollback) حجز الحصة الذي تم في
      // reserveGenerationSlot أعلاه — لا يجب أن يخسر المستخدم من رصيده الشهري مقابل توليد
      // لم يصله فعلياً بسبب فشل الحفظ (نفس منطق rollback الموجود في catch الخارجي أسفل الملف).
      try {
        await db.collection("users").doc(uid).update({ generationsUsed: FieldValue.increment(-1) });
        console.log("[server.js] ↩️ تم إرجاع محاولة التوليد (فشل الحفظ في Firestore) إلى رصيد المستخدم — uid=" + uid);
      } catch (rollbackError) {
        console.error(
          "[server.js] ⚠️ فشل إرجاع محاولة التوليد بعد فشل الحفظ (rollback) — uid=" + uid + ": " + rollbackError.message
        );
      }

      res.status(500).json({ success: false, errorCode: "SAVE_FAILED", error: "حفظ فشل" });
    }
  } catch (error) {
    // مطلوب حرفياً: طباعة الخطأ الكامل بهذا الشكل بالضبط.
    console.error("Claude API Error:", error.message);
    // سطر إضافي (لم يُطلب، لكن أُبقي عليه لفائدته التشخيصية): يضيف اسم الخطأ ورمز الحالة
    // HTTP إن وُجدا، لأن error.message وحدها أحياناً لا تكفي لتشخيص أخطاء Anthropic API
    // (rate limit، مفتاح غير صالح، انقطاع الشبكة...). لا يُخفي أو يستبدل السطر أعلاه.
    console.error(
      "[server.js] CLAUDE GENERATION ERROR (تفاصيل إضافية): " +
        (error.name || "") +
        " " +
        (error.status ? "(status " + error.status + ") " : "") +
        error.message
    );

    // التوليد فشل بعد أن كانت هذه المحاولة قد "حُجزت" بالفعل من حصة المستخدم الشهرية (زيادة
    // العداد في reserveGenerationSlot قبل استدعاء Claude API). بما أن الفشل هنا ليس بسبب
    // استخدام فعلي من المستخدم (خطأ من الخادم أو من Claude API نفسه)، نُرجع هذه المحاولة
    // (rollback) حتى لا يخسر رصيده الشهري بلا مقابل. decrement عملية ذرّية أيضاً فلا خطر سباق.
    // نتجاهل عمداً حالات فشل مبكرة جداً (قبل نجاح الحجز، مثل !db أو 401 أو 400) لأنها تُعالَج
    // بـ return مبكر أعلاه ولا تصل إطلاقاً إلى كتلة catch هذه.
    //
    // حارس إضافي (uid): بما أن uid أصبح الآن مُعرَّفاً كـ "let uid = null;" قبل try الخارجية
    // (راجع التعليق أعلى الدالة)، فهو مضمون أن يكون مرئياً هنا دوماً بدل ReferenceError. لكن
    // احتياطاً لأي تعديل مستقبلي في الكود قد يجعل خطأً يصل إلى هنا قبل نجاح verifyFirebaseToken
    // (وبالتالي uid ما زال null)، نتحقق أولاً قبل محاولة استخدامه في استعلام Firestore.
    if (uid) {
      try {
        await db.collection("users").doc(uid).update({ generationsUsed: FieldValue.increment(-1) });
        console.log("[server.js] ↩️ تم إرجاع محاولة التوليد الفاشلة إلى رصيد المستخدم — uid=" + uid);
      } catch (rollbackError) {
        console.error(
          "[server.js] ⚠️ فشل إرجاع محاولة التوليد الفاشلة (rollback) — uid=" + uid + ": " + rollbackError.message
        );
      }
    } else {
      console.warn(
        "[server.js] ⚠️ تعذّر إرجاع (rollback) محاولة التوليد الفاشلة: uid غير معروف بعد (فشل قبل التحقق من الهوية)."
      );
    }

    res.status(500).json({
      success: false,
      errorCode: "GENERATION_FAILED",
      error: "حدث خطأ أثناء توليد المحتوى عبر الذكاء الاصطناعي. حاول مرة أخرى بعد قليل.",
    });
  }
});

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
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log("Backend running on http://localhost:" + PORT);
  });
}

// مطلوب من أداة البناء @vercel/node لاستخدام تطبيق Express هذا كمعالج طلبات (request handler)
// مباشرة، دون تشغيل خادم HTTP فعلي بأنفسنا.
export default app;
