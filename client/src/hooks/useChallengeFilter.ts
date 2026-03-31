import { useCallback, useState } from 'react';
import type { CandidatePayload } from '../types/MovieType';
import { MAX_DETAIL_CANDIDATES } from '../constants/movie';
import {
  fetchDiscoverMovies,
  fetchMovieDetail,
  getDiscoverQueries,
  postReverseFilter,
} from '../utils/movieApi';
import { detailToCandidate, detailToUserMovie } from '../utils/movieMappers';

export function useChallengeFilter() {
  const [challengeLevel, setChallengeLevel] = useState(50);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [results, setResults] = useState<CandidatePayload[] | null>(null);
  const [titles, setTitles] = useState<Record<number, string>>({});
  const [posters, setPosters] = useState<Record<number, string | null>>({});
  const [candidatePoolCount, setCandidatePoolCount] = useState(0);

  const reset = useCallback(() => {
    setErr(null);
    setResults(null);
    setTitles({});
    setPosters({});
    setCandidatePoolCount(0);
  }, []);

  const run = useCallback(
    async (selectedGenreIds: number[], pickedMovieIds: number[]) => {
      if (selectedGenreIds.length < 2) {
        setResults(null);
        setCandidatePoolCount(0);
        setErr('장르가 부족합니다. 이전 단계로 돌아가 다시 선택해 주세요.');
        return;
      }
      if (pickedMovieIds.length < 2) {
        setResults(null);
        setCandidatePoolCount(0);
        setErr('영화는 최소 2개 선택해 주세요.');
        return;
      }

      setBusy(true);
      setErr(null);
      setResults(null);
      setCandidatePoolCount(0);

      try {
        const userDetails = await Promise.all(pickedMovieIds.map(fetchMovieDetail));
        const userMovies = userDetails.map(detailToUserMovie);

        const discoverQueries = getDiscoverQueries(selectedGenreIds, challengeLevel);
        const discoverResults = await Promise.all(discoverQueries.map(fetchDiscoverMovies));

        const candidateById = new Map(
          discoverResults
            .flat()
            .filter((m) => !pickedMovieIds.includes(m.id))
            .map((m) => [m.id, m])
        );

        const candidateIds = Array.from(candidateById.values())
          .sort((a, b) => (b.vote_average ?? 0) - (a.vote_average ?? 0))
          .slice(0, MAX_DETAIL_CANDIDATES)
          .map((m) => m.id);

        if (!candidateIds.length) {
          throw new Error(
            '추천 후보 목록을 만들지 못했습니다. 도전 강도나 장르를 바꿔서 다시 시도해 주세요.'
          );
        }

        setCandidatePoolCount(candidateIds.length);

        const settled = await Promise.allSettled(candidateIds.map(fetchMovieDetail));
        const candidateDetails = settled.flatMap((r) =>
          r.status === 'fulfilled' ? [r.value] : []
        );

        if (!candidateDetails.length) {
          throw new Error('후보 상세 메타데이터 로딩에 실패했습니다. 잠시 후 다시 시도해 주세요.');
        }

        const allDetails = [...userDetails, ...candidateDetails];
        setTitles(Object.fromEntries(allDetails.map((d) => [d.id, d.title])));
        setPosters(Object.fromEntries(allDetails.map((d) => [d.id, d.posterPath])));

        const data = await postReverseFilter({
          userGenres: selectedGenreIds,
          userMovies,
          challengeLevel,
          candidateMovies: candidateDetails.map(detailToCandidate),
        });

        setResults(data.results ?? []);
      } catch (e) {
        setErr(e instanceof Error ? e.message : '필터 실패');
      } finally {
        setBusy(false);
      }
    },
    [challengeLevel]
  );

  return {
    challengeLevel,
    setChallengeLevel,
    busy,
    err,
    results,
    titles,
    posters,
    candidatePoolCount,
    reset,
    run,
  };
}
