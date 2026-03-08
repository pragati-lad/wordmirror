import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import ProfileForm from '../../components/ProfileForm';
import colors from '../../constants/colors';
import { storage } from '../../utils/storage';

const NOTIFICATION_SETTINGS_KEY = 'notification-settings';

export default function ProfileScreen() {
  const { user, profile, apiKey, saveProfile, saveApiKey, logout } = useAuthStore();
  const [editing, setEditing] = useState(false);
  const [editingKey, setEditingKey] = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [notifStartHour, setNotifStartHour] = useState(8);
  const [notifEndHour, setNotifEndHour] = useState(20);

  useEffect(() => {
    loadNotificationSettings();
  }, []);

  const loadNotificationSettings = async () => {
    const settings = await storage.get(NOTIFICATION_SETTINGS_KEY);
    if (settings) {
      setNotifStartHour(settings.startHour);
      setNotifEndHour(settings.endHour);
    }
  };

  const saveNotificationSettings = async () => {
    if (notifStartHour >= notifEndHour) {
      Alert.alert('Invalid time range', 'Start time must be before end time');
      return;
    }
    await storage.set(NOTIFICATION_SETTINGS_KEY, {
      startHour: notifStartHour,
      endHour: notifEndHour,
    });
    Alert.alert('Saved', `Notifications between ${notifStartHour}:00 - ${notifEndHour}:00`);
  };

  const handleSave = async (data) => {
    await saveProfile(data);
    setEditing(false);
  };

  const handleSaveApiKey = async () => {
    const trimmed = keyInput.trim();
    if (!trimmed) return;
    await saveApiKey(trimmed);
    setEditingKey(false);
    setKeyInput('');
  };

  const maskKey = (key) => {
    if (!key) return 'Not set';
    if (key.length <= 8) return '--------';
    return key.slice(0, 5) + '---' + key.slice(-4);
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: () => logout() },
    ]);
  };

  if (editing) {
    return (
      <View style={styles.container}>
        <View style={styles.editHeader}>
          <TouchableOpacity onPress={() => setEditing(false)} style={styles.closeBtn}>
            <Ionicons name="close" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
        <ProfileForm
          initialData={profile}
          onSubmit={handleSave}
          submitLabel="Save Changes"
        />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>
            {(profile?.name || user?.email || '?')[0].toUpperCase()}
          </Text>
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.name}>{profile?.name || 'No name set'}</Text>
          <Text style={styles.email}>{user?.email}</Text>
        </View>
        <TouchableOpacity style={styles.editIconBtn} onPress={() => setEditing(true)}>
          <Ionicons name="create-outline" size={18} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Profile Details Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Profile</Text>
        <View style={styles.detailGrid}>
          <DetailItem icon="calendar-outline" label="Age" value={profile?.age ? `${profile.age} yrs` : null} />
          <DetailItem icon="globe-outline" label="Country" value={profile?.country} />
          <DetailItem icon="briefcase-outline" label="Profession" value={profile?.profession} />
        </View>

        {profile?.interests?.length > 0 && (
          <View style={styles.tagSection}>
            <Text style={styles.tagLabel}>Interests</Text>
            <View style={styles.tags}>
              {profile.interests.map((item, i) => (
                <View key={i} style={styles.tag}>
                  <Text style={styles.tagText}>{item}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {profile?.hobbies?.length > 0 && (
          <View style={styles.tagSection}>
            <Text style={styles.tagLabel}>Hobbies</Text>
            <View style={styles.tags}>
              {profile.hobbies.map((item, i) => (
                <View key={i} style={[styles.tag, styles.hobbyTag]}>
                  <Text style={[styles.tagText, styles.hobbyTagText]}>{item}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>

      {/* API Key Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>API Key</Text>
        {editingKey ? (
          <View style={styles.apiKeyInputRow}>
            <TextInput
              style={styles.apiKeyInput}
              placeholder="Paste your API key..."
              placeholderTextColor={colors.textLight}
              value={keyInput}
              onChangeText={setKeyInput}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
            />
            <TouchableOpacity style={styles.apiKeySaveBtn} onPress={handleSaveApiKey}>
              <Ionicons name="checkmark" size={18} color={colors.white} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.apiKeyCancelBtn}
              onPress={() => { setEditingKey(false); setKeyInput(''); }}
            >
              <Ionicons name="close" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.apiKeyDisplay} onPress={() => setEditingKey(true)}>
            <View style={styles.apiKeyLeft}>
              <Ionicons name="key-outline" size={16} color={colors.textLight} />
              <Text style={styles.apiKeyValue}>{maskKey(apiKey)}</Text>
            </View>
            <Text style={styles.apiKeyAction}>{apiKey ? 'Change' : 'Add'}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Notification Schedule Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Notification Schedule</Text>
        <View style={styles.timeRow}>
          <View style={styles.timeBlock}>
            <Text style={styles.timeLabel}>From</Text>
            <View style={styles.timeStepper}>
              <TouchableOpacity
                style={styles.stepBtn}
                onPress={() => setNotifStartHour(Math.max(0, notifStartHour - 1))}
              >
                <Ionicons name="remove" size={16} color={colors.primary} />
              </TouchableOpacity>
              <Text style={styles.timeValue}>{String(notifStartHour).padStart(2, '0')}:00</Text>
              <TouchableOpacity
                style={styles.stepBtn}
                onPress={() => setNotifStartHour(Math.min(23, notifStartHour + 1))}
              >
                <Ionicons name="add" size={16} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>

          <Ionicons name="arrow-forward" size={14} color={colors.textLight} style={{ marginTop: 24 }} />

          <View style={styles.timeBlock}>
            <Text style={styles.timeLabel}>To</Text>
            <View style={styles.timeStepper}>
              <TouchableOpacity
                style={styles.stepBtn}
                onPress={() => setNotifEndHour(Math.max(0, notifEndHour - 1))}
              >
                <Ionicons name="remove" size={16} color={colors.primary} />
              </TouchableOpacity>
              <Text style={styles.timeValue}>{String(notifEndHour).padStart(2, '0')}:00</Text>
              <TouchableOpacity
                style={styles.stepBtn}
                onPress={() => setNotifEndHour(Math.min(23, notifEndHour + 1))}
              >
                <Ionicons name="add" size={16} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.saveScheduleBtn} onPress={saveNotificationSettings}>
          <Text style={styles.saveScheduleBtnText}>Save Schedule</Text>
        </TouchableOpacity>
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={18} color={colors.error} />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function DetailItem({ icon, label, value }) {
  return (
    <View style={styles.detailItem}>
      <Ionicons name={icon} size={16} color={colors.primary} />
      <View style={styles.detailContent}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value || 'Not set'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 24,
    paddingTop: 28,
  },
  editHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    paddingTop: 8,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceHighlight,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Profile Header
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.surfaceHighlight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '300',
    color: colors.primary,
  },
  headerInfo: {
    flex: 1,
    marginLeft: 18,
  },
  name: {
    fontSize: 22,
    fontWeight: '400',
    color: colors.text,
    letterSpacing: -0.3,
  },
  email: {
    fontSize: 13,
    color: colors.textLight,
    marginTop: 3,
  },
  editIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surfaceHighlight,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Cards
  card: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 20,
    marginBottom: 18,
    shadowColor: colors.primaryDark,
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: 16,
    letterSpacing: 0.3,
  },

  // Detail Grid
  detailGrid: {
    gap: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  detailContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '400',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },

  // Tags
  tagSection: {
    marginTop: 18,
    paddingTop: 18,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  tagLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textLight,
    marginBottom: 10,
    letterSpacing: 0.2,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: colors.surfaceHighlight,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  tagText: {
    fontSize: 13,
    color: colors.primaryDark,
    fontWeight: '500',
  },
  hobbyTag: {
    backgroundColor: colors.secondary + '18',
  },
  hobbyTagText: {
    color: colors.accent,
  },

  // API Key
  apiKeyInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  apiKeyInput: {
    flex: 1,
    height: 44,
    backgroundColor: colors.surfaceLight,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    color: colors.text,
  },
  apiKeySaveBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  apiKeyCancelBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.surfaceHighlight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  apiKeyDisplay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderRadius: 12,
    padding: 14,
  },
  apiKeyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  apiKeyValue: {
    fontSize: 14,
    color: colors.textSecondary,
    fontFamily: 'monospace',
  },
  apiKeyAction: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },

  // Time Stepper
  timeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  timeBlock: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 12,
    color: colors.textLight,
    marginBottom: 8,
  },
  timeStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderRadius: 12,
    padding: 4,
  },
  stepBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surfaceHighlight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeValue: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
    textAlign: 'center',
  },
  saveScheduleBtn: {
    backgroundColor: colors.primary,
    borderRadius: 24,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 18,
  },
  saveScheduleBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },

  // Logout
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    marginTop: 10,
    borderRadius: 24,
    backgroundColor: colors.error + '08',
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.error,
  },
});
