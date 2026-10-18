import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { UserProfile } from '@workspace/api-client-react';
import { getToken, setToken } from '../lib/auth-token';
import { useGetMe } from '@workspace/api-client-react';

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: UserProfile) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(getToken());
  const [user, setUser] = useState<UserProfile | null>(null);
  
  // Only fetch if we have a token
  const { data: meData, isLoading: meLoading, error } = useGetMe({
    query: {
      queryKey: ['me'],
      enabled: !!token,
      retry: false,
    }
  });

  useEffect(() => {
    if (meData) {
      setUser(meData);
    }
    if (error) {
      logout();
    }
  }, [meData, error]);

  const login = (newToken: string, newUser: UserProfile) => {
    setToken(newToken);
    setTokenState(newToken);
    setUser(newUser);
  };

  const logout = () => {
    setToken(null);
    setTokenState(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      isLoading: !!token && meLoading, 
      login, 
      logout 
    }}>
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
