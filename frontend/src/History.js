import React, { useState, useEffect, useCallback } from "react";
import { Link, Navigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, orderBy, getDocs, deleteDoc, doc } from "firebase/firestore";
import { auth, db } from "./firebase";
import { LanguageSwitcher, useLanguage } from "./i18n";
import "./App.css";

// نظام ألوان "الوكالة الرقمية الفاخرة" — نفس القيم المعرَّفة في App.js (AGENCY_COLORS) وفي
// :root داخل App.css، مكرَّرة هنا محلياً لأن History.js مكوّن مستقل تماماً (self-contained)
// ولا يستورد أي شيء من App.js. يجب إبقاء القيمتين متطابقتين يدوياً عند أي تعديل مستقبلي.
const AGENCY_COLORS = {
  navy: "#0A192F",
  pearl: "#F8FAFC",
  gold: "#D97706",
  goldDark: "#B45309",
  border: "#E2E8F0",
  textMuted: "#64748B",
};

// ---------------------------------------------------------------------------
// شاشة "My Projects" (السجل الكامل) — تعرض كل الدورات التي حفظها الخادم فعلياً في
// Firestore بعد كل توليد ناجح (راجع POST /api/generate-content في backend/server.js،
// المسار: generations/{uid}/projects/{docId}).
//
// هذا المكوّن مستقل تماماً (self-contained) بنفس نمط SEOTool.js: له مسار خاص به في
// react-router (/history) ويستمع بنفسه لحالة تسجيل الدخول عبر onAuthStateChanged، بدل
// الاعتماد على تمرير user كـ prop من AppContent — بهذا يعمل حتى لو فُتح رابط /history
// مباشرة (مثلاً من علامة تبويب محفوظة) دون المرور أولاً بالشاشة الرئيسية.
//
// القراءة تتم مباشرة من المتصفح عبر Firebase Client SDK (وليس عبر الباكند)، وهو ما
// تسمح به قواعد Firestore الحالية: allow read لصاحب الحساب فقط على generations/{uid}/**.
//
// ⚠️ الحذف (Delete) يستخدم أيضاً Firebase Client SDK مباشرة (deleteDoc) — هذا يتطلب أن
// تسمح قواعد Firestore بـ "allow delete" لصاحب الحساب على هذا المسار (وليس فقط allow read
// كما كانت الحال سابقاً). عدّلت frontend/firestore.rules في نفس هذه الدفعة لإضافة هذا
// الاستثناء الدقيق (delete فقط، وليس create/update، اللذان يبقيان محصورين بالباكند عبر
// Admin SDK). بدون هذا التعديل، زر الحذف كان سيفشل بخطأ "Missing or insufficient
// permissions" من Firestore مهما كان الكود هنا صحيحاً.
// ---------------------------------------------------------------------------

// يحوّل قيمة createdAt (قد تصل كـ Firestore Timestamp من الباكند عبر "new Date()" في
// Admin SDK، أو نادراً كنص/رقم من بيانات قديمة) إلى تاريخ مقروء بلغة واجهة التطبيق الحالية،
// مثال: "18 سبتمبر 2026" بالعربية، أو "September 18, 2026" بالإنجليزية.
function formatProjectDate(createdAt, lang) {
  let dateObj = null;
  if (createdAt && typeof createdAt.toDate === "function") {
    dateObj = createdAt.toDate();
  } else if (createdAt) {
    dateObj = new Date(createdAt);
  }
  if (!dateObj || isNaN(dateObj.getTime())) return "—";

  const localeMap = { ar: "ar", en: "en-US", fr: "fr-FR" };
  try {
    return dateObj.toLocaleDateString(localeMap[lang] || "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch (_) {
    return dateObj.toLocaleDateString();
  }
}

// نافذة منبثقة (Modal) بسيطة تعرض تفاصيل مشروع واحد: كل المنشورات المحفوظة فيه
// (day, post, platform) — هذا هو زر "View" المطلوب.
function ProjectDetailsModal({ project, lang, t, isRtl, onClose }) {
  if (!project) return null;
  const posts = Array.isArray(project.generatedContent) ? project.generatedContent : [];

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2000,
        padding: "1rem",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="agency-card"
        style={{
          background: "white",
          borderRadius: "14px",
          padding: "1.75rem",
          maxWidth: "640px",
          width: "100%",
          maxHeight: "85vh",
          overflowY: "auto",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem", gap: "1rem" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "1.35rem", color: "#1e293b" }}>{t("history.modalTitle")}</h2>
            <div style={{ color: "#64748b", fontSize: "0.9rem", marginTop: "0.25rem" }}>
              {formatProjectDate(project.createdAt, lang)}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              border: "none",
              background: "#f1f5f9",
              color: "#334155",
              borderRadius: "8px",
              padding: "0.4rem 0.9rem",
              cursor: "pointer",
              fontWeight: "600",
              flexShrink: 0,
            }}
          >
            {t("history.closeBtn")}
          </button>
        </div>

        <p style={{ color: "#334155", fontSize: "0.95rem", marginBottom: "1.25rem", lineHeight: 1.5 }}>
          {project.projectDescription || t("history.noDescription")}
        </p>

        {posts.length === 0 ? (
          <p style={{ color: "#94a3b8", fontStyle: "italic" }}>{t("history.noPosts")}</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
            {posts.map((item, idx) => (
              <div
                key={idx}
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: "10px",
                  padding: "1rem",
                  background: "#f8fafc",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.5rem" }}>
                  <span style={{ fontWeight: "700", color: AGENCY_COLORS.navy }}>
                    {t("common.dayLabel", { n: item.day })}
                  </span>
                  {item.platform && (
                    <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
                      {t("history.platformLabel", { value: item.platform })}
                    </span>
                  )}
                </div>
                <p style={{ margin: 0, color: "#1e293b", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{item.post}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function History() {
  const { t, lang, isRtl } = useLanguage();

  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [viewingProject, setViewingProject] = useState(null);

  // يستمع لحالة تسجيل الدخول بشكل مستقل عن AppContent (راجع الشرح أعلى الملف).
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthChecked(true);
    });
    return unsubscribe;
  }, []);

  const fetchProjects = useCallback(async (uid) => {
    setLoadingProjects(true);
    setLoadError("");
    try {
      const projectsRef = collection(db, "generations", uid, "projects");
      const q = query(projectsRef, orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      setProjects(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error("[History.js] فشل تحميل سجل المشاريع:", e.code || "", e.message);
      setLoadError(t("history.loadError"));
    }
    setLoadingProjects(false);
  }, [t]);

  useEffect(() => {
    if (user) fetchProjects(user.uid);
  }, [user, fetchProjects]);

  const handleDelete = async (projectId) => {
    if (!window.confirm(t("history.confirmDelete"))) return;
    setDeletingId(projectId);
    try {
      await deleteDoc(doc(db, "generations", user.uid, "projects", projectId));
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
      setViewingProject((prev) => (prev && prev.id === projectId ? null : prev));
    } catch (e) {
      console.error("[History.js] فشل حذف المشروع:", e.code || "", e.message);
      alert(t("history.deleteError"));
    }
    setDeletingId(null);
  };

  // "Edit" و"Export CSV" مؤجَّلتان صراحة (المطلوب: "للمرة القادمة") — الزران ظاهران لإعطاء
  // فكرة عن الشكل النهائي للشاشة، لكن يعرضان تنبيهاً بدل تنفيذ فعلي حالياً.
  const handleComingSoon = () => alert(t("history.comingSoon"));

  const backArrow = isRtl ? "→" : "←";

  // شاشة تحميل أولية (قبل معرفة حالة تسجيل الدخول) — بنفس أسلوب شاشة التحميل في App.js.
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
            background: AGENCY_COLORS.pearl,
            color: AGENCY_COLORS.navy,
            fontFamily: "system-ui",
            fontSize: "1.1rem",
            fontWeight: "600",
          }}
        >
          {t("app.loading")}
        </div>
      </>
    );
  }

  // لا يوجد مستخدم مسجَّل الدخول -> إعادة توجيه للصفحة الرئيسية (ستعرض AppContent شاشة
  // تسجيل الدخول تلقائياً هناك، بدل تكرار منطق Auth هنا).
  if (!user) {
    return <Navigate to="/" replace />;
  }

  return (
    <>
      <LanguageSwitcher />
      <div style={{ minHeight: "100vh", background: AGENCY_COLORS.pearl, padding: "2rem", fontFamily: "system-ui" }}>
        <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
          {/* شريط ترويسة "Midnight Navy" — نفس نمط الترويسة الرئيسية في App.js، للحفاظ على
              تناسق النظام البصري بين الشاشتين. */}
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
            <Link
              to="/"
              style={{
                color: "white",
                textDecoration: "none",
                fontWeight: "600",
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                background: "rgba(255,255,255,0.15)",
                border: "1px solid rgba(255,255,255,0.5)",
                borderRadius: "8px",
                padding: "0.5rem 1rem",
              }}
            >
              {backArrow} {t("history.backToApp")}
            </Link>
            <span style={{ color: "rgba(255,255,255,0.85)", fontSize: "0.9rem" }}>{user.email}</span>
          </div>

          <h1 style={{ fontSize: "2.2rem", color: AGENCY_COLORS.navy, textAlign: "center", marginBottom: "1.75rem", fontWeight: "800", letterSpacing: "-0.02em" }}>
            {t("history.pageTitle")}
          </h1>

          {loadingProjects && (
            <div style={{ background: "white", borderRadius: "12px", padding: "2rem", textAlign: "center", color: "#64748b" }}>
              {t("history.loading")}
            </div>
          )}

          {!loadingProjects && loadError && (
            <div style={{ background: "white", borderRadius: "12px", padding: "2rem", textAlign: "center", color: "#dc2626" }}>
              {loadError}
            </div>
          )}

          {!loadingProjects && !loadError && projects.length === 0 && (
            <div className="agency-card" style={{ background: "white", borderRadius: "12px", padding: "2.5rem", textAlign: "center" }}>
              <p style={{ color: "#475569", fontSize: "1rem", marginBottom: "1.25rem" }}>{t("history.empty")}</p>
              <Link
                to="/"
                className="agency-btn-primary"
                style={{
                  display: "inline-block",
                  textDecoration: "none",
                  padding: "0.7rem 1.6rem",
                  borderRadius: "8px",
                }}
              >
                {t("history.emptyCta")}
              </Link>
            </div>
          )}

          {!loadingProjects && !loadError && projects.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {projects.map((project) => {
                const postsCount = Array.isArray(project.generatedContent) ? project.generatedContent.length : 0;
                const isDeleting = deletingId === project.id;
                return (
                  <div
                    key={project.id}
                    className="agency-card"
                    style={{
                      background: "white",
                      borderRadius: "12px",
                      padding: "1.25rem 1.5rem",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.75rem", marginBottom: "0.6rem" }}>
                      <div style={{ fontWeight: "700", color: "#1e293b", fontSize: "1.05rem" }}>
                        {formatProjectDate(project.createdAt, lang)}
                      </div>
                      <span
                        style={{
                          padding: "0.2rem 0.75rem",
                          borderRadius: "999px",
                          background:
                            project.plan === "premium" ? "#fdf4ff" : project.plan === "pro" ? "#f0fdf4" : "#f1f5f9",
                          color:
                            project.plan === "premium" ? "#701a75" : project.plan === "pro" ? "#166534" : "#475569",
                          fontSize: "0.78rem",
                          fontWeight: "700",
                        }}
                      >
                        {t("history.planLabel", { plan: t("tiers." + project.plan) || project.plan })}
                      </span>
                    </div>

                    <p style={{ color: "#334155", margin: "0 0 0.75rem 0", lineHeight: 1.5 }}>
                      {project.projectDescription || t("history.noDescription")}
                    </p>

                    <div style={{ display: "flex", gap: "1.25rem", flexWrap: "wrap", color: "#64748b", fontSize: "0.85rem", marginBottom: "1rem" }}>
                      <span>{t("history.daysLabel", { days: project.days ?? "—" })}</span>
                      <span>{t("history.postsLabel", { count: postsCount })}</span>
                    </div>

                    <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
                      <button
                        onClick={() => setViewingProject(project)}
                        className="agency-btn-primary"
                        style={{
                          padding: "0.5rem 1.1rem",
                          borderRadius: "8px",
                        }}
                      >
                        {t("history.viewBtn")}
                      </button>
                      <button
                        onClick={handleComingSoon}
                        title={t("history.comingSoon")}
                        style={{
                          padding: "0.5rem 1.1rem",
                          borderRadius: "8px",
                          border: "1px solid #e2e8f0",
                          background: "#f8fafc",
                          color: "#94a3b8",
                          fontWeight: "600",
                          cursor: "pointer",
                        }}
                      >
                        {t("history.editBtn")}
                      </button>
                      <button
                        onClick={handleComingSoon}
                        title={t("history.comingSoon")}
                        style={{
                          padding: "0.5rem 1.1rem",
                          borderRadius: "8px",
                          border: "1px solid #e2e8f0",
                          background: "#f8fafc",
                          color: "#94a3b8",
                          fontWeight: "600",
                          cursor: "pointer",
                        }}
                      >
                        {t("history.exportBtn")}
                      </button>
                      <button
                        onClick={() => handleDelete(project.id)}
                        disabled={isDeleting}
                        style={{
                          padding: "0.5rem 1.1rem",
                          borderRadius: "8px",
                          border: "1px solid #fecaca",
                          background: isDeleting ? "#fee2e2" : "white",
                          color: "#dc2626",
                          fontWeight: "600",
                          cursor: isDeleting ? "not-allowed" : "pointer",
                          marginInlineStart: "auto",
                        }}
                      >
                        {isDeleting ? t("history.deleting") : t("history.deleteBtn")}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <ProjectDetailsModal
        project={viewingProject}
        lang={lang}
        t={t}
        isRtl={isRtl}
        onClose={() => setViewingProject(null)}
      />
    </>
  );
}
