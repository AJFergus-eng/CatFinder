import React, { createContext, useContext, useState, useEffect } from 'react';

interface AuthContextType {
  token: string | null;
  email: string | null;
  username: string | null; // NEW
  login: (token: string, email: string, username: string) => void; // NEW
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null); // NEW

  useEffect(() => {
    try {
      const storedToken = localStorage.getItem('token');
      const storedEmail = localStorage.getItem('email');
      const storedUsername = localStorage.getItem('username'); // NEW
      if (storedToken && storedEmail) {
        setToken(storedToken);
        setEmail(storedEmail);
        if (storedUsername) setUsername(storedUsername); // NEW
      }
    } catch (e) {
      console.warn('localStorage is restricted in this environment.');
    }
  }, []);

  const login = (newToken: string, newEmail: string, newUsername: string) => { // NEW
    try {
      localStorage.setItem('token', newToken);
      localStorage.setItem('email', newEmail);
      localStorage.setItem('username', newUsername); // NEW
    } catch (e) {
      console.warn('localStorage is restricted. Auth state will not persist after refresh.');
    }
    setToken(newToken);
    setEmail(newEmail);
    setUsername(newUsername); // NEW
  };

  const logout = () => {
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('email');
      localStorage.removeItem('username'); // NEW
    } catch (e) {
      // Ignore
    }
    setToken(null);
    setEmail(null);
    setUsername(null); // NEW
  };

  return (
    <AuthContext.Provider value={{ token, email, username, login, logout, isAuthenticated: !!token }}> // NEW
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