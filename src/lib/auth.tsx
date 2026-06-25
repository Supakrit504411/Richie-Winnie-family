'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@/lib/types';
import { supabase } from '@/lib/supabase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (
    username: string,
    password: string,
    role: 'child' | 'parent',
    avatar?: string,
    parentId?: string,
    parentMode?: 'create' | 'join',
    familyInviteCode?: string
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function fetchProfile(userId: string): Promise<User | null> {
  const { data, error } = await supabase.from('users').select('*').eq('id', userId).single();
  if (error || !data) return null;
  return data as User;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const profile = await fetchProfile(session.user.id);
        setUser(profile);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const profile = await fetchProfile(session.user.id);
        setUser(profile);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function login(username: string, password: string) {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error || 'เข้าสู่ระบบไม่สำเร็จ' };

      if (data.session) {
        await supabase.auth.setSession(data.session);
        const profile = await fetchProfile(data.session.user.id);
        if (profile) setUser(profile);
      }
      return { success: true };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'เข้าสู่ระบบไม่สำเร็จ';
      return { success: false, error: message };
    }
  }

  async function register(
    username: string,
    password: string,
    role: 'child' | 'parent',
    avatar?: string,
    parentId?: string,
    parentMode?: 'create' | 'join',
    familyInviteCode?: string
  ) {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          password,
          role,
          avatar,
          parent_id: parentId,
          parent_mode: parentMode,
          family_invite_code: familyInviteCode,
        }),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error || 'สมัครไม่สำเร็จ' };

      if (data.session) {
        await supabase.auth.setSession(data.session);
        const profile = await fetchProfile(data.session.user.id);
        if (profile) setUser(profile);
      }
      return { success: true };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'สมัครไม่สำเร็จ';
      return { success: false, error: message };
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    setUser(null);
    setLoading(false);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
