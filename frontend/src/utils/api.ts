import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export async function apiCall(endpoint: string, options: RequestInit = {}) {
  const token = await AsyncStorage.getItem('auth_token');

  if (!BASE_URL) {
    console.error('API Error: EXPO_PUBLIC_BACKEND_URL is not defined in environment.');
    throw new Error('Server connection configuration missing. Please restart the app.');
  }

  const url = `${BASE_URL.replace(/\/$/, '')}/api${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  console.log(`[API] ${options.method || 'GET'} ${url}`);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Request failed' }));
      console.warn(`[API Error] ${response.status}: ${JSON.stringify(error)}`);
      throw new Error(error.detail || 'Request failed');
    }

    return response.json();
  } catch (err: any) {
    console.error(`[Network Error] ${url}:`, err);
    throw new Error(err.message || 'Network connection failed');
  }
}
