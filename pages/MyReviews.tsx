import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchReviews, deleteReview, fetchGames } from '../services/dataService';
import { Review, Game } from '../types';

const MyReviews: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, avgRating: 0, highest: 0 });

  useEffect(() => {
    // Redirect if not logged in
    if (!authLoading && !user) {
      navigate('/');
      return;
    }

    const loadData = async () => {
      if (!user) return;
      setLoading(true);
      try {
        // Fetch all data
        const [allReviews] = await Promise.all([fetchReviews()]);
        
        // Filter for current user
        const userReviews = allReviews.filter(r => r.userId === user.uid);
        
        // Sort by newest
        userReviews.sort((a, b) => b.timestamp - a.timestamp);
        setReviews(userReviews);

        // Calculate Stats
        if (userReviews.length > 0) {
            const total = userReviews.length;
            const sum = userReviews.reduce((acc, r) => acc + r.rating, 0);
            const highest = Math.max(...userReviews.map(r => r.rating));
            setStats({
                total,
                avgRating: sum / total,
                highest
            });
        }
      } catch (error) {
        console.error("Error loading reviews:", error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
        loadData();
    }
  }, [user, authLoading, navigate]);

  const handleDelete = async (reviewId: string) => {
    if (!confirm("Are you sure you want to delete this review? This action cannot be undone.")) return;

    // Optimistic Update
    const updatedReviews = reviews.filter(r => r.id !== reviewId);
    setReviews(updatedReviews);
    
    // Recalculate stats immediately for better UX
    if (updatedReviews.length > 0) {
        const total = updatedReviews.length;
        const sum = updatedReviews.reduce((acc, r) => acc + r.rating, 0);
        const highest = Math.max(...updatedReviews.map(r => r.rating));
        setStats({ total, avgRating: sum / total, highest });
    } else {
        setStats({ total: 0, avgRating: 0, highest: 0 });
    }

    try {
        await deleteReview(reviewId);
    } catch (error) {
        console.error("Failed to delete review", error);
        // In a real app, we might revert state here or show a toast
    }
  };

  if (loading || authLoading) {
    return (
        <div className="w-full flex items-center justify-center h-64">
            <div className="text-gray-500 animate-pulse font-bold">Loading your reviews...</div>
        </div>
    );
  }

  if (!user) return null;

  return (
    <div className="space-y-8 animate-fade-in w-full pb-12">
        {/* Header Dashboard */}
        <div className="bg-vgb-card p-8 rounded-xl border-l-4 border-vgb-accent shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
                <h1 className="text-3xl font-bold text-white mb-2">My Reviews</h1>
                <p className="text-gray-400">Track and manage your contributions to the community.</p>
            </div>
            
            <div className="flex gap-4">
                <div className="bg-zinc-900 px-5 py-3 rounded-lg border border-zinc-800 text-center min-w-[100px]">
                    <span className="block text-2xl font-bold text-white">{stats.total}</span>
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider">Total</span>
                </div>
                <div className="bg-zinc-900 px-5 py-3 rounded-lg border border-zinc-800 text-center min-w-[100px]">
                    <span className="block text-2xl font-bold text-vgb-accent">{stats.avgRating.toFixed(1)}</span>
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider">Avg Score</span>
                </div>
            </div>
        </div>

        {reviews.length === 0 ? (
            <div className="text-center py-24 bg-vgb-card rounded-xl border border-zinc-800 border-dashed flex flex-col items-center">
                <div className="text-6xl mb-6 opacity-20 grayscale">📝</div>
                <h2 className="text-xl font-bold text-gray-400 mb-2">You haven't written any reviews</h2>
                <p className="text-gray-500 mb-6 max-w-md">Share your opinion on the games you've played and help others decide!</p>
                <button 
                    onClick={() => navigate('/reviews')}
                    className="bg-vgb-accent hover:bg-vgb-accentDark text-black font-bold py-3 px-8 rounded-full transition-transform hover:scale-105 shadow-lg shadow-vgb-accent/20"
                >
                    Write a Review
                </button>
            </div>
        ) : (
            <div className="grid grid-cols-1 gap-4">
                {reviews.map(review => (
                    <div key={review.id} className="bg-vgb-card p-6 rounded-xl border border-zinc-800 hover:border-zinc-600 transition-all group flex flex-col md:flex-row gap-6 relative overflow-hidden">
                        
                        {/* Rating Side (Visual) */}
                        <div className="flex-shrink-0 flex flex-col items-center justify-center md:w-32 bg-zinc-900/50 rounded-lg p-4 border border-zinc-800/50">
                            <span className="text-4xl font-bold text-vgb-accent">{review.rating}</span>
                            <div className="text-yellow-500 text-xs mt-1">
                                {"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}
                            </div>
                        </div>

                        {/* Content Side */}
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="text-xl font-bold text-white truncate">{review.gameTitle}</h3>
                                <span className="text-xs text-gray-500 font-mono whitespace-nowrap">
                                    {new Date(review.timestamp).toLocaleDateString()}
                                </span>
                            </div>
                            
                            <p className="text-gray-300 text-sm leading-relaxed mb-4">
                                {review.text}
                            </p>

                            <div className="flex items-center gap-4 pt-4 border-t border-zinc-800/50">
                                <button 
                                    onClick={() => navigate('/search')} // In a real app, this would go to game details
                                    className="text-xs text-vgb-accent hover:underline font-bold uppercase tracking-wide"
                                >
                                    View Game Page
                                </button>
                                
                                <div className="ml-auto flex gap-2">
                                    <button 
                                        onClick={() => handleDelete(review.id)}
                                        className="flex items-center gap-1 px-3 py-1.5 rounded bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-colors text-xs font-bold border border-red-500/20 hover:border-red-500"
                                    >
                                        <span>🗑 Delete</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        )}
    </div>
  );
};

export default MyReviews;