import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyBW-ZXj758KcwmfvjqwvGjDCp_idY11p14',
  authDomain: 'vocab-a058f.firebaseapp.com',
  projectId: 'vocab-a058f',
  storageBucket: 'vocab-a058f.firebasestorage.app',
  messagingSenderId: '585911600201',
  appId: '1:585911600201:web:f873c61fba0024df97eb98',
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
