import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { useBookmarkStore } from '../../store/bookmarkStore';
import { useDailyWordsStore } from '../../store/dailyWordsStore';
import { getWordDetails } from '../../services/openaiService';
import BookmarkButton from '../../components/BookmarkButton';
import PronounceButton from '../../components/PronounceButton';
import SentenceCard from '../../components/SentenceCard';
import colors from '../../constants/colors';

export default function WordDetailScreen() {
  const { word } = useLocalSearchParams();
  const { profile, user, apiKey } = useAuthStore();
  const { isBookmarked, addBookmark, removeBookmark } = useBookmarkStore();
  const { getWordByName } = useDailyWordsStore();
  const [wordData, setWordData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const bookmarked = isBookmarked(word);

  useEffect(() => {
    loadWordData();
  }, [word]);

  const loadWordData = async () => {
    setLoading(true);
    setError(null);

    const cached = getWordByName(word);
    if (cached) {
      setWordData(cached);
      setLoading(false);
      return;
    }

    if (!apiKey) {
      setError('No API key set. Add your API key in Profile settings.');
      setLoading(false);
      return;
    }

    try {
      const data = await getWordDetails(apiKey, word, profile);
      setWordData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleBookmark = () => {
    if (!user) return;
    const firstMeaning = wordData?.meanings[0];
    if (bookmarked) {
      removeBookmark(user.id, word);
    } else {
      addBookmark(user.id, {
        word,
        definition: firstMeaning?.definitions[0]?.definition || '',
        partOfSpeech: firstMeaning?.partOfSpeech || '',
      });
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContent}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContent}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadWordData}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.wordRow}>
          <Text style={styles.word}>{wordData.word}</Text>
          <View style={styles.wordActions}>
            <PronounceButton word={wordData.word} size={24} />
            <BookmarkButton isBookmarked={bookmarked} onToggle={handleToggleBookmark} size={24} />
          </View>
        </View>
        {wordData.phonetic ? (
          <Text style={styles.phonetic}>{wordData.phonetic}</Text>
        ) : null}
      </View>

      <View style={styles.divider} />

      {/* Meanings */}
      {wordData.meanings?.map((meaning, idx) => (
        <View key={idx} style={styles.meaningSection}>
          <View style={styles.posBadge}>
            <Text style={styles.posText}>{meaning.partOfSpeech}</Text>
          </View>

          {meaning.definitions?.map((def, defIdx) => (
            <View key={defIdx} style={styles.definitionBlock}>
              <View style={styles.defNumberCircle}>
                <Text style={styles.definitionNumber}>{defIdx + 1}</Text>
              </View>
              <View style={styles.definitionContent}>
                <Text style={styles.definition}>{def.definition}</Text>
                {def.example && (
                  <Text style={styles.dictExample}>"{def.example}"</Text>
                )}
              </View>
            </View>
          ))}

          {meaning.synonyms?.length > 0 && (
            <View style={styles.tagsRow}>
              <Text style={styles.tagsLabel}>Synonyms</Text>
              <View style={styles.tags}>
                {meaning.synonyms.map((syn, i) => (
                  <View key={i} style={styles.tag}>
                    <Text style={styles.tagText}>{syn}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {meaning.antonyms?.length > 0 && (
            <View style={styles.tagsRow}>
              <Text style={styles.tagsLabel}>Antonyms</Text>
              <View style={styles.tags}>
                {meaning.antonyms.map((ant, i) => (
                  <View key={i} style={[styles.tag, styles.antonymTag]}>
                    <Text style={[styles.tagText, styles.antonymText]}>{ant}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {idx < wordData.meanings.length - 1 && <View style={styles.divider} />}
        </View>
      ))}

      {/* Personalized Sentences */}
      {wordData.personalizedSentences?.length > 0 && (
        <View style={styles.sentencesSection}>
          <View style={styles.divider} />
          <Text style={styles.sentencesTitle}>Your Examples</Text>
          {wordData.personalizedSentences.map((sentence, sIdx) => (
            <SentenceCard key={sIdx} sentence={sentence} index={sIdx} />
          ))}
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
    paddingBottom: 48,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: colors.background,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  header: {
    marginBottom: 8,
  },
  wordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  wordActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  word: {
    fontSize: 36,
    fontWeight: '300',
    color: colors.text,
    letterSpacing: -0.8,
  },
  phonetic: {
    fontSize: 16,
    color: colors.textLight,
    marginTop: 6,
    fontWeight: '400',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: 24,
  },
  meaningSection: {
    marginBottom: 4,
  },
  posBadge: {
    backgroundColor: colors.surfaceHighlight,
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 14,
    marginBottom: 18,
  },
  posText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.primaryDark,
    fontStyle: 'italic',
  },
  definitionBlock: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  defNumberCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.surfaceHighlight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  definitionNumber: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primaryDark,
  },
  definitionContent: {
    flex: 1,
  },
  definition: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 25,
    fontWeight: '400',
  },
  dictExample: {
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 8,
    lineHeight: 22,
  },
  tagsRow: {
    marginTop: 14,
    marginBottom: 8,
  },
  tagsLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textLight,
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  tag: {
    backgroundColor: colors.surfaceHighlight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagText: {
    fontSize: 13,
    color: colors.primaryDark,
    fontWeight: '500',
  },
  antonymTag: {
    backgroundColor: colors.error + '10',
  },
  antonymText: {
    color: colors.error,
  },
  sentencesSection: {
    marginTop: 4,
  },
  sentencesTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
    letterSpacing: 0.3,
    marginBottom: 18,
  },
  errorText: {
    fontSize: 14,
    color: colors.error,
    textAlign: 'center',
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
