import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
  TextInput, Alert, Image, KeyboardAvoidingView, Platform, RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '../../src/utils/theme';
import { apiCall } from '../../src/utils/api';

type Tab = 'weight' | 'water' | 'photos';

export default function ProgressScreen() {
  const [tab, setTab] = useState<Tab>('weight');

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.tabBar}>
        {(['weight', 'water', 'photos'] as Tab[]).map(t => (
          <TouchableOpacity
            key={t} testID={`progress-tab-${t}`}
            style={[s.tabBtn, tab === t && s.tabBtnActive]}
            onPress={() => setTab(t)}
          >
            <Ionicons
              name={t === 'weight' ? 'scale' : t === 'water' ? 'water' : 'camera'}
              size={18}
              color={tab === t ? COLORS.primary : COLORS.textMuted}
            />
            <Text style={[s.tabText, tab === t && s.tabTextActive]}>
              {t === 'weight' ? 'Weight' : t === 'water' ? 'Water' : 'Photos'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {tab === 'weight' && <WeightTab />}
      {tab === 'water' && <WaterTab />}
      {tab === 'photos' && <PhotosTab />}
    </SafeAreaView>
  );
}

function WeightTab() {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [weight, setWeight] = useState('');
  const [saving, setSaving] = useState(false);

  const fetch_ = useCallback(async () => {
    try {
      const data = await apiCall('/weight-entries');
      setEntries(data);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  const logWeight = async () => {
    const w = parseFloat(weight);
    if (!w || w < 20 || w > 500) { Alert.alert('Invalid', 'Enter a valid weight (20-500 kg)'); return; }
    setSaving(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      await apiCall('/weight-entries', { method: 'POST', body: JSON.stringify({ weight: w, date: today }) });
      setWeight('');
      fetch_();
    } catch (err: any) { Alert.alert('Error', err.message); } finally { setSaving(false); }
  };

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

  const maxW = entries.length ? Math.max(...entries.slice(0, 14).map(e => e.weight)) : 0;
  const minW = entries.length ? Math.min(...entries.slice(0, 14).map(e => e.weight)) : 0;
  const range = maxW - minW || 1;
  const chartData = [...entries].reverse().slice(-14);

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <View style={s.logRow}>
          <TextInput
            testID="weight-input"
            style={s.weightInput}
            value={weight}
            onChangeText={setWeight}
            placeholder="Enter weight (kg)"
            placeholderTextColor={COLORS.textMuted}
            keyboardType="numeric"
          />
          <TouchableOpacity testID="log-weight-btn" style={s.logBtn} onPress={logWeight} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.logBtnText}>LOG</Text>}
          </TouchableOpacity>
        </View>

        {chartData.length > 1 && (
          <View style={s.chartCard}>
            <Text style={s.sectionTitle}>TREND (LAST 14 ENTRIES)</Text>
            <View style={s.chartWrap}>
              <View style={s.chartLabels}>
                <Text style={s.chartLabel}>{maxW.toFixed(1)}</Text>
                <Text style={s.chartLabel}>{minW.toFixed(1)}</Text>
              </View>
              <View style={s.chartBars}>
                {chartData.map((e, i) => {
                  const h = ((e.weight - minW) / range) * 80 + 20;
                  return (
                    <View key={i} style={s.chartBarCol}>
                      <View style={[s.chartBar, { height: h }]} />
                      <Text style={s.chartBarLabel}>{e.date.slice(5)}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>
        )}

        <Text style={s.sectionTitle}>HISTORY</Text>
        {entries.length === 0 ? (
          <View style={s.emptyCard}><Text style={s.emptyText}>No entries yet. Log your first weight above!</Text></View>
        ) : entries.slice(0, 30).map((e, i) => (
          <View key={i} style={s.entryRow}>
            <View>
              <Text style={s.entryWeight}>{e.weight.toFixed(1)} kg</Text>
              <Text style={s.entryDate}>{e.date}</Text>
            </View>
            <TouchableOpacity testID={`delete-weight-${i}`} onPress={async () => {
              try { await apiCall(`/weight-entries/${e.id}`, { method: 'DELETE' }); fetch_(); } catch {}
            }}>
              <Ionicons name="trash-outline" size={18} color={COLORS.error} />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function WaterTab() {
  const [water, setWater] = useState<{ glasses: number; goal: number }>({ glasses: 0, goal: 8 });
  const [loading, setLoading] = useState(true);
  const today = new Date().toISOString().split('T')[0];

  const fetch_ = useCallback(async () => {
    try {
      const data = await apiCall(`/water-intake?date=${today}`);
      setWater(data);
    } catch {} finally { setLoading(false); }
  }, [today]);

  useEffect(() => { fetch_(); }, [fetch_]);

  const addGlass = async () => {
    try {
      const data = await apiCall('/water-intake/add', { method: 'POST', body: JSON.stringify({ date: today }) });
      setWater(data);
    } catch {}
  };

  const removeGlass = async () => {
    try {
      const data = await apiCall('/water-intake/remove', { method: 'POST', body: JSON.stringify({ date: today }) });
      setWater(data);
    } catch {}
  };

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={COLORS.secondary} /></View>;

  const pct = Math.min((water.glasses / water.goal) * 100, 100);
  const glasses = Array.from({ length: water.goal }, (_, i) => i < water.glasses);

  return (
    <ScrollView style={s.scroll} contentContainerStyle={[s.content, { alignItems: 'center' }]}>
      <Text style={[s.sectionTitle, { alignSelf: 'flex-start' }]}>TODAY'S WATER INTAKE</Text>

      <View style={s.waterCircle}>
        <Text style={s.waterBig}>{water.glasses}</Text>
        <Text style={s.waterOf}>of {water.goal}</Text>
        <Text style={s.waterGlasses}>glasses</Text>
      </View>

      <View style={s.waterProgressBar}>
        <View style={[s.waterProgressFill, { width: `${pct}%` }]} />
      </View>
      <Text style={s.waterPct}>{Math.round(pct)}% of daily goal</Text>

      <View style={s.glassGrid}>
        {glasses.map((filled, i) => (
          <View key={i} style={[s.glassIcon, filled && s.glassFilled]}>
            <Ionicons name="water" size={24} color={filled ? '#fff' : COLORS.textMuted} />
          </View>
        ))}
      </View>

      <View style={s.waterBtns}>
        <TouchableOpacity testID="water-remove-btn" style={s.waterMinusBtn} onPress={removeGlass}>
          <Ionicons name="remove" size={28} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <TouchableOpacity testID="water-add-btn" style={s.waterPlusBtn} onPress={addGlass}>
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      <Text style={s.waterTip}>Each glass = 250ml. Daily goal: {water.goal * 250}ml ({(water.goal * 250 / 1000).toFixed(1)}L)</Text>
    </ScrollView>
  );
}

function PhotosTab() {
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const fetch_ = useCallback(async () => {
    try {
      const data = await apiCall('/progress-photos');
      setPhotos(data);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera roll access is required');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.5,
      base64: true,
      allowsEditing: true,
    });
    if (!result.canceled && result.assets[0].base64) {
      setUploading(true);
      try {
        const today = new Date().toISOString().split('T')[0];
        await apiCall('/progress-photos', {
          method: 'POST',
          body: JSON.stringify({
            photo_base64: `data:image/jpeg;base64,${result.assets[0].base64}`,
            date: today,
            note: '',
          }),
        });
        fetch_();
      } catch (err: any) {
        Alert.alert('Error', err.message);
      } finally { setUploading(false); }
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera access is required');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.5,
      base64: true,
      allowsEditing: true,
    });
    if (!result.canceled && result.assets[0].base64) {
      setUploading(true);
      try {
        const today = new Date().toISOString().split('T')[0];
        await apiCall('/progress-photos', {
          method: 'POST',
          body: JSON.stringify({
            photo_base64: `data:image/jpeg;base64,${result.assets[0].base64}`,
            date: today,
            note: '',
          }),
        });
        fetch_();
      } catch (err: any) {
        Alert.alert('Error', err.message);
      } finally { setUploading(false); }
    }
  };

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.content}>
      <Text style={s.sectionTitle}>PROGRESS PHOTOS</Text>

      <View style={s.photoActions}>
        <TouchableOpacity testID="pick-photo-btn" style={s.photoActionBtn} onPress={pickImage} disabled={uploading}>
          <Ionicons name="images" size={24} color={COLORS.secondary} />
          <Text style={s.photoActionText}>Gallery</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="take-photo-btn" style={s.photoActionBtn} onPress={takePhoto} disabled={uploading}>
          <Ionicons name="camera" size={24} color={COLORS.primary} />
          <Text style={s.photoActionText}>Camera</Text>
        </TouchableOpacity>
      </View>

      {uploading && (
        <View style={s.uploadingCard}>
          <ActivityIndicator color={COLORS.primary} />
          <Text style={s.uploadingText}>Uploading...</Text>
        </View>
      )}

      {photos.length === 0 ? (
        <View style={s.emptyCard}>
          <Ionicons name="camera-outline" size={48} color={COLORS.textMuted} />
          <Text style={s.emptyText}>No progress photos yet</Text>
          <Text style={s.emptySubtext}>Take your first photo to track your transformation</Text>
        </View>
      ) : (
        <View style={s.photoGrid}>
          {photos.map((photo, i) => (
            <PhotoCard key={i} photo={photo} onDelete={() => {
              apiCall(`/progress-photos/${photo.id}`, { method: 'DELETE' }).then(fetch_).catch(() => {});
            }} />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function PhotoCard({ photo, onDelete }: { photo: any; onDelete: () => void }) {
  const [imageData, setImageData] = useState<string | null>(null);
  const [loadingImg, setLoadingImg] = useState(true);

  useEffect(() => {
    apiCall(`/progress-photos/${photo.id}`)
      .then(data => { if (data.photo_base64) setImageData(data.photo_base64); })
      .catch(() => {})
      .finally(() => setLoadingImg(false));
  }, [photo.id]);

  return (
    <View style={s.photoCard}>
      {loadingImg ? (
        <View style={s.photoPlaceholder}><ActivityIndicator color={COLORS.primary} /></View>
      ) : imageData ? (
        <Image source={{ uri: imageData }} style={s.photoImage} />
      ) : (
        <View style={s.photoPlaceholder}><Ionicons name="image-outline" size={32} color={COLORS.textMuted} /></View>
      )}
      <View style={s.photoInfo}>
        <Text style={s.photoDate}>{photo.date}</Text>
        <TouchableOpacity testID={`delete-photo-${photo.id}`} onPress={onDelete}>
          <Ionicons name="trash-outline" size={16} color={COLORS.error} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabBar: {
    flexDirection: 'row', paddingHorizontal: 16, paddingTop: 12, gap: 8,
  },
  tabBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, borderRadius: 12, backgroundColor: COLORS.surface,
    borderWidth: 1, borderColor: COLORS.border,
  },
  tabBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '15' },
  tabText: { fontSize: 13, fontWeight: '700', color: COLORS.textMuted },
  tabTextActive: { color: COLORS.primary },
  sectionTitle: { fontSize: 12, fontWeight: '800', color: COLORS.textSecondary, letterSpacing: 2, marginBottom: 12, marginTop: 8 },
  logRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  weightInput: {
    flex: 1, backgroundColor: COLORS.surface, borderRadius: 12, height: 48,
    paddingHorizontal: 16, color: COLORS.textPrimary, fontSize: 18, fontWeight: '700',
    borderWidth: 1, borderColor: COLORS.border,
  },
  logBtn: {
    backgroundColor: COLORS.primary, paddingHorizontal: 24, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', height: 48,
  },
  logBtnText: { color: '#fff', fontWeight: '800', fontSize: 14, letterSpacing: 1 },
  chartCard: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: COLORS.border },
  chartWrap: { flexDirection: 'row', height: 120, marginTop: 8 },
  chartLabels: { justifyContent: 'space-between', marginRight: 8, paddingBottom: 18 },
  chartLabel: { fontSize: 10, color: COLORS.textMuted },
  chartBars: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: 3 },
  chartBarCol: { flex: 1, alignItems: 'center' },
  chartBar: { width: '85%', backgroundColor: COLORS.primary, borderRadius: 3, minHeight: 6 },
  chartBarLabel: { fontSize: 7, color: COLORS.textMuted, marginTop: 3 },
  entryRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, marginBottom: 6,
    borderWidth: 1, borderColor: COLORS.border,
  },
  entryWeight: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },
  entryDate: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  emptyCard: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 32, alignItems: 'center', gap: 8 },
  emptyText: { color: COLORS.textMuted, fontSize: 14, fontWeight: '600' },
  emptySubtext: { color: COLORS.textMuted, fontSize: 12 },
  // Water
  waterCircle: {
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: COLORS.surface, borderWidth: 3, borderColor: COLORS.secondary,
    alignItems: 'center', justifyContent: 'center', marginVertical: 24,
  },
  waterBig: { fontSize: 48, fontWeight: '900', color: COLORS.textPrimary },
  waterOf: { fontSize: 14, color: COLORS.textMuted },
  waterGlasses: { fontSize: 12, color: COLORS.textMuted },
  waterProgressBar: { width: '100%', height: 8, backgroundColor: COLORS.surfaceHighlight, borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  waterProgressFill: { height: '100%', backgroundColor: COLORS.secondary, borderRadius: 4 },
  waterPct: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 20 },
  glassGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginBottom: 24 },
  glassIcon: { width: 48, height: 48, borderRadius: 12, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },
  glassFilled: { backgroundColor: COLORS.secondary, borderColor: COLORS.secondary },
  waterBtns: { flexDirection: 'row', gap: 16, marginBottom: 24 },
  waterMinusBtn: { width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },
  waterPlusBtn: { width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.secondary, alignItems: 'center', justifyContent: 'center' },
  waterTip: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center' },
  // Photos
  photoActions: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  photoActionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.surface, borderRadius: 12, paddingVertical: 14,
    borderWidth: 1, borderColor: COLORS.border,
  },
  photoActionText: { color: COLORS.textSecondary, fontSize: 14, fontWeight: '700' },
  uploadingCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, marginBottom: 12 },
  uploadingText: { color: COLORS.textSecondary, fontSize: 13 },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  photoCard: { width: '47%', backgroundColor: COLORS.surface, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border, marginBottom: 4 },
  photoImage: { width: '100%', aspectRatio: 1, resizeMode: 'cover' },
  photoPlaceholder: { width: '100%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surfaceHighlight },
  photoInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 10 },
  photoDate: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
});
