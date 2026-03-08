import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import colors from '../constants/colors';

export default function WordCard({ wordData }) {
  const router = useRouter();

  const firstMeaning = wordData.meanings[0];
  const firstDef = firstMeaning?.definitions[0]?.definition || '';

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/word/${wordData.word}`)}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.wordRow}>
          <Text style={styles.word}>{wordData.word}</Text>
          {wordData.phonetic ? (
            <Text style={styles.phonetic}>{wordData.phonetic}</Text>
          ) : null}
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
      </View>

      {firstMeaning && (
        <View style={styles.posTag}>
          <Text style={styles.posText}>{firstMeaning.partOfSpeech}</Text>
        </View>
      )}

      <Text style={styles.definition} numberOfLines={2}>
        {firstDef}
      </Text>

      {firstMeaning?.synonyms?.length > 0 && (
        <View style={styles.synonymsRow}>
          <Text style={styles.synonymsLabel}>Synonyms: </Text>
          <Text style={styles.synonyms} numberOfLines={1}>
            {firstMeaning.synonyms.slice(0, 3).join(', ')}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 20,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  wordRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  word: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  phonetic: {
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  posTag: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 8,
  },
  posText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  definition: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  synonymsRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  synonymsLabel: {
    fontSize: 13,
    color: colors.textLight,
    fontWeight: '600',
  },
  synonyms: {
    fontSize: 13,
    color: colors.primaryDark,
    flex: 1,
  },
});
