import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAYGNyEMwyRPVHSHlhthdiU9rDQ2Ga_uzU",
  authDomain: "syncro-4a807.firebaseapp.com",
  projectId: "syncro-4a807",
  storageBucket: "syncro-4a807.firebasestorage.app",
  messagingSenderId: "480581985063",
  appId: "1:480581985063:web:eb0168cae7f33b81e27f02"
};

const app = initializeApp(firebaseConfig);
// On exporte la base de données (db) pour pouvoir l'utiliser dans le calendrier
export const db = getFirestore(app);