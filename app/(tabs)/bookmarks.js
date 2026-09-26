import { useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { useBookmarkStore } from '../../store/bookmarkStore';
import PronounceButton from '../../components/PronounceButton';
import colors from '../../constants/colors';

export default function BookmarksScreen() {
  const { user } = useAuthStore();
  const { bookmarks, loading, loadBookmarks } = useBookmarkStore();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      loadBookmarks(user.id);
    }
  }, [user]);

  const renderBookmark = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/word/${item.word}`)}
      activeOpacity={0.7}
    >
      <View style={styles.cardContent}>
        <View style={styles.wordRow}>
          <Text style={styles.word}>{item.word}</Text>
          <PronounceButton word={item.word} size={18} />
        </View>
        {item.partOfSpeech ? (
          <Text style={styles.pos}>{item.partOfSpeech}</Text>
        ) : null}
        <Text style={styles.definition} numberOfLines={2}>
          {item.definition}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textLight} />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centerContent}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {bookmarks.length === 0 ? (
        <View style={styles.centerContent}>
          <View style={styles.emptyIcon}>
            <Ionicons name="heart-outline" size={28} color={colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>No saved words</Text>
          <Text style={styles.emptySubtitle}>
            Bookmark words from the detail page to review them here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={bookmarks}
          keyExtractor={(item) => item.id}
          renderItem={renderBookmark}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <Text style={styles.count}>{bookmarks.length} word{bookmarks.length !== 1 ? 's' : ''} saved</Text>
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
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
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  list: {
    padding: 24,
    paddingBottom: 40,
  },
  count: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: 18,
    letterSpacing: 0.2,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 18,
    shadowColor: colors.primaryDark,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardContent: {
    flex: 1,
  },
  wordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 3,
  },
  word: {
    fontSize: 18,
    fontWeight: '500',
    color: colors.text,
  },
  pos: {
    fontSize: 13,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginBottom: 4,
  },
  definition: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 21,
  },
  separator: {
    height: 12,
  },
});
