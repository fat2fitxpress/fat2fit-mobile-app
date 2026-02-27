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

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
      router.replace('/(tabs)');
    } catch (err: any) {
      Alert.alert('Login Failed', err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.logoArea}>
            <Image
              source={require('../../assets/images/f2f_logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Text style={styles.brandSub}>XPRESS</Text>
            <Text style={styles.tagline}>Your Express Journey to Fitness</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputRow}>
              <Ionicons name="mail-outline" size={20} color={COLORS.textMuted} />
              <TextInput
                testID="login-email-input"
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
                testID="login-password-input"
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={COLORS.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPw}
              />
              <TouchableOpacity onPress={() => setShowPw(!showPw)} testID="toggle-password-btn">
                <Ionicons name={showPw ? 'eye-off' : 'eye'} size={20} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              testID="login-submit-btn"
              style={[styles.btn, loading && { opacity: 0.6 }]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>LOGIN</Text>}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.push('/auth/signup')} testID="go-to-signup-btn" style={styles.linkBtn}>
              <Text style={styles.linkText}>
                Don't have an account? <Text style={styles.linkHL}>Sign Up</Text>
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
  logoArea: { alignItems: 'center', marginBottom: 48 },
  logoImage: { width: 220, height: 80, marginBottom: 8 },
  brandSub: { fontSize: 18, fontWeight: '700', color: COLORS.primary, letterSpacing: 8, marginTop: 0 },
  tagline: { fontSize: 13, color: COLORS.textSecondary, marginTop: 8 },
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
