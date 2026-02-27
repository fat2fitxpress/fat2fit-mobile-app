import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiCall } from '../utils/api';

export interface User {
  id: string;
  name: string;
  email: string;
  height_cm?: number | null;
  weight_kg?: number | null;
  age?: number | null;
  gender?: string | null;
  goal?: string | null;
  created_at: string;
}

export function isProfileComplete(u: User | null): boolean {
  if (!u) return false;
  return !!(u.age && u.height_cm && u.weight_kg && u.gender && u.goal);
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  profileComplete: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (token) {
        const userData = await apiCall('/auth/me');
        setUser(userData);
      }
    } catch {
      await AsyncStorage.removeItem('auth_token');
    } finally {
      setLoading(false);
    }
  }

  async function login(email: string, password: string) {
    const data = await apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    await AsyncStorage.setItem('auth_token', data.token);
    setUser(data.user);
  }

  async function signup(name: string, email: string, password: string) {
    const data = await apiCall('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
    await AsyncStorage.setItem('auth_token', data.token);
    setUser(data.user);
  }

  async function logout() {
    await AsyncStorage.removeItem('auth_token');
    setUser(null);
  }

  async function refreshUser() {
    try {
      const userData = await apiCall('/auth/me');
      setUser(userData);
    } catch {}
  }

  const profileComplete = isProfileComplete(user);

  return (
    <AuthContext.Provider value={{ user, loading, profileComplete, login, signup, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
