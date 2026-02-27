import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, ScrollView, Image
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../src/context/AuthContext';
import { COLORS } from '../../src/utils/theme';
import { Ionicons } from '@expo/vector-icons';

export default function SignupScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const { signup } = useAuth();
  const router = useRouter();

  async function handleSignup() {
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      await signup(name.trim(), email.trim().toLowerCase(), password);
      router.replace('/(tabs)');
    } catch (err: any) {
      Alert.alert('Signup Failed', err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} testID="signup-back-btn" style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <View style={styles.signupLogoRow}>
              <Image
                source={require('../../assets/images/f2f_icon.png')}
                style={styles.signupLogo}
                resizeMode="contain"
              />
              <View>
                <Text style={styles.title}>CREATE ACCOUNT</Text>
                <Text style={styles.subtitle}>Start your fitness journey today</Text>
              </View>
            </View>
          </View>

          <View style={styles.form}>
            <View style={styles.inputRow}>
              <Ionicons name="person-outline" size={20} color={COLORS.textMuted} />
              <TextInput
                testID="signup-name-input"
                style={styles.input}
                placeholder="Full Name"
                placeholderTextColor={COLORS.textMuted}
                value={name}
                onChangeText={setName}
              />
            </View>

            <View style={styles.inputRow}>
              <Ionicons name="mail-outline" size={20} color={COLORS.textMuted} />
              <TextInput
                testID="signup-email-input"
                style={styles.input}
                placeholder="Email"
                placeholderTextColor={COLORS.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputRow}>
              <Ionicons name="lock-closed-outline" size={20} color={COLORS.textMuted} />
              <TextInput
                testID="signup-password-input"
                style={styles.input}
                placeholder="Password (min 6 chars)"
                placeholderTextColor={COLORS.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPw}
              />
              <TouchableOpacity onPress={() => setShowPw(!showPw)} testID="signup-toggle-pw-btn">
                <Ionicons name={showPw ? 'eye-off' : 'eye'} size={20} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              testID="signup-submit-btn"
              style={[styles.btn, loading && { opacity: 0.6 }]}
              onPress={handleSignup}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>SIGN UP</Text>}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.back()} testID="go-to-login-btn" style={styles.linkBtn}>
              <Text style={styles.linkText}>
                Already have an account? <Text style={styles.linkHL}>Login</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  header: { marginBottom: 40 },
  backBtn: { marginBottom: 16 },
  signupLogoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  signupLogo: { width: 48, height: 48 },
  title: { fontSize: 28, fontWeight: '900', color: COLORS.textPrimary, letterSpacing: 2 },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },
  form: { gap: 16 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.surface, borderRadius: 12, paddingHorizontal: 16,
    height: 52, borderWidth: 1, borderColor: COLORS.border,
  },
  input: { flex: 1, color: COLORS.textPrimary, fontSize: 16 },
  btn: {
    backgroundColor: COLORS.primary, height: 52, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', marginTop: 8,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 2 },
  linkBtn: { alignItems: 'center', marginTop: 16 },
  linkText: { color: COLORS.textSecondary, fontSize: 14 },
  linkHL: { color: COLORS.primary, fontWeight: '700' },
});
