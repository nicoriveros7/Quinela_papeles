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
const PUBLIC_PAGES = ['/', ...AUTH_PAGES];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<PublicUser | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  // Track whether we've already ensured main pool membership this session.
  // The boot effect reruns on every pathname change, so we use a ref to fire once.
  const mainPoolEnsured = useRef(false);

  const ensureMainPool = useCallback((activeToken: string) => {
    api.getMyMainPool(activeToken).catch(() => {
      // Non-fatal: log but never break the session
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

  // Runs on every pathname change but ensureMainPool fires only once per session via ref.
  useEffect(() => {
    const boot = async () => {
      const stored = getStoredToken();

      if (!stored) {
        setIsBootstrapping(false);
        if (!PUBLIC_PAGES.includes(pathname)) {
          router.replace('/login');
        }
        return;
      }

      try {
        const profile = await api.me(stored);
        setToken(stored);
        setUser(profile);

        if (!mainPoolEnsured.current) {
          mainPoolEnsured.current = true;
          ensureMainPool(stored);
        }

        if (AUTH_PAGES.includes(pathname)) {
          router.replace('/dashboard');
        }
      } catch {
        clearStoredToken();
        setToken(null);
        setUser(null);
        mainPoolEnsured.current = false;
        if (!PUBLIC_PAGES.includes(pathname)) {
          router.replace('/login');
        }
      } finally {
        setIsBootstrapping(false);
      }
    };

    void boot();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, router]);

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
