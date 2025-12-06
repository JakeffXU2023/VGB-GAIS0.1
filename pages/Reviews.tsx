import React, { useEffect, useState } from 'react';
import { fetchGames, fetchReviews, addReview, deleteReview, updateReview } from '../services/dataService';
import { Game, Review } from '../types';
import { useAuth } from '../context/AuthContext';

const Reviews: React.FC = () => {
  const { user } = useAuth();
  const [games, setGames] = useState<Game[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [selectedGameTitle, setSelectedGameTitle] = useState<string>('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest');
  
  // Form State
  const [reviewText, setReviewText] = useState('');
  const [rating, setRating] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const [g, r] = await Promise.all([fetchGames(), fetchReviews()]);
      setGames(g);
      setReviews(r);
    };
    init();
  }, []);

  const handleSubmit = async () => {
    if (!user) return alert("Please log in.");
    if (!selectedGameTitle || rating === 0 || !reviewText.trim()) return alert("Fill all fields.");

    try {
      if (editingId) {
        await updateReview(editingId, { text: reviewText, rating, timestamp: Date.now() });
        setReviews(prev => prev.map(r => r.id === editingId ? { ...r, text: reviewText, rating, timestamp: Date.now() } : r));
        setEditingId(null);
        alert("Review Updated!");
      } else {
        const game = games.find(g => g.title === selectedGameTitle);
        const newReview: Omit<Review, 'id'> = {
          gameId: game?.id || 'unknown',
          gameTitle: selectedGameTitle,
          userId: user.uid,
          username: user.username || 'Anonymous', // Ensure username is not null
          rating,
          text: reviewText,
          timestamp: Date.now()
        };
        const id = await addReview(newReview);
        setReviews(prev => [...prev, { ...newReview, id }]);
        alert("Review Submitted!");
      }
      setReviewText('');
      setRating(0);
    } catch (e) {
      console.error(e);
      alert("Error submitting review");
    }
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    
    // Find the review to check ownership
    const reviewToDelete = reviews.find(r => r.id === id);
    if (!reviewToDelete) return;

    const isOwner = reviewToDelete.userId === user.uid;
    const isAdmin = user.role === 'admin';

    if (!isOwner && !isAdmin) {
        alert("You do not have permission to delete this review.");
        return;
    }

    if (confirm("Delete this review?")) {
      // Optimistic UI Update: Remove it immediately from the screen
      setReviews(prev => prev.filter(r => r.id !== id));
      
      try {
        await deleteReview(id);
        // Success (or soft-delete success handled in service)
      } catch (error: any) {
        console.error("Delete operation encountered an error:", error);
        // Even if it errors, we leave it removed from UI because we want to hide it
      }
    }
  };

  const startEdit = (review: Review) => {
    setReviewText(review.text);
    setRating(review.rating);
    setSelectedGameTitle(review.gameTitle); // Switch to the game context of the review
    setEditingId(review.id);
    // Scroll to top or form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Filter & Sort
  const filteredReviews = reviews
    .filter(r => !selectedGameTitle || r.gameTitle === selectedGameTitle)
    .sort((a, b) => {
      if (sortBy === 'newest') return b.timestamp - a.timestamp;
      if (sortBy === 'oldest') return a.timestamp - b.timestamp;
      if (sortBy === 'highest') return b.rating - a.rating;
      if (sortBy === 'lowest') return a.rating - b.rating;
      return 0;
    });

  const selectedGameObj = games.find(g => g.title === selectedGameTitle);
  const avgRating = filteredReviews.length 
    ? (filteredReviews.reduce((acc, r) => acc + r.rating, 0) / filteredReviews.length).toFixed(1)
    : 'N/A';

  return (
    <div className="w-full space-y-8 animate-fade-in pb-12">
      
      <div className="flex flex-col xl:flex-row gap-8">
          {/* Left Column: Form and Stats (Takes 1/3 on huge screens) */}
          <div className="xl:w-1/3 space-y-6">
              {/* Controls */}
            <section className="bg-vgb-card p-6 rounded-xl border border-zinc-800 shadow-md">
                <h2 className="text-2xl font-bold text-white mb-4">Select Game</h2>
                <div className="grid grid-cols-1 gap-4">
                    <select 
                        className="bg-zinc-900 border border-zinc-700 text-white p-3 rounded-lg focus:ring-2 focus:ring-vgb-accent outline-none"
                        value={selectedGameTitle}
                        onChange={e => setSelectedGameTitle(e.target.value)}
                    >
                        <option value="">All Games</option>
                        {games.map(g => <option key={g.id} value={g.title}>{g.title}</option>)}
                    </select>

                    <select 
                        className="bg-zinc-900 border border-zinc-700 text-white p-3 rounded-lg focus:ring-2 focus:ring-vgb-accent outline-none"
                        value={sortBy}
                        onChange={e => setSortBy(e.target.value as any)}
                    >
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                        <option value="highest">Highest Rating</option>
                        <option value="lowest">Lowest Rating</option>
                    </select>
                </div>

                {selectedGameTitle && selectedGameObj && (
                    <div className="mt-6 bg-zinc-800/50 p-4 rounded-lg border border-zinc-700 flex flex-col justify-between items-center gap-4 text-center">
                        <div>
                            <h3 className="text-xl font-bold text-white">{selectedGameObj.title}</h3>
                            <p className="text-gray-400 text-sm">{selectedGameObj.developer}</p>
                        </div>
                        <div>
                            <div className="text-4xl font-bold text-vgb-accent">{avgRating}</div>
                            <div className="text-xs text-gray-500 uppercase tracking-wide">Average Rating</div>
                            <div className="text-xs text-gray-400 mt-1">{filteredReviews.length} reviews</div>
                        </div>
                    </div>
                )}
            </section>

            {/* Review Form */}
            <section className="bg-vgb-card p-6 rounded-xl border border-zinc-800 shadow-md relative overflow-hidden">
                {/* Lock overlay if not logged in */}
                {!user && (
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center text-center p-4">
                        <p className="text-white font-bold text-lg mb-2">Login to write a review</p>
                        <span className="text-gray-400 text-sm">Join the discussion with the community!</span>
                    </div>
                )}

                <h3 className="text-lg font-bold text-white mb-4">{editingId ? 'Edit Your Review' : 'Write a Review'}</h3>
                
                <div className="flex gap-2 mb-4">
                    {[1, 2, 3, 4, 5].map(star => (
                    <button
                        key={star}
                        onClick={() => setRating(star)}
                        className={`text-2xl transition-transform hover:scale-110 ${star <= rating ? 'text-yellow-400' : 'text-zinc-600'}`}
                    >
                        ★
                    </button>
                    ))}
                </div>

                <textarea
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-white focus:ring-1 focus:ring-vgb-accent outline-none mb-4 min-h-[100px]"
                    placeholder="Share your thoughts..."
                    value={reviewText}
                    onChange={e => setReviewText(e.target.value)}
                />

                <div className="flex justify-end gap-3">
                    {editingId && (
                        <button 
                            onClick={() => { setEditingId(null); setReviewText(''); setRating(0); }}
                            className="px-4 py-2 text-sm text-gray-400 hover:text-white"
                        >
                            Cancel
                        </button>
                    )}
                    <button
                        onClick={handleSubmit}
                        disabled={!selectedGameTitle || rating === 0 || !reviewText.trim()}
                        className="bg-vgb-accent hover:bg-vgb-accentDark text-black font-bold py-2 px-6 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {editingId ? 'Update Review' : 'Submit Review'}
                    </button>
                </div>
            </section>
          </div>

          {/* Right Column: Review List (Takes 2/3 on huge screens) */}
          <div className="xl:w-2/3">
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filteredReviews.length === 0 ? (
                    <div className="col-span-full text-center py-12 text-gray-500 bg-vgb-card rounded-xl border border-zinc-800 border-dashed">
                        <p>No reviews found for this selection.</p>
                    </div>
                ) : (
                    filteredReviews.map(r => (
                    <div key={r.id} className="bg-vgb-card p-5 rounded-xl border border-zinc-800 hover:border-zinc-700 transition-colors flex flex-col justify-between h-full">
                        <div>
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-zinc-700 rounded-full flex items-center justify-center text-xs font-bold text-gray-300">
                                        {(r.username || "AN").substring(0,2).toUpperCase()}
                                    </div>
                                    <div>
                                        <span className="block text-sm font-bold text-vgb-accent">{r.username || "Anonymous"}</span>
                                        <span className="block text-xs text-gray-500">{new Date(r.timestamp).toLocaleDateString()}</span>
                                    </div>
                                </div>
                                <div className="text-yellow-400 tracking-widest text-sm shrink-0">
                                    {"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}
                                </div>
                            </div>
                            
                            {/* If viewing "All Games", show the game title context */}
                            {!selectedGameTitle && (
                                <div className="mb-2 text-xs font-bold text-gray-500 uppercase tracking-wide bg-zinc-900 inline-block px-2 py-1 rounded">
                                    {r.gameTitle}
                                </div>
                            )}

                            <p className="text-gray-300 text-sm leading-relaxed mt-2">{r.text}</p>
                        </div>

                        {/* Actions for owner or admin - Explicit check for 'user' to prevent guests from seeing buttons */}
                        {user && (user.role === 'admin' || user.uid === r.userId) && (
                        <div className="mt-4 flex gap-2 justify-end border-t border-zinc-800 pt-2">
                            {user.uid === r.userId && (
                                <button 
                                    onClick={() => startEdit(r)}
                                    className="text-xs text-blue-400 hover:text-blue-300 font-bold px-2 py-1"
                                >
                                    EDIT
                                </button>
                            )}
                            <button 
                                onClick={() => handleDelete(r.id)}
                                className="text-xs text-red-500 hover:text-red-400 font-bold px-2 py-1"
                            >
                                {user.role === 'admin' && user.uid !== r.userId ? 'DELETE (ADMIN)' : 'DELETE'}
                            </button>
                        </div>
                        )}
                    </div>
                    ))
                )}
            </div>
          </div>
      </div>
    </div>
  );
};

export default Reviews;