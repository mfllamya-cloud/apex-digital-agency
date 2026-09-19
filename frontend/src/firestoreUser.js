import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

/**
 * ينشئ وثيقة المستخدم في users/{uid} إن لم تكن موجودة بعد (أول تسجيل، سواء
 * بالبريد أو بجوجل). إذا كانت موجودة مسبقاً (تسجيل دخول عادي) لا يغيّر شيئاً
 * فيها إطلاقاً.
 */
export async function ensureUserProfile(user) {
  const userRef = doc(db, "users", user.uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    await setDoc(userRef, {
      email: user.email,
      createdAt: serverTimestamp(),
      plan: "free",
      generationsUsed: 0,
    });
  }

  return userRef;
}

/** يقرأ وثيقة المستخدم من Firestore، أو null إذا لم تكن موجودة. */
export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data() : null;
}
