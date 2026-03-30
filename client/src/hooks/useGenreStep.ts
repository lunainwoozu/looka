import { useCallback, useState } from 'react';
import type { SearchMovie } from '../types/MovieType';
import { fetchTopMoviesByGenre } from '../utils/movieApi';

export function useGenreStep() {
  const [selectedGenreIds, setSelectedGenreIds] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [genreMovieMap, setGenreMovieMap] = useState<Record<number, SearchMovie[]>>({});

  const toggleGenre = useCallback((genreId: number) => {
    setSelectedGenreIds((prev) => {
      if (prev.includes(genreId)) return prev.filter((id) => id !== genreId);
      if (prev.length >= 3) return prev;
      return [...prev, genreId];
    });
  }, []);

  // movieIndex를 반환해서 App에서 MovieSelection에 seed로 넘겨줌
  const loadGenreMovies = useCallback(async (): Promise<Record<number, SearchMovie> | null> => {
    if (selectedGenreIds.length < 2 || selectedGenreIds.length > 3) {
      setErr('장르는 2~3개 선택해 주세요.');
      return null;
    }

    setBusy(true);
    setErr(null);

    try {
      const pairs = await Promise.all(
        selectedGenreIds.map(async (id) => [id, await fetchTopMoviesByGenre(id)] as const)
      );
      const map = Object.fromEntries(pairs) as Record<number, SearchMovie[]>;
      setGenreMovieMap(map);

      const index: Record<number, SearchMovie> = {};
      Object.values(map)
        .flat()
        .forEach((m) => {
          index[m.id] = m;
        });
      return index;
    } catch (e) {
      setErr(e instanceof Error ? e.message : '장르별 영화 로딩 실패');
      return null;
    } finally {
      setBusy(false);
    }
  }, [selectedGenreIds]);

  return { selectedGenreIds, busy, err, setErr, genreMovieMap, toggleGenre, loadGenreMovies };
}
