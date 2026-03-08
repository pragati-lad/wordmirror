import { useState, useEffect } from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import colors from '../constants/colors';

export default function PronounceButton({ word, size = 24 }) {
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, []);

  const handlePress = () => {
    if (speaking) {
      Speech.stop();
      setSpeaking(false);
      return;
    }

    setSpeaking(true);
    Speech.speak(word, {
      language: 'en-US',
      onDone: () => setSpeaking(false),
      onStopped: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    });
  };

  return (
    <TouchableOpacity onPress={handlePress} style={styles.button} hitSlop={8}>
      <Ionicons
        name={speaking ? 'volume-high' : 'volume-high-outline'}
        size={size}
        color={speaking ? colors.primary : colors.textSecondary}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: 4,
  },
});
