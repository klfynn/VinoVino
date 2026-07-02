import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export interface Address {
  street: string;
  zip: string;
  city: string;
  country: string;
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  address?: Address;
}

interface RegisterInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  address?: Address;
}

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  updateAddress: (address: Address) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Map common Supabase error messages to friendly German strings.
function mapAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials') || m.includes('invalid email or password')) {
    return 'E-Mail oder Passwort ist ungültig.';
  }
  if (m.includes('email already') || m.includes('user already registered') || m.includes('already been registered')) {
    return 'Diese E-Mail ist bereits registriert.';
  }
  if (m.includes('invalid email') || m.includes('unable to validate email')) {
    return 'Bitte eine gültige E-Mail-Adresse eingeben.';
  }
  if (m.includes('rate limit') || m.includes('too many requests')) {
    return 'Zu viele Versuche. Bitte warte einen Moment und versuche es erneut.';
  }
  if (m.includes('network') || m.includes('fetch') || m.includes('connection')) {
    return 'Keine Internetverbindung. Bitte überprüfe deine Verbindung und versuche es erneut.';
  }
  if (m.includes('password') && (m.includes('short') || m.includes('weak') || m.includes('6'))) {
    return 'Das Passwort muss mindestens 6 Zeichen haben.';
  }
  return message;
}

function sessionToUser(session: Session | null): User | null {
  if (!session?.user) return null;
  const { id, email, user_metadata } = session.user;
  return {
    id,
    email: email ?? '',
    firstName: user_metadata?.first_name ?? '',
    lastName: user_metadata?.last_name ?? '',
    address: user_metadata?.address,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Restore persisted session on startup.
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(sessionToUser(session));
      setIsLoading(false);
    });

    // React to sign-in / sign-out / token-refresh events.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(sessionToUser(session));
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !password) {
      throw new Error('Bitte E-Mail und Passwort eingeben.');
    }

    const { error } = await supabase.auth.signInWithPassword({ email: trimmed, password });
    if (error) throw new Error(mapAuthError(error.message));
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const firstName = input.firstName.trim();
    const lastName = input.lastName.trim();
    const email = input.email.trim().toLowerCase();
    const { password, address } = input;

    if (!firstName || !email || !password) {
      throw new Error('Bitte alle Felder ausfüllen.');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error('Bitte eine gültige E-Mail-Adresse eingeben.');
    }
    if (password.length < 6) {
      throw new Error('Das Passwort muss mindestens 6 Zeichen haben.');
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          ...(address ? { address } : {}),
        },
      },
    });

    if (error) throw new Error(mapAuthError(error.message));
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const updateAddress = useCallback(async (address: Address) => {
    const { data, error } = await supabase.auth.updateUser({
      data: { address },
    });
    if (error) throw new Error(mapAuthError(error.message));
    if (data.user) {
      setUser((prev) => prev ? { ...prev, address } : prev);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: user !== null,
      isLoading,
      login,
      register,
      logout,
      updateAddress,
    }),
    [user, isLoading, login, register, logout, updateAddress],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
