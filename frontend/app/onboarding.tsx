import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../src/utils/theme';
import { apiCall } from '../src/utils/api';
import { useAuth } from '../src/context/AuthContext';

type UnitSystem = 'metric' | 'imperial';
const LB_PER_KG = 2.20462;
const CM_PER_IN = 2.54;

const GOALS = [
  { id: 'Weight Loss', icon: 'trending-down', color: '#E53935', desc: 'Burn fat & get lean' },
  { id: 'Muscle Gain', icon: 'barbell', color: '#1976D2', desc: 'Build muscle & strength' },
  { id: 'Maintenance', icon: 'fitness', color: '#32D74B', desc: 'Stay fit & healthy' },
  { id: 'General Fitness', icon: 'heart', color: '#FF9800', desc: 'Overall wellness' },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string }>();
  const isUpdate = params.mode === 'update';
  const { user, refreshUser } = useAuth();

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [units, setUnits] = useState<UnitSystem>('metric');

  // Pre-fill from user profile when updating
  const [gender, setGender] = useState<string>(isUpdate && user?.gender ? user.gender : '');
  const [age, setAge] = useState(isUpdate && user?.age ? String(user.age) : '');
  const [weight, setWeight] = useState(isUpdate && user?.weight_kg ? String(user.weight_kg) : '');
  const [heightCm, setHeightCm] = useState(isUpdate && user?.height_cm ? String(user.height_cm) : '');
  const [heightFt, setHeightFt] = useState('');
  const [heightIn, setHeightIn] = useState('');
  const [goal, setGoal] = useState(isUpdate && user?.goal ? user.goal : '');

  const getWeightKg = () => units === 'imperial' ? (parseFloat(weight) || 0) / LB_PER_KG : (parseFloat(weight) || 0);
  const getHeightCm = () => units === 'imperial'
    ? ((parseFloat(heightFt) || 0) * 12 + (parseFloat(heightIn) || 0)) * CM_PER_IN
    : (parseFloat(heightCm) || 0);

  const canNext = () => {
    switch (step) {
      case 0: return !!gender;
      case 1: return !!(age && weight && (units === 'metric' ? heightCm : heightFt));
      case 2: return !!goal;
      default: return true;
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      await apiCall('/profile', {
        method: 'PUT',
        body: JSON.stringify({
          gender,
          age: parseInt(age),
          weight_kg: Math.round(getWeightKg() * 10) / 10,
          height_cm: Math.round(getHeightCm() * 10) / 10,
          goal,
        }),
      });
      await refreshUser();
      router.replace('/(tabs)');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  // --- Computed personalized data ---
  const wKg = getWeightKg();
  const hCm = getHeightCm();
  const hm = hCm / 100;
  const bmi = wKg && hm ? wKg / (hm * hm) : 0;
  const bmr = gender === 'male'
    ? 10 * wKg + 6.25 * hCm - 5 * (parseInt(age) || 0) + 5
    : 10 * wKg + 6.25 * hCm - 5 * (parseInt(age) || 0) - 161;
  const tdee = bmr * 1.55; // moderate activity default

  const getBmiCategory = () => {
    if (bmi < 18.5) return { label: 'Underweight', color: '#42A5F5' };
    if (bmi < 25) return { label: 'Normal', color: COLORS.success };
    if (bmi < 30) return { label: 'Overweight', color: COLORS.warning };
    return { label: 'Obese', color: COLORS.error };
  };

  const getCalorieTarget = () => {
    if (goal === 'Weight Loss') return Math.round(tdee - 500);
    if (goal === 'Muscle Gain') return Math.round(tdee + 300);
    return Math.round(tdee);
  };

  const getRecommendedPlan = () => {
    if (goal === 'Weight Loss') return { name: 'Full Body Foundation', level: 'Beginner', reason: 'Full body workouts maximize calorie burn and build a strong foundation for fat loss.' };
    if (goal === 'Muscle Gain') return { name: 'Push / Pull / Legs', level: 'Intermediate', reason: 'PPL split provides optimal volume and frequency for muscle growth.' };
    if (goal === 'General Fitness') return { name: 'Full Body Foundation', level: 'Beginner', reason: 'Full body routine covers all muscle groups efficiently for general fitness.' };
    return { name: 'Push / Pull / Legs', level: 'Intermediate', reason: 'A balanced split to maintain your current physique and keep progressing.' };
  };

  const getTips = () => {
    const tips: string[] = [];
    if (goal === 'Weight Loss') {
      tips.push(`Aim for ${getCalorieTarget()} calories/day (500 cal deficit)`);
      tips.push('Focus on high protein intake (1.6-2.2g per kg bodyweight)');
      tips.push('Add 2-3 cardio sessions per week alongside weight training');
      tips.push('Track your food intake for at least the first 4 weeks');
    } else if (goal === 'Muscle Gain') {
      tips.push(`Aim for ${getCalorieTarget()} calories/day (300 cal surplus)`);
      tips.push('Prioritize protein: 1.8-2.2g per kg bodyweight daily');
      tips.push('Progressive overload: increase weight or reps each week');
      tips.push('Sleep 7-9 hours for optimal muscle recovery');
    } else {
      tips.push(`Your maintenance calories are ~${Math.round(tdee)}/day`);
      tips.push('Stay consistent with 3-5 workouts per week');
      tips.push('Drink at least 2L of water daily');
      tips.push('Mix cardio and resistance training for best results');
    }
    const waterLiters = Math.round(wKg * 0.033 * 10) / 10;
    tips.push(`Recommended water intake: ${waterLiters}L per day based on your weight`);
    return tips;
  };

  const totalSteps = 4;
  const progress = ((step + 1) / totalSteps) * 100;

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        {/* Progress bar */}
        <View style={s.progressWrap}>
          {isUpdate && (
            <TouchableOpacity testID="onboard-close-btn" style={s.closeBtn} onPress={() => router.back()}>
              <Ionicons name="close" size={22} color={COLORS.textSecondary} />
            </TouchableOpacity>
          )}
          <View style={s.progressBar}>
            <View style={[s.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={s.stepText}>STEP {step + 1} OF {totalSteps}</Text>
        </View>

        <ScrollView style={s.scroll} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">

          {/* STEP 0: Gender */}
          {step === 0 && (
            <View>
              <Text style={s.stepTitle}>What's your gender?</Text>
              <Text style={s.stepSubtitle}>This helps us personalize your fitness calculations</Text>
              <View style={s.genderRow}>
                {[
                  { id: 'male', icon: 'male', label: 'Male' },
                  { id: 'female', icon: 'female', label: 'Female' },
                ].map(g => (
                  <TouchableOpacity
                    key={g.id}
                    testID={`onboard-gender-${g.id}`}
                    style={[s.genderCard, gender === g.id && s.genderCardActive]}
                    onPress={() => setGender(g.id)}
                  >
                    <View style={[s.genderIconWrap, gender === g.id && s.genderIconActive]}>
                      <Ionicons name={g.icon as any} size={40} color={gender === g.id ? '#fff' : COLORS.textMuted} />
                    </View>
                    <Text style={[s.genderLabel, gender === g.id && s.genderLabelActive]}>{g.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* STEP 1: Body Stats */}
          {step === 1 && (
            <View>
              <Text style={s.stepTitle}>Tell us about yourself</Text>
              <Text style={s.stepSubtitle}>We'll use this to calculate your personalized plan</Text>

              {/* Unit toggle */}
              <View style={s.unitRow}>
                {(['metric', 'imperial'] as UnitSystem[]).map(u => (
                  <TouchableOpacity
                    key={u} testID={`onboard-unit-${u}`}
                    style={[s.unitBtn, units === u && s.unitBtnActive]}
                    onPress={() => { setUnits(u); setWeight(''); setHeightCm(''); setHeightFt(''); setHeightIn(''); }}
                  >
                    <Text style={[s.unitBtnText, units === u && s.unitBtnTextActive]}>
                      {u === 'metric' ? 'METRIC' : 'IMPERIAL'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={s.fieldLabel}>AGE</Text>
              <TextInput
                testID="onboard-age-input"
                style={s.input}
                value={age}
                onChangeText={setAge}
                keyboardType="numeric"
                placeholder="e.g. 25"
                placeholderTextColor={COLORS.textMuted}
              />

              <Text style={s.fieldLabel}>WEIGHT ({units === 'metric' ? 'KG' : 'LBS'})</Text>
              <TextInput
                testID="onboard-weight-input"
                style={s.input}
                value={weight}
                onChangeText={setWeight}
                keyboardType="numeric"
                placeholder={units === 'metric' ? 'e.g. 75' : 'e.g. 165'}
                placeholderTextColor={COLORS.textMuted}
              />

              {units === 'metric' ? (
                <>
                  <Text style={s.fieldLabel}>HEIGHT (CM)</Text>
                  <TextInput
                    testID="onboard-height-input"
                    style={s.input}
                    value={heightCm}
                    onChangeText={setHeightCm}
                    keyboardType="numeric"
                    placeholder="e.g. 175"
                    placeholderTextColor={COLORS.textMuted}
                  />
                </>
              ) : (
                <>
                  <Text style={s.fieldLabel}>HEIGHT (FT / IN)</Text>
                  <View style={s.heightRow}>
                    <View style={s.heightField}>
                      <TextInput
                        testID="onboard-heightFt-input"
                        style={s.input}
                        value={heightFt}
                        onChangeText={setHeightFt}
                        keyboardType="numeric"
                        placeholder="5"
                        placeholderTextColor={COLORS.textMuted}
                      />
                      <Text style={s.heightUnit}>ft</Text>
                    </View>
                    <View style={s.heightField}>
                      <TextInput
                        testID="onboard-heightIn-input"
                        style={s.input}
                        value={heightIn}
                        onChangeText={setHeightIn}
                        keyboardType="numeric"
                        placeholder="10"
                        placeholderTextColor={COLORS.textMuted}
                      />
                      <Text style={s.heightUnit}>in</Text>
                    </View>
                  </View>
                </>
              )}
            </View>
          )}

          {/* STEP 2: Goal */}
          {step === 2 && (
            <View>
              <Text style={s.stepTitle}>What's your goal?</Text>
              <Text style={s.stepSubtitle}>We'll recommend the best workout plan for you</Text>
              <View style={s.goalList}>
                {GOALS.map(g => (
                  <TouchableOpacity
                    key={g.id}
                    testID={`onboard-goal-${g.id.replace(/\s/g, '-')}`}
                    style={[s.goalCard, goal === g.id && { borderColor: g.color, borderWidth: 2 }]}
                    onPress={() => setGoal(g.id)}
                  >
                    <View style={[s.goalIconWrap, { backgroundColor: g.color + '20' }]}>
                      <Ionicons name={g.icon as any} size={28} color={g.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.goalName}>{g.id}</Text>
                      <Text style={s.goalDesc}>{g.desc}</Text>
                    </View>
                    {goal === g.id && <Ionicons name="checkmark-circle" size={24} color={g.color} />}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* STEP 3: Personalized Results */}
          {step === 3 && (
            <View>
              <View style={s.resultHeader}>
                <Image
                  source={require('../assets/images/f2f_icon.png')}
                  style={s.resultLogo}
                  resizeMode="contain"
                />
                <Text style={s.stepTitle}>{isUpdate ? 'Your Updated Plan' : 'Your Personalized Plan'}</Text>
                <Text style={s.stepSubtitle}>Here's what we've calculated for you, {user?.name?.split(' ')[0]}</Text>
              </View>

              {/* BMI Card */}
              <View style={s.statCard}>
                <View style={s.statRow}>
                  <View>
                    <Text style={s.statLabel}>YOUR BMI</Text>
                    <View style={s.statValueRow}>
                      <Text style={s.statBig}>{bmi.toFixed(1)}</Text>
                      <View style={[s.badge, { backgroundColor: getBmiCategory().color + '20' }]}>
                        <Text style={[s.badgeText, { color: getBmiCategory().color }]}>{getBmiCategory().label}</Text>
                      </View>
                    </View>
                  </View>
                  <Ionicons name="body" size={32} color={getBmiCategory().color} />
                </View>
              </View>

              {/* Calories Card */}
              <View style={s.statCard}>
                <View style={s.statRow}>
                  <View>
                    <Text style={s.statLabel}>DAILY CALORIE TARGET</Text>
                    <Text style={s.statBig}>{getCalorieTarget()}</Text>
                    <Text style={s.statSub}>calories/day for {goal.toLowerCase()}</Text>
                  </View>
                  <Ionicons name="flame" size={32} color={COLORS.warning} />
                </View>
              </View>

              {/* Recommended Plan */}
              <View style={[s.statCard, { borderColor: COLORS.primary, borderWidth: 1 }]}>
                <Text style={s.statLabel}>RECOMMENDED WORKOUT PLAN</Text>
                <View style={s.planRow}>
                  <Ionicons name="barbell" size={24} color={COLORS.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.planName}>{getRecommendedPlan().name}</Text>
                    <View style={[s.badge, { backgroundColor: COLORS.primary + '20', alignSelf: 'flex-start', marginTop: 4 }]}>
                      <Text style={[s.badgeText, { color: COLORS.primary }]}>{getRecommendedPlan().level}</Text>
                    </View>
                  </View>
                </View>
                <Text style={s.planReason}>{getRecommendedPlan().reason}</Text>
              </View>

              {/* Tips */}
              <View style={s.tipsCard}>
                <View style={s.tipsHeader}>
                  <Ionicons name="bulb" size={20} color={COLORS.warning} />
                  <Text style={s.tipsTitle}>PERSONALIZED TIPS</Text>
                </View>
                {getTips().map((tip, i) => (
                  <View key={i} style={s.tipRow}>
                    <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                    <Text style={s.tipText}>{tip}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </ScrollView>

        {/* Bottom nav */}
        <View style={s.bottomBar}>
          {step > 0 && (
            <TouchableOpacity testID="onboard-back-btn" style={s.backBtn} onPress={() => setStep(step - 1)}>
              <Ionicons name="arrow-back" size={20} color={COLORS.textPrimary} />
              <Text style={s.backBtnText}>Back</Text>
            </TouchableOpacity>
          )}
          <View style={{ flex: 1 }} />
          {step < 3 ? (
            <TouchableOpacity
              testID="onboard-next-btn"
              style={[s.nextBtn, !canNext() && { opacity: 0.4 }]}
              onPress={() => canNext() && setStep(step + 1)}
              disabled={!canNext()}
            >
              <Text style={s.nextBtnText}>{step === 2 ? 'SEE MY PLAN' : 'NEXT'}</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity testID="onboard-finish-btn" style={s.finishBtn} onPress={saveProfile} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : (
                <>
                  <Ionicons name="rocket" size={20} color="#fff" />
                  <Text style={s.nextBtnText}>LET'S GO!</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 24 },
  // Progress
  progressWrap: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4 },
  closeBtn: { alignSelf: 'flex-end', padding: 4, marginBottom: 4 },
  progressBar: { height: 4, backgroundColor: COLORS.surfaceHighlight, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 2 },
  stepText: { fontSize: 10, fontWeight: '800', color: COLORS.textMuted, letterSpacing: 2, marginTop: 8 },
  // Step headers
  stepTitle: { fontSize: 26, fontWeight: '900', color: COLORS.textPrimary, marginBottom: 6 },
  stepSubtitle: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 28, lineHeight: 20 },
  // Gender
  genderRow: { flexDirection: 'row', gap: 16 },
  genderCard: {
    flex: 1, backgroundColor: COLORS.surface, borderRadius: 20, padding: 24,
    alignItems: 'center', borderWidth: 2, borderColor: COLORS.border,
  },
  genderCardActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '10' },
  genderIconWrap: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: COLORS.surfaceHighlight,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  genderIconActive: { backgroundColor: COLORS.primary },
  genderLabel: { fontSize: 16, fontWeight: '800', color: COLORS.textMuted },
  genderLabelActive: { color: COLORS.textPrimary },
  // Unit toggle
  unitRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  unitBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center',
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
  },
  unitBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  unitBtnText: { color: COLORS.textMuted, fontWeight: '700', fontSize: 13 },
  unitBtnTextActive: { color: '#fff' },
  // Fields
  fieldLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, letterSpacing: 1, marginBottom: 8, marginTop: 4 },
  input: {
    backgroundColor: COLORS.surface, borderRadius: 12, height: 52,
    paddingHorizontal: 16, color: COLORS.textPrimary, fontSize: 20, fontWeight: '700',
    borderWidth: 1, borderColor: COLORS.border, marginBottom: 12,
  },
  heightRow: { flexDirection: 'row', gap: 10 },
  heightField: { flex: 1, position: 'relative' as const },
  heightUnit: { position: 'absolute' as const, right: 14, top: 16, color: COLORS.textMuted, fontSize: 14, fontWeight: '600' },
  // Goals
  goalList: { gap: 12 },
  goalCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: COLORS.surface, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: COLORS.border,
  },
  goalIconWrap: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  goalName: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary },
  goalDesc: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  // Results
  resultHeader: { alignItems: 'center', marginBottom: 8 },
  resultLogo: { width: 48, height: 48, marginBottom: 12 },
  statCard: {
    backgroundColor: COLORS.surface, borderRadius: 16, padding: 18, marginBottom: 12,
    borderWidth: 1, borderColor: COLORS.border,
  },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statLabel: { fontSize: 10, fontWeight: '800', color: COLORS.textMuted, letterSpacing: 2, marginBottom: 6 },
  statValueRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statBig: { fontSize: 36, fontWeight: '900', color: COLORS.textPrimary },
  statSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  badgeText: { fontSize: 12, fontWeight: '800' },
  planRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10 },
  planName: { fontSize: 18, fontWeight: '900', color: COLORS.textPrimary },
  planReason: { fontSize: 13, color: COLORS.textSecondary, marginTop: 10, lineHeight: 19 },
  tipsCard: {
    backgroundColor: COLORS.surface, borderRadius: 16, padding: 18, marginBottom: 12,
    borderWidth: 1, borderColor: COLORS.border,
  },
  tipsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  tipsTitle: { fontSize: 11, fontWeight: '800', color: COLORS.textSecondary, letterSpacing: 2 },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  tipText: { fontSize: 14, color: COLORS.textPrimary, flex: 1, lineHeight: 20 },
  // Bottom bar
  bottomBar: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20,
    paddingVertical: 14, borderTopWidth: 1, borderTopColor: COLORS.border, backgroundColor: COLORS.background,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 12, paddingHorizontal: 4 },
  backBtnText: { color: COLORS.textSecondary, fontSize: 14, fontWeight: '600' },
  nextBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.primary, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14,
  },
  nextBtnText: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 1 },
  finishBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.success, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14,
  },
});
