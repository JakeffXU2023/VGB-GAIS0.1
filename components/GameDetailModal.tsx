import React from 'react';
import { Game } from '../types';

interface GameWithRating extends Game {
    avgRating?: number;
    reviewCount?: number;
}

interface GameDetailModalProps {
  game: GameWithRating | null;
  isOpen: boolean;
  onClose: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}

const GameDetailModal: React.FC<GameDetailModalProps> = ({ game, isOpen, onClose, isFavorite, onToggleFavorite }) => {
  if (!isOpen || !game) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}>
      <div 
        className="bg-vgb-card w-full max-w-2xl rounded-2xl shadow-2xl border border-vgb-border overflow-hidden relative" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Background */}
        <div className="h-48 relative">
             {game.imageUrl ? (
                 <img src={game.imageUrl} alt={game.title} className="w-full h-full object-cover" />
             ) : (
                <div className="w-full h-full bg-gradient-to-r from-zinc-800 to-vgb-card flex items-center justify-center">
                    <span className="text-8xl text-white/5 font-black">{game.title.charAt(0)}</span>
                </div>
             )}
             <div className="absolute inset-0 bg-gradient-to-t from-vgb-card to-transparent opacity-90"></div>
             
             <button 
                onClick={onClose}
                className="absolute top-4 right-4 bg-black/50 hover:bg-black/80 text-white rounded-full p-2 transition-colors z-10"
             >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
             </button>
        </div>

        <div className="px-8 pb-8 -mt-16 relative z-10">
            <div className="flex flex-col md:flex-row gap-6">
                
                {/* Game "Cover" Placeholder */}
                <div className="w-32 h-48 md:w-48 md:h-64 bg-zinc-900 rounded-lg shadow-xl border border-zinc-700 shrink-0 flex items-center justify-center overflow-hidden">
                    {game.imageUrl ? (
                         <img src={game.imageUrl} alt={game.title} className="w-full h-full object-cover" />
                    ) : (
                        <span className="text-zinc-700 font-bold text-4xl">{game.title.charAt(0)}</span>
                    )}
                </div>

                <div className="flex-1 pt-4 md:pt-14 space-y-4">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-2xl md:text-3xl font-bold text-white leading-tight drop-shadow-md">{game.title}</h2>
                            <p className="text-vgb-accent font-bold text-sm mt-1 uppercase tracking-wide">{game.developer}</p>
                        </div>
                        
                        <button 
                            onClick={onToggleFavorite}
                            className={`p-2 rounded-full border transition-all duration-300 ${
                                isFavorite 
                                    ? 'bg-red-500/10 border-red-500 text-red-500 hover:bg-red-500/20' 
                                    : 'bg-zinc-800 border-zinc-600 text-gray-400 hover:border-gray-400 hover:text-white'
                            }`}
                            title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
                        >
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill={isFavorite ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                        </button>
                    </div>

                    {/* Stats Row */}
                    <div className="flex flex-wrap gap-4 text-sm text-gray-300 bg-zinc-900/50 p-3 rounded-lg border border-zinc-800">
                        <div className="flex flex-col">
                            <span className="text-xs text-gray-500 uppercase">Status</span>
                            <span className={`font-bold ${game.status === 'Released' ? 'text-green-400' : 'text-yellow-400'}`}>{game.status}</span>
                        </div>
                        <div className="w-px bg-zinc-700"></div>
                        <div className="flex flex-col">
                            <span className="text-xs text-gray-500 uppercase">Release Date</span>
                            <span className="font-bold text-white">{game.releaseDate}</span>
                        </div>
                        <div className="w-px bg-zinc-700"></div>
                        <div className="flex flex-col">
                            <span className="text-xs text-gray-500 uppercase">Genre</span>
                            <span className="font-bold text-white">{game.genre}</span>
                        </div>
                        {(game.avgRating || 0) > 0 && (
                            <>
                            <div className="w-px bg-zinc-700"></div>
                            <div className="flex flex-col">
                                <span className="text-xs text-gray-500 uppercase">User Rating</span>
                                <span className="font-bold text-yellow-400">★ {game.avgRating?.toFixed(1)}</span>
                            </div>
                            </>
                        )}
                    </div>

                    {/* Platforms */}
                    <div className="flex flex-wrap gap-2">
                        {game.platforms?.map(p => (
                            <span key={p} className="px-2 py-1 bg-zinc-800 rounded text-xs text-gray-300 border border-zinc-700">{p}</span>
                        ))}
                    </div>

                    {/* Description */}
                    <div className="mt-4">
                        <h4 className="text-sm font-bold text-gray-400 uppercase mb-2">About</h4>
                        <p className="text-gray-300 text-sm leading-relaxed">
                            {game.description || "No description available for this title yet."}
                        </p>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default GameDetailModal;