import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../constants/colors';

export default function ProgressBar({ seen, total }) {
  const percentage = total > 0 ? Math.round((seen / total) * 100) : 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.labelRow}>
          <Ionicons name="school-outline" size={16} color={colors.primary} />
          <Text style={styles.label}>GRE Word Progress</Text>
        </View>
        <Text style={styles.count}>
          {seen} / {total} ({percentage}%)
        </Text>
      </View>
      <View style={styles.trackBar}>
        <View style={[styles.fillBar, { width: `${percentage}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  count: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  trackBar: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  fillBar: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
});
