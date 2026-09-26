import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import PronounceButton from "./PronounceButton";
import colors from "../constants/colors";

export default function DailyWordCard({ wordData, onPress }) {
  const router = useRouter();

  const firstMeaning = wordData.meanings?.[0];
  const firstDef = firstMeaning?.definitions?.[0]?.definition || "";

  const handlePress = () => {
    if (onPress) onPress(wordData);
    router.push(`/word/${wordData.word}`);
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={handlePress}
      activeOpacity={0.85}
    >
      {/* WORD + SPEAKER */}
      <View style={styles.header}>
        <View style={styles.wordContainer}>
          <Text style={styles.word}>{wordData.word}</Text>
          {wordData.phonetic && (
            <Text style={styles.phonetic}>{wordData.phonetic}</Text>
          )}
        </View>

        <PronounceButton word={wordData.word} size={18} />
      </View>

      {/* PART OF SPEECH */}
      {firstMeaning && (
        <Text style={styles.partOfSpeech}>{firstMeaning.partOfSpeech}</Text>
      )}

      {/* DEFINITION */}
      <Text style={styles.definition} numberOfLines={3}>
        {firstDef}
      </Text>

      {/* EXAMPLE SENTENCE */}
      {wordData.personalizedSentences?.[0] && (
        <Text style={styles.example}>
          “{wordData.personalizedSentences[0]}”
        </Text>
      )}

      {/* FOOTER */}
      <View style={styles.footer}>
        <View style={styles.synonyms}>
          {firstMeaning?.synonyms?.slice(0, 3).map((syn, i) => (
            <Text key={i} style={styles.synonym}>
              {syn}
            </Text>
          ))}
        </View>

        <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 24,
    marginBottom: 18,
    shadowColor: colors.primaryDark,
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  wordContainer: {
    flex: 1,
  },

  word: {
    fontSize: 26,
    fontWeight: "300",
    color: colors.text,
    letterSpacing: -0.5,
  },

  phonetic: {
    fontSize: 14,
    color: colors.textLight,
    marginTop: 4,
    fontWeight: "400",
  },

  partOfSpeech: {
    marginTop: 12,
    fontSize: 13,
    color: colors.textSecondary,
    fontStyle: "italic",
    fontWeight: "400",
  },

  definition: {
    marginTop: 10,
    fontSize: 15,
    color: colors.text,
    lineHeight: 24,
    fontWeight: "400",
  },

  example: {
    marginTop: 14,
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: "italic",
    lineHeight: 22,
    paddingLeft: 14,
    borderLeftWidth: 2,
    borderLeftColor: colors.primaryLight,
  },

  footer: {
    marginTop: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  synonyms: {
    flexDirection: "row",
    gap: 10,
  },

  synonym: {
    fontSize: 12,
    color: colors.textLight,
    fontWeight: "400",
  },
});