import React, { useEffect, useState } from 'react';
import { fetchGames } from '../services/dataService';
import { Game } from '../types';

const Calendar: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [games, setGames] = useState<Game[]>([]);
  const [selectedDayGames, setSelectedDayGames] = useState<Game[] | null>(null);
  const [selectedDateStr, setSelectedDateStr] = useState<string>('');

  useEffect(() => {
    fetchGames().then(setGames);
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (y: number, m: number) => new Date(y, m, 1).getDay();

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const today = new Date();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleDayClick = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const releases = games.filter(g => g.releaseDate === dateStr);
    if (releases.length > 0) {
      setSelectedDayGames(releases);
      setSelectedDateStr(dateStr);
    } else {
      setSelectedDayGames(null);
    }
  };

  const renderCalendarGrid = () => {
    const days = [];
    // Empty cells for padding
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="bg-zinc-900/30 min-h-[120px] lg:min-h-[160px] border border-zinc-800/50 rounded-sm"></div>);
    }

    // Actual days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const releases = games.filter(g => g.releaseDate === dateStr);
      const hasRelease = releases.length > 0;
      const isToday = d === today.getDate() && month === today.getMonth() && year === today.getFullYear();

      days.push(
        <div 
          key={d} 
          onClick={() => handleDayClick(d)}
          className={`
            relative p-2 min-h-[120px] lg:min-h-[160px] border border-zinc-800 bg-vgb-card rounded-sm cursor-pointer transition-colors group
            ${isToday ? 'bg-zinc-800 ring-1 ring-vgb-accent' : 'hover:bg-zinc-800'}
            ${hasRelease ? 'hover:border-vgb-accent/50' : ''}
          `}
        >
          <div className="flex justify-between items-start">
             <span className={`text-sm font-bold ${isToday ? 'text-vgb-accent' : 'text-gray-400 group-hover:text-white'}`}>{d}</span>
             {hasRelease && (
                <span className="text-[10px] bg-vgb-accent text-black font-bold px-1.5 rounded">{releases.length}</span>
             )}
          </div>
          
          {hasRelease && (
            <div className="mt-2 space-y-1">
                {releases.slice(0, 2).map(g => (
                    <div key={g.id} className="text-[10px] text-gray-300 truncate bg-zinc-900/50 px-1 rounded border-l-2 border-vgb-accent">
                        {g.title}
                    </div>
                ))}
                {releases.length > 2 && (
                    <div className="text-[9px] text-gray-500 text-center">+{releases.length - 2} more</div>
                )}
            </div>
          )}
        </div>
      );
    }
    return days;
  };

  return (
    <div className="relative w-full">
      <div className="flex items-center justify-between mb-6 bg-vgb-card p-4 rounded-xl shadow-lg border border-zinc-800">
        <h2 className="text-2xl font-bold text-white">
          {currentDate.toLocaleString('default', { month: 'long' })} <span className="text-vgb-accent">{year}</span>
        </h2>
        <div className="flex gap-2">
          <button onClick={handlePrevMonth} className="p-2 bg-zinc-700 hover:bg-zinc-600 rounded text-white transition-colors">
            &#9664; Prev
          </button>
          <button onClick={handleNextMonth} className="p-2 bg-zinc-700 hover:bg-zinc-600 rounded text-white transition-colors">
            Next &#9654;
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2 mb-2 text-center text-gray-400 font-bold uppercase text-xs tracking-wider">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="py-2">{day}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {renderCalendarGrid()}
      </div>

      {/* Release Info Panel (Modal-like overlay) */}
      {selectedDayGames && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-vgb-card w-full max-w-md rounded-xl shadow-2xl border border-vgb-border overflow-hidden animate-fade-in">
            <div className="bg-zinc-800 px-6 py-4 flex justify-between items-center border-b border-zinc-700">
              <h3 className="text-lg font-bold text-white">Releases on {selectedDateStr}</h3>
              <button 
                onClick={() => setSelectedDayGames(null)}
                className="text-gray-400 hover:text-white text-xl"
              >
                &times;
              </button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4">
              {selectedDayGames.map(game => (
                <div key={game.id} className="bg-zinc-900/50 p-4 rounded-lg border border-zinc-800">
                  <h4 className="font-bold text-vgb-accent text-lg">{game.title}</h4>
                  <div className="text-sm text-gray-400 mt-2 space-y-1">
                    <p>Developer: <span className="text-gray-300">{game.developer}</span></p>
                    <p>Publisher: <span className="text-gray-300">{game.publisher}</span></p>
                    <p>Platforms: <span className="text-gray-300">{game.platforms?.join(', ')}</span></p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Calendar;