import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Address, User } from '../types';

const STORAGE_KEY = '@vinovino/auth_user';

export interface RegisterPayload {
  firstName: string;
  lastName: string;
  email: string;
  address: Address;
  password: string;
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setUser(JSON.parse(raw) as User);
      } catch {
        // Ignore restore errors; user stays logged out.
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const persist = useCallback(async (next: User | null) => {
    setUser(next);
    if (next) {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } else {
      await AsyncStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const login = useCallback(
    async (email: string, _password: string) => {
      // TODO: Replace with real auth call (Supabase/Firebase).
      await new Promise((r) => setTimeout(r, 800));
      const mockUser: User = {
        id: `local-${Date.now()}`,
        firstName: 'Gast',
        lastName: '',
        email: email.trim().toLowerCase(),
        address: { street: '', zip: '', city: '', country: '' },
        createdAt: new Date().toISOString(),
      };
      await persist(mockUser);
    },
    [persist],
  );

  const register = useCallback(
    async (payload: RegisterPayload) => {
      // TODO: Replace with real signup call (Supabase/Firebase). Hash & send password server-side.
      await new Promise((r) => setTimeout(r, 1000));
      const newUser: User = {
        id: `local-${Date.now()}`,
        firstName: payload.firstName.trim(),
        lastName: payload.lastName.trim(),
        email: payload.email.trim().toLowerCase(),
        address: payload.address,
        createdAt: new Date().toISOString(),
      };
      await persist(newUser);
    },
    [persist],
  );

  const logout = useCallback(async () => {
    // TODO: Invalidate server-side session token.
    await persist(null);
  }, [persist]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, isLoading, login, register, logout }),
    [user, isLoading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
