import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../src/utils/theme';
import { apiCall } from '../../src/utils/api';
import { useAuth } from '../../src/context/AuthContext';
import { useRouter } from 'expo-router';

export default function ProfileScreen() {
  const { user, logout, refreshUser } = useAuth();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: user?.name || '',
    height_cm: user?.height_cm?.toString() || '',
    weight_kg: user?.weight_kg?.toString() || '',
    age: user?.age?.toString() || '',
    gender: user?.gender || '',
    goal: user?.goal || '',
  });

  const setField = (key: string, val: string) => setForm(p => ({ ...p, [key]: val }));

  const saveProfile = async () => {
    setSaving(true);
    try {
      await apiCall('/profile', {
        method: 'PUT',
        body: JSON.stringify({
          name: form.name || undefined,
          height_cm: form.height_cm ? parseFloat(form.height_cm) : undefined,
          weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : undefined,
          age: form.age ? parseInt(form.age) : undefined,
          gender: form.gender || undefined,
          goal: form.goal || undefined,
        }),
      });
      await refreshUser();
      setEditing(false);
      Alert.alert('Success', 'Profile updated!');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: async () => {
        await logout();
        router.replace('/auth/login');
      }},
    ]);
  };

  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';

  const GOALS = ['Weight Loss', 'Muscle Gain', 'Maintenance', 'General Fitness'];
  const GENDERS = ['male', 'female'];

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView style={s.scroll} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
          <View style={s.header}>
            <View style={s.avatar}>
              <Text style={s.avatarText}>{initials}</Text>
            </View>
            <Text style={s.name}>{user?.name || 'Athlete'}</Text>
            <Text style={s.email}>{user?.email}</Text>
          </View>

          <View style={s.card}>
            <View style={s.cardHeader}>
              <Text style={s.cardTitle}>PERSONAL INFO</Text>
              {!editing ? (
                <TouchableOpacity testID="edit-profile-btn" onPress={() => {
                  setForm({
                    name: user?.name || '',
                    height_cm: user?.height_cm?.toString() || '',
                    weight_kg: user?.weight_kg?.toString() || '',
                    age: user?.age?.toString() || '',
                    gender: user?.gender || '',
                    goal: user?.goal || '',
                  });
                  setEditing(true);
                }}>
                  <Ionicons name="pencil" size={18} color={COLORS.primary} />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity testID="cancel-edit-btn" onPress={() => setEditing(false)}>
                  <Ionicons name="close" size={20} color={COLORS.error} />
                </TouchableOpacity>
              )}
            </View>

            {editing ? (
              <>
                <ProfileInput label="Name" value={form.name} onChangeText={v => setField('name', v)} testID="profile-name-input" />
                <ProfileInput label="Height (cm)" value={form.height_cm} onChangeText={v => setField('height_cm', v)} keyboard="numeric" testID="profile-height-input" />
                <ProfileInput label="Weight (kg)" value={form.weight_kg} onChangeText={v => setField('weight_kg', v)} keyboard="numeric" testID="profile-weight-input" />
                <ProfileInput label="Age" value={form.age} onChangeText={v => setField('age', v)} keyboard="numeric" testID="profile-age-input" />

                <Text style={s.fieldLabel}>Gender</Text>
                <View style={s.chipRow}>
                  {GENDERS.map(g => (
                    <TouchableOpacity key={g} testID={`profile-gender-${g}`} style={[s.chip, form.gender === g && s.chipActive]} onPress={() => setField('gender', g)}>
                      <Text style={[s.chipText, form.gender === g && s.chipActiveText]}>{g.toUpperCase()}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={s.fieldLabel}>Goal</Text>
                <View style={s.chipRow}>
                  {GOALS.map(g => (
                    <TouchableOpacity key={g} testID={`profile-goal-${g}`} style={[s.chip, form.goal === g && s.chipActive]} onPress={() => setField('goal', g)}>
                      <Text style={[s.chipText, form.goal === g && s.chipActiveText]}>{g}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity testID="save-profile-btn" style={s.saveBtn} onPress={saveProfile} disabled={saving}>
                  {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnText}>SAVE CHANGES</Text>}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <InfoRow icon="person" label="Name" value={user?.name || '--'} />
                <InfoRow icon="resize-outline" label="Height" value={user?.height_cm ? `${user.height_cm} cm` : '--'} />
                <InfoRow icon="scale-outline" label="Weight" value={user?.weight_kg ? `${user.weight_kg} kg` : '--'} />
                <InfoRow icon="calendar-outline" label="Age" value={user?.age ? `${user.age} years` : '--'} />
                <InfoRow icon="male-female" label="Gender" value={user?.gender ? user.gender.charAt(0).toUpperCase() + user.gender.slice(1) : '--'} />
                <InfoRow icon="flag-outline" label="Goal" value={user?.goal || '--'} />
              </>
            )}
          </View>

          <TouchableOpacity testID="logout-btn" style={s.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color={COLORS.error} />
            <Text style={s.logoutText}>Logout</Text>
          </TouchableOpacity>

          <Text style={s.version}>Fat2FitXpress v1.0.0</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={s.infoRow}>
      <Ionicons name={icon as any} size={18} color={COLORS.textMuted} />
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={s.infoValue}>{value}</Text>
    </View>
  );
}

function ProfileInput({ label, value, onChangeText, keyboard, testID }: {
  label: string; value: string; onChangeText: (v: string) => void; keyboard?: string; testID?: string;
}) {
  return (
    <View style={s.fieldWrap}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput
        testID={testID}
        style={s.fieldInput}
        value={value}
        onChangeText={onChangeText}
        keyboardType={(keyboard as any) || 'default'}
        placeholderTextColor={COLORS.textMuted}
      />
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 48 },
  header: { alignItems: 'center', marginBottom: 32, marginTop: 16 },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  avatarText: { fontSize: 28, fontWeight: '900', color: '#fff' },
  name: { fontSize: 22, fontWeight: '900', color: COLORS.textPrimary },
  email: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },
  card: {
    backgroundColor: COLORS.surface, borderRadius: 16, padding: 20, marginBottom: 20,
    borderWidth: 1, borderColor: COLORS.border,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  cardTitle: { fontSize: 12, fontWeight: '800', color: COLORS.textSecondary, letterSpacing: 2 },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 12 },
  infoLabel: { fontSize: 14, color: COLORS.textMuted, flex: 1 },
  infoValue: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  fieldWrap: { marginBottom: 14 },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 },
  fieldInput: {
    backgroundColor: COLORS.surfaceHighlight, borderRadius: 10, height: 44,
    paddingHorizontal: 14, color: COLORS.textPrimary, fontSize: 15,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, backgroundColor: COLORS.surfaceHighlight },
  chipActive: { backgroundColor: COLORS.primary },
  chipText: { color: COLORS.textMuted, fontSize: 12, fontWeight: '600' },
  chipActiveText: { color: '#fff' },
  saveBtn: {
    backgroundColor: COLORS.primary, height: 48, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', marginTop: 8,
  },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '800', letterSpacing: 1 },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.surface, borderRadius: 12, paddingVertical: 14,
    borderWidth: 1, borderColor: COLORS.error + '40',
  },
  logoutText: { color: COLORS.error, fontSize: 15, fontWeight: '700' },
  version: { textAlign: 'center', color: COLORS.textMuted, fontSize: 12, marginTop: 24 },
});
