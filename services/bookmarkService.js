import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import { db } from './firebase';

function bookmarksRef(userId) {
  return collection(db, 'users', userId, 'bookmarks');
}

export async function fetchBookmarks(userId) {
  const q = query(bookmarksRef(userId), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function addBookmark(userId, wordData) {
  const docRef = await addDoc(bookmarksRef(userId), {
    word: wordData.word,
    definition: wordData.definition,
    partOfSpeech: wordData.partOfSpeech,
    createdAt: new Date().toISOString(),
  });
  return {
    id: docRef.id,
    word: wordData.word,
    definition: wordData.definition,
    partOfSpeech: wordData.partOfSpeech,
  };
}

export async function removeBookmark(userId, word) {
  const q = query(bookmarksRef(userId), where('word', '==', word));
  const snap = await getDocs(q);
  const deletes = snap.docs.map((d) => deleteDoc(d.ref));
  await Promise.all(deletes);
}

export async function isBookmarked(userId, word) {
  const q = query(bookmarksRef(userId), where('word', '==', word));
  const snap = await getDocs(q);
  return !snap.empty;
}
