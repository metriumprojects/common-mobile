import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  getStoredToken,
  getStoredUserData,
  clearAuthData,
  isAuthenticated as checkIsAuthenticated,
  storeAuthData,
} from '../util/authController';
import { useAuth as useClerkAuth, useUser as useClerkUser } from '@clerk/clerk-expo';
import { mobileSocket } from '../api/socket';
import { clearDataCache } from '../api/dataCache';

interface AuthContextType {
  user: any;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (token: string, userData: any) => Promise<void>;
  logout: () => void;
  checkAuthStatus: () => Promise<void>;
  isClerkAuth?: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const clerkAuth = useClerkAuth();
  const clerkUser = useClerkUser();

  const login = async (newToken: string, userData: any) => {
    setToken(newToken);
    setUser(userData);
    setIsAuthenticated(true);
    await storeAuthData(newToken, userData);
  };

  const logout = async () => {
    try {
      if (clerkAuth.isSignedIn && clerkAuth.signOut) {
        await clerkAuth.signOut();
      }
    } catch (e) {
      console.warn('[AuthContext] Error during Clerk signOut:', e);
    }
    await clearAuthData();
    await clearDataCache();
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
  };

  // Sync Clerk authentication state
  useEffect(() => {
    let isCancelled = false;

    const syncClerkSession = async () => {
      if (!clerkAuth.isLoaded) return;

      if (clerkAuth.isSignedIn) {
        try {
          const clerkJwt = await clerkAuth.getToken();
          if (clerkJwt && !isCancelled) {
            const userData = {
              id: clerkAuth.userId,
              clerkId: clerkAuth.userId,
              email:
                clerkUser.user?.primaryEmailAddress?.emailAddress ||
                clerkUser.user?.emailAddresses?.[0]?.emailAddress ||
                '',
              fullName:
                clerkUser.user?.fullName ||
                `${clerkUser.user?.firstName || ''} ${clerkUser.user?.lastName || ''}`.trim() ||
                '',
              profilePicture: clerkUser.user?.imageUrl || '',
            };
            await storeAuthData(clerkJwt, userData);
            if (!isCancelled) {
              setToken(clerkJwt);
              setUser(userData);
              setIsAuthenticated(true);
              setLoading(false);
            }
            return;
          }
        } catch (err) {
          console.error('[AuthContext] Error retrieving Clerk token:', err);
        }
      }

      // If not signed in via Clerk, fall back to stored auth data
      try {
        const storedToken = await getStoredToken();
        const userData = await getStoredUserData();
        const authStatus = await checkIsAuthenticated();

        if (authStatus && storedToken && userData && !isCancelled) {
          setToken(storedToken);
          setUser(userData);
          setIsAuthenticated(true);
        } else if (!isCancelled) {
          setToken(null);
          setUser(null);
          setIsAuthenticated(false);
        }
      } catch (error) {
        if (!isCancelled) {
          setToken(null);
          setUser(null);
          setIsAuthenticated(false);
        }
      } finally {
        if (!isCancelled) setLoading(false);
      }
    };

    syncClerkSession();

    return () => {
      isCancelled = true;
    };
  }, [clerkAuth.isLoaded, clerkAuth.isSignedIn, clerkAuth.userId, clerkUser.user]);

  const checkAuthStatus = async () => {
    if (clerkAuth.isSignedIn) {
      try {
        const clerkJwt = await clerkAuth.getToken();
        if (clerkJwt) {
          setToken(clerkJwt);
          setIsAuthenticated(true);
          return;
        }
      } catch (e) {}
    }

    try {
      setLoading(true);
      const storedToken = await getStoredToken();
      const userData = await getStoredUserData();
      const authStatus = await checkIsAuthenticated();

      if (authStatus && storedToken && userData) {
        setToken(storedToken);
        setUser(userData);
        setIsAuthenticated(true);
      } else {
        setToken(null);
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('[AuthContext] Error checking auth status:', error);
      setToken(null);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const uid = user?.id;
    if (!uid) return;
    const registerOnline = () => {
      mobileSocket.emit('user-online', uid);
    };
    if (mobileSocket.connected) {
      registerOnline();
    }
    mobileSocket.on('connect', registerOnline);
    return () => {
      mobileSocket.off('connect', registerOnline);
    };
  }, [user?.id]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        loading: !clerkAuth.isLoaded || loading,
        login,
        logout,
        checkAuthStatus,
        isClerkAuth: Boolean(clerkAuth.isSignedIn),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
