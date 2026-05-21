/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole, ApprovalStatus } from '@/types';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider, 
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc,
  serverTimestamp,
  onSnapshot 
} from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  loginWithGoogle: (role?: UserRole) => Promise<void>;
  signupWithEmail: (email: string, password: string, userData: Partial<UserProfile>) => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    // Handle standard Google login redirect results (necessary for mobile/Safari compatibility under custom domains)
    const handleRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result && result.user) {
          const firebaseUser = result.user;
          const userRef = doc(db, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userRef);

          if (!userDoc.exists()) {
            const preferredRole = (localStorage.getItem('google_preferred_role') as UserRole) || 'candidate';
            const newProfile: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              role: preferredRole,
              status: preferredRole === 'recruiter' ? 'pending' : 'approved',
              displayName: firebaseUser.displayName || 'Utilisateur',
              companyName: preferredRole === 'recruiter' ? (firebaseUser.displayName || '') : undefined,
              photoUrl: firebaseUser.photoURL || null,
              createdAt: serverTimestamp(),
            };
            await setDoc(userRef, newProfile);
            setUser(newProfile);
          } else {
            setUser(userDoc.data() as UserProfile);
          }
        }
      } catch (error) {
        console.error("Error retrieving redirect login result:", error);
      }
    };

    handleRedirectResult();

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      if (firebaseUser) {
        setLoading(true);
        // Using onSnapshot for real-time updates (like suspension)
        unsubscribeProfile = onSnapshot(doc(db, 'users', firebaseUser.uid), (snapshot) => {
          if (snapshot.exists()) {
            const profile = snapshot.data() as UserProfile;
            setUser(profile);
          } else {
            setUser(null);
          }
          setLoading(false);
        }, (error) => {
          console.error("Profile sync error:", error);
          setLoading(false);
        });
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  const loginWithGoogle = async (preferredRole: UserRole = 'candidate') => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      
      // Store preferred role in localStorage in case we need it after redirect
      localStorage.setItem('google_preferred_role', preferredRole);

      // Detect Safari / iOS / Mobile to prefer redirect for a better UX on restricted devices
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
      const isMobile = /Android|webOS|iPhone|iPad|Macintosh|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      if (isSafari || isMobile) {
        console.log("Safari/Mobile detected, utilizing redirect flow for Google Login...");
        await signInWithRedirect(auth, provider);
        return;
      }

      try {
        const result = await signInWithPopup(auth, provider);
        const firebaseUser = result.user;

        const userRef = doc(db, 'users', firebaseUser.uid);
        const userDoc = await getDoc(userRef);

        if (!userDoc.exists()) {
          const newProfile: UserProfile = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            role: preferredRole,
            status: preferredRole === 'recruiter' ? 'pending' : 'approved',
            displayName: firebaseUser.displayName || 'Utilisateur',
            companyName: preferredRole === 'recruiter' ? (firebaseUser.displayName || '') : undefined,
            photoUrl: firebaseUser.photoURL || null,
            createdAt: serverTimestamp(),
          };
          await setDoc(userRef, newProfile);
          setUser(newProfile);
        } else {
          setUser(userDoc.data() as UserProfile);
        }
      } catch (popupError: any) {
        console.warn("Popup blocked or failed, falling back to redirect...", popupError);
        if (popupError.code === 'auth/popup-blocked' || 
            popupError.code === 'auth/operation-not-supported-in-this-environment' ||
            popupError.code === 'auth/web-storage-unsupported') {
          await signInWithRedirect(auth, provider);
        } else {
          throw popupError;
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signupWithEmail = async (email: string, password: string, userData: Partial<UserProfile>) => {
    setLoading(true);
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = result.user;

      const newProfile: UserProfile = {
        uid: firebaseUser.uid,
        email: email,
        role: userData.role || 'candidate',
        status: userData.role === 'recruiter' ? 'submitted' : 'approved',
        displayName: userData.displayName || 'Utilisateur',
        photoUrl: null,
        phone: userData.phone,
        location: userData.location,
        companyName: userData.companyName,
        registrationNumber: userData.registrationNumber,
        companyDescription: userData.companyDescription,
        website: userData.website,
        sectorActivity: userData.sectorActivity,
        companySize: userData.companySize,
        legalDocuments: userData.legalDocuments,
        profileComplete: userData.role === 'recruiter' ? true : false,
        createdAt: serverTimestamp(),
      };

      await setDoc(doc(db, 'users', firebaseUser.uid), newProfile);
      setUser(newProfile);
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const loginWithEmail = async (email: string, password: string) => {
    setLoading(true);
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = result.user;
      
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      if (userDoc.exists()) {
        setUser(userDoc.data() as UserProfile);
      } else {
        // Self-heal mechanism: recreate a profile if missing in Firestore to avoid lock-outs
        const newProfile: UserProfile = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || email,
          role: 'candidate',
          status: 'approved',
          displayName: firebaseUser.displayName || email.split('@')[0],
          photoUrl: firebaseUser.photoURL || null,
          createdAt: serverTimestamp(),
        };
        await setDoc(doc(db, 'users', firebaseUser.uid), newProfile);
        setUser(newProfile);
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const sendPasswordReset = async (email: string) => {
    const { sendPasswordResetEmail } = await import('firebase/auth');
    auth.languageCode = 'fr';
    await sendPasswordResetEmail(auth, email);
  };

  const logout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    if (!user) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, data);
      
      // Update local state
      setUser(prev => prev ? { ...prev, ...data } : null);
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginWithGoogle, signupWithEmail, loginWithEmail, sendPasswordReset, updateProfile, logout }}>
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
