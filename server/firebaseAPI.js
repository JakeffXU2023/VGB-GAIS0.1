import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBTjjbpK2tHeEaOzaMfwqDfJHZEnqUU98Y",
  authDomain: "game-release-tracker-api-67431.firebaseapp.com",
  databaseURL: "https://game-release-tracker-api-67431-default-rtdb.asia-southeast1.firebasedatabase.app/",
  projectId: "game-release-tracker-api-67431",
  storageBucket: "game-release-tracker-api-67431.firebasestorage.app",
  messagingSenderId: "887552222808",
  appId: "1:887552222808:web:22a7d6b2677a2de19ecc2d",
  measurementId: "G-FP17JJQWXT"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const firestoreDb = getFirestore(app);