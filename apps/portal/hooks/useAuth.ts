import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useEffect } from 'react';

export const useAuth = () => {
  const { setAuth, clearAuth, user, isAuthenticated, accessToken } = useAuthStore();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['auth-me'],
    queryFn: async () => {
      // 1. Try to get user profile
      const res = await api.get('/auth/me');
      return res.data;
    },
    // Only run if we don't have a user but might have a session cookie
    // or if we already have an accessToken in memory.
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  useEffect(() => {
    if (data?.user) {
      // Update store with fetched user data
      // Note: access_token usually comes from the refresh interceptor logic
      setAuth(data.user, accessToken || '');
    }
  }, [data, setAuth, accessToken]);

  useEffect(() => {
    // Handle 401 specifically
    if (isError && (error as any)?.response?.status === 401) {
      clearAuth();
    }
  }, [isError, error, clearAuth]);

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Failed to logout from server', error);
    } finally {
      clearAuth();
    }
  };

  return {
    user,
    isLoading,
    isAuthenticated,
    logout,
  };
};