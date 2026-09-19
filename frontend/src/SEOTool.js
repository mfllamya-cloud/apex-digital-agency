import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";

// ---------------------------------------------------------------------------
// أداة SEO مجانية مصغّرة (Micro-Tool) — صفحات هبوط مستقلة الهدف منها جلب زيارات
// من محركات البحث (مثلاً بحث "free instagram caption generator") ثم تحويل جزء من
// هؤلاء الزوّار إلى مستخدمين مسجَّلين عبر رسالة ترقية (Upsell) أسفل النتيجة.
//
// هذه الصفحة مستقلة تماماً عن نظام الحسابات: لا تسجيل دخول، ولا استهلاك لأي حصة
// generationsUsed، وتستدعي مساراً منفصلاً تماماً في الخادم (/api/micro-tool) لا علاقة
// له بـ /api/generate-content إطلاقاً (راجع server.js).
//
// لإضافة أداة جديدة لاحقاً (مثلاً "gym"، "salon"...): أضف مفتاحاً جديداً هنا في
// toolsConfig بنفس الشكل، وأضف تعليمة مطابقة له في MICRO_TOOL_PROMPTS داخل server.js.
// ---------------------------------------------------------------------------

const toolsConfig = {
  instagram: {
    title: "Free Instagram Caption Generator",
    description:
      "Describe your post in a few words and get an instant, ready-to-publish Instagram caption with hashtags — free, no account needed.",
    inputLabel: "What is this post about?",
    placeholder: "e.g. New matcha latte launch at our downtown cafe",
    buttonText: "Generate My Caption",
  },
  "real-estate": {
    title: "Free Real Estate Listing Post Generator",
    description:
      "Turn your property details into a scroll-stopping social media post in seconds — free, no account needed.",
    inputLabel: "Describe the property",
    placeholder: "e.g. 3-bedroom villa in Casablanca with a private garden and pool",
    buttonText: "Generate My Listing Post",
  },
  restaurant: {
    title: "Free Restaurant Social Media Post Generator",
    description:
      "Get a mouth-watering post for your dish, offer, or event — instantly, and completely free.",
    inputLabel: "What are you promoting?",
    placeholder: "e.g. Weekend brunch special: eggs benedict with fresh orange juice",
    buttonText: "Generate My Post",
  },
  linkedin: {
    title: "Free LinkedIn Post Generator",
    description:
      "Turn your update, achievement, or idea into a professional LinkedIn post — free, no account needed.",
    inputLabel: "What do you want to share?",
    placeholder: "e.g. We just closed a $2M seed round to expand into new markets",
    buttonText: "Generate My LinkedIn Post",
  },
};

// إعداد احتياطي عام يُستخدم إن كان الرابط يحمل category غير معروف في toolsConfig —
// يبقي الصفحة تعمل بدل عرض صفحة فارغة أو خطأ.
const DEFAULT_TOOL = {
  title: "Free Social Media Post Generator",
  description: "Describe what you want to post about and get an instant, ready-to-publish post — free.",
  inputLabel: "What is this post about?",
  placeholder: "e.g. Describe your product, service, or update...",
  buttonText: "Generate My Post",
};

// مسار نسبي بدل رابط localhost ثابت — راجع نفس التعليق في App.js (fetch الخاص بـ
// generate-content): يعمل تلقائياً على Vercel (نفس الدومين للفرونت والباكند)، ومحلياً عبر
// حقل "proxy" في frontend/package.json.
const MICRO_TOOL_ENDPOINT = "/api/micro-tool";

// هذه الصفحة إنجليزية دائماً بقصد (صفحة هبوط مستقلة لجلب زيارات من محركات البحث، منفصلة عن
// نظام i18n الخاص بالتطبيق الرئيسي — راجع الملاحظة أعلى المكوّن). لذلك نترجم errorCode القادم
// من /api/micro-tool محلياً هنا إلى إنجليزية ثابتة، بدل عرض نص data.error الخام الذي قد يصل
// بالعربية من الخادم ويكسر اتساق هذه الصفحة الإنجليزية.
const MICRO_TOOL_ERROR_MESSAGES = {
  SERVER_NOT_READY: "The server isn't ready right now. Please try again in a moment.",
  DESCRIPTION_REQUIRED: "Please write a description before generating.",
  GENERATION_FAILED: "Something went wrong while generating. Please try again.",
};

function getMicroToolErrorMessage(data) {
  const code = data && data.errorCode;
  if (code && MICRO_TOOL_ERROR_MESSAGES[code]) {
    return MICRO_TOOL_ERROR_MESSAGES[code];
  }
  return "Something went wrong. Please try again.";
}

export default function SEOTool() {
  const { category } = useParams();
  const tool = toolsConfig[category] || DEFAULT_TOOL;

  const [businessDescription, setBusinessDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");

  const isValid = businessDescription.trim().length > 0;

  const handleGenerate = async () => {
    if (!isValid) return;

    setLoading(true);
    setError("");
    setResult("");
    try {
      const res = await fetch(MICRO_TOOL_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessDescription: businessDescription.trim(),
          toolType: category || "",
        }),
      });
      const data = await res.json();
      if (res.ok && data.result) {
        setResult(data.result);
      } else {
        setError(getMicroToolErrorMessage(data));
      }
    } catch (e) {
      setError("Could not reach the server. Please try again in a moment.");
    }
    setLoading(false);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #667eea, #764ba2)",
        padding: "2rem",
        fontFamily: "system-ui",
      }}
    >
      <div style={{ maxWidth: "640px", margin: "0 auto" }}>
        <h1 style={{ fontSize: "2rem", color: "white", textAlign: "center", marginBottom: "0.5rem" }}>
          {tool.title}
        </h1>
        <p style={{ color: "rgba(255,255,255,0.9)", textAlign: "center", marginBottom: "2rem" }}>
          {tool.description}
        </p>

        <div style={{ background: "white", borderRadius: "12px", padding: "2rem", marginBottom: "1.5rem" }}>
          <label style={{ display: "block", fontWeight: "600", marginBottom: "0.5rem" }}>
            {tool.inputLabel}
          </label>
          <textarea
            value={businessDescription}
            onChange={(e) => setBusinessDescription(e.target.value)}
            placeholder={tool.placeholder}
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

          <button
            onClick={handleGenerate}
            disabled={loading || !isValid}
            style={{
              width: "100%",
              padding: "1rem",
              background: "linear-gradient(90deg, #3b82f6, #8b5cf6)",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontWeight: "bold",
              fontSize: "1rem",
              cursor: loading || !isValid ? "not-allowed" : "pointer",
              opacity: loading || !isValid ? 0.6 : 1,
            }}
          >
            {loading ? "Generating..." : tool.buttonText}
          </button>

          {error && (
            <p style={{ color: "#ef4444", fontSize: "0.85rem", marginTop: "0.75rem", marginBottom: 0 }}>
              {error}
            </p>
          )}
        </div>

        {result && (
          <div style={{ background: "white", borderRadius: "12px", padding: "1.75rem", marginBottom: "1.5rem" }}>
            <p style={{ whiteSpace: "pre-wrap", margin: 0 }}>{result}</p>
          </div>
        )}

        {result && (
          <div
            style={{
              background: "rgba(255,255,255,0.15)",
              border: "1px solid rgba(255,255,255,0.4)",
              color: "white",
              padding: "1.25rem",
              borderRadius: "10px",
              textAlign: "center",
            }}
          >
            <p style={{ fontWeight: "700", marginTop: 0, marginBottom: "0.5rem" }}>
              Liked this? This was just ONE post.
            </p>
            <p style={{ marginTop: 0, marginBottom: "1rem", fontSize: "0.9rem" }}>
              Get a full monthly content calendar tailored to your business — create a free account to get started.
            </p>
            <Link
              to="/"
              style={{
                display: "inline-block",
                background: "white",
                color: "#3b82f6",
                padding: "0.6rem 1.5rem",
                borderRadius: "999px",
                fontWeight: "700",
                textDecoration: "none",
              }}
            >
              Get My Full Content Calendar →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
