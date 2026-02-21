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
    if (val) callback(val);
  });
}

export function saveData(data) {
  return set(DATA_REF, data);
}
