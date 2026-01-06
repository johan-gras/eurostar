'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { showSuccess } from '@/lib/notifications';

export interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const fetchUser = useCallback(async (): Promise<User | null> => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json() as { data: User };
        return data.data;
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  const refreshAuth = useCallback(async () => {
    setIsLoading(true);
    try {
      const currentUser = await fetchUser();
      setUser(currentUser);
    } finally {
      setIsLoading(false);
    }
  }, [fetchUser]);

  useEffect(() => {
    void refreshAuth();
  }, [refreshAuth]);

  const login = useCallback(
    async (email: string, password: string, rememberMe = false): Promise<{ success: boolean; error?: string }> => {
      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, rememberMe }),
        });

        const data = await response.json() as { success?: boolean; error?: string; data?: User };

        if (!response.ok) {
          return { success: false, error: data.error || 'Login failed' };
        }

        // Fetch user data after successful login
        const currentUser = await fetchUser();
        setUser(currentUser);

        return { success: true };
      } catch {
        return { success: false, error: 'Unable to connect to the server' };
      }
    },
    [fetchUser]
  );

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      showSuccess('Logged out', 'You have been signed out');
    } finally {
      setUser(null);
      router.push('/login');
    }
  }, [router]);

  const register = useCallback(
    async (name: string, email: string, password: string): Promise<{ success: boolean; error?: string }> => {
      try {
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password }),
        });

        const data = await response.json() as { success?: boolean; error?: string };

        if (!response.ok) {
          return { success: false, error: data.error || 'Registration failed' };
        }

        return { success: true };
      } catch {
        return { success: false, error: 'Unable to connect to the server' };
      }
    },
    []
  );

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    register,
    refreshAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
