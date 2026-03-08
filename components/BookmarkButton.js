import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../constants/colors';

export default function BookmarkButton({ isBookmarked, onToggle, size = 24 }) {
  return (
    <TouchableOpacity onPress={onToggle} style={styles.button} hitSlop={8}>
      <Ionicons
        name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
        size={size}
        color={isBookmarked ? colors.secondary : colors.textSecondary}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: 4,
  },
});
