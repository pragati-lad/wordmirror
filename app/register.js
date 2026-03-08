import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import ProfileForm from '../components/ProfileForm';
import colors from '../constants/colors';

export default function RegisterScreen() {
  const [step, setStep] = useState(1); // 1 = credentials, 2 = profile
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { register, saveProfile, error, clearError } = useAuthStore();
  const router = useRouter();

  const handleRegister = async () => {
    if (!email.trim() || password.length < 6) return;
    setLoading(true);
    try {
      await register(email.trim(), password);
      setStep(2);
    } catch {
      // error is set in store
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSubmit = async (profileData) => {
    try {
      await saveProfile(profileData);
      router.replace('/(tabs)/home');
    } catch {
      // error handled in store
    }
  };

  if (step === 2) {
    return (
      <View style={styles.container}>
        <View style={styles.stepHeader}>
          <Text style={styles.stepLabel}>Step 2 of 2</Text>
          <Text style={styles.stepTitle}>Create your profile</Text>
        </View>
        <ProfileForm onSubmit={handleProfileSubmit} submitLabel="Complete Signup" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.logo}>WordMirror</Text>
          <Text style={styles.tagline}>Learn words your way</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.stepLabel}>Step 1 of 2</Text>
          <Text style={styles.title}>Create your account</Text>

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={colors.textLight}
            value={email}
            onChangeText={(text) => { clearError(); setEmail(text); }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />

          <TextInput
            style={styles.input}
            placeholder="Password (min 6 characters)"
            placeholderTextColor={colors.textLight}
            value={password}
            onChangeText={(text) => { clearError(); setPassword(text); }}
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.buttonText}>Continue</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => router.back()}
          >
            <Text style={styles.linkText}>
              Already have an account? <Text style={styles.linkBold}>Log In</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 28,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logo: {
    fontSize: 44,
    fontWeight: '300',
    color: colors.primary,
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 15,
    color: colors.textLight,
    marginTop: 6,
  },
  stepHeader: {
    padding: 24,
    paddingTop: 60,
  },
  form: {
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 28,
    shadowColor: colors.primaryDark,
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  stepLabel: {
    fontSize: 13,
    color: colors.primaryDark,
    fontWeight: '500',
    marginBottom: 4,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '400',
    color: colors.text,
    letterSpacing: -0.3,
  },
  title: {
    fontSize: 22,
    fontWeight: '400',
    color: colors.text,
    marginBottom: 24,
    letterSpacing: -0.3,
  },
  errorBox: {
    backgroundColor: colors.error + '0A',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
  },
  input: {
    borderRadius: 14,
    padding: 15,
    fontSize: 16,
    color: colors.text,
    marginBottom: 14,
    backgroundColor: colors.surfaceLight,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 24,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  linkButton: {
    alignItems: 'center',
    marginTop: 20,
  },
  linkText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  linkBold: {
    color: colors.primary,
    fontWeight: '600',
  },
});
