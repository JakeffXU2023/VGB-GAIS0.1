import { db, firestoreDb } from "./firebaseAPI.js";
import { ref, set, get, push, update, remove, child } from "firebase/database";
import { collection, addDoc, getDocs, query, where } from "firebase/firestore";

/* =========================================================================
   1. USER FUNCTIONS (Realtime Database)
   Schema: User_ID, Username, Email, Guest, Registered, Administrator, Registration_Date
   ========================================================================= */

/**
 * Creates a new user record in RTDB.
 * @param {Object} params
 */
export const createUser = async ({ userId, username, email, isGuest = false, isRegistered = true, isAdmin = false }) => {
    if (!userId) throw new Error("User_ID is required");

    const userRef = ref(db, `users/${userId}`);
    const userData = {
        User_ID: userId,
        Username: username,
        Email: email,
        Guest: isGuest,
        Registered: isRegistered,
        Administrator: isAdmin,
        Registration_Date: new Date().toISOString()
    };

    await set(userRef, userData);
    return userData;
};

/**
 * Retrieves a user record by User_ID.
 * @param {string} userId 
 */
export const getUser = async (userId) => {
    const snapshot = await get(ref(db, `users/${userId}`));
    if (!snapshot.exists()) return null;
    return snapshot.val();
};


/* =========================================================================
   2. GAME FUNCTIONS (Realtime Database)
   Schema: Game_ID, Title, Description, Release_Date, Platform, Genre, Image, Upcoming, Released
   ========================================================================= */

/**
 * Creates a new GAME record.
 * @param {Object} params 
 */
export const createGame = async ({ title, description, releaseDate, platform, genre, imageUrl, isUpcoming, isReleased }) => {
    const gamesRef = ref(db, 'games');
    const newGameRef = push(gamesRef);
    const gameId = newGameRef.key;

    const gameData = {
        Game_ID: gameId,
        Title: title,
        Description: description || "",
        Release_Date: releaseDate, // ISO string or YYYY-MM-DD
        Platform: platform || [], // Array of platforms
        Genre: genre || "Action",
        Image: imageUrl || "",
        Upcoming: !!isUpcoming,
        Released: !!isReleased
    };

    await set(newGameRef, gameData);
    return gameId;
};

/**
 * Retrieves a game by Game_ID.
 * @param {string} gameId 
 */
export const getGame = async (gameId) => {
    const snapshot = await get(ref(db, `games/${gameId}`));
    if (!snapshot.exists()) return null;
    return snapshot.val();
};

/**
 * Retrieves all game records.
 */
export const getAllGames = async () => {
    const snapshot = await get(ref(db, 'games'));
    if (!snapshot.exists()) return [];
    
    // Transform object of objects into array
    const data = snapshot.val();
    return Object.values(data);
};

/**
 * Updates specified fields for a game.
 * @param {string} gameId 
 * @param {Object} updatedFields Object containing fields to update (PascalCase keys)
 */
export const updateGame = async (gameId, updatedFields) => {
    const gameRef = ref(db, `games/${gameId}`);
    await update(gameRef, updatedFields);
    return true;
};


/* =========================================================================
   3. REVIEW FUNCTIONS (Firestore)
   Schema: Review_ID (Doc ID), Text, Rating, Date_Time_Posted, User_ID, Game_ID
   Constraint: Must have Text OR Rating.
   ========================================================================= */

/**
 * Creates a new Review in Firestore.
 * @param {Object} params 
 */
export const createReview = async ({ userId, gameId, text, rating }) => {
    // Validation: Must check that at least one of text or rating is provided.
    if ((!text || text.trim() === "") && (rating === undefined || rating === null || rating === 0)) {
        throw new Error("Validation Error: Review must contain either text content or a rating.");
    }

    const reviewsCol = collection(firestoreDb, 'reviews');
    const reviewData = {
        User_ID: userId,
        Game_ID: gameId,
        Text: text || null,
        Rating: rating ? Number(rating) : null,
        Date_Time_Posted: new Date().toISOString()
    };

    const docRef = await addDoc(reviewsCol, reviewData);
    
    // Return the generated Review_ID (Document ID) and the data
    return {
        Review_ID: docRef.id,
        ...reviewData
    };
};

/**
 * Retrieves all reviews for a specific game.
 * @param {string} gameId 
 */
export const getReviewsByGame = async (gameId) => {
    const reviewsCol = collection(firestoreDb, 'reviews');
    const q = query(reviewsCol, where("Game_ID", "==", gameId));
    
    const querySnapshot = await getDocs(q);
    const reviews = [];
    
    querySnapshot.forEach((doc) => {
        reviews.push({
            Review_ID: doc.id,
            ...doc.data()
        });
    });
    
    return reviews;
};


/* =========================================================================
   4. FAVORITE FUNCTIONS (Realtime Database)
   Schema: Composite Key (User_ID_Game_ID), User_ID, Game_ID, Date_Added
   ========================================================================= */

/**
 * Adds a favorite record using composite key.
 * @param {Object} params 
 */
export const addFavorite = async ({ userId, gameId }) => {
    if (!userId || !gameId) throw new Error("User ID and Game ID required");

    // Composite Key Pattern
    const compositeKey = `${userId}_${gameId}`;
    const favRef = ref(db, `favorites/${compositeKey}`);

    const favData = {
        User_ID: userId,
        Game_ID: gameId,
        Date_Added: new Date().toISOString()
    };

    await set(favRef, favData);
    return compositeKey;
};

/**
 * Removes a favorite record.
 * @param {Object} params 
 */
export const removeFavorite = async ({ userId, gameId }) => {
    const compositeKey = `${userId}_${gameId}`;
    const favRef = ref(db, `favorites/${compositeKey}`);
    await remove(favRef);
    return true;
};

/**
 * Checks if a favorite record exists.
 * @param {Object} params 
 */
export const isFavorite = async ({ userId, gameId }) => {
    const compositeKey = `${userId}_${gameId}`;
    const snapshot = await get(ref(db, `favorites/${compositeKey}`));
    return snapshot.exists();
};