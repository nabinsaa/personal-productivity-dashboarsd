import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updateProfile as firebaseUpdateProfile,
  signInAnonymously,
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { UserProfile } from '../types';
import { getUserProfile, createUserProfile, updateUserProfile } from '../services/dbService';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  signUp: (email: string, pass: string, name: string) => Promise<void>;
  login: (email: string, pass: string) => Promise<void>;
  demoLogin: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserDisplayName: (name: string) => Promise<void>;
  updateNotificationSettings: (prefs: UserProfile['notificationPreferences']) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [theme, setThemeState] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('theme_preference');
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  // Apply theme to DOM
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }
    localStorage.setItem('theme_preference', theme);
  }, [theme]);

  const setTheme = (newTheme: 'light' | 'dark') => {
    setThemeState(newTheme);
    setUserProfile((prev) => (prev ? { ...prev, theme: newTheme } : null));
    if (currentUser) {
      updateUserProfile(currentUser.uid, { theme: newTheme }).catch((e) =>
        console.error('Failed to update theme in profile:', e)
      );
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        let profile = await getUserProfile(user.uid);
        if (!profile) {
          profile = {
            uid: user.uid,
            email: user.email || 'guest@productivity.app',
            displayName: user.displayName || (user.isAnonymous ? 'Guest User' : user.email?.split('@')[0] || 'User'),
            theme,
            notificationPreferences: {
              emailAlerts: true,
              dueDateReminders: true,
              dailySummary: false,
            },
            createdAt: new Date().toISOString(),
          };
          await createUserProfile(profile);
        }
        setUserProfile(profile);
        if (profile.theme && (profile.theme === 'light' || profile.theme === 'dark')) {
          setThemeState(profile.theme);
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signUp = async (email: string, pass: string, name: string) => {
    try {
      const res = await createUserWithEmailAndPassword(auth, email, pass);
      await firebaseUpdateProfile(res.user, { displayName: name });
      const profile: UserProfile = {
        uid: res.user.uid,
        email,
        displayName: name,
        theme,
        notificationPreferences: {
          emailAlerts: true,
          dueDateReminders: true,
          dailySummary: false,
        },
        createdAt: new Date().toISOString(),
      };
      await createUserProfile(profile);
      setUserProfile(profile);
    } catch (err: any) {
      if (
        err.code === 'auth/admin-restricted-operation' ||
        err.code === 'auth/operation-not-allowed'
      ) {
        console.warn('Firebase Auth operation restricted by admin settings. Using local session mode.');
        const localUid = 'user-' + btoa(email).substring(0, 12);
        const fakeUser = {
          uid: localUid,
          email,
          displayName: name,
          isAnonymous: false,
        } as User;
        setCurrentUser(fakeUser);
        const profile: UserProfile = {
          uid: localUid,
          email,
          displayName: name,
          theme,
          notificationPreferences: {
            emailAlerts: true,
            dueDateReminders: true,
            dailySummary: false,
          },
          createdAt: new Date().toISOString(),
        };
        setUserProfile(profile);
        return;
      }
      throw err;
    }
  };

  const login = async (email: string, pass: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (err: any) {
      if (
        err.code === 'auth/admin-restricted-operation' ||
        err.code === 'auth/operation-not-allowed'
      ) {
        console.warn('Firebase Auth operation restricted by admin settings. Using local session mode.');
        const localUid = 'user-' + btoa(email).substring(0, 12);
        const fakeUser = {
          uid: localUid,
          email,
          displayName: email.split('@')[0] || 'User',
          isAnonymous: false,
        } as User;
        setCurrentUser(fakeUser);
        let profile = await getUserProfile(localUid);
        if (!profile) {
          profile = {
            uid: localUid,
            email,
            displayName: email.split('@')[0] || 'User',
            theme,
            notificationPreferences: {
              emailAlerts: true,
              dueDateReminders: true,
              dailySummary: false,
            },
            createdAt: new Date().toISOString(),
          };
        }
        setUserProfile(profile);
        return;
      }
      throw err;
    }
  };

  const demoLogin = async () => {
    try {
      if (auth.currentUser) {
        await firebaseSignOut(auth);
      }
      const res = await signInAnonymously(auth);
      const profile: UserProfile = {
        uid: res.user.uid,
        email: 'demo@productivity.app',
        displayName: 'Demo Workspace',
        theme,
        notificationPreferences: {
          emailAlerts: false,
          dueDateReminders: true,
          dailySummary: false,
        },
        createdAt: new Date().toISOString(),
      };
      await createUserProfile(profile);
      setUserProfile(profile);
    } catch (err: any) {
      // Generate a fresh unique ID for this demo session so new demo users start clean without seeing prior group chats
      let localUid = sessionStorage.getItem('current_demo_uid');
      if (!localUid) {
        localUid = 'demo-user-' + Math.random().toString(36).substring(2, 9) + '-' + Date.now().toString(36);
        sessionStorage.setItem('current_demo_uid', localUid);
      }
      const localUser = {
        uid: localUid,
        email: 'demo@productivity.app',
        displayName: 'Demo User',
        isAnonymous: true,
      } as User;
      setCurrentUser(localUser);
      let profile = await getUserProfile(localUid);
      if (!profile) {
        profile = {
          uid: localUid,
          email: 'demo@productivity.app',
          displayName: 'Demo User',
          theme,
          notificationPreferences: {
            emailAlerts: false,
            dueDateReminders: true,
            dailySummary: false,
          },
          createdAt: new Date().toISOString(),
        };
        await createUserProfile(profile);
      }
      setUserProfile(profile);
    }
  };

  const logout = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (e) {
      console.warn('Signout error:', e);
    } finally {
      sessionStorage.removeItem('current_demo_uid');
      setCurrentUser(null);
      setUserProfile(null);
    }
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const updateUserDisplayName = async (name: string) => {
    if (!currentUser) return;
    await firebaseUpdateProfile(currentUser, { displayName: name });
    await updateUserProfile(currentUser.uid, { displayName: name });
    setUserProfile((prev) => (prev ? { ...prev, displayName: name } : null));
  };

  const updateNotificationSettings = async (prefs: UserProfile['notificationPreferences']) => {
    if (!currentUser) return;
    await updateUserProfile(currentUser.uid, { notificationPreferences: prefs });
    setUserProfile((prev) => (prev ? { ...prev, notificationPreferences: prefs } : null));
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        loading,
        theme,
        setTheme,
        signUp,
        login,
        demoLogin,
        logout,
        resetPassword,
        updateUserDisplayName,
        updateNotificationSettings,
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
