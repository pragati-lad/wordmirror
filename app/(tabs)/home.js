import { useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DailyWordCard from '../../components/DailyWordCard';
import { useAuthStore } from '../../store/authStore';
import { useDailyWordsStore } from '../../store/dailyWordsStore';
import colors from '../../constants/colors';

export default function HomeScreen() {
  const { profile, apiKey } = useAuthStore();
  const { loading, error, loadWords, fetchNewWords, getVisibleWords, markWordVisited } =
    useDailyWordsStore();

  const visibleWords = getVisibleWords();

  useEffect(() => {
    if (apiKey) {
      loadWords(apiKey, profile);
    }
  }, [apiKey]);

  useEffect(() => {
    const interval = setInterval(() => {
      useDailyWordsStore.setState({});
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleWordPress = (wordData) => {
    markWordVisited(wordData.word);
  };

  const greeting = profile?.name ? `${profile.name}` : 'there';
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.hello}>Hello, {greeting}</Text>
        <Text style={styles.date}>{today}</Text>
        <View style={styles.divider} />
        <Text style={styles.sectionLabel}>Today's words</Text>
      </View>

      {!apiKey && (
        <View style={styles.centerContent}>
          <View style={styles.emptyIcon}>
            <Ionicons name="key-outline" size={28} color={colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>Add your API key</Text>
          <Text style={styles.emptySubtitle}>
            Go to Profile and add an API key to start learning.
          </Text>
        </View>
      )}

      {apiKey && loading && (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Fetching new words...</Text>
        </View>
      )}

      {apiKey && error && !loading && (
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => fetchNewWords(apiKey, profile)}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {apiKey && !loading && !error && visibleWords.length > 0 && (
        <View>
          {visibleWords.map((wordData, index) => (
            <DailyWordCard
              key={wordData.word}
              wordData={wordData}
              index={index}
              onPress={handleWordPress}
            />
          ))}
        </View>
      )}

      {apiKey && !loading && !error && visibleWords.length === 0 && (
        <View style={styles.centerContent}>
          <View style={styles.emptyIcon}>
            <Ionicons name="time-outline" size={28} color={colors.secondary} />
          </View>
          <Text style={styles.emptyTitle}>Words coming soon</Text>
          <Text style={styles.emptySubtitle}>
            Your next word will appear at its scheduled time.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 24,
    paddingTop: 16,
    paddingBottom: 40,
    flexGrow: 1,
  },
  header: {
    marginTop: 20,
    marginBottom: 32,
  },
  hello: {
    fontSize: 32,
    fontWeight: '300',
    color: colors.text,
    letterSpacing: -0.5,
  },
  date: {
    fontSize: 13,
    color: colors.textLight,
    marginTop: 6,
    letterSpacing: 0.2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: 24,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
    letterSpacing: 0.3,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surfaceHighlight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  errorText: {
    fontSize: 14,
    color: colors.error,
    textAlign: 'center',
    lineHeight: 22,
  },
  retryButton: {
    backgroundColor: colors.white,
    paddingHorizontal: 28,
    paddingVertical: 11,
    borderRadius: 24,
    marginTop: 6,
    shadowColor: colors.primary,
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  retryText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 14,
  },
});
