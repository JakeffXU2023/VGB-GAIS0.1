import React, { useEffect, useState } from 'react';
import { fetchGames, fetchReviews, getFavorites, toggleFavorite } from '../services/dataService';
import { Game } from '../types';
import { useAuth } from '../context/AuthContext';
import GameDetailModal from '../components/GameDetailModal';

interface GameWithRating extends Game {
  avgRating: number;
  reviewCount: number;
}

const Search: React.FC = () => {
  const { user } = useAuth();
  const [allGames, setAllGames] = useState<GameWithRating[]>([]);
  const [filteredGames, setFilteredGames] = useState<GameWithRating[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Selection & Favorites
  const [selectedGame, setSelectedGame] = useState<GameWithRating | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('All');
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [sortOrder, setSortOrder] = useState<'relevance' | 'rating-high' | 'rating-low' | 'date-new' | 'date-old'>('relevance');

  // Options
  const platforms = ['All', 'PC', 'PS5', 'Xbox Series X', 'Switch'];
  const genres = ['All', 'Action', 'RPG', 'Adventure', 'Strategy', 'Horror', 'Racing'];
  const statuses = ['All', 'Released', 'Upcoming', 'TBA'];

  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      try {
        const [gamesData, reviewsData] = await Promise.all([fetchGames(), fetchReviews()]);

        // Calculate ratings
        const ratingsMap: Record<string, number[]> = {};
        reviewsData.forEach((r) => {
          if (!ratingsMap[r.gameTitle]) ratingsMap[r.gameTitle] = [];
          ratingsMap[r.gameTitle].push(r.rating);
        });

        const enhancedGames: GameWithRating[] = gamesData.map(g => {
          const ratings = ratingsMap[g.title] || [];
          const total = ratings.reduce((acc, curr) => acc + curr, 0);
          const avg = ratings.length > 0 ? total / ratings.length : 0;
          return { ...g, avgRating: avg, reviewCount: ratings.length };
        });

        setAllGames(enhancedGames);
        setFilteredGames(enhancedGames);
        
        // Load initial favorites (Async)
        const favs = await getFavorites(user?.uid);
        setFavorites(favs);
      } catch (err) {
        console.error("Failed to load search data", err);
      } finally {
        setLoading(false);
      }
    };
    initData();
  }, [user]);

  // Update favorites when user changes (Separated effect)
  useEffect(() => {
    const loadFavs = async () => {
        const favs = await getFavorites(user?.uid);
        setFavorites(favs);
    };
    loadFavs();
  }, [user]);

  // Filter Logic
  useEffect(() => {
    let result = [...allGames];

    // 1. Text Search
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(g => g.title.toLowerCase().includes(lower) || (g.developer && g.developer.toLowerCase().includes(lower)));
    }

    // 2. Platform
    if (selectedPlatform !== 'All') {
      result = result.filter(g => g.platforms?.some(p => p.toLowerCase() === selectedPlatform.toLowerCase() || p.toLowerCase().includes(selectedPlatform.toLowerCase())));
    }

    // 3. Genre
    if (selectedGenre !== 'All') {
      result = result.filter(g => (g.genre || '').toLowerCase() === selectedGenre.toLowerCase());
    }

    // 4. Status
    if (selectedStatus !== 'All') {
      result = result.filter(g => (g.status || '').toLowerCase() === selectedStatus.toLowerCase());
    }

    // 5. Date Range
    if (dateStart) {
      result = result.filter(g => g.releaseDate >= dateStart);
    }
    if (dateEnd) {
      result = result.filter(g => g.releaseDate <= dateEnd);
    }

    // 6. Sorting
    switch (sortOrder) {
      case 'rating-high':
        result.sort((a, b) => b.avgRating - a.avgRating);
        break;
      case 'rating-low':
        result.sort((a, b) => a.avgRating - b.avgRating);
        break;
      case 'date-new':
        result.sort((a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime());
        break;
      case 'date-old':
        result.sort((a, b) => new Date(a.releaseDate).getTime() - new Date(b.releaseDate).getTime());
        break;
      case 'relevance':
      default:
        break;
    }

    setFilteredGames(result);
  }, [searchTerm, selectedPlatform, selectedGenre, selectedStatus, dateStart, dateEnd, sortOrder, allGames]);

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedPlatform('All');
    setSelectedGenre('All');
    setSelectedStatus('All');
    setDateStart('');
    setDateEnd('');
    setSortOrder('relevance');
  };

  const handleToggleFavorite = async (gameId: string | undefined) => {
    if (!gameId) return;

    // Strict Requirement: Registered only
    if (!user) {
        alert("Favoriting games is available for registered users only. Please log in or create an account.");
        return;
    }
    
    // Optimistic Update: Update UI immediately
    const isCurrentlyFav = favorites.includes(gameId);
    let newFavorites;
    if (isCurrentlyFav) {
        newFavorites = favorites.filter(id => id !== gameId);
    } else {
        newFavorites = [...favorites, gameId];
    }
    setFavorites(newFavorites);

    // Perform API call
    try {
        await toggleFavorite(gameId, user.uid);
    } catch (error) {
        console.error("Failed to toggle favorite", error);
        // Revert on error
        const favs = await getFavorites(user.uid);
        setFavorites(favs); 
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12 w-full">
      <div className="flex flex-col md:flex-row gap-6">
        
        {/* Filters Sidebar - Fixed width on Desktop for consistency */}
        <aside className="w-full md:w-64 lg:w-72 shrink-0 bg-vgb-card p-5 rounded-xl border border-zinc-800 h-fit space-y-6">
          <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
            <h2 className="text-xl font-bold text-white">Filters</h2>
            <button onClick={clearFilters} className="text-xs text-vgb-accent hover:underline">Reset</button>
          </div>

          {/* Search Input */}
          <div>
            <label className="block text-xs font-bold text-gray-400 mb-1 uppercase">Search</label>
            <input 
              type="text" 
              placeholder="Game title..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-sm text-white focus:outline-none focus:border-vgb-accent"
            />
          </div>

          {/* Platform */}
          <div>
            <label className="block text-xs font-bold text-gray-400 mb-1 uppercase">Platform</label>
            <select 
              value={selectedPlatform}
              onChange={(e) => setSelectedPlatform(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-sm text-white focus:outline-none focus:border-vgb-accent"
            >
              {platforms.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          {/* Genre */}
          <div>
            <label className="block text-xs font-bold text-gray-400 mb-1 uppercase">Genre</label>
            <select 
              value={selectedGenre}
              onChange={(e) => setSelectedGenre(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-sm text-white focus:outline-none focus:border-vgb-accent"
            >
              {genres.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-bold text-gray-400 mb-1 uppercase">Status</label>
            <div className="space-y-2">
              {statuses.map(s => (
                <label key={s} className="flex items-center gap-2 cursor-pointer group">
                  <input 
                    type="radio" 
                    name="status" 
                    value={s} 
                    checked={selectedStatus === s}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="accent-vgb-accent"
                  />
                  <span className={`text-sm group-hover:text-white ${selectedStatus === s ? 'text-white' : 'text-gray-400'}`}>{s}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-xs font-bold text-gray-400 mb-1 uppercase">Release Date Range</label>
            <div className="flex gap-2">
              <input 
                type="date" 
                value={dateStart}
                onChange={(e) => setDateStart(e.target.value)}
                className="w-1/2 bg-zinc-900 border border-zinc-700 rounded p-1 text-xs text-white"
              />
              <input 
                type="date" 
                value={dateEnd}
                onChange={(e) => setDateEnd(e.target.value)}
                className="w-1/2 bg-zinc-900 border border-zinc-700 rounded p-1 text-xs text-white"
              />
            </div>
          </div>
        </aside>

        {/* Results Area */}
        <div className="flex-1 space-y-4 min-w-0">
          <div className="flex justify-between items-center bg-vgb-card p-4 rounded-xl border border-zinc-800">
             <span className="text-gray-400 font-bold text-sm">{filteredGames.length} Games Found</span>
             <div className="flex items-center gap-2">
                <label className="text-gray-500 text-sm hidden sm:block">Sort by:</label>
                <select 
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as any)}
                  className="bg-zinc-900 border border-zinc-700 rounded p-1.5 text-sm text-white focus:outline-none"
                >
                  <option value="relevance">Relevance</option>
                  <option value="rating-high">Highest Rated</option>
                  <option value="rating-low">Lowest Rated</option>
                  <option value="date-new">Newest First</option>
                  <option value="date-old">Oldest First</option>
                </select>
             </div>
          </div>

          {loading ? (
             <div className="text-center py-12 text-gray-500">Loading Games Database...</div>
          ) : filteredGames.length === 0 ? (
             <div className="text-center py-20 bg-vgb-card rounded-xl border border-zinc-800 border-dashed">
                <p className="text-xl text-gray-400 font-bold">No games found.</p>
                <p className="text-gray-600 mt-2">Try adjusting your filters.</p>
                <button onClick={clearFilters} className="mt-4 text-vgb-accent hover:underline">Clear all filters</button>
             </div>
          ) : (
            // Expanded grid columns for large screens (up to 5 cols)
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
               {filteredGames.map(game => (
                 <div 
                    key={game.id} 
                    onClick={() => setSelectedGame(game)}
                    className="relative bg-vgb-card rounded-xl border border-zinc-800 hover:border-vgb-accent/50 hover:shadow-lg transition-all duration-300 group flex flex-col justify-between cursor-pointer transform hover:-translate-y-1 h-full overflow-hidden"
                 >
                    {/* Heart Button */}
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            handleToggleFavorite(game.id);
                        }}
                        className={`absolute top-2 right-2 z-10 transition-transform active:scale-95 hover:scale-110 p-2 rounded-full backdrop-blur-sm bg-black/40 ${favorites.includes(game.id!) ? 'text-red-500' : 'text-zinc-400 hover:text-red-400'} ${!user ? 'opacity-50' : ''}`}
                        title={user ? (favorites.includes(game.id!) ? "Remove from favorites" : "Add to favorites") : "Log in to favorite"}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill={favorites.includes(game.id!) ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                    </button>

                    {/* Image Header */}
                    <div className="h-32 w-full relative bg-zinc-800">
                        {game.imageUrl ? (
                             <img src={game.imageUrl} alt={game.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-zinc-700">
                                {game.title.charAt(0)}
                            </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-vgb-card via-transparent to-transparent"></div>
                    </div>

                    <div className="p-4 pt-2 flex-1 flex flex-col justify-between">
                        <div>
                            <h3 className="font-bold text-white group-hover:text-vgb-accent truncate text-sm mb-1">{game.title}</h3>
                            <div className="flex gap-2 mb-2 items-center">
                                <span className="text-[10px] text-gray-500 uppercase tracking-wide bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">{game.genre || 'Unknown'}</span>
                                {game.avgRating > 0 && (
                                    <div className="flex items-center gap-1 bg-zinc-900 px-1.5 py-0.5 rounded text-[10px] border border-zinc-800">
                                    <span className="text-yellow-400">★</span>
                                    <span className="font-bold text-white">{game.avgRating.toFixed(1)}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        <div className="mt-2 pt-2 border-t border-zinc-800/50 flex flex-wrap gap-1 items-center justify-between">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                (game.status || '').toLowerCase() === 'released' ? 'text-green-400' : 'text-yellow-400'
                            }`}>
                                {game.status}
                            </span>
                            <span className="text-[9px] text-gray-500">{game.releaseDate}</span>
                        </div>
                    </div>
                 </div>
               ))}
            </div>
          )}
        </div>
      </div>

      <GameDetailModal 
        game={selectedGame} 
        isOpen={!!selectedGame} 
        onClose={() => setSelectedGame(null)} 
        isFavorite={selectedGame ? favorites.includes(selectedGame.id!) : false}
        onToggleFavorite={() => selectedGame && handleToggleFavorite(selectedGame.id)}
      />
    </div>
  );
};

export default Search;