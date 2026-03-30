import type {
  CandidatePayload,
  DiscoverQuery,
  MovieDetail,
  SearchMovie,
  SearchResponse,
  UserMoviePayload,
} from '../types/MovieType';

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }

  return res.json() as Promise<T>;
}

export async function fetchMovieDetail(id: number): Promise<MovieDetail> {
  return fetchJson<MovieDetail>(`/api/tmdb/movies/${id}`);
}

function pickUniquePages(count: number, min: number, max: number): number[] {
  const pages = new Set<number>();
  const safeCount = Math.max(1, Math.min(count, max - min + 1));

  while (pages.size < safeCount) {
    const p = Math.floor(Math.random() * (max - min + 1)) + min;
    pages.add(p);
  }

  return Array.from(pages);
}

export function getDiscoverQueries(userGenres: number[], challengeLevel: number): DiscoverQuery[] {
  if (challengeLevel <= 30) {
    return pickUniquePages(3, 1, 12).map((page) => ({
      page,
      sortBy: 'popularity.desc',
      withGenres: userGenres,
    }));
  }

  if (challengeLevel <= 70) {
    const familiar = pickUniquePages(2, 1, 16).map((page) => ({
      page,
      sortBy: 'popularity.desc' as const,
      withGenres: userGenres,
    }));
    const broader = pickUniquePages(2, 1, 20).map((page) => ({
      page,
      sortBy: 'vote_average.desc' as const,
    }));

    return [...familiar, ...broader];
  }

  return pickUniquePages(4, 1, 30).map((page) => ({
    page,
    sortBy: 'popularity.desc',
    withoutGenres: userGenres,
  }));
}

export async function fetchDiscoverMovies(query: DiscoverQuery): Promise<SearchMovie[]> {
  const params = new URLSearchParams({
    language: 'ko-KR',
    page: String(query.page),
    sort_by: query.sortBy,
    vote_count_gte: '120',
  });

  if (query.withGenres && query.withGenres.length > 0) {
    params.set('with_genres', query.withGenres.join('|'));
  }

  if (query.withoutGenres && query.withoutGenres.length > 0) {
    params.set('without_genres', query.withoutGenres.join(','));
  }

  const data = await fetchJson<SearchResponse>(`/api/tmdb/movies/discover?${params.toString()}`);
  return data.results ?? [];
}

export async function fetchTopMoviesByGenre(genreId: number): Promise<SearchMovie[]> {
  const picked: SearchMovie[] = [];
  const seen = new Set<number>();

  for (const page of [1, 2, 3]) {
    const params = new URLSearchParams({
      language: 'ko-KR',
      page: String(page),
      sort_by: 'vote_average.desc',
      vote_count_gte: '500',
      with_genres: String(genreId),
    });

    const data = await fetchJson<SearchResponse>(`/api/tmdb/movies/discover?${params.toString()}`);

    for (const movie of data.results ?? []) {
      if (seen.has(movie.id)) continue;
      if (!movie.poster_path) continue;

      seen.add(movie.id);
      picked.push(movie);

      if (picked.length >= 5) {
        return picked;
      }
    }
  }

  return picked.slice(0, 5);
}

export async function searchMovies(query: string): Promise<SearchMovie[]> {
  const params = new URLSearchParams({ query, language: 'ko-KR' });
  const data = await fetchJson<SearchResponse>(`/api/tmdb/movies/search?${params.toString()}`);
  return (data.results ?? []).slice(0, 12);
}

export async function postReverseFilter(payload: {
  userGenres: number[];
  userMovies: UserMoviePayload[];
  challengeLevel: number;
  candidateMovies: CandidatePayload[];
}): Promise<{ results: CandidatePayload[]; count: number }> {
  return fetchJson<{ results: CandidatePayload[]; count: number }>('/api/recommend/reverse-filter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}
