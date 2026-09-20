// نقطة الدخول الرسمية لتوابع Vercel (Vercel Functions) — أي ملف داخل مجلد api/ في جذر
// المشروع يتحول تلقائياً إلى Vercel Function دون أي إعداد إضافي في vercel.json (هذا هو
// الأسلوب الحديث الموثّق رسمياً من Vercel، بديل أسلوب "builds" القديم/المهجور).
//
// هذا الملف لا يكرر أي منطق: هو فقط يعيد تصدير تطبيق Express الكامل والمُهيَّأ بالفعل من
// backend/server.js (بكل مساراته: /api/generate-content، /api/micro-tool، /api/submit-form).
// قاعدة express.js نفسها تحتوي أصلاً على حارس `if (!process.env.VERCEL) { app.listen(...) }`
// الذي يمنعها من محاولة الاستماع على منفذ محلي عند التشغيل كدالة سحابية على Vercel.
export { default } from "../backend/server.js";
