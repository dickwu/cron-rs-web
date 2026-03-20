'use client';

import { useState, useEffect, useCallback } from 'react';
import { getToken, setToken, clearToken, isAuthenticated as checkAuth } from '@/lib/auth';

export function useAuth() {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setAuthenticated(checkAuth());
    setLoading(false);
  }, []);

  const loginWithToken = useCallback((token: string) => {
    setToken(token);
    setAuthenticated(true);
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setAuthenticated(false);
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }, []);

  return {
    authenticated,
    loading,
    token: getToken(),
    loginWithToken,
    logout,
  };
}
