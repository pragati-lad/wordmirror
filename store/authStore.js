import { create } from 'zustand';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { storage } from '../utils/storage';

const API_KEY_STORAGE_KEY = 'openai-api-key';
const PROVIDER_STORAGE_KEY = 'api-provider';
const DEFAULT_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY || '';

export const useAuthStore = create((set, get) => ({
  user: null,
  profile: null,
  apiKey: DEFAULT_API_KEY,
  apiProvider: 'groq',
  loading: true,
  error: null,

  initialize: async () => {
    try {
      await get().loadApiKey();
      await get().loadProvider();
    } catch (err) {
      set({ error: err.message });
    }

    onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const user = { id: firebaseUser.uid, email: firebaseUser.email };
        set({ user });
        await get().fetchProfile(user.id);
      } else {
        set({ user: null, profile: null });
      }
      set({ loading: false });
    });
  },

  loadApiKey: async () => {
    const key = await storage.get(API_KEY_STORAGE_KEY);
    set({ apiKey: key || DEFAULT_API_KEY });
  },

  saveApiKey: async (key) => {
    await storage.set(API_KEY_STORAGE_KEY, key);
    set({ apiKey: key });
  },

  loadProvider: async () => {
    const provider = await storage.get(PROVIDER_STORAGE_KEY);
    set({ apiProvider: provider || 'groq' });
  },

  saveProvider: async (provider) => {
    await storage.set(PROVIDER_STORAGE_KEY, provider);
    set({ apiProvider: provider });
  },

  fetchProfile: async (userId) => {
    const snap = await getDoc(doc(db, 'users', userId));
    if (snap.exists()) {
      set({ profile: { id: userId, ...snap.data() } });
    }
  },

  login: async (email, password) => {
    set({ error: null });
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      set({ error: err.message });
      throw err;
    }
  },

  register: async (email, password) => {
    set({ error: null });
    try {
      const { user: firebaseUser } = await createUserWithEmailAndPassword(auth, email, password);
      return { user: { id: firebaseUser.uid, email: firebaseUser.email } };
    } catch (err) {
      set({ error: err.message });
      throw err;
    }
  },

  saveProfile: async (profileData) => {
    const user = get().user;
    if (!user) return;

    await setDoc(doc(db, 'users', user.id), {
      ...profileData,
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    set({ profile: { id: user.id, ...profileData } });
  },

  logout: async () => {
    await signOut(auth);
    set({ user: null, profile: null });
  },

  clearError: () => set({ error: null }),
}));
