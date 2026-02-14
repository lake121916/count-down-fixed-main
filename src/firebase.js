// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCA7TU_qDV_slHpomptLpXJlhs1OfT94Vo",
  authDomain: "countdown-for-events-7c502.firebaseapp.com",
  projectId: "countdown-for-events-7c502",
  storageBucket: "countdown-for-events-7c502.appspot.com", // ✅ fix this
  messagingSenderId: "1079093362859",
  appId: "1:1079093362859:web:2ec595874e8fb08964f7ee",
  measurementId: "G-QFPSY1ETKN"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
const auth = getAuth(app);

export { app, analytics, db, auth };
