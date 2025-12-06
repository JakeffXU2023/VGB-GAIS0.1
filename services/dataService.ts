import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc, arrayUnion, arrayRemove, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { Game, Review, NewsItem } from "../types";

// Local Storage Helpers for Preview/Fallback Mode
const STORAGE_KEYS = {
    REVIEWS: 'vgb_local_reviews',
    DELETED_IDS: 'vgb_deleted_review_ids'
};

const getLocalList = <T>(key: string): T[] => {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : [];
    } catch { return []; }
};

const addToLocal = <T>(key: string, item: T) => {
    const list = getLocalList<T>(key);
    list.push(item);
    localStorage.setItem(key, JSON.stringify(list));
};

// Favorites System Helpers
export const getFavorites = async (userId: string = 'guest'): Promise<string[]> => {
    // 1. Strict Requirement: Guests have no favorites
    if (!userId || userId === 'guest') {
        return [];
    }

    // 2. Handle Demo Users via Local Storage
    if (userId.startsWith('demo-')) {
        const key = `vgb_favorites_${userId}`;
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : [];
    }

    // 3. Handle Authenticated Users via Firestore
    try {
        const userDocRef = doc(db, "users", userId);
        const userSnap = await getDoc(userDocRef);

        if (userSnap.exists()) {
            return userSnap.data().favorites || [];
        } else {
            return [];
        }
    } catch (error) {
        console.error("Error fetching favorites from Firestore:", error);
        return [];
    }
};

export const toggleFavorite = async (gameId: string, userId: string = 'guest'): Promise<boolean> => {
    // 1. Strict Requirement: Guests cannot favorite
    if (!userId || userId === 'guest') {
        return false;
    }

    // 2. Handle Demo Users via Local Storage
    if (userId.startsWith('demo-')) {
        const key = `vgb_favorites_${userId}`;
        const stored = localStorage.getItem(key);
        const favorites: string[] = stored ? JSON.parse(stored) : [];
        const index = favorites.indexOf(gameId);
        let isFav = false;
        
        if (index === -1) {
            favorites.push(gameId);
            isFav = true;
        } else {
            favorites.splice(index, 1);
            isFav = false;
        }
        
        localStorage.setItem(key, JSON.stringify(favorites));
        return isFav;
    }

    // 3. Handle Authenticated Users via Firestore
    try {
        const userDocRef = doc(db, "users", userId);
        const userSnap = await getDoc(userDocRef);

        // Ensure user document exists (it should, but safety first)
        if (!userSnap.exists()) {
            await setDoc(userDocRef, { favorites: [gameId] }, { merge: true });
            return true;
        }

        const currentFavorites = userSnap.data().favorites || [];
        const isCurrentlyFav = currentFavorites.includes(gameId);

        if (isCurrentlyFav) {
            await updateDoc(userDocRef, {
                favorites: arrayRemove(gameId)
            });
            return false;
        } else {
            await updateDoc(userDocRef, {
                favorites: arrayUnion(gameId)
            });
            return true;
        }
    } catch (error) {
        console.error("Error updating favorites in Firestore:", error);
        return false;
    }
};

// Helper to generate dynamic dates relative to today
const getRelativeDate = (daysOffset: number): string => {
    const d = new Date();
    d.setDate(d.getDate() + daysOffset);
    return d.toISOString().split('T')[0];
};

// Mock Data with Dynamic Dates so the App always looks "live"
const MOCK_GAMES: Game[] = [
  {
    id: '1',
    title: 'Cyberpunk 2077: Phantom Liberty',
    releaseDate: getRelativeDate(-10), // Released 10 days ago
    developer: 'CD Projekt Red',
    publisher: 'CD Projekt',
    status: 'Released',
    platforms: ['PC', 'PS5', 'Xbox Series X'],
    genre: 'RPG',
    description: 'Phantom Liberty is a new spy-thriller adventure for Cyberpunk 2077. Return as cyber-enhanced mercenary V and embark on a high-stakes mission of espionage and intrigue to save the NUS President.',
    imageUrl: 'https://media.rawg.io/media/games/59a/59a3ebcba3d08c51532c6ca877af2564.jpg'
  },
  {
    id: '2',
    title: 'Starfield',
    releaseDate: getRelativeDate(-45), // Released ~1.5 months ago
    developer: 'Bethesda Game Studios',
    publisher: 'Bethesda Softworks',
    status: 'Released',
    platforms: ['PC', 'Xbox Series X'],
    genre: 'RPG',
    description: 'Starfield is the first new universe in over 25 years from Bethesda Game Studios. Create any character you want and explore with unparalleled freedom.',
    imageUrl: 'https://media.rawg.io/media/games/54a/54a3e4c617217848dc43c4de9989fe37.jpg'
  },
  {
    id: '3',
    title: 'Hollow Knight: Silksong',
    releaseDate: getRelativeDate(14), // Coming in 2 weeks
    developer: 'Team Cherry',
    publisher: 'Team Cherry',
    status: 'Upcoming',
    platforms: ['PC', 'Switch', 'PS5', 'Xbox'],
    genre: 'Action',
    description: 'Discover a vast, haunted kingdom in Hollow Knight: Silksong! The sequel to the award winning action-adventure. Play as Hornet, princess-protector of Hallownest.',
    imageUrl: 'https://media.rawg.io/media/games/729/7290a365f5732152a5146c8230b06b00.jpg'
  },
  {
    id: '4',
    title: 'Elden Ring: Shadow of the Erdtree',
    releaseDate: getRelativeDate(-5), // Released 5 days ago
    developer: 'FromSoftware',
    publisher: 'Bandai Namco',
    status: 'Released',
    platforms: ['PC', 'PS5', 'Xbox'],
    genre: 'RPG',
    description: 'The Shadow of the Erdtree expansion features an all-new story set in the Land of Shadow, imbued with mystery, perilous dungeons, and new enemies.',
    imageUrl: 'https://media.rawg.io/media/games/b29/b294fdd866dcdb643e7bab370a552855.jpg'
  },
  {
    id: '5',
    title: 'Grand Theft Auto VI',
    releaseDate: getRelativeDate(365), // Next Year
    developer: 'Rockstar Games',
    publisher: 'Rockstar Games',
    status: 'Upcoming',
    platforms: ['PS5', 'Xbox Series X'],
    genre: 'Adventure',
    description: 'Grand Theft Auto VI heads to the state of Leonida, home to the neon-soaked streets of Vice City and beyond.',
    imageUrl: 'https://media.rawg.io/media/games/b21/b21555abc69d04d9b5d7da15fad3903f.jpg'
  },
  {
    id: '6',
    title: 'Forza Motorsport',
    releaseDate: getRelativeDate(-100),
    developer: 'Turn 10',
    publisher: 'Xbox Game Studios',
    status: 'Released',
    platforms: ['PC', 'Xbox Series X'],
    genre: 'Racing',
    description: 'Out-build the competition in the all-new career. Race your friends in the adjudicated multiplayer events.',
    imageUrl: 'https://media.rawg.io/media/games/082/082365507ff1d9263153572bf4250261.jpg'
  }
];

export const fetchGames = async (): Promise<Game[]> => {
  try {
    const controller = new AbortController();
    // Reduced timeout to 400ms. In preview/demo, we want to fail fast to mocks if the backend isn't there.
    const id = setTimeout(() => controller.abort(), 400); 
    
    // CHANGED: Port 3001 to match the new server configuration
    const response = await fetch("http://localhost:3001/games", { signal: controller.signal });
    clearTimeout(id);
    
    if (!response.ok) throw new Error("API not available");
    const data = await response.json();
    return data;
  } catch (error) {
    const todayStr = getRelativeDate(0);
    // Use a unique ID for the dynamic "Today" release to avoid key collisions
    const demoGame = { ...MOCK_GAMES[0], id: 'demo-today', releaseDate: todayStr, title: "Special Release Today", genre: 'Action' };
    return [demoGame, ...MOCK_GAMES];
  }
};

export const addGame = async (game: Game): Promise<Game | null> => {
    try {
        const response = await fetch("http://localhost:3001/add", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(game)
        });
        if (!response.ok) throw new Error("Failed to add game");
        const result = await response.json();
        return result.data;
    } catch (error) {
        console.error("Add game failed:", error);
        return null;
    }
};

export const deleteGame = async (gameId: string): Promise<boolean> => {
    try {
        const response = await fetch(`http://localhost:3001/delete/${gameId}`, {
            method: "DELETE"
        });
        return response.ok;
    } catch (error) {
        console.error("Delete game failed:", error);
        return false;
    }
};

export const fetchReviews = async (): Promise<Review[]> => {
  let reviews: Review[] = [];
  
  // 1. Try fetching from Firestore
  try {
    const querySnapshot = await getDocs(collection(db, "reviews"));
    querySnapshot.forEach((doc) => {
      reviews.push({ id: doc.id, ...doc.data() } as Review);
    });
  } catch (error) {
    console.warn("Firestore fetch failed (likely auth/permissions). Using local data.");
  }

  // 2. Fetch Local Reviews (Fallback/Demo mode)
  const localReviews = getLocalList<Review>(STORAGE_KEYS.REVIEWS);
  
  // 3. Merge
  const allReviews = [...reviews, ...localReviews];

  // 4. Filter out deleted IDs (Soft Delete)
  const deletedIds = getLocalList<string>(STORAGE_KEYS.DELETED_IDS).map(String);
  return allReviews.filter(r => !deletedIds.includes(String(r.id)));
};

export const addReview = async (review: Omit<Review, 'id'>) => {
  try {
    const docRef = await addDoc(collection(db, "reviews"), review);
    return docRef.id;
  } catch (error) {
    console.warn("Firestore write failed. Saving locally.");
    const fakeId = 'local_' + Date.now();
    const newReview = { ...review, id: fakeId };
    addToLocal(STORAGE_KEYS.REVIEWS, newReview);
    return fakeId;
  }
};

export const updateReview = async (id: string, updates: Partial<Review>) => {
  try {
    if (id.startsWith('local_')) {
        throw new Error("Local update");
    }
    const reviewRef = doc(db, "reviews", id);
    await updateDoc(reviewRef, updates);
  } catch (error) {
    // Update in local storage
    const list = getLocalList<Review>(STORAGE_KEYS.REVIEWS);
    const index = list.findIndex(r => r.id === id);
    if (index !== -1) {
        list[index] = { ...list[index], ...updates };
        localStorage.setItem(STORAGE_KEYS.REVIEWS, JSON.stringify(list));
    }
  }
};

export const deleteReview = async (id: string) => {
  // 1. Always mask it locally first so the UI updates instantly
  const deletedIds = getLocalList<string>(STORAGE_KEYS.DELETED_IDS);
  if (!deletedIds.includes(id)) {
      deletedIds.push(id);
      localStorage.setItem(STORAGE_KEYS.DELETED_IDS, JSON.stringify(deletedIds));
  }
  
  // 2. If it is a purely local review, remove it from local storage completely
  const list = getLocalList<Review>(STORAGE_KEYS.REVIEWS);
  const isLocal = id.startsWith('local_');
  
  if (isLocal) {
    const newList = list.filter(r => r.id !== id);
    localStorage.setItem(STORAGE_KEYS.REVIEWS, JSON.stringify(newList));
    return; // Don't try to contact server for local items
  }

  // 3. If it's a server item, try to delete it from Firestore
  try {
    await deleteDoc(doc(db, "reviews", id));
  } catch (error) {
    console.warn("Firestore delete failed. Handled by local soft-delete masking.");
    // We swallow the error because we already hid it via the DELETED_IDS list
  }
};

export const fetchNews = async (): Promise<NewsItem[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([
        {
          id: 'n1',
          source: 'Twitter',
          author: 'Geoff Keighley',
          handle: '@geoffkeighley',
          avatar: 'GK',
          content: 'Just received word that the next State of Play is confirmed for next Thursday. Expect big reveals! #StateOfPlay',
          timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), 
          likes: 12500,
          retweets: 3400
        },
        {
          id: 'n2',
          source: 'Twitter',
          author: 'Rockstar Games',
          handle: '@RockstarGames',
          avatar: 'RS',
          content: 'Trailer 2 coming next month. Stay tuned. #GTAVI',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
          likes: 850000,
          retweets: 210000
        },
        {
          id: 'n3',
          source: 'Twitter',
          author: 'IGN',
          handle: '@IGN',
          avatar: 'IG',
          content: 'REVIEW: Elden Ring Shadow of the Erdtree is a masterpiece that somehow improves on perfection. 10/10.',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
          likes: 5400,
          retweets: 1200
        },
        {
          id: 'n4',
          source: 'Official',
          author: 'Nintendo of America',
          handle: '@NintendoAmerica',
          avatar: 'NT',
          content: 'Join us tomorrow at 7am PT for a new Nintendo Direct Partner Showcase!',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
          likes: 45000,
          retweets: 15000
        }
      ]);
    }, 800);
  });
};