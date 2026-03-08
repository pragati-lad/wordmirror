import { create } from 'zustand';
import { storage } from '../utils/storage';
import { generateDailyWords } from '../services/openaiService';
import { BARRON_WORDS } from '../data/barronWords';

const SCHEDULE_KEY = 'daily-word-schedule';
const NOTIFICATION_SETTINGS_KEY = 'notification-settings';
const WORDS_PER_DAY = 3;
const HOURS_UNTIL_EXPIRY = 24;

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Calculate scheduled times for 3 words equally spaced in time range
function calculateScheduledTimes(startHour, endHour) {
  const totalHours = endHour - startHour;
  const interval = totalHours / WORDS_PER_DAY;

  const now = new Date();
  const times = [];
  for (let i = 0; i < WORDS_PER_DAY; i++) {
    const hour = startHour + Math.round(interval * (i + 0.5));
    const scheduled = new Date(now);
    scheduled.setHours(hour, 0, 0, 0);
    times.push(scheduled.getTime());
  }
  return times;
}

// Check if a scheduled word should still be visible
function isWordVisible(entry) {
  const now = Date.now();

  // Not yet scheduled to show
  if (now < entry.scheduledTime) return false;

  // Never visited → always visible
  if (!entry.visitedAt) return true;

  const hoursSinceScheduled = (now - entry.scheduledTime) / (1000 * 60 * 60);

  // Visited AND 24+ hours since scheduled → expired (hide immediately)
  if (hoursSinceScheduled >= HOURS_UNTIL_EXPIRY) return false;

  // Visited AND <24 hours since scheduled → still visible until 24 hours
  return true;
}

export const useDailyWordsStore = create((set, get) => ({
  // wordSchedule: [{ word: {full AI object}, scheduledTime, visitedAt }]
  wordSchedule: [],
  loading: false,
  error: null,

  // Get only the words that should be visible right now
  getVisibleWords: () => {
    const { wordSchedule } = get();
    return wordSchedule.filter(isWordVisible).map(entry => entry.word);
  },

  // Load saved schedule from storage
  loadSchedule: async () => {
    const schedule = await storage.get(SCHEDULE_KEY);
    if (schedule) {
      set({ wordSchedule: schedule });
    }
    return schedule;
  },

  // Save schedule to storage
  saveSchedule: async (schedule) => {
    await storage.set(SCHEDULE_KEY, schedule);
    set({ wordSchedule: schedule });
  },

  // Pick 3 new words from Barron's list (avoid recently used)
  pickNextWords: async () => {
    const schedule = await storage.get(SCHEDULE_KEY);
    const recentWords = new Set(
      (schedule || []).map(e => e.word.word.toLowerCase())
    );

    let available = BARRON_WORDS.filter(w => !recentWords.has(w.toLowerCase()));
    if (available.length < WORDS_PER_DAY) {
      available = [...BARRON_WORDS];
    }

    return shuffle(available).slice(0, WORDS_PER_DAY);
  },

  // Main entry: load existing schedule or fetch new words
  loadWords: async (apiKey, userProfile) => {
    const schedule = await get().loadSchedule();

    // If we have a schedule with visible words, use it
    if (schedule && schedule.length > 0) {
      const hasVisible = schedule.some(isWordVisible);
      const hasUnexpired = schedule.some(e => {
        const hours = (Date.now() - e.scheduledTime) / (1000 * 60 * 60);
        return hours < HOURS_UNTIL_EXPIRY;
      });

      if (hasVisible || hasUnexpired) {
        set({ wordSchedule: schedule, loading: false, error: null });
        return;
      }
    }

    // No valid schedule → fetch new words
    await get().fetchNewWords(apiKey, userProfile);
  },

  // Fetch new words from AI and create schedule
  fetchNewWords: async (apiKey, userProfile) => {
    if (!apiKey) {
      set({ error: 'Please add your API key in Profile settings.', loading: false });
      return;
    }

    set({ loading: true, error: null });
    try {
      const targetWords = await get().pickNextWords();
      const words = await generateDailyWords(apiKey, userProfile, targetWords);

      // Get notification settings for scheduling
      const settings = await storage.get(NOTIFICATION_SETTINGS_KEY);
      const startHour = settings?.startHour || 8;
      const endHour = settings?.endHour || 20;

      const scheduledTimes = calculateScheduledTimes(startHour, endHour);

      // Create schedule entries
      const schedule = words.map((word, i) => ({
        word,
        scheduledTime: scheduledTimes[i],
        visitedAt: null,
      }));

      await get().saveSchedule(schedule);
      set({ loading: false });
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  // Mark a word as visited
  markWordVisited: async (wordName) => {
    const { wordSchedule } = get();
    const updated = wordSchedule.map(entry => {
      if (entry.word.word.toLowerCase() === wordName.toLowerCase()) {
        return { ...entry, visitedAt: Date.now() };
      }
      return entry;
    });
    await storage.set(SCHEDULE_KEY, updated);
    set({ wordSchedule: updated });
  },

  // Get a specific word by name
  getWordByName: (word) => {
    const { wordSchedule } = get();
    const entry = wordSchedule.find(
      e => e.word.word.toLowerCase() === word.toLowerCase()
    );
    return entry?.word || null;
  },

  // Reset everything
  resetProgress: async () => {
    await storage.remove(SCHEDULE_KEY);
    set({ wordSchedule: [] });
  },
}));
