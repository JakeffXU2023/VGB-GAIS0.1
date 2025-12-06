import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AuthModal from './AuthModal';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isAuthModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  const openAuth = (mode: 'login' | 'signup') => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  const navLinks = [
    { path: '/', label: 'DASHBOARD' },
    { path: '/calendar', label: 'CALENDAR' },
    { path: '/reviews', label: 'REVIEWS' },
    { path: '/search', label: 'SEARCH' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-vgb-bg text-vgb-text font-sans">
      {/* Header */}
      <header className="flex items-center justify-between bg-zinc-800 px-6 py-3 shadow-md border-b border-zinc-700 sticky top-0 z-40 w-full">
        <div className="w-full max-w-[1920px] mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
                {/* Logo */}
                <Link to="/" className="flex items-center gap-3 group">
                    <img 
                        src="logo.png" 
                        alt="VGB Logo" 
                        className="h-10 w-auto object-contain transition-transform group-hover:scale-105"
                        onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            if (e.currentTarget.parentElement?.querySelector('.logo-fallback')) return;
                            
                            const span = document.createElement('span');
                            span.innerText = 'VGB';
                            span.className = 'logo-fallback text-2xl font-bold text-vgb-accent border-2 border-vgb-accent rounded-full w-10 h-10 flex items-center justify-center';
                            e.currentTarget.parentElement?.prepend(span);
                        }}
                    />
                    <span className="text-lg font-bold tracking-wider text-vgb-accent hidden sm:block group-hover:text-white transition-colors">
                        VIDEO GAME BULLETIN
                    </span>
                </Link>
            </div>

            <nav className="flex items-center gap-1 sm:gap-4 bg-zinc-900/50 px-4 py-1 rounded-full backdrop-blur-sm overflow-x-auto">
            {navLinks.map((link) => (
                <Link
                key={link.path}
                to={link.path}
                className={`px-3 py-1 text-sm font-bold transition-colors rounded-full whitespace-nowrap ${
                    location.pathname === link.path
                    ? 'text-vgb-accent bg-vgb-accent/10'
                    : 'text-gray-400 hover:text-white'
                }`}
                >
                {link.label}
                </Link>
            ))}
            </nav>

            <div className="flex items-center gap-3">
            {user ? (
                <>
                <div className="hidden md:flex flex-col items-end mr-2">
                    <span className="text-xs text-gray-400 uppercase tracking-wider">{user.role}</span>
                    <span className="text-sm font-bold text-white">{user.username}</span>
                </div>
                <button 
                    onClick={logout}
                    className="bg-red-600 hover:bg-red-700 text-white text-sm font-bold py-1.5 px-4 rounded transition-colors"
                >
                    Log out
                </button>
                </>
            ) : (
                <>
                <button 
                    onClick={() => openAuth('login')}
                    className="bg-zinc-700 hover:bg-zinc-600 text-white text-sm font-bold py-1.5 px-4 rounded transition-colors"
                >
                    Log in
                </button>
                <button 
                    onClick={() => openAuth('signup')}
                    className="hidden sm:block bg-blue-700 hover:bg-blue-600 text-white text-sm font-bold py-1.5 px-4 rounded transition-colors"
                >
                    Sign Up
                </button>
                </>
            )}
            </div>
        </div>
      </header>

      <div className="flex flex-1 w-full max-w-[1920px] mx-auto">
        {/* Sidebar */}
        <aside className="hidden lg:block w-64 bg-zinc-800/50 p-6 border-r border-zinc-700 shrink-0 h-[calc(100vh-64px)] sticky top-[64px] overflow-y-auto">
          <h3 className="text-vgb-accent font-bold uppercase text-sm mb-4 tracking-wider">
            {user?.role === 'admin' ? 'Admin Tools' : user ? 'User Tools' : 'Quick Access'}
          </h3>
          
          <div className="space-y-3">
            {user?.role === 'admin' ? (
              <>
                <SidebarButton>Manage Users</SidebarButton>
                <SidebarButton>Approve Reviews</SidebarButton>
                <SidebarButton 
                    active={location.pathname === '/admin/games'}
                    onClick={() => navigate('/admin/games')}
                >
                    Admin Game Manager
                </SidebarButton>
                <SidebarButton>View Reports</SidebarButton>
              </>
            ) : user ? (
              <>
                <SidebarButton 
                    active={location.pathname === '/favorites'} 
                    onClick={() => navigate('/favorites')}
                >
                    My Favorites
                </SidebarButton>
                <SidebarButton 
                    active={location.pathname === '/my-reviews'} 
                    onClick={() => navigate('/my-reviews')}
                >
                    My Reviews
                </SidebarButton>
                <SidebarButton>Account Settings</SidebarButton>
              </>
            ) : (
              <>
                <SidebarButton 
                    active={location.pathname === '/search'} 
                    onClick={() => navigate('/search')}
                >
                    Popular Games
                </SidebarButton>
                <SidebarButton 
                    active={location.pathname === '/calendar'} 
                    onClick={() => navigate('/calendar')}
                >
                    New Releases
                </SidebarButton>
                <SidebarButton onClick={() => navigate('/search')}>Top Rated</SidebarButton>
              </>
            )}
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto w-full">
          {children}
        </main>
      </div>

      <footer className="bg-zinc-800 text-center py-4 text-gray-500 text-sm border-t border-zinc-700">
        <p>&copy; 2025 Project VAUYL | Video Game Bulletin</p>
      </footer>

      {isAuthModalOpen && (
        <AuthModal 
            isOpen={isAuthModalOpen} 
            onClose={() => setAuthModalOpen(false)} 
            initialView={authMode} 
        />
      )}
    </div>
  );
};

const SidebarButton: React.FC<{ children: React.ReactNode; onClick?: () => void; active?: boolean }> = ({ children, onClick, active }) => (
  <button 
    onClick={onClick}
    className={`w-full text-left px-4 py-3 rounded text-sm font-medium transition-all hover:translate-x-1 ${
        active 
          ? 'bg-vgb-accent text-black font-bold shadow-md shadow-vgb-accent/20' 
          : 'bg-zinc-700 hover:bg-zinc-600 text-gray-200'
      }`}
  >
    {children}
  </button>
);

export default Layout;