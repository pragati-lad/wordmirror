import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../constants/colors';

export default function ProfileForm({ initialData, onSubmit, submitLabel = 'Save Profile' }) {
  const [name, setName] = useState(initialData?.name || '');
  const [age, setAge] = useState(initialData?.age?.toString() || '');
  const [country, setCountry] = useState(initialData?.country || '');
  const [profession, setProfession] = useState(initialData?.profession || '');
  const [interests, setInterests] = useState(initialData?.interests?.join(', ') || '');
  const [hobbies, setHobbies] = useState(initialData?.hobbies?.join(', ') || '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSubmit({
        name: name.trim(),
        age: age.trim() ? parseInt(age.trim(), 10) : null,
        country: country.trim(),
        profession: profession.trim(),
        interests: interests.split(',').map(s => s.trim()).filter(Boolean),
        hobbies: hobbies.split(',').map(s => s.trim()).filter(Boolean),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Tell us about yourself</Text>
      <Text style={styles.subtitle}>
        We'll use this to create personalized example sentences
      </Text>

      <View style={styles.field}>
        <Text style={styles.label}>Name *</Text>
        <View style={styles.inputRow}>
          <Ionicons name="person-outline" size={18} color={colors.primaryLight} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Your name"
            placeholderTextColor={colors.textLight}
            value={name}
            onChangeText={setName}
          />
        </View>
      </View>

      <View style={styles.row}>
        <View style={[styles.field, { flex: 1 }]}>
          <Text style={styles.label}>Age</Text>
          <View style={styles.inputRow}>
            <Ionicons name="calendar-outline" size={18} color={colors.primaryLight} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="25"
              placeholderTextColor={colors.textLight}
              value={age}
              onChangeText={setAge}
              keyboardType="number-pad"
              maxLength={3}
            />
          </View>
        </View>

        <View style={[styles.field, { flex: 2 }]}>
          <Text style={styles.label}>Country</Text>
          <View style={styles.inputRow}>
            <Ionicons name="globe-outline" size={18} color={colors.primaryLight} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="e.g., India, USA"
              placeholderTextColor={colors.textLight}
              value={country}
              onChangeText={setCountry}
            />
          </View>
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Profession</Text>
        <View style={styles.inputRow}>
          <Ionicons name="briefcase-outline" size={18} color={colors.primaryLight} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="e.g., Software Engineer, Student"
            placeholderTextColor={colors.textLight}
            value={profession}
            onChangeText={setProfession}
          />
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Interests</Text>
        <View style={styles.inputRow}>
          <Ionicons name="heart-outline" size={18} color={colors.primaryLight} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="e.g., cricket, technology, music"
            placeholderTextColor={colors.textLight}
            value={interests}
            onChangeText={setInterests}
          />
        </View>
        <Text style={styles.hint}>Separate with commas</Text>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Hobbies</Text>
        <View style={styles.inputRow}>
          <Ionicons name="game-controller-outline" size={18} color={colors.primaryLight} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="e.g., reading, gaming, cooking"
            placeholderTextColor={colors.textLight}
            value={hobbies}
            onChangeText={setHobbies}
          />
        </View>
        <Text style={styles.hint}>Separate with commas</Text>
      </View>

      <TouchableOpacity
        style={[styles.button, (!name.trim() || saving) && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={!name.trim() || saving}
      >
        {saving ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <Text style={styles.buttonText}>{submitLabel}</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '400',
    color: colors.text,
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    marginBottom: 32,
    lineHeight: 22,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  field: {
    marginBottom: 22,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderRadius: 14,
    paddingHorizontal: 14,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.text,
  },
  hint: {
    fontSize: 12,
    color: colors.textLight,
    marginTop: 4,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 24,
    padding: 16,
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 40,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
