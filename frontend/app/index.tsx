import { Redirect } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

export default function Index() {
  const { user, loading, profileComplete } = useAuth();

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#1976D2" />
      </View>
    );
  }

  if (user && profileComplete) {
    return <Redirect href="/(tabs)" />;
  }

  if (user && !profileComplete) {
    return <Redirect href="/onboarding" />;
  }

  return <Redirect href="/auth/login" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
