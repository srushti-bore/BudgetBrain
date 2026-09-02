'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { authApi, setAccessToken } from '@/lib/api';
import { User, TokenResponse, RegisterResponse } from '@/types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<TokenResponse>;
  register: (email: string, password: string, fullName?: string) => Promise<RegisterResponse>;
  verifyOtp: (email: string, otp: string) => Promise<TokenResponse>;
  googleLogin: (idToken: string) => Promise<TokenResponse>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();

  const handleAuthSuccess = useCallback((tokenResponse: TokenResponse) => {
    setUser(tokenResponse.user);
    setAccessToken(tokenResponse.access_token);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const refreshed = await authApi.refresh();
      handleAuthSuccess(refreshed);
    } catch {
      setUser(null);
      setAccessToken(null);
    }
  }, [handleAuthSuccess]);

  // Initial session restoration on mount
  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      // 3.5s timeout promise so the UI never gets stuck on the loading vault screen
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Session restoration timeout')), 3500)
      );

      try {
        const refreshed = await Promise.race([authApi.refresh(), timeoutPromise]);
        if (isMounted) {
          handleAuthSuccess(refreshed);
        }
      } catch {
        if (isMounted) {
          setUser(null);
          setAccessToken(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };


    initAuth();

    return () => {
      isMounted = false;
    };
  }, [handleAuthSuccess]);

  const login = async (email: string, password: string): Promise<TokenResponse> => {
    const res = await authApi.login({ email, password });
    handleAuthSuccess(res);
    return res;
  };

  const register = async (email: string, password: string, fullName?: string): Promise<RegisterResponse> => {
    const res = await authApi.register({ email, password, full_name: fullName });
    return res;
  };

  const verifyOtp = async (email: string, otp: string): Promise<TokenResponse> => {
    const res = await authApi.verifyOtp(email, otp);
    handleAuthSuccess(res);
    return res;
  };

  const googleLogin = async (idToken: string): Promise<TokenResponse> => {
    const res = await authApi.googleLogin(idToken);
    handleAuthSuccess(res);
    return res;
  };

  const logout = async (): Promise<void> => {
    try {
      await authApi.logout();
    } catch {
      // Ignore network errors on logout
    } finally {
      setUser(null);
      setAccessToken(null);
      router.push('/login');
    }
  };

  const logoutAll = async (): Promise<void> => {
    try {
      await authApi.logoutAll();
    } catch {
      // Ignore network errors on logout
    } finally {
      setUser(null);
      setAccessToken(null);
      router.push('/login');
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string): Promise<void> => {
    await authApi.changePassword({ current_password: currentPassword, new_password: newPassword });
    setUser(null);
    setAccessToken(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        verifyOtp,
        googleLogin,
        logout,
        logoutAll,
        changePassword,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
