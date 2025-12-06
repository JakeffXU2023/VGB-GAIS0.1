import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { db } from "./firebaseAPI.js"; 
import { ref, push, get, remove, child, update } from "firebase/database";

const app = express();
app.use(cors());
app.use(bodyParser.json());
// Note: Frontend serving is handled by the frontend dev server in this environment
// app.use(express.static("frontend")); 

/* =========================
   HELPER: Schema Mapper
========================= */
// Maps Database Schema (PascalCase) -> Frontend Schema (camelCase)
const mapDbToFrontend = (id, dbData) => {
    // Determine status string from boolean flags
    let status = 'TBA';
    if (dbData.Released === true) status = 'Released';
    else if (dbData.Upcoming === true) status = 'Upcoming';

    return {
        id: id,
        title: dbData.Title || dbData.title, // Fallback for legacy data
        description: dbData.Description || dbData.description || '',
        releaseDate: dbData.Release_Date || dbData.releaseDate || 'TBA',
        platforms: dbData.Platform || dbData.platforms || [],
        genre: dbData.Genre || dbData.genre || 'Action',
        imageUrl: dbData.Image || dbData.imageUrl || '',
        status: status,
        developer: dbData.Developer || 'Unknown', // Extra fields to keep logic intact
        publisher: dbData.Publisher || 'Unknown'
    };
};

/* =========================
   HELPER: Get Games
========================= */
const getGamesWithIds = async () => {
  const snapshot = await get(ref(db, "games"));
  const gamesObj = snapshot.val() || {};
  
  return Object.entries(gamesObj).map(([id, game]) => mapDbToFrontend(id, game));
};

/* =========================
   IGDB HELPER: GET TOKEN
========================= */
// Simple in-memory cache for the access token
let tokenCache = {
    token: null,
    expiry: 0
};

const getTwitchAccessToken = async (clientId, clientSecret) => {
    // 1. Check if we have a valid cached token (with 60s buffer)
    if (tokenCache.token && Date.now() < tokenCache.expiry - 60000) {
        return tokenCache.token;
    }

    // 2. Fetch new token
    const authRes = await fetch(`https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`, {
        method: 'POST'
    });
    
    const authData = await authRes.json();
    if (!authRes.ok) throw new Error(authData.message || "Failed to authenticate with Twitch");
    
    // 3. Cache the token
    tokenCache.token = authData.access_token;
    // expires_in is in seconds, convert to milliseconds
    tokenCache.expiry = Date.now() + (authData.expires_in * 1000);

    return authData.access_token;
};

/* =========================
   IGDB SEARCH ENDPOINT
========================= */
app.post("/igdb/search", async (req, res) => {
  const { clientId, clientSecret, query } = req.body;
  
  if (!clientId || !clientSecret || !query) {
    return res.status(400).json({ error: "Missing Client ID, Secret, or Query" });
  }

  try {
    const accessToken = await getTwitchAccessToken(clientId, clientSecret);

    // Search IGDB
    const igdbRes = await fetch("https://api.igdb.com/v4/games", {
        method: 'POST',
        headers: {
            'Client-ID': clientId,
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'text/plain'
        },
        // APICALYPSE Query Language
        body: `search "${query}"; fields name, cover.image_id, first_release_date, summary, genres.name, involved_companies.company.name, platforms.name; limit 12;`
    });

    const games = await igdbRes.json();
    if (!igdbRes.ok) throw new Error("IGDB Request Failed");

    res.json(games);

  } catch (err) {
    console.error("IGDB Error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* =========================
   IGDB DISCOVER ENDPOINT
========================= */
app.post("/igdb/discover", async (req, res) => {
  const { clientId, clientSecret } = req.body;
  
  if (!clientId || !clientSecret) {
    return res.status(400).json({ error: "Missing Client ID or Secret" });
  }

  try {
    const accessToken = await getTwitchAccessToken(clientId, clientSecret);

    // Fetch Popular/Trending Games (Sorted by popularity)
    const igdbRes = await fetch("https://api.igdb.com/v4/games", {
        method: 'POST',
        headers: {
            'Client-ID': clientId,
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'text/plain'
        },
        // Get top 20 popular games that have covers
        body: `fields name, cover.image_id, first_release_date, summary, genres.name, involved_companies.company.name, platforms.name; sort popularity desc; limit 20; where cover != null & first_release_date != null;`
    });

    const games = await igdbRes.json();
    if (!igdbRes.ok) throw new Error("IGDB Request Failed");

    res.json(games);

  } catch (err) {
    console.error("IGDB Discover Error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* =========================
   ADD NEW GAME (ENFORCING NEW SCHEMA)
========================= */
app.post("/add", async (req, res) => {
  try {
    const { title, description, releaseDate, platforms, genre, imageUrl, status, developer, publisher } = req.body;
    
    if (!title || !releaseDate) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    // Logic for Boolean Flags
    const isReleased = status === 'Released';
    const isUpcoming = status === 'Upcoming' || status === 'TBA'; 

    // REQUESTED SCHEMA FORMAT
    const dbGame = {
        Title: title,
        Description: description || '',
        Release_Date: releaseDate,
        Platform: platforms || [], // Storing as array, consistent with inputs
        Genre: genre || 'Action',
        Image: imageUrl || '',
        Released: isReleased,
        Upcoming: isUpcoming,
        // Extras not in strict schema but good to have
        Developer: developer || '',
        Publisher: publisher || ''
    };

    const newRef = await push(ref(db, "games"), dbGame);
    
    // We can also update the record to include its own ID if "Game_ID" needs to be explicit in the body
    await update(ref(db, `games/${newRef.key}`), { Game_ID: newRef.key });

    res.status(201).json({ 
        message: "Game added successfully!", 
        data: mapDbToFrontend(newRef.key, dbGame) 
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* =========================
   DELETE GAME
========================= */
app.delete("/delete/:id", async (req, res) => {
  try {
    const gameId = req.params.id;
    if (!gameId) {
      return res.status(400).json({ message: "Missing game ID." });
    }
    await remove(ref(db, `games/${gameId}`));
    res.status(200).json({ message: "Game deleted successfully." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* =========================
   GET ALL GAMES
========================= */
app.get("/games", async (req, res) => {
  try {
    const games = await getGamesWithIds();
    res.json(games);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* =========================
   GET UPCOMING GAMES
========================= */
app.get("/upcoming", async (req, res) => {
  try {
    const games = await getGamesWithIds();
    const upcoming = games.filter(g => g.status === "Upcoming");
    res.json(upcoming);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* =========================
   GET RELEASED GAMES
========================= */
app.get("/released", async (req, res) => {
  try {
    const games = await getGamesWithIds();
    const released = games.filter(g => g.status === "Released");
    res.json(released);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* =========================
   GET DELAYED GAMES
========================= */
app.get("/delayed", async (req, res) => {
  try {
    const games = await getGamesWithIds();
    const delayed = games.filter(g => g.status === "delayed"); // Schema doesn't have explicit Delayed flag, status mapping handles it if stored
    res.json(delayed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* =========================
   GET CANCELLED GAMES
========================= */
app.get("/cancelled", async (req, res) => {
  try {
    const games = await getGamesWithIds();
    const cancelled = games.filter(g => g.status === "cancelled");
    res.json(cancelled);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* =========================
   SERVER START
========================= */
const PORT = 3001;
app.listen(PORT, () => console.log(`API running at http://localhost:${PORT}`));