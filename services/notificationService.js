import * as Notifications from 'expo-notifications';
import { storage } from '../utils/storage';

const NOTIFICATION_SCHEDULE_KEY = 'notification-schedule';

// Configure how notifications should behave
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const notificationService = {
  /**
   * Schedule notifications for 3 words throughout the day
   * @param {Array<object>} words - Full word objects from AI (with meanings, personalizedSentences)
   * @param {number} startHour - Start hour (e.g., 8 for 8am)
   * @param {number} endHour - End hour (e.g., 20 for 8pm)
   */
  scheduleNotifications: async (words, startHour, endHour) => {
    if (!words || words.length === 0) return;

    // Clear existing notifications
    await Notifications.cancelAllScheduledNotificationsAsync();

    const totalHours = endHour - startHour;
    const intervalHours = totalHours / words.length;
    const notificationIds = [];

    for (let i = 0; i < words.length; i++) {
      const hour = startHour + Math.round(intervalHours * (i + 0.5));
      const wordObj = words[i];

      // Extract first definition for notification body
      const definition = wordObj.meanings?.[0]?.definitions?.[0]?.definition || '';

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: wordObj.word,
          body: definition,
          data: { word: wordObj.word, index: i },
        },
        trigger: {
          type: 'daily',
          hour: hour % 24,
          minute: 0,
        },
      });

      notificationIds.push(notificationId);
    }

    await storage.set(NOTIFICATION_SCHEDULE_KEY, {
      startHour,
      endHour,
      notificationIds,
      scheduledAt: Date.now(),
    });

    return notificationIds;
  },

  getSchedule: async () => {
    return await storage.get(NOTIFICATION_SCHEDULE_KEY);
  },

  clearAll: async () => {
    await Notifications.cancelAllScheduledNotificationsAsync();
    await storage.remove(NOTIFICATION_SCHEDULE_KEY);
  },

  requestPermissions: async () => {
    try {
      const { granted } = await Notifications.requestPermissionsAsync();
      return granted;
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  },
};
