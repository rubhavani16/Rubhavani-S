import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, UserRole } from '../types';
import { api } from '../services/api';
import i18n from '../i18n';

interface AuthContextType {
  user: User | null;
  token: string | null;
  role: UserRole;
  language: string;
  simpleLanguage: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  switchRole: (newRole: UserRole) => void;
  setLanguage: (lang: string) => void;
  toggleSimpleLanguage: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('river_health_token'));
  const [role, setRole] = useState<UserRole>((localStorage.getItem('river_health_role') as UserRole) || 'RESIDENT');
  const [language, setLangState] = useState<string>(localStorage.getItem('river_health_lang') || 'en');
  const [simpleLanguage, setSimpleLanguage] = useState<boolean>(localStorage.getItem('river_health_simple') === 'true');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function checkUser() {
      let currentToken = token;
      if (!currentToken) {
        try {
          // Auto-login default demo user
          const data = await api.login('resident', 'resident123');
          currentToken = data.access_token;
          setToken(currentToken);
          setRole(data.role);
          localStorage.setItem('river_health_token', currentToken);
          localStorage.setItem('river_health_role', data.role);
          if (data.preferred_language) {
            setLangState(data.preferred_language);
            i18n.changeLanguage(data.preferred_language);
          }
        } catch (err) {
          console.error('Auto-login failed', err);
        }
      }

      if (currentToken) {
        try {
          const profile = await api.getMe();
          setUser(profile);
          setRole(profile.role);
          localStorage.setItem('river_health_role', profile.role);
          if (profile.preferred_language) {
            setLangState(profile.preferred_language);
            i18n.changeLanguage(profile.preferred_language);
          }
        } catch {
          // Token expired or invalid
          logout();
        }
      }
      setIsLoading(false);
    }
    checkUser();
  }, []);

  const login = async (username: string, password: string) => {
    const data = await api.login(username, password);
    setToken(data.access_token);
    setRole(data.role);
    localStorage.setItem('river_health_token', data.access_token);
    localStorage.setItem('river_health_role', data.role);
    if (data.preferred_language) {
      setLanguage(data.preferred_language);
    }
    const profile = await api.getMe();
    setUser(profile);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('river_health_token');
    localStorage.removeItem('river_health_role');
  };

  const switchRole = (newRole: UserRole) => {
    setRole(newRole);
    localStorage.setItem('river_health_role', newRole);
    if (user) {
      setUser({ ...user, role: newRole });
    }
  };

  const setLanguage = (lang: string) => {
    setLangState(lang);
    localStorage.setItem('river_health_lang', lang);
    i18n.changeLanguage(lang);
  };

  const toggleSimpleLanguage = () => {
    const newVal = !simpleLanguage;
    setSimpleLanguage(newVal);
    localStorage.setItem('river_health_simple', String(newVal));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role,
        language,
        simpleLanguage,
        isLoading,
        login,
        logout,
        switchRole,
        setLanguage,
        toggleSimpleLanguage,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
