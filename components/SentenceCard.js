import { View, Text, StyleSheet } from 'react-native';
import colors from '../constants/colors';

export default function SentenceCard({ sentence, index }) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>Example {index + 1}</Text>
      <Text style={styles.sentence}>"{sentence}"</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderLeftWidth: 2,
    borderLeftColor: colors.primaryLight,
    paddingLeft: 16,
    marginBottom: 18,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textLight,
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  sentence: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 24,
    fontStyle: 'italic',
  },
});
