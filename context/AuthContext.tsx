import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { UserProfile, UserRole } from '../types';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  loginAsDemo: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  logout: async () => {},
  refreshUser: async () => {},
  loginAsDemo: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = async (firebaseUser: User) => {
    try {
      const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        // INTERPRET SCHEMA: Robust check for Admin role
        // Accepts: Administrator, administrator, Admin, admin, or role: 'admin'
        let appRole: UserRole = 'user'; // Default
        
        const isAdmin = 
            userData.Administrator === true || 
            userData.administrator === true || 
            userData.Admin === true || 
            userData.admin === true || 
            userData.role === 'admin';

        const isGuest = 
            userData.Guest === true || 
            userData.guest === true || 
            userData.role === 'guest';

        if (isAdmin) {
            appRole = 'admin';
        } else if (isGuest) {
            appRole = 'guest';
        }

        setUser({
          uid: userData.User_ID || firebaseUser.uid,
          email: userData.Email || firebaseUser.email,
          username: userData.Username || firebaseUser.email?.split('@')[0] || 'User',
          role: appRole,
        });
      } else {
        // Fallback if user record doesn't exist in Firestore yet
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          username: firebaseUser.email?.split('@')[0] || 'User',
          role: 'user',
        });
      }
    } catch (err) {
      console.error("Error fetching user profile:", err);
      // Even if Firestore fails, allow basic auth login so they aren't locked out entirely
      setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          username: firebaseUser.email?.split('@')[0] || 'User',
          role: 'user',
      });
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        await fetchUserProfile(firebaseUser);
      } else {
        // No user logged in
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    try {
        await signOut(auth);
    } catch (error) {
        console.log("Sign out finished");
    }
    setUser(null);
  };

  const refreshUser = async () => {
    if (auth.currentUser) {
      await fetchUserProfile(auth.currentUser);
    }
  };

  const loginAsDemo = (role: UserRole) => {
    const stableId = role === 'admin' ? 'demo-admin-stable-id' : 'demo-user-stable-id';
    
    setUser({
        uid: stableId,
        email: `demo.${role}@vgb.com`,
        username: role === 'admin' ? 'Demo Admin' : 'Demo User',
        role: role
    });
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout, refreshUser, loginAsDemo }}>
      {children}
    </AuthContext.Provider>
  );
};