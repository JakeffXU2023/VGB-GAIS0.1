import React, { useState, useEffect } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialView?: 'login' | 'signup';
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, initialView = 'login' }) => {
  const [view, setView] = useState<'login' | 'signup'>(initialView);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { refreshUser, loginAsDemo } = useAuth();

  // Reset view and errors when modal opens or initialView prop changes
  useEffect(() => {
    if (isOpen) {
      setView(initialView);
      setError('');
    }
  }, [isOpen, initialView]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (view === 'signup') {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        
        // SAVE DATA: Implementing the requested schema
        await setDoc(doc(db, "users", cred.user.uid), {
          User_ID: cred.user.uid,
          Username: username,
          Email: email,
          Registration_Date: new Date().toISOString(),
          // Boolean Flags Schema (Default to standard user)
          Guest: false,
          Registered: true,
          Administrator: false,
          Admin: false 
        });

        await refreshUser();
        onClose();
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        await refreshUser();
        onClose();
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('Incorrect email or password. Please check your credentials.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('This email is already registered.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Invalid email format. If using an ID, please enter the full email address (e.g., 2023...@school.edu).');
      } else {
        setError(err.message || 'Authentication failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = (role: 'user' | 'admin') => {
      loginAsDemo(role);
      onClose();
  };

  const toggleView = () => {
    setView(view === 'login' ? 'signup' : 'login');
    setError('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm">
      <div className="bg-vgb-card w-full max-w-sm p-6 rounded-xl shadow-2xl border border-vgb-border relative animate-fade-in">
        <button 
          onClick={onClose} 
          className="absolute top-3 right-4 text-gray-400 hover:text-white text-2xl"
        >
          &times;
        </button>
        
        <div className="flex justify-center mb-4">
          <img 
            src="logo.png" 
            alt="VGB Logo" 
            className="h-12 w-auto object-contain"
            onError={(e) => {
                e.currentTarget.style.display = 'none';
                if (e.currentTarget.parentElement?.querySelector('.logo-fallback-modal')) return;
                const span = document.createElement('span');
                span.innerText = 'VGB';
                span.className = 'logo-fallback-modal text-xl font-bold text-vgb-accent border-2 border-vgb-accent rounded-full w-10 h-10 flex items-center justify-center';
                e.currentTarget.parentElement?.prepend(span);
            }} 
          />
        </div>
        
        <h2 className="text-2xl font-bold text-center text-white mb-6">
          {view === 'login' ? 'Log In' : 'Sign Up'}
        </h2>

        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 text-sm p-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-400 text-sm mb-1">Email</label>
            <input 
              type="email" 
              required 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-vgb-bg border border-vgb-border rounded p-2 text-white focus:outline-none focus:border-vgb-accent transition-colors"
              placeholder="Enter your email"
            />
          </div>

          {view === 'signup' && (
            <div>
              <label className="block text-gray-400 text-sm mb-1">Username</label>
              <input 
                type="text" 
                required 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-vgb-bg border border-vgb-border rounded p-2 text-white focus:outline-none focus:border-vgb-accent transition-colors"
                placeholder="Choose a username"
              />
            </div>
          )}

          <div>
            <label className="block text-gray-400 text-sm mb-1">Password</label>
            <input 
              type="password" 
              required 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-vgb-bg border border-vgb-border rounded p-2 text-white focus:outline-none focus:border-vgb-accent transition-colors"
              placeholder="Enter your password"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-700 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition-colors disabled:opacity-50 mt-4"
          >
            {loading ? 'Processing...' : (view === 'login' ? 'Log In' : 'Sign Up')}
          </button>
        </form>

        <div className="mt-4 pt-4 border-t border-zinc-700">
             <p className="text-xs text-gray-500 text-center mb-2">Test without an account:</p>
             <div className="flex gap-2">
                 <button onClick={() => handleDemoLogin('user')} className="flex-1 bg-zinc-700 hover:bg-zinc-600 text-xs text-white py-2 rounded">
                    Demo User
                 </button>
                 <button onClick={() => handleDemoLogin('admin')} className="flex-1 bg-vgb-accent/20 hover:bg-vgb-accent/30 border border-vgb-accent/50 text-xs text-vgb-accent py-2 rounded font-bold">
                    Demo Admin
                 </button>
             </div>
        </div>

        <p className="text-center text-gray-400 text-sm mt-6">
          {view === 'login' ? "Don't have an account?" : "Already have an account?"}{" "}
          <button 
            onClick={toggleView} 
            className="text-vgb-accent hover:underline font-bold"
          >
            {view === 'login' ? 'Sign Up' : 'Log In'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default AuthModal;