import React, { useEffect, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// Reveal — ظهور تدريجي ناعم عند التمرير (scroll fade-in).
//
// يغلّف أي محتوى ويجعله يظهر بانزلاق خفيف لأعلى عند دخوله الشاشة لأول مرة فقط
// (نوقف المراقبة بعد أول ظهور: لا وميض ولا تكرار عند التمرير للأعلى والأسفل).
//
// ثلاث حالات يجب أن يبقى فيها المحتوى ظاهراً فوراً بدل أن يختفي إلى الأبد:
//   1. المستخدم مفعّل "تقليل الحركة" في نظامه (prefers-reduced-motion) — احترام
//      لإعداد إمكانية الوصول، ولأن الحركة تسبب دواراً فعلياً لبعض المستخدمين.
//   2. المتصفح لا يدعم IntersectionObserver.
//   3. الاختبارات/البيئات بدون window.
// في كل هذه الحالات نضبط visible = true مباشرة، فلا يُفقد أي محتوى.
//
// الاستعمال:
//   <Reveal>...</Reveal>
//   <Reveal delay={120}>...</Reveal>   // لتتابع البطاقات (stagger)
// ---------------------------------------------------------------------------
export default function Reveal({ children, delay = 0, style, className }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.unobserve(entry.target);
          }
        });
      },
      // rootMargin السالب يؤخّر الظهور قليلاً حتى يدخل العنصر الشاشة فعلاً بدل أن
      // يبدأ وهو ما زال على حافتها، فيبدو التتابع مقصوداً لا عشوائياً.
      { threshold: 0.1, rootMargin: "0px 0px -60px 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "none" : "translateY(26px)",
        // منحنى "ease-out expo" — سريع في البداية ثم يستقر بهدوء: هو ما يعطي
        // الإحساس "الغالي" بدل ease الافتراضي المسطّح.
        transition: `opacity 720ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, transform 720ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
        willChange: visible ? "auto" : "opacity, transform",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
