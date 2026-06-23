'use client';

import { usePathname, useRouter } from 'next/navigation';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { api, ApiError } from '@/lib/api';
import { clearStoredToken, getStoredToken, setStoredToken } from '@/lib/auth-token';
import { PublicUser } from '@/types/api';

type AuthContextValue = {
  token: string | null;
  user: PublicUser | null;
  isBootstrapping: boolean;
  isAuthenticated: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  register: (email: string, displayName: string, password: string) => Promise<void>;
  logout: () => void;
  refreshMe: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const AUTH_PAGES = ['/login', '/register'];
const PUBLIC_PAGES = ['/', '/forgot-password', '/reset-password', ...AUTH_PAGES];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<PublicUser | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  const mainPoolEnsured = useRef(false);

  const ensureMainPool = useCallback((activeToken: string) => {
    api.getMyMainPool(activeToken).catch(() => {
      console.warn('[auth] ensureMainPool failed — will retry on dashboard load');
    });
  }, []);

  const handleLogout = useCallback(() => {
    clearStoredToken();
    setToken(null);
    setUser(null);
    mainPoolEnsured.current = false;
    if (!AUTH_PAGES.includes(pathname)) {
      router.push('/login');
    }
  }, [pathname, router]);

  const refreshMe = useCallback(async () => {
    const activeToken = getStoredToken();
    if (!activeToken) {
      throw new ApiError('No active session', 401);
    }
    const profile = await api.me(activeToken);
    setUser(profile);
    setToken(activeToken);
  }, []);

  // Runs ONCE on mount: validates the stored token against the API.
  // Uses AbortController so a stale fetch never writes state after unmount.
  useEffect(() => {
    const controller = new AbortController();

    const boot = async () => {
      const stored = getStoredToken();
      if (!stored) {
        setIsBootstrapping(false);
        return;
      }
      try {
        const profile = await api.me(stored, controller.signal);
        if (controller.signal.aborted) return;
        setToken(stored);
        setUser(profile);
      } catch {
        if (controller.signal.aborted) return;
        clearStoredToken();
        setToken(null);
        setUser(null);
      } finally {
        if (!controller.signal.aborted) {
          setIsBootstrapping(false);
        }
      }
    };

    void boot();
    return () => controller.abort();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Redirect guard: reacts to auth state + pathname changes without calling the API.
  useEffect(() => {
    if (isBootstrapping) return;

    if (!token || !user) {
      mainPoolEnsured.current = false;
      if (!PUBLIC_PAGES.includes(pathname)) {
        router.replace('/login');
      }
      return;
    }

    if (!mainPoolEnsured.current) {
      mainPoolEnsured.current = true;
      ensureMainPool(token);
    }

    if (AUTH_PAGES.includes(pathname)) {
      router.replace('/dashboard');
    }
  }, [isBootstrapping, token, user, pathname, router, ensureMainPool]);

  const login = useCallback(
    async (identifier: string, password: string) => {
      const response = await api.login(identifier, password);
      setStoredToken(response.accessToken);
      setToken(response.accessToken);
      setUser(response.user);
      mainPoolEnsured.current = true;
      ensureMainPool(response.accessToken);
      router.push('/dashboard');
    },
    [ensureMainPool, router],
  );

  const register = useCallback(
    async (email: string, displayName: string, password: string) => {
      const response = await api.register(email, displayName, password);
      setStoredToken(response.accessToken);
      setToken(response.accessToken);
      setUser(response.user);
      mainPoolEnsured.current = true;
      ensureMainPool(response.accessToken);
      router.push('/dashboard');
    },
    [ensureMainPool, router],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      user,
      isBootstrapping,
      isAuthenticated: Boolean(token && user),
      login,
      register,
      logout: handleLogout,
      refreshMe,
    }),
    [handleLogout, isBootstrapping, login, refreshMe, register, token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}
