import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchGames, getFavorites, toggleFavorite } from '../services/dataService';
import { Game } from '../types';
import GameDetailModal from '../components/GameDetailModal';

const Favorites: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [favoriteGames, setFavoriteGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);

  useEffect(() => {
    // Redirect if not logged in (and not loading auth)
    if (!authLoading && !user) {
      navigate('/');
      return;
    }

    const loadFavorites = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const [games, favIds] = await Promise.all([
          fetchGames(),
          getFavorites(user.uid)
        ]);
        
        // Filter games that are in the favorites list
        const filtered = games.filter(g => g.id && favIds.includes(g.id));
        setFavoriteGames(filtered);
      } catch (error) {
        console.error("Error loading favorites:", error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
        loadFavorites();
    }
  }, [user, authLoading, navigate]);

  const handleRemove = async (gameId: string) => {
    if (!user) return;
    
    // Optimistic update
    setFavoriteGames(prev => prev.filter(g => g.id !== gameId));
    
    try {
        await toggleFavorite(gameId, user.uid);
    } catch (error) {
        console.error("Failed to remove favorite", error);
        // We could revert here, but for now we assume success or user will refresh
    }
  };

  if (loading || authLoading) {
    return (
        <div className="w-full flex items-center justify-center h-64">
            <div className="text-gray-500 animate-pulse font-bold">Loading your collection...</div>
        </div>
    );
  }

  if (!user) return null; 

  return (
    <div className="space-y-8 animate-fade-in w-full pb-12">
        {/* Header */}
        <div className="bg-vgb-card p-8 rounded-xl border-l-4 border-vgb-accent shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h1 className="text-3xl font-bold text-white mb-2">My Favorites</h1>
                <p className="text-gray-400">Manage your personal collection and watchlist.</p>
            </div>
            <div className="bg-zinc-900 px-6 py-3 rounded-lg border border-zinc-800 text-center min-w-[120px]">
                <span className="block text-3xl font-bold text-vgb-accent">{favoriteGames.length}</span>
                <span className="text-xs text-gray-500 uppercase tracking-wider">Saved Games</span>
            </div>
        </div>

        {favoriteGames.length === 0 ? (
            <div className="text-center py-24 bg-vgb-card rounded-xl border border-zinc-800 border-dashed flex flex-col items-center">
                <div className="text-6xl mb-6 opacity-20 grayscale">🎮</div>
                <h2 className="text-xl font-bold text-gray-400 mb-2">Your list is empty</h2>
                <p className="text-gray-500 mb-6 max-w-md">It looks like you haven't saved any games yet. Go explore the database and build your ultimate collection!</p>
                <button 
                    onClick={() => navigate('/search')}
                    className="bg-vgb-accent hover:bg-vgb-accentDark text-black font-bold py-3 px-8 rounded-full transition-transform hover:scale-105 shadow-lg shadow-vgb-accent/20"
                >
                    Browse Games
                </button>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {favoriteGames.map(game => (
                    <div 
                        key={game.id}
                        onClick={() => setSelectedGame(game)}
                        className="group relative bg-vgb-card rounded-xl border border-zinc-800 overflow-hidden hover:border-vgb-accent/50 hover:shadow-lg transition-all duration-300 cursor-pointer transform hover:-translate-y-1"
                    >
                        {/* Remove Button Overlay */}
                        <div className="absolute top-0 right-0 p-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemove(game.id!);
                                }}
                                className="bg-black/70 hover:bg-red-600 text-white w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-sm transition-colors shadow-lg"
                                title="Remove from favorites"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Top Gradient / Image Placeholder */}
                        <div className="h-32 bg-zinc-800 relative overflow-hidden">
                             <div className="absolute inset-0 bg-gradient-to-t from-vgb-card to-transparent z-0"></div>
                             {/* Decorative Pattern */}
                             <div className="absolute inset-0 opacity-10 pattern-grid-lg"></div>
                             
                             <div className="absolute bottom-4 left-5 font-bold text-5xl text-white/10 select-none z-0">
                                {game.title.charAt(0)}
                             </div>
                        </div>
                        
                        <div className="p-5 pt-2 relative z-10">
                            <h3 className="font-bold text-white text-lg leading-tight mb-2 group-hover:text-vgb-accent transition-colors truncate pr-2">{game.title}</h3>
                            <p className="text-xs text-gray-500 uppercase tracking-wide mb-4 flex items-center gap-2">
                                <span>{game.developer}</span>
                            </p>
                            
                            <div className="flex justify-between items-center border-t border-zinc-800 pt-3 mt-2">
                                <span className={`text-xs px-2 py-1 rounded font-bold uppercase ${
                                    (game.status || '').toLowerCase() === 'released' ? 'bg-green-900/30 text-green-400' : 'bg-yellow-900/30 text-yellow-400'
                                }`}>
                                    {game.status}
                                </span>
                                <span className="text-xs text-gray-400 font-mono">
                                    {game.releaseDate}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        )}

        <GameDetailModal 
            game={selectedGame} 
            isOpen={!!selectedGame} 
            onClose={() => setSelectedGame(null)} 
            isFavorite={true}
            onToggleFavorite={() => {
                if(selectedGame) {
                    handleRemove(selectedGame.id!);
                    setSelectedGame(null);
                }
            }}
        />
    </div>
  );
};

export default Favorites;