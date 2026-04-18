import React, { createContext, useContext, useState, useEffect } from 'react';

interface AuthContextType {
  token: string | null;
  email: string | null;
  login: (token: string, email: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    // Check local storage on initial load
    try {
      const storedToken = localStorage.getItem('token');
      const storedEmail = localStorage.getItem('email');
      if (storedToken && storedEmail) {
        setToken(storedToken);
        setEmail(storedEmail);
      }
    } catch (e) {
      console.warn('localStorage is restricted in this environment.');
    }
  }, []);

  const login = (newToken: string, newEmail: string) => {
    try {
      localStorage.setItem('token', newToken);
      localStorage.setItem('email', newEmail);
    } catch (e) {
      console.warn('localStorage is restricted. Auth state will not persist after refresh.');
    }
    setToken(newToken);
    setEmail(newEmail);
  };

  const logout = () => {
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('email');
    } catch (e) {
      // Ignore
    }
    setToken(null);
    setEmail(null);
  };

  return (
    <AuthContext.Provider value={{ token, email, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
