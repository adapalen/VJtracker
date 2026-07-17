import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, getFirestore } from "firebase/firestore";
import firebaseConfig from "../firebase-applet-config.json";

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

let database;
try {
  if (firebaseConfig.firestoreDatabaseId) {
    database = initializeFirestore(app, {}, firebaseConfig.firestoreDatabaseId);
  } else {
    database = getFirestore(app);
  }
} catch (err) {
  console.warn("Failed to initialize Firestore with custom database ID, falling back to default:", err);
  try {
    database = getFirestore(app);
  } catch (fallbackErr) {
    console.error("Failed to initialize default Firestore:", fallbackErr);
    // Return a dummy object so the app doesn't crash on import
    database = {} as any;
  }
}

export const db = database;

