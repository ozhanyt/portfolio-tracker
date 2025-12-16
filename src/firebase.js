import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyAwugbSt-lEiUm2kenaoHjBgMW4Z3Lflbs",
    authDomain: "fon-tahmini.firebaseapp.com",
    projectId: "fon-tahmini",
    storageBucket: "fon-tahmini.firebasestorage.app",
    messagingSenderId: "108328915456",
    appId: "1:108328915456:web:d22193a7994ff4f35b3ee5",
    measurementId: "G-0DTJ2J8VVL"
};

import { getAuth } from "firebase/auth";

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
