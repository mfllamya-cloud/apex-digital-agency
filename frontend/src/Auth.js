import React, { useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { auth, googleProvider } from "./firebase";
import { useLanguage } from "./i18n";
import "./Auth.css";

export default function Auth({ onAuthSuccess }) {
  const { t } = useLanguage();

  const [mode, setMode] = useState("login"); // "login" | "register"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isRegister = mode === "register";

  // ترجمة أكواد أخطاء Firebase إلى رسائل مفهومة للمستخدم بلغة الواجهة الحالية —
  // كل الرسائل معرَّفة مركزياً في i18n.js تحت auth.errors.<code>.
  const getErrorMessage = (code) => t("auth.errors." + code) || t("auth.errors.default");

  const switchMode = (next) => {
    setMode(next);
    setError("");
    setPassword("");
    setConfirmPassword("");
  };

  // تبسيط بسيط لصيغة البريد قبل إرساله لـ Firebase (يقبل أي نطاق حقيقي مثل gmail.com)
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      setError(t("auth.errors.fillAllFields"));
      return;
    }
    if (!EMAIL_REGEX.test(cleanEmail)) {
      setError(t("auth.errors.invalidEmailFormat"));
      return;
    }
    if (isRegister && password !== confirmPassword) {
      setError(t("auth.errors.passwordMismatch"));
      return;
    }
    if (isRegister && password.length < 6) {
      setError(t("auth.errors.passwordTooShort"));
      return;
    }

    setLoading(true);
    try {
      if (isRegister) {
        await createUserWithEmailAndPassword(auth, cleanEmail, password);
      } else {
        await signInWithEmailAndPassword(auth, cleanEmail, password);
      }
      onAuthSuccess && onAuthSuccess();
    } catch (err) {
      console.error("FIREBASE ERROR:", err.code, err.message);
      setError(getErrorMessage(err.code));
    } finally {
      setLoading(false);
    }
  };

  // تسجيل الدخول عبر مزوّد خارجي (Google) بنافذة منبثقة
  const handleOAuth = async (provider, providerName) => {
    setError("");
    setLoading(true);
    try {
      await signInWithPopup(auth, provider);
      onAuthSuccess && onAuthSuccess();
    } catch (err) {
      console.error("FIREBASE ERROR:", err.code, err.message);
      // تجاهل حالة إغلاق المستخدم للنافذة بنفسه أو تكرار الطلب
      if (
        err.code !== "auth/popup-closed-by-user" &&
        err.code !== "auth/cancelled-popup-request"
      ) {
        setError(getErrorMessage(err.code));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">{t("app.title")}</div>
        <h1 className="auth-title">
          {isRegister ? t("auth.registerTitle") : t("auth.loginTitle")}
        </h1>
        <p className="auth-subtitle">
          {isRegister ? t("auth.registerSubtitle") : t("auth.loginSubtitle")}
        </p>

        <div className="auth-oauth-group">
          <button
            type="button"
            className="auth-oauth-btn auth-oauth-google"
            onClick={() => handleOAuth(googleProvider, "Google")}
            disabled={loading}
          >
            <span className="auth-oauth-icon" aria-hidden="true">
              <svg viewBox="0 0 48 48" width="20" height="20">
                <path fill="#FFC107" d="M43.6 20.5H42V20.4H24v7.2h11.3c-1.6 4.6-6 7.9-11.3 7.9-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.1-5.1C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.5z"/>
                <path fill="#FF3D00" d="M6.3 14.7l5.9 4.3C13.9 15.4 18.6 12.4 24 12.4c3.1 0 5.9 1.2 8 3.1l5.1-5.1C34.6 6.1 29.6 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"/>
                <path fill="#4CAF50" d="M24 44c5.5 0 10.4-2.1 14.1-5.6l-6.5-5.5C29.6 34.6 26.9 35.6 24 35.6c-5.3 0-9.7-3.3-11.3-7.9l-6.2 4.8C9.6 39.7 16.3 44 24 44z"/>
                <path fill="#1976D2" d="M43.6 20.5H42V20.4H24v7.2h11.3c-.8 2.2-2.2 4.1-4.1 5.4l6.5 5.5C40.3 36 44 30.5 44 24c0-1.2-.1-2.4-.4-3.5z"/>
              </svg>
            </span>
            {t("auth.googleBtn")}
          </button>
        </div>

        <div className="auth-divider">
          <span>{t("auth.or")}</span>
        </div>

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <label className="auth-label" htmlFor="auth-email">
            {t("auth.emailLabel")}
          </label>
          <input
            id="auth-email"
            type="email"
            className="auth-input"
            placeholder="example@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />

          <label className="auth-label" htmlFor="auth-password">
            {t("auth.passwordLabel")}
          </label>
          <input
            id="auth-password"
            type="password"
            className="auth-input"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={isRegister ? "new-password" : "current-password"}
          />

          {isRegister && (
            <>
              <label className="auth-label" htmlFor="auth-confirm-password">
                {t("auth.confirmPasswordLabel")}
              </label>
              <input
                id="auth-confirm-password"
                type="password"
                className="auth-input"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
            </>
          )}

          {error && <div className="auth-error">{error}</div>}

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading
              ? t("auth.processing")
              : isRegister
              ? t("auth.createAccountBtn")
              : t("auth.loginBtn")}
          </button>
        </form>

        <div className="auth-switch">
          {isRegister ? (
            <>
              {t("auth.haveAccount")}{" "}
              <button
                type="button"
                className="auth-link"
                onClick={() => switchMode("login")}
              >
                {t("auth.loginLink")}
              </button>
            </>
          ) : (
            <>
              {t("auth.noAccount")}{" "}
              <button
                type="button"
                className="auth-link"
                onClick={() => switchMode("register")}
              >
                {t("auth.registerLink")}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
