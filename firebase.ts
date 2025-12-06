import * as firebase from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBZYj7_mAMVkMawvOqX34d_y01ekvdBJMc",
  authDomain: "video-game-bulletin.firebaseapp.com",
  databaseURL: "https://video-game-bulletin-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "video-game-bulletin",
  storageBucket: "video-game-bulletin.firebasestorage.app",
  messagingSenderId: "1031804164200",
  appId: "1:1031804164200:web:5c937b7b173ed64797c3dd",
  measurementId: "G-HNKSMG8QF8"
};

const app = firebase.initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);