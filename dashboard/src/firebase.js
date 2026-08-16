import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCkeA9Rbkk_BGNAkQr-G6GnOyjHDTiNhSw",
  authDomain: "sheshield-1778b.firebaseapp.com",
  projectId: "sheshield-1778b",
  storageBucket: "sheshield-1778b.firebasestorage.app",
  messagingSenderId: "858546956058",
  appId: "1:858546956058:web:54cbe133a22af5742baea3",
  measurementId: "G-CC7Q9WXVCD"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);