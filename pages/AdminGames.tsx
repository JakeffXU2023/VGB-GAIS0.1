import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchGames, addGame, deleteGame } from '../services/dataService';
import { Game } from '../types';

const AdminGames: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [dbGames, setDbGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'manage' | 'import'>('manage');

  // API Source Selector
  const [apiSource, setApiSource] = useState<'igdb' | 'custom'>('igdb');

  // IGDB Auth State
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');

  // Custom API State
  const [customUrl, setCustomUrl] = useState('');
  const [customKey, setCustomKey] = useState('');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [importResults, setImportResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [bulkImporting, setBulkImporting] = useState(false);
  
  // Staging State (Game being edited before add)
  const [stagedGame, setStagedGame] = useState<Game | null>(null);

  useEffect(() => {
    // Strict redirect: If not admin, go home. 
    // This relies on AuthContext accurately detecting 'admin' from Firestore.
    if (user && user.role !== 'admin') {
        navigate('/');
        return;
    }
    loadDbGames();
  }, [user, navigate]);

  // Load keys from storage on mount
  useEffect(() => {
    const storedId = localStorage.getItem('vgb_twitch_client_id');
    const storedSecret = localStorage.getItem('vgb_twitch_client_secret');
    if (storedId) setClientId(storedId);
    if (storedSecret) setClientSecret(storedSecret);
  }, []);

  // Save keys when they change
  useEffect(() => {
    if (clientId) localStorage.setItem('vgb_twitch_client_id', clientId);
  }, [clientId]);

  useEffect(() => {
    if (clientSecret) localStorage.setItem('vgb_twitch_client_secret', clientSecret);
  }, [clientSecret]);

  const loadDbGames = async () => {
      setLoading(true);
      try {
          const games = await fetchGames();
          setDbGames(games);
      } catch (e) {
          console.error(e);
      } finally {
          setLoading(false);
      }
  };

  const handleSearch = async (e: React.FormEvent) => {
      e.preventDefault();
      setSearching(true);
      setImportResults([]);

      try {
          if (apiSource === 'igdb') {
              // --- IGDB SEARCH ---
              if (!clientId || !clientSecret) {
                  alert("Please enter both Client ID and Client Secret.");
                  setSearching(false);
                  return;
              }
              const res = await fetch(`http://localhost:3001/igdb/search`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                      clientId,
                      clientSecret,
                      query: searchTerm
                  })
              });
              
              const data = await res.json();
              if (res.ok) {
                setImportResults(data || []);
              } else {
                alert("Search failed: " + (data.error || "Unknown error"));
              }

          } else {
              // --- CUSTOM / LEGACY API SEARCH ---
              if (!customUrl) {
                  alert("Please enter a valid API Endpoint URL.");
                  setSearching(false);
                  return;
              }

              // Construct URL: Append query param. 
              // Assumes pattern: https://api.yoursite.com/games?search=TERM or ?q=TERM
              const url = new URL(customUrl);
              url.searchParams.append('search', searchTerm);
              if (customKey) {
                  url.searchParams.append('key', customKey);
              }

              const res = await fetch(url.toString());
              if (!res.ok) throw new Error(`Custom API returned ${res.status}`);
              
              const data = await res.json();
              
              // Handle common wrapper properties like { results: [...] } or { data: [...] }
              const results = Array.isArray(data) ? data : (data.results || data.data || []);
              setImportResults(results);
          }
      } catch (error: any) {
          console.error("Search Error", error);
          alert("Search failed: " + error.message);
      } finally {
          setSearching(false);
      }
  };

  const mapIgdbToGame = (igdbGame: any): Game => {
      let dateStr = 'TBA';
      if (igdbGame.first_release_date) {
          const d = new Date(igdbGame.first_release_date * 1000);
          dateStr = d.toISOString().split('T')[0];
      }

      let imgUrl = '';
      if (igdbGame.cover && igdbGame.cover.image_id) {
          imgUrl = `https://images.igdb.com/igdb/image/upload/t_720p/${igdbGame.cover.image_id}.jpg`;
      }

      return {
          title: igdbGame.name,
          releaseDate: dateStr,
          developer: igdbGame.involved_companies?.[0]?.company?.name || 'Unknown',
          publisher: 'Unknown',
          status: dateStr === 'TBA' ? 'TBA' : (new Date(dateStr) > new Date() ? 'Upcoming' : 'Released'),
          platforms: igdbGame.platforms?.map((p: any) => p.name) || [],
          genre: igdbGame.genres?.[0]?.name || 'Action',
          description: igdbGame.summary || "Imported from IGDB.",
          imageUrl: imgUrl
      };
  };

  const mapCustomToGame = (data: any): Game => {
      // Generic mapper: tries to find standard fields (name/title, released/releaseDate, etc)
      const title = data.name || data.title || 'Unknown Title';
      const dateStr = data.released || data.release_date || data.first_release_date || 'TBA';
      const imgUrl = data.background_image || data.image || data.imageUrl || data.cover?.url || '';
      
      let platforms: string[] = [];
      // Attempt to parse platforms from common structures
      if (Array.isArray(data.platforms)) {
          platforms = data.platforms.map((p: any) => {
              if (typeof p === 'string') return p;
              return p.platform?.name || p.name || 'Unknown';
          });
      }

      return {
          title: title,
          releaseDate: dateStr,
          developer: data.developers?.[0]?.name || 'Unknown',
          publisher: data.publishers?.[0]?.name || 'Unknown',
          status: 'Released', // Default, user can edit
          platforms: platforms.length > 0 ? platforms : ['PC'],
          genre: data.genres?.[0]?.name || 'Action',
          description: data.description_raw || data.description || data.summary || "Imported from Custom API.",
          imageUrl: imgUrl
      };
  };

  const stageForImport = (rawGame: any) => {
      if (apiSource === 'igdb') {
          setStagedGame(mapIgdbToGame(rawGame));
      } else {
          setStagedGame(mapCustomToGame(rawGame));
      }
  };

  const handleBulkPopulate = async () => {
      if (apiSource !== 'igdb') {
          alert("Auto-populate is only available for IGDB.");
          return;
      }
      if (!clientId || !clientSecret) {
          alert("Please enter both Client ID and Client Secret first.");
          return;
      }
      
      if (!confirm("This will automatically fetch and add the top 20 trending games from IGDB. Continue?")) return;

      setBulkImporting(true);
      try {
          const res = await fetch(`http://localhost:3001/igdb/discover`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ clientId, clientSecret })
          });
          
          const igdbGames = await res.json();
          if (!res.ok) throw new Error(igdbGames.error || "Failed to fetch popular games");
          
          let addedCount = 0;
          for (const rawGame of igdbGames) {
             const gameObj = mapIgdbToGame(rawGame);
             const exists = dbGames.some(g => g.title === gameObj.title);
             if (!exists) {
                 await addGame(gameObj);
                 addedCount++;
             }
          }
          alert(`Successfully imported ${addedCount} new games!`);
          loadDbGames();
          setActiveTab('manage');

      } catch (error) {
          console.error("Bulk Import Error", error);
          alert("Failed to auto-populate. Check server logs.");
      } finally {
          setBulkImporting(false);
      }
  };

  const saveStagedGame = async () => {
      if (!stagedGame) return;
      
      const success = await addGame(stagedGame);
      if (success) {
          alert("Game imported successfully!");
          setStagedGame(null);
          loadDbGames();
          setActiveTab('manage');
      } else {
          alert("Failed to save game to database.");
      }
  };

  const handleDeleteDbGame = async (id: string) => {
      if (!confirm("Delete this game permanently?")) return;
      const success = await deleteGame(id);
      if (success) {
          setDbGames(prev => prev.filter(g => g.id !== id));
      } else {
          alert("Could not delete game.");
      }
  };

  if (!user || user.role !== 'admin') return null;

  return (
    <div className="space-y-6 animate-fade-in w-full pb-12">
        <div className="flex items-center gap-4 mb-2">
            <button onClick={() => navigate('/')} className="text-gray-400 hover:text-white flex items-center gap-1 text-sm font-bold">
                ← Back
            </button>
        </div>

        <div className="bg-vgb-card p-6 rounded-xl border-l-4 border-vgb-accent shadow-lg flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
                <h1 className="text-3xl font-bold text-white mb-1">Admin Game Manager</h1>
                <p className="text-gray-400">Manage database and import new titles.</p>
            </div>
            <div className="flex bg-zinc-900 rounded-lg p-1 gap-1">
                <button 
                    onClick={() => setActiveTab('manage')}
                    className={`px-4 py-2 rounded text-sm font-bold transition-colors ${activeTab === 'manage' ? 'bg-zinc-700 text-white' : 'text-gray-500 hover:text-white'}`}
                >
                    Database ({dbGames.length})
                </button>
                <button 
                    onClick={() => setActiveTab('import')}
                    className={`px-4 py-2 rounded text-sm font-bold transition-colors ${activeTab === 'import' ? 'bg-vgb-accent text-black' : 'text-gray-500 hover:text-white'}`}
                >
                    Import Games
                </button>
            </div>
        </div>

        {/* IMPORT TAB */}
        {activeTab === 'import' && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {/* Search & Config Column */}
                <div className="space-y-6">
                    
                    {/* Source Selector */}
                    <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800 flex items-center gap-4">
                        <span className="text-sm font-bold text-gray-400 uppercase">Import Source:</span>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => { setApiSource('igdb'); setImportResults([]); }}
                                className={`px-4 py-2 rounded text-xs font-bold transition-all ${apiSource === 'igdb' ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/50' : 'bg-zinc-800 text-gray-400 hover:text-white'}`}
                            >
                                IGDB (Twitch)
                            </button>
                            <button 
                                onClick={() => { setApiSource('custom'); setImportResults([]); }}
                                className={`px-4 py-2 rounded text-xs font-bold transition-all ${apiSource === 'custom' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'bg-zinc-800 text-gray-400 hover:text-white'}`}
                            >
                                My Custom API
                            </button>
                        </div>
                    </div>

                    {/* Configuration Box */}
                    <div className="bg-vgb-card p-6 rounded-xl border border-zinc-800 relative overflow-hidden">
                        <h2 className="text-xl font-bold text-white mb-4">1. Configuration</h2>
                        
                        {apiSource === 'igdb' ? (
                            <div className="space-y-4 animate-fade-in">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs text-gray-500 uppercase font-bold mb-1">Client ID</label>
                                        <input 
                                            type="text" 
                                            value={clientId}
                                            onChange={(e) => setClientId(e.target.value)}
                                            className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-white text-sm"
                                            placeholder="Twitch Dev Console ID"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-500 uppercase font-bold mb-1">Client Secret</label>
                                        <input 
                                            type="password" 
                                            value={clientSecret}
                                            onChange={(e) => setClientSecret(e.target.value)}
                                            className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-white text-sm"
                                            placeholder="Twitch Dev Console Secret"
                                        />
                                    </div>
                                </div>
                                <div className="flex items-center justify-between border-t border-zinc-800 pt-4">
                                    <a href="https://dev.twitch.tv/console" target="_blank" rel="noreferrer" className="text-xs text-vgb-accent underline">
                                        Get Keys Here
                                    </a>
                                    <button 
                                        onClick={handleBulkPopulate}
                                        disabled={bulkImporting || !clientId}
                                        className="bg-green-700 hover:bg-green-600 text-white font-bold px-4 py-2 rounded text-xs transition-colors shadow-lg shadow-green-900/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                    >
                                        {bulkImporting ? 'Importing...' : '⚡ Auto-Populate Trending'}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4 animate-fade-in">
                                <div className="p-3 bg-blue-900/20 border border-blue-900/50 rounded text-blue-200 text-xs mb-2">
                                    Enter your custom API endpoint. We will append <code>?search=QUERY</code> to fetch data.
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-500 uppercase font-bold mb-1">API Endpoint URL</label>
                                    <input 
                                        type="text" 
                                        value={customUrl}
                                        onChange={(e) => setCustomUrl(e.target.value)}
                                        className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-white text-sm font-mono"
                                        placeholder="https://api.rawg.io/api/games"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-500 uppercase font-bold mb-1">API Key (Optional)</label>
                                    <input 
                                        type="password" 
                                        value={customKey}
                                        onChange={(e) => setCustomKey(e.target.value)}
                                        className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-white text-sm"
                                        placeholder="Secret Key"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Search Box */}
                    <div className="bg-vgb-card p-6 rounded-xl border border-zinc-800">
                        <h2 className="text-xl font-bold text-white mb-4">2. Search</h2>
                        <form onSubmit={handleSearch} className="flex gap-2">
                            <input 
                                type="text" 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder={apiSource === 'igdb' ? "Search specifically..." : "Enter search query..."}
                                className="flex-1 bg-zinc-900 border border-zinc-700 rounded p-2 text-white"
                            />
                            <button type="submit" className={`font-bold px-6 rounded transition-colors text-white ${apiSource === 'igdb' ? 'bg-purple-600 hover:bg-purple-500' : 'bg-blue-600 hover:bg-blue-500'}`}>
                                {searching ? '...' : 'Search'}
                            </button>
                        </form>
                    </div>

                    {/* Results Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                        {importResults.length === 0 && !searching && (
                            <div className="col-span-full text-center py-8 text-gray-500 border border-dashed border-zinc-800 rounded-lg">
                                No results yet.
                            </div>
                        )}
                        {importResults.map((result: any, idx) => {
                            // Helper to get image URL safely based on source
                            let img = '';
                            if (apiSource === 'igdb' && result.cover) {
                                img = `https://images.igdb.com/igdb/image/upload/t_cover_big/${result.cover.image_id}.jpg`;
                            } else {
                                // Try common properties for custom APIs
                                img = result.background_image || result.image || result.imageUrl || '';
                            }

                            return (
                                <div key={result.id || idx} className="bg-vgb-card border border-zinc-800 rounded-lg overflow-hidden hover:border-vgb-accent/50 transition-colors flex flex-col group">
                                    <div className="h-32 bg-zinc-800 relative overflow-hidden">
                                        {img ? (
                                            <img 
                                                src={img} 
                                                alt={result.name} 
                                                className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" 
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-zinc-600 font-bold text-xs">No Image</div>
                                        )}
                                    </div>
                                    <div className="p-3 flex-1 flex flex-col justify-between">
                                        <div>
                                            <h3 className="font-bold text-white truncate text-sm" title={result.name || result.title}>
                                                {result.name || result.title || 'Unknown'}
                                            </h3>
                                            <p className="text-xs text-gray-500">
                                                {(result.first_release_date || result.released || result.release_date) ? String(result.first_release_date || result.released || result.release_date).substring(0,4) : 'TBA'}
                                            </p>
                                        </div>
                                        <button 
                                            onClick={() => stageForImport(result)}
                                            className="mt-3 w-full bg-zinc-700 hover:bg-vgb-accent hover:text-black text-white text-xs font-bold py-2 rounded transition-colors"
                                        >
                                            SELECT
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Staging/Edit Column */}
                <div>
                     <div className={`bg-vgb-card p-6 rounded-xl border-2 sticky top-6 ${stagedGame ? 'border-vgb-accent shadow-lg shadow-vgb-accent/10' : 'border-zinc-800 border-dashed opacity-50'}`}>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-white">3. Review & Save</h2>
                            {stagedGame && <span className="text-xs bg-vgb-accent text-black px-2 py-1 rounded font-bold">DRAFT</span>}
                        </div>
                        
                        {stagedGame ? (
                            <div className="space-y-4 animate-fade-in">
                                <div>
                                    <label className="block text-xs text-gray-500 uppercase font-bold mb-1">Title</label>
                                    <input 
                                        value={stagedGame.title} 
                                        onChange={(e) => setStagedGame({...stagedGame, title: e.target.value})}
                                        className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-white"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs text-gray-500 uppercase font-bold mb-1">Release Date</label>
                                        <input 
                                            value={stagedGame.releaseDate} 
                                            onChange={(e) => setStagedGame({...stagedGame, releaseDate: e.target.value})}
                                            className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-500 uppercase font-bold mb-1">Status</label>
                                        <select 
                                            value={stagedGame.status} 
                                            onChange={(e) => setStagedGame({...stagedGame, status: e.target.value})}
                                            className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-white"
                                        >
                                            <option value="Upcoming">Upcoming</option>
                                            <option value="Released">Released</option>
                                            <option value="TBA">TBA</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-500 uppercase font-bold mb-1">Image URL</label>
                                    <div className="flex gap-2">
                                        <input 
                                            value={stagedGame.imageUrl || ''} 
                                            onChange={(e) => setStagedGame({...stagedGame, imageUrl: e.target.value})}
                                            className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-white text-xs font-mono"
                                        />
                                        {stagedGame.imageUrl && <img src={stagedGame.imageUrl} alt="Preview" className="w-10 h-10 object-cover rounded border border-zinc-600" />}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-500 uppercase font-bold mb-1">Developer</label>
                                    <input 
                                        value={stagedGame.developer || ''} 
                                        onChange={(e) => setStagedGame({...stagedGame, developer: e.target.value})}
                                        className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-500 uppercase font-bold mb-1">Genre</label>
                                    <input 
                                        value={stagedGame.genre || ''} 
                                        onChange={(e) => setStagedGame({...stagedGame, genre: e.target.value})}
                                        className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-500 uppercase font-bold mb-1">Description</label>
                                    <textarea 
                                        value={stagedGame.description || ''} 
                                        onChange={(e) => setStagedGame({...stagedGame, description: e.target.value})}
                                        className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-white text-sm h-24"
                                    />
                                </div>
                                <div className="flex gap-3 pt-4 border-t border-zinc-800">
                                    <button onClick={() => setStagedGame(null)} className="flex-1 py-3 text-sm font-bold text-gray-400 hover:text-white bg-zinc-800 rounded transition-colors">CANCEL</button>
                                    <button onClick={saveStagedGame} className="flex-1 py-3 text-sm font-bold text-black bg-vgb-accent hover:bg-vgb-accentDark rounded shadow-lg transition-colors">CONFIRM IMPORT</button>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-12 flex flex-col items-center">
                                <div className="text-4xl opacity-20 mb-2">📋</div>
                                <p className="text-gray-400 text-sm">Select a game from the search results to edit it here before saving.</p>
                                <button 
                                    onClick={() => setStagedGame({ title: 'New Game', releaseDate: 'TBA', status: 'Upcoming', genre: 'Action', platforms: [], developer: '', description: '' })}
                                    className="mt-4 text-xs text-vgb-accent hover:underline"
                                >
                                    Or create from scratch
                                </button>
                            </div>
                        )}
                     </div>
                </div>
            </div>
        )}

        {/* MANAGE TAB */}
        {activeTab === 'manage' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
                {loading ? <div className="text-white">Loading...</div> : dbGames.map(game => (
                    <div key={game.id} className="bg-vgb-card border border-zinc-800 rounded-xl overflow-hidden group">
                        <div className="h-40 bg-zinc-800 relative">
                             {game.imageUrl ? (
                                 <img src={game.imageUrl} alt={game.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                             ) : (
                                <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-zinc-700">{game.title.charAt(0)}</div>
                             )}
                             <div className="absolute top-2 right-2">
                                <span className={`text-[10px] px-2 py-1 rounded font-bold uppercase ${game.status === 'Released' ? 'bg-green-900 text-green-300' : 'bg-yellow-900 text-yellow-300'}`}>
                                    {game.status}
                                </span>
                             </div>
                        </div>
                        <div className="p-4">
                            <h3 className="font-bold text-white text-lg truncate mb-1">{game.title}</h3>
                            <p className="text-xs text-gray-500 mb-4">{game.releaseDate} · {game.developer}</p>
                            
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => handleDeleteDbGame(game.id!)}
                                    className="flex-1 bg-red-900/30 hover:bg-red-900/50 text-red-500 text-xs font-bold py-2 rounded border border-red-900/50 transition-colors"
                                >
                                    DELETE
                                </button>
                                <button 
                                    onClick={() => {
                                        setStagedGame(game);
                                        setActiveTab('import');
                                    }} 
                                    className="flex-1 bg-zinc-700 hover:bg-zinc-600 text-white text-xs font-bold py-2 rounded transition-colors"
                                >
                                    EDIT
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        )}
    </div>
  );
};

export default AdminGames;