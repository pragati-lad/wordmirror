import { create } from 'zustand';
import * as bookmarkService from '../services/bookmarkService';

export const useBookmarkStore = create((set, get) => ({
  bookmarks: [],
  loading: false,
  error: null,

  loadBookmarks: async (userId) => {
    set({ loading: true, error: null });
    try {
      const bookmarks = await bookmarkService.fetchBookmarks(userId);
      set({ bookmarks });
    } catch (err) {
      set({ error: err.message });
    } finally {
      set({ loading: false });
    }
  },

  addBookmark: async (userId, wordData) => {
    try {
      const bookmark = await bookmarkService.addBookmark(userId, wordData);
      set(state => ({ bookmarks: [bookmark, ...state.bookmarks] }));
    } catch (err) {
      set({ error: err.message });
    }
  },

  removeBookmark: async (userId, word) => {
    try {
      await bookmarkService.removeBookmark(userId, word);
      set(state => ({
        bookmarks: state.bookmarks.filter(b => b.word !== word),
      }));
    } catch (err) {
      set({ error: err.message });
    }
  },

  isBookmarked: (word) => {
    return get().bookmarks.some(b => b.word === word);
  },
}));
