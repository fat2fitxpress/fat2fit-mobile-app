import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../src/utils/theme';
import { apiCall } from '../../src/utils/api';
import { useAuth } from '../../src/context/AuthContext';

interface DashboardData {
  user: any;
  water: { glasses: number; goal: number };
  latest_weight: { weight: number; date: string } | null;
  weight_history: Array<{ weight: number; date: string }>;
  workouts_this_week: number;
  today: string;
}

export default function DashboardScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = useCallback(async () => {
    try {
      const result = await apiCall('/dashboard');
      setData(result);
    } catch (err) {
      console.log('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  const onRefresh = () => { setRefreshing(true); fetchDashboard(); };

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  if (loading) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      </SafeAreaView>
    );
  }

  const firstName = user?.name?.split(' ')[0] || 'Athlete';
  const waterPct = data ? Math.min((data.water.glasses / data.water.goal) * 100, 100) : 0;

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        <View style={s.header}>
          <View>
            <Text style={s.greeting}>{getGreeting()}</Text>
            <Text style={s.name}>{firstName}</Text>
          </View>
          <View style={s.dateBadge}>
            <Text style={s.dateText}>{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
          </View>
        </View>

        <View style={s.statsRow}>
          <View style={[s.statCard, { flex: 1 }]}>
            <Ionicons name="scale-outline" size={24} color={COLORS.primary} />
            <Text style={s.statValue}>{data?.latest_weight?.weight?.toFixed(1) || '--'}</Text>
            <Text style={s.statLabel}>KG</Text>
          </View>
          <View style={[s.statCard, { flex: 1 }]}>
            <Ionicons name="water-outline" size={24} color={COLORS.secondary} />
            <Text style={s.statValue}>{data?.water.glasses || 0}/{data?.water.goal || 8}</Text>
            <Text style={s.statLabel}>GLASSES</Text>
          </View>
          <View style={[s.statCard, { flex: 1 }]}>
            <Ionicons name="barbell-outline" size={24} color={COLORS.success} />
            <Text style={s.statValue}>{data?.workouts_this_week || 0}</Text>
            <Text style={s.statLabel}>THIS WEEK</Text>
          </View>
        </View>

        <View style={s.waterCard}>
          <View style={s.waterHeader}>
            <Text style={s.sectionTitle}>WATER INTAKE</Text>
            <Text style={s.waterPctText}>{Math.round(waterPct)}%</Text>
          </View>
          <View style={s.waterBar}>
            <View style={[s.waterFill, { width: `${waterPct}%` }]} />
          </View>
          <View style={s.waterActions}>
            <TouchableOpacity
              testID="dashboard-add-water-btn"
              style={s.waterBtn}
              onPress={async () => {
                try {
                  await apiCall('/water-intake/add', { method: 'POST', body: JSON.stringify({ date: data?.today }) });
                  fetchDashboard();
                } catch {}
              }}
            >
              <Ionicons name="add-circle" size={28} color={COLORS.secondary} />
              <Text style={s.waterBtnText}>Add Glass</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="dashboard-remove-water-btn"
              style={s.waterBtn}
              onPress={async () => {
                try {
                  await apiCall('/water-intake/remove', { method: 'POST', body: JSON.stringify({ date: data?.today }) });
                  fetchDashboard();
                } catch {}
              }}
            >
              <Ionicons name="remove-circle" size={28} color={COLORS.textMuted} />
              <Text style={s.waterBtnText}>Remove</Text>
            </TouchableOpacity>
          </View>
        </View>

        {data && data.weight_history.length > 0 && (
          <View style={s.chartCard}>
            <Text style={s.sectionTitle}>WEIGHT TREND</Text>
            <WeightChart data={data.weight_history} />
          </View>
        )}

        <Text style={s.sectionTitle}>QUICK ACTIONS</Text>
        <View style={s.actionsRow}>
          <TouchableOpacity testID="quick-log-weight-btn" style={s.actionBtn} onPress={() => router.push('/(tabs)/progress')}>
            <Ionicons name="scale" size={28} color={COLORS.primary} />
            <Text style={s.actionText}>Log Weight</Text>
          </TouchableOpacity>
          <TouchableOpacity testID="quick-workout-btn" style={s.actionBtn} onPress={() => router.push('/(tabs)/workouts')}>
            <Ionicons name="barbell" size={28} color={COLORS.success} />
            <Text style={s.actionText}>Workout</Text>
          </TouchableOpacity>
          <TouchableOpacity testID="quick-calc-btn" style={s.actionBtn} onPress={() => router.push('/(tabs)/calculators')}>
            <Ionicons name="calculator" size={28} color={COLORS.warning} />
            <Text style={s.actionText}>Calculate</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function WeightChart({ data }: { data: Array<{ weight: number; date: string }> }) {
  if (data.length === 0) return null;
  const maxW = Math.max(...data.map(d => d.weight));
  const minW = Math.min(...data.map(d => d.weight));
  const range = maxW - minW || 1;
  const CHART_H = 100;

  return (
    <View style={cs.container}>
      <View style={cs.labels}>
        <Text style={cs.labelText}>{maxW.toFixed(1)}</Text>
        <Text style={cs.labelText}>{minW.toFixed(1)}</Text>
      </View>
      <View style={cs.bars}>
        {data.map((d, i) => {
          const h = ((d.weight - minW) / range) * (CHART_H - 20) + 20;
          return (
            <View key={i} style={cs.barCol}>
              <View style={[cs.bar, { height: h }]} />
              <Text style={cs.barLabel}>{d.date.slice(-2)}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const cs = StyleSheet.create({
  container: { flexDirection: 'row', marginTop: 12, height: 120 },
  labels: { justifyContent: 'space-between', marginRight: 8, paddingBottom: 18 },
  labelText: { fontSize: 10, color: COLORS.textMuted },
  bars: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  barCol: { flex: 1, alignItems: 'center' },
  bar: { width: '80%', backgroundColor: COLORS.primary, borderRadius: 4, minHeight: 8 },
  barLabel: { fontSize: 9, color: COLORS.textMuted, marginTop: 4 },
});

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  greeting: { fontSize: 14, color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 1 },
  name: { fontSize: 28, fontWeight: '900', color: COLORS.textPrimary, marginTop: 2 },
  dateBadge: { backgroundColor: COLORS.surface, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border },
  dateText: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard: {
    backgroundColor: COLORS.surface, borderRadius: 16, padding: 16,
    alignItems: 'center', borderWidth: 1, borderColor: COLORS.border,
  },
  statValue: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary, marginTop: 8 },
  statLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: '700', letterSpacing: 1, marginTop: 2 },
  waterCard: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: COLORS.border },
  waterHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  waterPctText: { fontSize: 16, fontWeight: '800', color: COLORS.secondary },
  waterBar: { height: 8, backgroundColor: COLORS.surfaceHighlight, borderRadius: 4, overflow: 'hidden' },
  waterFill: { height: '100%', backgroundColor: COLORS.secondary, borderRadius: 4 },
  waterActions: { flexDirection: 'row', gap: 16, marginTop: 12 },
  waterBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  waterBtnText: { color: COLORS.textSecondary, fontSize: 13 },
  chartCard: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: COLORS.border },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: COLORS.textSecondary, letterSpacing: 2, marginBottom: 12 },
  actionsRow: { flexDirection: 'row', gap: 10 },
  actionBtn: {
    flex: 1, backgroundColor: COLORS.surface, borderRadius: 16, padding: 20,
    alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, gap: 8,
  },
  actionText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '700' },
});
