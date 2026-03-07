import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
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
  googleLogin: (idToken: string) => Promise<void>;
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
      const token = await SecureStore.getItemAsync('auth_token');
      if (token) {
        const userData = await apiCall('/auth/me');
        setUser(userData);
      }
    } catch {
      await SecureStore.deleteItemAsync('auth_token');
    } finally {
      setLoading(false);
    }
  }

  async function login(email: string, password: string) {
    const data = await apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    await SecureStore.setItemAsync('auth_token', data.token);
    setUser(data.user);
  }

  async function signup(name: string, email: string, password: string) {
    const data = await apiCall('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
    await SecureStore.setItemAsync('auth_token', data.token);
    setUser(data.user);
  }

  async function logout() {
    await SecureStore.deleteItemAsync('auth_token');
    setUser(null);
  }

  async function googleLogin(idToken: string) {
    const data = await apiCall('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ id_token: idToken }),
    });
    await SecureStore.setItemAsync('auth_token', data.token);
    setUser(data.user);
  }

  async function refreshUser() {
    try {
      const userData = await apiCall('/auth/me');
      setUser(userData);
    } catch { }
  }

  const profileComplete = isProfileComplete(user);

  return (
    <AuthContext.Provider value={{ user, loading, profileComplete, login, signup, logout, googleLogin, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
