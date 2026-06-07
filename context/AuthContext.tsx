import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SESSION_KEY = '@vinovino_session';
const USERS_KEY = '@vinovino_users';

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

interface StoredUser extends User {
  password: string;
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

async function loadUsers(): Promise<StoredUser[]> {
  const raw = await AsyncStorage.getItem(USERS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as StoredUser[];
  } catch {
    return [];
  }
}

async function saveUsers(users: StoredUser[]): Promise<void> {
  await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(SESSION_KEY);
        if (raw) setUser(JSON.parse(raw) as User);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const persistSession = useCallback(async (sessionUser: User | null) => {
    if (sessionUser) {
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
    } else {
      await AsyncStorage.removeItem(SESSION_KEY);
    }
    setUser(sessionUser);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const normalizedEmail = email.trim().toLowerCase();
      if (!normalizedEmail || !password) {
        throw new Error('Bitte E-Mail und Passwort eingeben.');
      }

      const users = await loadUsers();
      const match = users.find((u) => u.email === normalizedEmail);
      if (!match || match.password !== password) {
        throw new Error('E-Mail oder Passwort ist ungültig.');
      }

      const { password: _, ...sessionUser } = match;
      await persistSession(sessionUser);
    },
    [persistSession],
  );

  const register = useCallback(
    async (input: RegisterInput) => {
      const firstName = input.firstName.trim();
      const lastName = input.lastName.trim();
      const email = input.email.trim().toLowerCase();
      const password = input.password;

      if (!firstName || !email || !password) {
        throw new Error('Bitte alle Felder ausfüllen.');
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error('Bitte eine gültige E-Mail-Adresse eingeben.');
      }
      if (password.length < 6) {
        throw new Error('Das Passwort muss mindestens 6 Zeichen haben.');
      }

      const users = await loadUsers();
      if (users.some((u) => u.email === email)) {
        throw new Error('Diese E-Mail ist bereits registriert.');
      }

      const newUser: StoredUser = {
        id: Date.now().toString(),
        firstName,
        lastName,
        email,
        password,
      };

      await saveUsers([...users, newUser]);
      const { password: _, ...sessionUser } = newUser;
      await persistSession(sessionUser);
    },
    [persistSession],
  );

  const logout = useCallback(async () => {
    await persistSession(null);
  }, [persistSession]);

  const updateAddress = useCallback(
    async (address: Address) => {
      if (!user) return;
      const updatedUser: User = { ...user, address };
      const users = await loadUsers();
      const updatedUsers = users.map((u) =>
        u.id === user.id ? { ...u, address } : u,
      );
      await saveUsers(updatedUsers);
      await persistSession(updatedUser);
    },
    [user, persistSession],
  );

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
