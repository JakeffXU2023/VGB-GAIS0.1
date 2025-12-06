import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchGames, fetchReviews, fetchNews } from '../services/dataService';
import { Game, Review, NewsItem } from '../types';
import { useAuth } from '../context/AuthContext';

// Helper type for display
interface GameWithRating extends Game {
  avgRating?: number;
  reviewCount?: number;
}

const Home: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [featuredGames, setFeaturedGames] = useState<GameWithRating[]>([]);
  const [anticipatedGames, setAnticipatedGames] = useState<GameWithRating[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'featured' | 'anticipated'>('featured');
  const [email, setEmail] = useState('');

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [gamesData, reviewsData, newsData] = await Promise.all([
          fetchGames(), 
          fetchReviews(),
          fetchNews()
        ]);
        
        setNews(newsData);

        // 1. Process Featured (Use more games to fill wider screens)
        setFeaturedGames(gamesData.slice(0, 8));

        // 2. Process Anticipated (Based on Ratings)
        // Create a map of Title -> Ratings[]
        const ratingsMap: Record<string, number[]> = {};
        reviewsData.forEach((r: Review) => {
          if (!ratingsMap[r.gameTitle]) {
            ratingsMap[r.gameTitle] = [];
          }
          ratingsMap[r.gameTitle].push(r.rating);
        });

        // Calculate averages and attach to games
        const gamesWithScores: GameWithRating[] = gamesData.map(game => {
          const ratings = ratingsMap[game.title] || [];
          const total = ratings.reduce((acc, curr) => acc + curr, 0);
          const avg = ratings.length > 0 ? total / ratings.length : 0;
          return {
            ...game,
            avgRating: avg,
            reviewCount: ratings.length
          };
        });

        // Sort by Average Rating Descending, then by Review Count
        const sortedByRating = gamesWithScores
          .filter(g => (g.reviewCount || 0) > 0) // Only show games that actually have reviews/hype
          .sort((a, b) => {
            if ((b.avgRating || 0) !== (a.avgRating || 0)) {
              return (b.avgRating || 0) - (a.avgRating || 0);
            }
            return (b.reviewCount || 0) - (a.reviewCount || 0);
          });

        // If no games have reviews yet, fallback to showing all games sorted by ID or another metric
        const finalAnticipated = sortedByRating.length > 0 ? sortedByRating : gamesWithScores.slice(0, 8);

        setAnticipatedGames(finalAnticipated.slice(0, 8));

      } catch (error) {
        console.error("Failed to load home data", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      alert(`Thanks for subscribing! News will be sent to ${email}`);
      setEmail('');
    }
  };

  const displayGames = activeTab === 'featured' ? featuredGames : anticipatedGames;

  // Helper to format twitter-style numbers
  const formatMetric = (num?: number) => {
    if (!num) return '0';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toString();
  };

  return (
    <div className="space-y-8 animate-fade-in w-full pb-8">
      {/* Welcome Banner */}
      <section className="relative bg-gradient-to-br from-blue-950 via-zinc-900 to-black rounded-2xl border border-zinc-800 shadow-2xl overflow-hidden group">
        {/* Dynamic Background Glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-vgb-accent/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none mix-blend-screen opacity-50"></div>
        <div className="absolute inset-0 opacity-10 pattern-grid-lg pointer-events-none"></div>
        
        <div className="relative z-10 p-8 md:p-12 flex flex-col items-start">
            
            {/* Tagline Badge (Eyebrow) */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-6 hover:bg-white/10 transition-colors cursor-default shadow-lg">
                <span className="w-1.5 h-1.5 rounded-full bg-vgb-accent animate-pulse"></span>
                <span className="text-[10px] md:text-xs font-bold tracking-[0.2em] text-gray-300 uppercase font-mono">
                    Your ultimate source for everything gaming
                </span>
            </div>

            <h1 className="text-4xl md:text-6xl font-black text-white mb-6 tracking-tight leading-none drop-shadow-lg">
                {user ? `Welcome back, ${user.username}!` : 'VIDEO GAME BULLETIN'}
            </h1>
            
            <div className="border-l-4 border-vgb-accent pl-6 max-w-3xl">
                <p className="text-gray-300 text-lg md:text-xl leading-relaxed">
                {user?.role === 'admin' 
                    ? 'Manage content, users, and reviews from your dashboard.' 
                    : 'Your one-stop destination for the latest gaming news, release dates, and community reviews.'}
                </p>
            </div>
        </div>
      </section>

      {/* Admin Shortcut */}
      {user?.role === 'admin' && (
        <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4 flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-vgb-accent/10 rounded-lg text-vgb-accent">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                </div>
                <div>
                    <h3 className="text-white font-bold">Admin Dashboard</h3>
                    <p className="text-sm text-gray-400">You have admin access. Manage the game database directly.</p>
                </div>
            </div>
            <button 
                onClick={() => navigate('/admin/games')} 
                className="bg-vgb-accent hover:bg-white text-black px-6 py-2 rounded-lg font-bold transition-colors shadow-lg shadow-vgb-accent/10"
            >
                Manage Games
            </button>
        </div>
      )}

      {/* Main Grid Layout: Scales to 4 columns on XL screens for games, 1 col for news */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
        
        {/* Main Content Area (Games) - Takes 3 columns on large screens */}
        <div className="xl:col-span-3 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex bg-zinc-900 p-1 rounded-lg">
                <button 
                  onClick={() => setActiveTab('featured')}
                  className={`px-4 py-2 rounded-md text-sm font-bold transition-all duration-300 ${
                    activeTab === 'featured' 
                      ? 'bg-vgb-accent text-black shadow-lg scale-105' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  FEATURED
                </button>
                <button 
                  onClick={() => setActiveTab('anticipated')}
                  className={`px-4 py-2 rounded-md text-sm font-bold transition-all duration-300 ${
                    activeTab === 'anticipated' 
                      ? 'bg-vgb-accent text-black shadow-lg scale-105' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  MOST ANTICIPATED
                </button>
              </div>
              
              <span className="text-xs text-vgb-accent font-bold uppercase tracking-wider hidden sm:block">
                {activeTab === 'featured' ? 'Editors Picks' : 'Community Rated'}
              </span>
          </div>

          {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
                  {[1,2,3,4].map(i => (
                      <div key={i} className="h-48 bg-zinc-800 rounded-xl animate-pulse"></div>
                  ))}
              </div>
          ) : (
              // Inner Grid: Scales from 1 to 4 columns based on screen width
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6 animate-fade-in">
              {displayGames.map((game) => (
                  <div key={game.id} className="group bg-vgb-card rounded-xl border border-zinc-800 hover:border-vgb-accent/50 hover:shadow-lg hover:shadow-vgb-accent/10 transition-all duration-300 transform hover:-translate-y-1 flex flex-col justify-between h-full overflow-hidden">
                    
                    {/* Image Header */}
                    <div className="h-40 w-full relative bg-zinc-800">
                        {game.imageUrl ? (
                             <img src={game.imageUrl} alt={game.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-zinc-700">
                                {game.title.charAt(0)}
                            </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-vgb-card via-transparent to-transparent"></div>
                        
                        <div className="absolute top-2 right-2">
                             <span className={`text-[10px] px-2 py-1 rounded font-bold uppercase shrink-0 ${
                                game.status === 'Released' ? 'bg-green-900 text-green-300' : 'bg-yellow-900 text-yellow-300'
                            }`}>
                            {game.status || 'TBA'}
                            </span>
                        </div>
                    </div>

                    <div className="p-5 pt-2 flex-1 flex flex-col justify-between">
                        <div>
                            <h3 className="text-xl font-bold text-white group-hover:text-vgb-accent transition-colors truncate mb-1" title={game.title}>
                                {game.title}
                            </h3>
                            
                            <div className="space-y-1 text-sm text-gray-400">
                                <p><span className="text-gray-500">Dev:</span> {game.developer || 'Unknown'}</p>
                                <p><span className="text-gray-500">Release:</span> {game.releaseDate}</p>
                                <div className="flex flex-wrap gap-2 mt-2">
                                {game.platforms?.map(p => (
                                    <span key={p} className="px-2 py-0.5 bg-zinc-700 rounded text-xs text-gray-300">{p}</span>
                                ))}
                                </div>
                            </div>
                        </div>

                        {/* Rating Section */}
                        {activeTab === 'anticipated' && (
                        <div className="mt-4 pt-4 border-t border-zinc-800 flex items-center justify-between">
                            <div className="flex items-center gap-1">
                            <span className="text-yellow-400 text-lg">★</span>
                            <span className="font-bold text-white text-lg">{(game.avgRating || 0).toFixed(1)}</span>
                            </div>
                            <span className="text-xs text-gray-500">
                            {game.reviewCount} Reviews
                            </span>
                        </div>
                        )}
                    </div>
                  </div>
              ))}
              </div>
          )}
        </div>

        {/* Sidebar (Right Column) - News & Newsletter - Takes 1 column on large screens */}
        <div className="xl:col-span-1 space-y-6">
          
          {/* News Feed */}
          <div className="bg-vgb-card rounded-xl border border-zinc-800 overflow-hidden flex flex-col h-[500px]">
             <div className="bg-zinc-900 px-4 py-3 border-b border-zinc-800 flex justify-between items-center">
                <h2 className="font-bold text-white flex items-center gap-2">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                  LATEST NEWS
                </h2>
                <span className="text-xs text-gray-500">Live Feed</span>
             </div>
             
             <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
                {loading ? (
                  <p className="text-gray-500 text-center text-sm">Loading feed...</p>
                ) : (
                  news.map(item => (
                    <div key={item.id} className="border-b border-zinc-800/50 pb-4 last:border-0 last:pb-0">
                       <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center font-bold text-xs text-gray-300 shrink-0">
                             {item.avatar}
                          </div>
                          <div>
                             <div className="flex items-center gap-1 flex-wrap">
                                <span className="font-bold text-sm text-white hover:underline cursor-pointer">{item.author}</span>
                                <span className="text-xs text-gray-500">{item.handle}</span>
                                <span className="text-xs text-gray-600">· {new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                             </div>
                             <p className="text-sm text-gray-300 mt-1 leading-snug">
                                {item.content}
                             </p>
                             <div className="flex gap-4 mt-2 text-xs text-gray-500">
                                <span className="flex items-center gap-1 hover:text-green-400 cursor-pointer">
                                  <span>↺</span> {formatMetric(item.retweets)}
                                </span>
                                <span className="flex items-center gap-1 hover:text-red-400 cursor-pointer">
                                  <span>♥</span> {formatMetric(item.likes)}
                                </span>
                             </div>
                          </div>
                       </div>
                    </div>
                  ))
                )}
             </div>
          </div>

          {/* Newsletter Box */}
          <div className="bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-xl p-5 border border-zinc-700 shadow-lg">
            <h3 className="text-xl font-bold text-white mb-2">The VGB Newsletter</h3>
            <p className="text-sm text-gray-400 mb-4">Get the latest game releases and exclusive reviews delivered straight to your inbox.</p>
            <form onSubmit={handleSubscribe} className="space-y-3">
              <input 
                type="email" 
                placeholder="your@email.com" 
                className="w-full bg-black/30 border border-zinc-600 rounded px-3 py-2 text-white text-sm focus:border-vgb-accent focus:outline-none"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <button className="w-full bg-vgb-accent hover:bg-vgb-accentDark text-black font-bold py-2 rounded text-sm transition-colors uppercase tracking-wide">
                Subscribe
              </button>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Home;