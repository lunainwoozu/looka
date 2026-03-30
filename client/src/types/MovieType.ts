export type GenreOption = { id: number; name: string };

export type SearchMovie = {
  id: number;
  title: string;
  vote_average: number;
  genre_ids: number[];
  poster_path: string | null;
};

export type SearchResponse = { results: SearchMovie[] };

export type DiscoverQuery = {
  page: number;
  sortBy: 'popularity.desc' | 'vote_average.desc';
  withGenres?: number[];
  withoutGenres?: number[];
};

export type MovieDetail = {
  id: number;
  voteAverage: number | null;
  title: string;
  posterPath: string | null;
  genres: { id: number }[];
  directors: { id: number }[];
  cast: { id: number }[];
  keywords: { id: number }[];
  productionCountries: { iso_3166_1: string }[];
};

export type CandidatePayload = {
  id: number;
  vote_average?: number;
  title?: string;
  poster_path?: string | null;
  genre_ids?: number[];
  genres?: { id: number }[];
  directors?: { id: number }[];
  cast?: { id: number }[];
  production_countries?: { iso_3166_1: string }[];
};

export type UserMoviePayload = {
  id: number;
  directors?: { id: number }[];
  cast?: { id: number }[];
  keywords?: { id: number }[];
  production_countries?: { iso_3166_1: string }[];
};

export type CardMovie = {
  id: number;
  title: string;
  voteAverage?: number | null;
  posterPath?: string | null;
};
