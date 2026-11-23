import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, setAuthToken, setUnauthorizedHandler } from '../api/client';

const STORAGE_KEY = 'expense-tracker.session';
const AuthContext = createContext(null);

function readSession() {
  try {
    const session = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (session?.token && new Date(session.expiresAt) > new Date()) return session;
  } catch {
    /* storage unavailable or corrupt */
  }
  return null;
}

function writeSession(session) {
  try {
    if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* storage unavailable */
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => {
    const stored = readSession();
    setAuthToken(stored?.token ?? null);
    return stored;
  });
  // 'checking' while we confirm a stored token with the server.
  const [status, setStatus] = useState(session ? 'checking' : 'ready');
  const [notice, setNotice] = useState(null);

  const applySession = useCallback((next) => {
    setAuthToken(next?.token ?? null);
    writeSession(next);
    setSession(next);
  }, []);

  const logout = useCallback(
    (reason) => {
      if (reason === 'expired') setNotice('Your session has expired. Please log in again.');
      if (session?.token && reason !== 'expired') api.post('/auth/logout').catch(() => {});
      applySession(null);
    },
    [applySession, session]
  );

  // Any 401 from an authenticated request ends the session.
  useEffect(() => {
    setUnauthorizedHandler(() => logout('expired'));
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  // Log out exactly when the JWT expires.
  useEffect(() => {
    if (!session) return undefined;
    const ms = new Date(session.expiresAt).getTime() - Date.now();
    const id = setTimeout(() => logout('expired'), Math.max(0, Math.min(ms, 2 ** 31 - 1)));
    return () => clearTimeout(id);
  }, [session, logout]);

  // Confirm a stored token is still valid and refresh the user profile.
  useEffect(() => {
    if (status !== 'checking') return;
    api
      .get('/auth/me')
      .then(({ data }) => applySession({ ...readSession(), user: data }))
      .catch(() => applySession(null))
      .finally(() => setStatus('ready'));
  }, [status, applySession]);

  const login = useCallback(
    async (credentials) => {
      const res = await api.post('/auth/login', credentials);
      setNotice(null);
      applySession(res);
      return res.user;
    },
    [applySession]
  );

  const register = useCallback(
    async (details) => {
      const res = await api.post('/auth/register', details);
      setNotice(null);
      applySession(res);
      return res.user;
    },
    [applySession]
  );

  const updateUser = useCallback(
    (user) => applySession({ ...session, user }),
    [applySession, session]
  );

  const value = useMemo(
    () => ({
      user: session?.user ?? null,
      isAuthenticated: Boolean(session),
      status,
      notice,
      login,
      register,
      logout,
      updateUser,
    }),
    [session, status, notice, login, register, logout, updateUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
