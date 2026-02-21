import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, set } from "firebase/database";

// =============================================================
// 🔧 REPLACE THESE WITH YOUR FIREBASE CONFIG VALUES
// (from Firebase Console → Project Settings → Web App)
// =============================================================
const firebaseConfig = {
  apiKey: "AIzaSyDfcoEvXWBldfhTLmilCJS3CcPlWhI_hcs",
  authDomain: "japan-trip-2026-d4bbb.firebaseapp.com",
  databaseURL: "https://japan-trip-2026-d4bbb-default-rtdb.firebaseio.com",
  projectId: "japan-trip-2026-d4bbb",
  storageBucket: "japan-trip-2026-d4bbb.firebasestorage.app",
  messagingSenderId: "63665190718",
  appId: "1:63665190718:web:9132655251606c0df71e6f",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const DATA_REF = ref(db, "tripData");

export function subscribeToData(callback) {
  return onValue(DATA_REF, (snapshot) => {
    const val = snapshot.val();
    if (val) {
      // Firebase drops empty arrays — convert "__empty__" placeholders back
      const revive = (obj) => {
        if (obj === "__empty__") return [];
        if (Array.isArray(obj)) return obj.map(revive);
        if (obj && typeof obj === "object") {
          const out = {};
          for (const k in obj) out[k] = revive(obj[k]);
          return out;
        }
        return obj;
      };
      callback(revive(val));
    }
  });
}

export function saveData(data) {
  // Firebase deletes keys with empty arrays — replace with placeholder
  const prep = (obj) => {
    if (Array.isArray(obj)) return obj.length === 0 ? "__empty__" : obj.map(prep);
    if (obj && typeof obj === "object") {
      const out = {};
      for (const k in obj) out[k] = prep(obj[k]);
      return out;
    }
    return obj;
  };
  return set(DATA_REF, prep(data));
}
