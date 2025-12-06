export interface Game {
  id?: string;
  title: string;
  releaseDate: string; // YYYY-MM-DD
  developer?: string;
  publisher?: string;
  status?: string;
  platforms?: string[];
  description?: string;
  genre?: string;
  imageUrl?: string; // URL from RAWG or manual input
}

export interface Review {
  id: string;
  gameId: string; // Linking to game title or ID
  gameTitle: string;
  userId: string;
  username: string;
  rating: number;
  text: string;
  timestamp: number;
}

export interface NewsItem {
  id: string;
  source: 'Twitter' | 'Web' | 'Official';
  author: string;
  handle?: string; // e.g. @IGN
  avatar?: string; // Initials or url
  content: string;
  timestamp: string; // ISO string
  likes?: number;
  retweets?: number;
}

export type UserRole = 'guest' | 'user' | 'admin';

export interface UserProfile {
  uid: string;
  email: string | null;
  username: string;
  role: UserRole;
}

export interface CalendarDay {
  day: number;
  dateStr: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  releases: Game[];
}