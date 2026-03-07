import { Tabs } from 'expo-router';
import { COLORS } from '../../src/utils/theme';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform } from 'react-native';

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarStyle: {
        backgroundColor: COLORS.surface,
        borderTopColor: COLORS.border,
        borderTopWidth: 1,
        // More generous padding for iOS as requested
        paddingBottom: Platform.OS === 'ios' ? insets.bottom + 12 : (insets.bottom > 0 ? insets.bottom : 10) + 8,
        paddingTop: 12,
        height: Platform.OS === 'ios' ? insets.bottom + 70 : 64 + (insets.bottom > 0 ? insets.bottom : 0) + 8,
      },
      tabBarActiveTintColor: COLORS.primary,
      tabBarInactiveTintColor: COLORS.textMuted,
      tabBarLabelStyle: {
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
      },
    }}>
      <Tabs.Screen name="index" options={{
        title: 'Home',
        tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
      }} />
      <Tabs.Screen name="calculators" options={{
        title: 'Calc',
        tabBarIcon: ({ color, size }) => <Ionicons name="calculator" size={size} color={color} />,
      }} />
      <Tabs.Screen name="workouts" options={{
        title: 'Workouts',
        tabBarIcon: ({ color, size }) => <Ionicons name="barbell" size={size} color={color} />,
      }} />
      <Tabs.Screen name="progress" options={{
        title: 'Progress',
        tabBarIcon: ({ color, size }) => <Ionicons name="trending-up" size={size} color={color} />,
      }} />
      <Tabs.Screen name="profile" options={{
        title: 'Profile',
        tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
      }} />
    </Tabs>
  );
}
