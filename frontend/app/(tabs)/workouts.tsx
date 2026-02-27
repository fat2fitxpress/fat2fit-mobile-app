import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
  TextInput, Alert, KeyboardAvoidingView, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../src/utils/theme';
import { apiCall } from '../../src/utils/api';

type ViewMode = 'plans' | 'detail' | 'log' | 'history';

export default function WorkoutsScreen() {
  const [view, setView] = useState<ViewMode>('plans');
  const [plans, setPlans] = useState<any[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [selectedDay, setSelectedDay] = useState<any>(null);
  const [logData, setLogData] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchPlans = useCallback(async () => {
    try {
      const data = await apiCall('/workout-plans');
      setPlans(data);
    } catch (err) {
      console.log('Error fetching plans:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    try {
      const data = await apiCall('/workout-logs');
      setLogs(data);
    } catch {}
  }, []);

  useEffect(() => { fetchPlans(); fetchLogs(); }, [fetchPlans, fetchLogs]);

  const startLog = (day: any) => {
    setSelectedDay(day);
    const exercises = day.exercises.map((ex: any) => ({
      name: ex.name,
      muscle_group: ex.muscle_group,
      sets: Array.from({ length: ex.sets }, () => ({
        reps: ex.reps.includes('-') ? ex.reps.split('-')[0] : ex.reps.replace(/[^0-9]/g, '') || '0',
        weight: String(ex.weight_kg),
      })),
    }));
    setLogData(exercises);
    setView('log');
  };

  const updateSet = (exIdx: number, setIdx: number, field: 'reps' | 'weight', value: string) => {
    setLogData(prev => {
      const copy = JSON.parse(JSON.stringify(prev));
      copy[exIdx].sets[setIdx][field] = value;
      return copy;
    });
  };

  const saveWorkout = async () => {
    setSaving(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      await apiCall('/workout-logs', {
        method: 'POST',
        body: JSON.stringify({
          date: today,
          plan_name: selectedPlan?.name || '',
          day_name: selectedDay?.name || '',
          exercises: logData.map(ex => ({
            name: ex.name,
            muscle_group: ex.muscle_group,
            sets: ex.sets.map((s: any) => ({ reps: parseInt(s.reps) || 0, weight: parseFloat(s.weight) || 0 })),
          })),
        }),
      });
      Alert.alert('Workout Saved!', 'Great job completing your workout!');
      fetchLogs();
      setView('plans');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save workout');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <SafeAreaView style={s.safe}><View style={s.center}><ActivityIndicator size="large" color={COLORS.primary} /></View></SafeAreaView>;
  }

  // History View
  if (view === 'history') {
    return (
      <SafeAreaView style={s.safe}>
        <ScrollView style={s.scroll} contentContainerStyle={s.content}>
          <TouchableOpacity testID="history-back-btn" style={s.backBtn} onPress={() => setView('plans')}>
            <Ionicons name="arrow-back" size={20} color={COLORS.textPrimary} />
            <Text style={s.backText}>Back</Text>
          </TouchableOpacity>
          <Text style={s.pageTitle}>WORKOUT HISTORY</Text>
          {logs.length === 0 ? (
            <View style={s.emptyCard}><Text style={s.emptyText}>No workouts logged yet</Text></View>
          ) : logs.map((log, i) => (
            <View key={i} style={s.logCard}>
              <View style={s.logHeader}>
                <Text style={s.logDate}>{log.date}</Text>
                <Text style={s.logPlan}>{log.plan_name}</Text>
              </View>
              <Text style={s.logDay}>{log.day_name}</Text>
              <Text style={s.logExCount}>{log.exercises?.length || 0} exercises</Text>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Log View
  if (view === 'log' && selectedDay) {
    return (
      <SafeAreaView style={s.safe}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView style={s.scroll} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
            <TouchableOpacity testID="log-back-btn" style={s.backBtn} onPress={() => setView('detail')}>
              <Ionicons name="arrow-back" size={20} color={COLORS.textPrimary} />
              <Text style={s.backText}>Back</Text>
            </TouchableOpacity>
            <Text style={s.pageTitle}>LOG WORKOUT</Text>
            <Text style={s.dayTitle}>{selectedDay.name}</Text>

            {logData.map((ex, exIdx) => (
              <View key={exIdx} style={s.exLogCard}>
                <Text style={s.exLogName}>{ex.name}</Text>
                <Text style={s.exLogMuscle}>{ex.muscle_group}</Text>
                <View style={s.setHeader}>
                  <Text style={[s.setHeaderText, { flex: 0.5 }]}>SET</Text>
                  <Text style={[s.setHeaderText, { flex: 1 }]}>REPS</Text>
                  <Text style={[s.setHeaderText, { flex: 1 }]}>KG</Text>
                </View>
                {ex.sets.map((set: any, setIdx: number) => (
                  <View key={setIdx} style={s.setRow}>
                    <Text style={[s.setNum, { flex: 0.5 }]}>{setIdx + 1}</Text>
                    <TextInput
                      testID={`log-reps-${exIdx}-${setIdx}`}
                      style={[s.setInput, { flex: 1 }]}
                      value={set.reps}
                      onChangeText={v => updateSet(exIdx, setIdx, 'reps', v)}
                      keyboardType="numeric"
                      placeholderTextColor={COLORS.textMuted}
                    />
                    <TextInput
                      testID={`log-weight-${exIdx}-${setIdx}`}
                      style={[s.setInput, { flex: 1 }]}
                      value={set.weight}
                      onChangeText={v => updateSet(exIdx, setIdx, 'weight', v)}
                      keyboardType="numeric"
                      placeholderTextColor={COLORS.textMuted}
                    />
                  </View>
                ))}
              </View>
            ))}

            <TouchableOpacity testID="save-workout-btn" style={s.saveBtn} onPress={saveWorkout} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : (
                <>
                  <Ionicons name="checkmark-circle" size={22} color="#fff" />
                  <Text style={s.saveBtnText}>COMPLETE WORKOUT</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // Detail View
  if (view === 'detail' && selectedPlan) {
    return (
      <SafeAreaView style={s.safe}>
        <ScrollView style={s.scroll} contentContainerStyle={s.content}>
          <TouchableOpacity testID="detail-back-btn" style={s.backBtn} onPress={() => setView('plans')}>
            <Ionicons name="arrow-back" size={20} color={COLORS.textPrimary} />
            <Text style={s.backText}>All Plans</Text>
          </TouchableOpacity>
          <Text style={s.planDetailName}>{selectedPlan.name}</Text>
          <Text style={s.planDetailDesc}>{selectedPlan.description}</Text>
          <View style={s.planMeta}>
            <View style={s.metaBadge}><Text style={s.metaText}>{selectedPlan.days_per_week} days/week</Text></View>
            <View style={s.metaBadge}><Text style={s.metaText}>{selectedPlan.duration_weeks} weeks</Text></View>
          </View>

          {selectedPlan.days?.map((day: any, i: number) => (
            <View key={i} style={s.dayCard}>
              <View style={s.dayHeader}>
                <View>
                  <Text style={s.dayLabel}>DAY {day.day}</Text>
                  <Text style={s.dayName}>{day.name}</Text>
                </View>
                <TouchableOpacity
                  testID={`start-day-${i}-btn`}
                  style={s.startBtn}
                  onPress={() => startLog(day)}
                >
                  <Ionicons name="play" size={16} color="#fff" />
                  <Text style={s.startBtnText}>START</Text>
                </TouchableOpacity>
              </View>
              {day.exercises?.map((ex: any, j: number) => (
                <View key={j} style={s.exRow}>
                  <View style={s.exDot} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.exName}>{ex.name}</Text>
                    <Text style={s.exDetail}>
                      {ex.sets} sets × {ex.reps} reps {ex.weight_kg > 0 ? `• ${ex.weight_kg}kg` : ''}
                    </Text>
                  </View>
                  <Text style={s.exMuscle}>{ex.muscle_group}</Text>
                </View>
              ))}
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Plans View
  return (
    <SafeAreaView style={s.safe}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content}>
        <View style={s.topRow}>
          <Text style={s.pageTitle}>WORKOUT PLANS</Text>
          <TouchableOpacity testID="view-history-btn" style={s.histBtn} onPress={() => { fetchLogs(); setView('history'); }}>
            <Ionicons name="time" size={18} color={COLORS.textSecondary} />
            <Text style={s.histText}>History</Text>
          </TouchableOpacity>
        </View>

        {plans.map((plan, i) => {
          const levelColor = plan.level === 'Beginner' ? COLORS.success : plan.level === 'Intermediate' ? COLORS.warning : COLORS.error;
          return (
            <TouchableOpacity
              key={i} testID={`plan-card-${i}`}
              style={s.planCard}
              onPress={() => { setSelectedPlan(plan); setView('detail'); }}
            >
              <View style={[s.levelBadge, { backgroundColor: levelColor + '20' }]}>
                <Text style={[s.levelText, { color: levelColor }]}>{plan.level}</Text>
              </View>
              <Text style={s.planName}>{plan.name}</Text>
              <Text style={s.planDesc}>{plan.description}</Text>
              <View style={s.planFooter}>
                <View style={s.planStat}>
                  <Ionicons name="calendar" size={14} color={COLORS.textMuted} />
                  <Text style={s.planStatText}>{plan.days_per_week} days/week</Text>
                </View>
                <View style={s.planStat}>
                  <Ionicons name="time" size={14} color={COLORS.textMuted} />
                  <Text style={s.planStatText}>{plan.duration_weeks} weeks</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pageTitle: { fontSize: 13, fontWeight: '800', color: COLORS.textSecondary, letterSpacing: 2, marginBottom: 16, marginTop: 8 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  backText: { color: COLORS.textSecondary, fontSize: 14, fontWeight: '600' },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  histBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 12, backgroundColor: COLORS.surface, borderRadius: 20 },
  histText: { color: COLORS.textSecondary, fontSize: 13 },
  planCard: {
    backgroundColor: COLORS.surface, borderRadius: 16, padding: 20, marginBottom: 12,
    borderWidth: 1, borderColor: COLORS.border,
  },
  levelBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, marginBottom: 12 },
  levelText: { fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  planName: { fontSize: 20, fontWeight: '900', color: COLORS.textPrimary, marginBottom: 6 },
  planDesc: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18, marginBottom: 16 },
  planFooter: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  planStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  planStatText: { color: COLORS.textMuted, fontSize: 12 },
  planDetailName: { fontSize: 28, fontWeight: '900', color: COLORS.textPrimary, marginBottom: 8 },
  planDetailDesc: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 20, marginBottom: 12 },
  planMeta: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  metaBadge: { backgroundColor: COLORS.surfaceHighlight, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  metaText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '600' },
  dayCard: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  dayLabel: { fontSize: 10, fontWeight: '800', color: COLORS.textMuted, letterSpacing: 1 },
  dayName: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary, marginTop: 2 },
  startBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
  },
  startBtnText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  exRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 10, borderTopWidth: 1, borderTopColor: COLORS.border },
  exDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.primary },
  exName: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  exDetail: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  exMuscle: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600', backgroundColor: COLORS.surfaceHighlight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  dayTitle: { fontSize: 20, fontWeight: '900', color: COLORS.textPrimary, marginBottom: 20 },
  exLogCard: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
  exLogName: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary },
  exLogMuscle: { fontSize: 11, color: COLORS.textMuted, marginTop: 2, marginBottom: 12 },
  setHeader: { flexDirection: 'row', marginBottom: 8 },
  setHeaderText: { fontSize: 10, fontWeight: '800', color: COLORS.textMuted, letterSpacing: 1, textAlign: 'center' },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  setNum: { fontSize: 14, fontWeight: '700', color: COLORS.textSecondary, textAlign: 'center' },
  setInput: {
    backgroundColor: COLORS.surfaceHighlight, borderRadius: 8, height: 40,
    textAlign: 'center', color: COLORS.textPrimary, fontSize: 16, fontWeight: '700',
  },
  saveBtn: {
    flexDirection: 'row', backgroundColor: COLORS.success, height: 52, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', marginTop: 8, gap: 8,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 1 },
  logCard: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: COLORS.border },
  logHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  logDate: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  logPlan: { fontSize: 12, color: COLORS.textMuted },
  logDay: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },
  logExCount: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  emptyCard: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 32, alignItems: 'center' },
  emptyText: { color: COLORS.textMuted, fontSize: 14 },
});
