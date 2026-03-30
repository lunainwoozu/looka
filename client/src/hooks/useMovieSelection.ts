import { useCallback, useState } from 'react';
import type { SearchMovie } from '../types/MovieType';
import { searchMovies } from '../utils/movieApi';

export function useMovieSelection() {
  const [pickedMovieIds, setPickedMovieIds] = useState<number[]>([]);
  const [movieIndex, setMovieIndex] = useState<Record<number, SearchMovie>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchErr, setSearchErr] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<SearchMovie[]>([]);

  // 장르 로딩 완료 후 App에서 호출
  const reset = useCallback((seedIndex: Record<number, SearchMovie>) => {
    setMovieIndex(seedIndex);
    setPickedMovieIds([]);
    setSearchQuery('');
    setSearchResults([]);
    setSearchErr(null);
  }, []);

  const togglePick = useCallback((id: number) => {
    setPickedMovieIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  const runSearch = useCallback(async (query: string) => {
    const q = query.trim();
    if (!q) return;

    setSearching(true);
    setSearchErr(null);

    try {
      const movies = await searchMovies(q);
      setSearchResults(movies);
      setMovieIndex((prev) => {
        const next = { ...prev };
        movies.forEach((m) => {
          next[m.id] = m;
        });
        return next;
      });
    } catch (e) {
      setSearchErr(e instanceof Error ? e.message : '검색 실패');
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  return {
    pickedMovieIds,
    movieIndex,
    searchQuery,
    setSearchQuery,
    searching,
    searchErr,
    searchResults,
    reset,
    togglePick,
    runSearch,
  };
}
