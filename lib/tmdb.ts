export type TmdbEpisode = {
  id: number;
  name: string;
  overview: string;
  episode_number: number;
  season_number: number;
  still_path: string | null;
  air_date: string | null;
  vote_average: number;
  runtime: number | null;
};

export type TmdbSeason = {
  id: number;
  name: string;
  season_number: number;
  episode_count: number;
  episodes: TmdbEpisode[];
};
export type TmdbMediaType = "movie" | "tv";

export type TmdbTitle = {
  id: number;
  media_type?: TmdbMediaType | "person";
  title?: string;
  name?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
  genre_ids?: number[];
};

export type TmdbDetails = TmdbTitle & {
  genres?: Array<{ id: number; name: string }>;
  runtime?: number | null;
  episode_run_time?: number[];
  number_of_episodes?: number;
  number_of_seasons?: number;
  seasons?: Array<{ season_number: number; name: string; episode_count: number }>;
  credits?: {
    cast: Array<{ id: number; name: string; character: string; profile_path: string | null }>;
    crew: Array<{ id: number; name: string; job: string }>;
  };
  videos?: { results: Array<{ key: string; site: string; type: string }> };
};

export type TmdbList = {
  results: TmdbTitle[];
  total_results?: number;
  total_pages?: number;
};

export async function fetchTmdb<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const apiKey = process.env.TMDB_API_KEY?.trim();
  if (!apiKey) throw new Error("TMDB_API_KEY_MISSING");

  const url = new URL(`https://api.themoviedb.org/3/${path}`);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("language", "id-ID");
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);

  const response = await fetch(url, { next: { revalidate: 1800 } });
  if (!response.ok) throw new Error(`TMDB_REQUEST_FAILED_${response.status}`);
  return response.json() as Promise<T>;
}