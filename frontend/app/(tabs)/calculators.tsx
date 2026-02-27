import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../src/utils/theme';

type CalcType = 'tdee' | 'bmi' | 'bodyfat' | 'macros' | '1rm' | 'ideal';
type UnitSystem = 'metric' | 'imperial';

const LB_PER_KG = 2.20462;
const CM_PER_IN = 2.54;
const IN_PER_FT = 12;

const CALCS: { id: CalcType; name: string; icon: string; color: string; desc: string }[] = [
  { id: 'tdee', name: 'TDEE', icon: 'flame', color: '#1976D2', desc: 'Total Daily Energy Expenditure' },
  { id: 'bmi', name: 'BMI', icon: 'body', color: '#42A5F5', desc: 'Body Mass Index' },
  { id: 'bodyfat', name: 'Body Fat %', icon: 'fitness', color: '#32D74B', desc: 'Estimate body fat percentage' },
  { id: 'macros', name: 'Macros', icon: 'nutrition', color: '#FFD60A', desc: 'Macronutrient breakdown' },
  { id: '1rm', name: '1 Rep Max', icon: 'barbell', color: '#E53935', desc: 'Estimate your max lift' },
  { id: 'ideal', name: 'Ideal Weight', icon: 'scale', color: '#90CAF9', desc: 'Based on height & gender' },
];

const ACTIVITY_LEVELS = [
  { label: 'Sedentary', factor: 1.2 },
  { label: 'Light Active', factor: 1.375 },
  { label: 'Moderate', factor: 1.55 },
  { label: 'Active', factor: 1.725 },
  { label: 'Very Active', factor: 1.9 },
];

const GOALS = ['Weight Loss', 'Maintenance', 'Muscle Gain'];

function toKg(val: number, unit: UnitSystem) { return unit === 'imperial' ? val / LB_PER_KG : val; }
function toCm(ft: number, inches: number) { return (ft * IN_PER_FT + inches) * CM_PER_IN; }
function kgToLb(kg: number) { return kg * LB_PER_KG; }
function cmToFtIn(cm: number) { const totalIn = cm / CM_PER_IN; return { ft: Math.floor(totalIn / 12), inches: Math.round(totalIn % 12) }; }

export default function CalculatorsScreen() {
  const [selected, setSelected] = useState<CalcType | null>(null);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [result, setResult] = useState<any>(null);
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [actIdx, setActIdx] = useState(2);
  const [goalIdx, setGoalIdx] = useState(0);
  const [units, setUnits] = useState<UnitSystem>('metric');

  const setInput = (key: string, val: string) => setInputs(p => ({ ...p, [key]: val }));
  const num = (key: string) => parseFloat(inputs[key] || '0') || 0;

  const reset = () => { setInputs({}); setResult(null); };

  // Get weight in kg regardless of unit system
  const getWeightKg = () => toKg(num('weight'), units);
  // Get height in cm regardless of unit system
  const getHeightCm = () => units === 'imperial' ? toCm(num('heightFt'), num('heightIn')) : num('height');

  const fmtWeight = (kg: number) => units === 'imperial' ? `${Math.round(kgToLb(kg))} lbs` : `${kg.toFixed(1)} kg`;
  const fmtWeightShort = (kg: number) => units === 'imperial' ? `${Math.round(kgToLb(kg))}lbs` : `${Math.round(kg)}kg`;

  const calculate = () => {
    switch (selected) {
      case 'tdee': {
        const w = getWeightKg(), h = getHeightCm(), a = num('age');
        if (!w || !h || !a) return;
        const bmr = gender === 'male' ? 10 * w + 6.25 * h - 5 * a + 5 : 10 * w + 6.25 * h - 5 * a - 161;
        const tdee = bmr * ACTIVITY_LEVELS[actIdx].factor;
        setResult({ bmr: Math.round(bmr), tdee: Math.round(tdee), deficit: Math.round(tdee - 500), surplus: Math.round(tdee + 300) });
        break;
      }
      case 'bmi': {
        const w = getWeightKg(), h = getHeightCm();
        if (!w || !h) return;
        const hm = h / 100;
        const bmi = w / (hm * hm);
        let cat = 'Normal';
        if (bmi < 18.5) cat = 'Underweight';
        else if (bmi >= 25 && bmi < 30) cat = 'Overweight';
        else if (bmi >= 30) cat = 'Obese';
        setResult({ bmi: bmi.toFixed(1), category: cat });
        break;
      }
      case 'bodyfat': {
        const w = getWeightKg(), h = getHeightCm(), a = num('age');
        if (!w || !h || !a) return;
        const hm = h / 100;
        const bmi = w / (hm * hm);
        const bf = gender === 'male' ? 1.20 * bmi + 0.23 * a - 16.2 : 1.20 * bmi + 0.23 * a - 5.4;
        let cat = 'Average';
        if (gender === 'male') {
          if (bf < 6) cat = 'Essential'; else if (bf < 14) cat = 'Athletic';
          else if (bf < 18) cat = 'Fitness'; else if (bf < 25) cat = 'Average'; else cat = 'Above Average';
        } else {
          if (bf < 14) cat = 'Essential'; else if (bf < 21) cat = 'Athletic';
          else if (bf < 25) cat = 'Fitness'; else if (bf < 32) cat = 'Average'; else cat = 'Above Average';
        }
        setResult({ bodyfat: bf.toFixed(1), category: cat });
        break;
      }
      case 'macros': {
        const w = getWeightKg();
        if (!w) return;
        const goal = GOALS[goalIdx];
        let cals: number, pRatio: number, fRatio: number;
        if (goal === 'Weight Loss') { cals = w * 22; pRatio = 0.40; fRatio = 0.30; }
        else if (goal === 'Muscle Gain') { cals = w * 33; pRatio = 0.30; fRatio = 0.25; }
        else { cals = w * 28; pRatio = 0.30; fRatio = 0.30; }
        const protein = Math.round((cals * pRatio) / 4);
        const fat = Math.round((cals * fRatio) / 9);
        const carbs = Math.round((cals * (1 - pRatio - fRatio)) / 4);
        setResult({ calories: Math.round(cals), protein, carbs, fat });
        break;
      }
      case '1rm': {
        const w = getWeightKg(), r = num('reps');
        if (!w || !r) return;
        const orm = w * (1 + r / 30);
        setResult({ oneRepMaxKg: orm, pct90Kg: orm * 0.9, pct80Kg: orm * 0.8, pct70Kg: orm * 0.7 });
        break;
      }
      case 'ideal': {
        const h = getHeightCm();
        if (!h) return;
        const inches = h / CM_PER_IN;
        const over60 = Math.max(inches - 60, 0);
        const idealKg = gender === 'male' ? 50 + 2.3 * over60 : 45.5 + 2.3 * over60;
        setResult({ idealKg, rangeLowKg: idealKg * 0.9, rangeHighKg: idealKg * 1.1 });
        break;
      }
    }
  };

  // --- Render helpers ---

  const renderUnitToggle = () => (
    <View style={s.unitToggleWrap}>
      <Text style={s.unitLabel}>UNITS</Text>
      <View style={s.unitToggleRow}>
        {(['metric', 'imperial'] as UnitSystem[]).map(u => (
          <TouchableOpacity
            key={u} testID={`unit-${u}-btn`}
            style={[s.unitBtn, units === u && s.unitBtnActive]}
            onPress={() => { setUnits(u); setInputs({}); setResult(null); }}
          >
            <Text style={[s.unitBtnText, units === u && s.unitBtnTextActive]}>
              {u === 'metric' ? 'METRIC (kg/cm)' : 'IMPERIAL (lb/ft)'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderWeightInput = (label: string = 'Weight') => (
    <View style={s.inputGroup}>
      <Text style={s.inputLabel}>{label} ({units === 'metric' ? 'kg' : 'lbs'})</Text>
      <TextInput
        testID="calc-input-weight"
        style={s.textInput}
        value={inputs['weight'] || ''}
        onChangeText={v => setInput('weight', v)}
        keyboardType="numeric"
        placeholderTextColor={COLORS.textMuted}
        placeholder={units === 'metric' ? 'e.g. 75' : 'e.g. 165'}
      />
    </View>
  );

  const renderHeightInput = () => {
    if (units === 'metric') {
      return (
        <View style={s.inputGroup}>
          <Text style={s.inputLabel}>Height (cm)</Text>
          <TextInput
            testID="calc-input-height"
            style={s.textInput}
            value={inputs['height'] || ''}
            onChangeText={v => setInput('height', v)}
            keyboardType="numeric"
            placeholderTextColor={COLORS.textMuted}
            placeholder="e.g. 175"
          />
        </View>
      );
    }
    return (
      <View style={s.inputGroup}>
        <Text style={s.inputLabel}>Height (ft / in)</Text>
        <View style={s.heightRow}>
          <View style={s.heightField}>
            <TextInput
              testID="calc-input-heightFt"
              style={s.textInput}
              value={inputs['heightFt'] || ''}
              onChangeText={v => setInput('heightFt', v)}
              keyboardType="numeric"
              placeholderTextColor={COLORS.textMuted}
              placeholder="5"
            />
            <Text style={s.heightUnit}>ft</Text>
          </View>
          <View style={s.heightField}>
            <TextInput
              testID="calc-input-heightIn"
              style={s.textInput}
              value={inputs['heightIn'] || ''}
              onChangeText={v => setInput('heightIn', v)}
              keyboardType="numeric"
              placeholderTextColor={COLORS.textMuted}
              placeholder="10"
            />
            <Text style={s.heightUnit}>in</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderInput = (label: string, key: string, unit: string = '') => (
    <View style={s.inputGroup} key={key}>
      <Text style={s.inputLabel}>{label} {unit ? `(${unit})` : ''}</Text>
      <TextInput
        testID={`calc-input-${key}`}
        style={s.textInput}
        value={inputs[key] || ''}
        onChangeText={v => setInput(key, v)}
        keyboardType="numeric"
        placeholderTextColor={COLORS.textMuted}
        placeholder="0"
      />
    </View>
  );

  const renderGenderPicker = () => (
    <View style={s.inputGroup}>
      <Text style={s.inputLabel}>Gender</Text>
      <View style={s.toggleRow}>
        {(['male', 'female'] as const).map(g => (
          <TouchableOpacity
            key={g} testID={`gender-${g}-btn`}
            style={[s.toggleBtn, gender === g && s.toggleActive]}
            onPress={() => setGender(g)}
          >
            <Text style={[s.toggleText, gender === g && s.toggleActiveText]}>{g.toUpperCase()}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderActivityPicker = () => (
    <View style={s.inputGroup}>
      <Text style={s.inputLabel}>Activity Level</Text>
      <View style={s.chipRow}>
        {ACTIVITY_LEVELS.map((a, i) => (
          <TouchableOpacity
            key={i} testID={`activity-${i}-btn`}
            style={[s.chip, actIdx === i && s.chipActive]}
            onPress={() => setActIdx(i)}
          >
            <Text style={[s.chipText, actIdx === i && s.chipActiveText]}>{a.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderGoalPicker = () => (
    <View style={s.inputGroup}>
      <Text style={s.inputLabel}>Goal</Text>
      <View style={s.toggleRow}>
        {GOALS.map((g, i) => (
          <TouchableOpacity
            key={i} testID={`goal-${i}-btn`}
            style={[s.toggleBtn, goalIdx === i && s.toggleActive, { flex: 1 }]}
            onPress={() => setGoalIdx(i)}
          >
            <Text style={[s.toggleText, goalIdx === i && s.toggleActiveText, { fontSize: 11 }]}>{g}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderForm = () => {
    switch (selected) {
      case 'tdee': return <>{renderUnitToggle()}{renderGenderPicker()}{renderInput('Age', 'age', 'years')}{renderWeightInput()}{renderHeightInput()}{renderActivityPicker()}</>;
      case 'bmi': return <>{renderUnitToggle()}{renderWeightInput()}{renderHeightInput()}</>;
      case 'bodyfat': return <>{renderUnitToggle()}{renderGenderPicker()}{renderInput('Age', 'age', 'years')}{renderWeightInput()}{renderHeightInput()}</>;
      case 'macros': return <>{renderUnitToggle()}{renderWeightInput()}{renderGoalPicker()}</>;
      case '1rm': return <>{renderUnitToggle()}{renderWeightInput('Weight Lifted')}{renderInput('Reps Completed', 'reps')}</>;
      case 'ideal': return <>{renderUnitToggle()}{renderGenderPicker()}{renderHeightInput()}</>;
      default: return null;
    }
  };

  const renderResult = () => {
    if (!result) return null;
    switch (selected) {
      case 'tdee': return (
        <View style={s.resultCard}>
          <Text style={s.resultTitle}>YOUR TDEE</Text>
          <Text style={s.resultBig}>{result.tdee}</Text>
          <Text style={s.resultUnit}>calories/day</Text>
          <View style={s.resultGrid}>
            <ResultItem label="BMR" value={`${result.bmr}`} />
            <ResultItem label="Fat Loss" value={`${result.deficit}`} />
            <ResultItem label="Bulk" value={`${result.surplus}`} />
          </View>
        </View>
      );
      case 'bmi': return (
        <View style={s.resultCard}>
          <Text style={s.resultTitle}>YOUR BMI</Text>
          <Text style={s.resultBig}>{result.bmi}</Text>
          <Text style={[s.resultUnit, { color: result.category === 'Normal' ? COLORS.success : COLORS.warning }]}>{result.category}</Text>
        </View>
      );
      case 'bodyfat': return (
        <View style={s.resultCard}>
          <Text style={s.resultTitle}>BODY FAT</Text>
          <Text style={s.resultBig}>{result.bodyfat}%</Text>
          <Text style={s.resultUnit}>{result.category}</Text>
        </View>
      );
      case 'macros': return (
        <View style={s.resultCard}>
          <Text style={s.resultTitle}>DAILY MACROS</Text>
          <Text style={s.resultBig}>{result.calories}</Text>
          <Text style={s.resultUnit}>calories/day</Text>
          <View style={s.resultGrid}>
            <ResultItem label="Protein" value={`${result.protein}g`} color={COLORS.primary} />
            <ResultItem label="Carbs" value={`${result.carbs}g`} color={COLORS.warning} />
            <ResultItem label="Fat" value={`${result.fat}g`} color={COLORS.secondary} />
          </View>
        </View>
      );
      case '1rm': return (
        <View style={s.resultCard}>
          <Text style={s.resultTitle}>1 REP MAX</Text>
          <Text style={s.resultBig}>{fmtWeight(result.oneRepMaxKg)}</Text>
          <View style={s.resultGrid}>
            <ResultItem label="90%" value={fmtWeightShort(result.pct90Kg)} />
            <ResultItem label="80%" value={fmtWeightShort(result.pct80Kg)} />
            <ResultItem label="70%" value={fmtWeightShort(result.pct70Kg)} />
          </View>
        </View>
      );
      case 'ideal': {
        const idealStr = fmtWeight(result.idealKg);
        const lowStr = fmtWeight(result.rangeLowKg);
        const highStr = fmtWeight(result.rangeHighKg);
        return (
          <View style={s.resultCard}>
            <Text style={s.resultTitle}>IDEAL WEIGHT</Text>
            <Text style={s.resultBig}>{idealStr}</Text>
            <Text style={s.resultUnit}>Range: {lowStr} - {highStr}</Text>
          </View>
        );
      }
      default: return null;
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView style={s.scroll} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
          <Text style={s.pageTitle}>FITNESS CALCULATORS</Text>

          {!selected ? (
            <View style={s.calcGrid}>
              {CALCS.map(c => (
                <TouchableOpacity
                  key={c.id} testID={`calc-select-${c.id}`}
                  style={s.calcCard}
                  onPress={() => { setSelected(c.id); reset(); }}
                >
                  <View style={[s.calcIcon, { backgroundColor: c.color + '20' }]}>
                    <Ionicons name={c.icon as any} size={28} color={c.color} />
                  </View>
                  <Text style={s.calcName}>{c.name}</Text>
                  <Text style={s.calcDesc}>{c.desc}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View>
              <TouchableOpacity
                testID="calc-back-btn"
                style={s.backBtn}
                onPress={() => { setSelected(null); reset(); }}
              >
                <Ionicons name="arrow-back" size={20} color={COLORS.textPrimary} />
                <Text style={s.backText}>All Calculators</Text>
              </TouchableOpacity>

              <Text style={s.calcTitle}>{CALCS.find(c => c.id === selected)?.name}</Text>

              {renderForm()}

              <TouchableOpacity testID="calc-calculate-btn" style={s.calcBtn} onPress={calculate}>
                <Text style={s.calcBtnText}>CALCULATE</Text>
              </TouchableOpacity>

              {renderResult()}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ResultItem({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={s.resultItem}>
      <Text style={s.resultItemLabel}>{label}</Text>
      <Text style={[s.resultItemValue, color ? { color } : {}]}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  pageTitle: { fontSize: 13, fontWeight: '800', color: COLORS.textSecondary, letterSpacing: 2, marginBottom: 20, marginTop: 8 },
  calcGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  calcCard: {
    width: '47%', backgroundColor: COLORS.surface, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: COLORS.border,
  },
  calcIcon: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  calcName: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary },
  calcDesc: { fontSize: 11, color: COLORS.textMuted, marginTop: 4 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  backText: { color: COLORS.textSecondary, fontSize: 14, fontWeight: '600' },
  calcTitle: { fontSize: 24, fontWeight: '900', color: COLORS.textPrimary, marginBottom: 20 },
  // Unit toggle
  unitToggleWrap: { marginBottom: 20, backgroundColor: COLORS.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: COLORS.border },
  unitLabel: { fontSize: 10, fontWeight: '800', color: COLORS.textMuted, letterSpacing: 2, marginBottom: 8 },
  unitToggleRow: { flexDirection: 'row', gap: 8 },
  unitBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center',
    backgroundColor: COLORS.surfaceHighlight, borderWidth: 1, borderColor: COLORS.border,
  },
  unitBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  unitBtnText: { color: COLORS.textMuted, fontWeight: '700', fontSize: 12 },
  unitBtnTextActive: { color: '#fff' },
  // Inputs
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, letterSpacing: 1, marginBottom: 8, textTransform: 'uppercase' },
  textInput: {
    backgroundColor: COLORS.surface, borderRadius: 12, height: 48,
    paddingHorizontal: 16, color: COLORS.textPrimary, fontSize: 18, fontWeight: '700',
    borderWidth: 1, borderColor: COLORS.border,
  },
  heightRow: { flexDirection: 'row', gap: 10 },
  heightField: { flex: 1, position: 'relative' as const },
  heightUnit: { position: 'absolute' as const, right: 14, top: 14, color: COLORS.textMuted, fontSize: 14, fontWeight: '600' },
  toggleRow: { flexDirection: 'row', gap: 8 },
  toggleBtn: {
    paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
  },
  toggleActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  toggleText: { color: COLORS.textMuted, fontWeight: '700', fontSize: 13 },
  toggleActiveText: { color: '#fff' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
  },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { color: COLORS.textMuted, fontSize: 12, fontWeight: '600' },
  chipActiveText: { color: '#fff' },
  calcBtn: {
    backgroundColor: COLORS.primary, height: 52, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', marginTop: 8, marginBottom: 16,
  },
  calcBtnText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 2 },
  resultCard: {
    backgroundColor: COLORS.surface, borderRadius: 16, padding: 24,
    alignItems: 'center', borderWidth: 1, borderColor: COLORS.primary,
  },
  resultTitle: { fontSize: 12, fontWeight: '800', color: COLORS.textSecondary, letterSpacing: 2, marginBottom: 8 },
  resultBig: { fontSize: 48, fontWeight: '900', color: COLORS.primaryLight || COLORS.textPrimary },
  resultUnit: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4, marginBottom: 16 },
  resultGrid: { flexDirection: 'row', gap: 16, marginTop: 8 },
  resultItem: { alignItems: 'center' },
  resultItemLabel: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600', marginBottom: 4 },
  resultItemValue: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },
});
