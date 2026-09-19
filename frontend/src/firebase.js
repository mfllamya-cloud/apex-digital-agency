// إعداد Firebase للمشروع
// المصدر: Firebase Console → Project settings → Your apps → SDK setup and configuration
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// تُقرأ القيم من ملف .env (متغيرات تبدأ بـ REACT_APP_ حتى يقرأها React)
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

// تنبيه مبكر وواضح في الـ console إذا كان أحد المتغيرات ناقصاً
// (سبب شائع: نسيان إعادة تشغيل npm start بعد تعديل .env)
Object.entries(firebaseConfig).forEach(([key, value]) => {
  if (!value) {
    console.error(
      `[firebase.js] المتغيّر REACT_APP_FIREBASE_${key
        .replace(/[A-Z]/g, (l) => "_" + l)
        .toUpperCase()} غير موجود. تأكد من وجوده في .env وأعد تشغيل npm start.`
    );
  }
});

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

// مزوّد تسجيل الدخول الخارجي (Google)
export const googleProvider = new GoogleAuthProvider();

export default app;
