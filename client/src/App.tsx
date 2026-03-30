import { useCallback, useEffect, useState } from 'react';
import './App.css';

type Health = { ok: boolean; db?: string };

type GenreRow = { id: number; name: string };

type SearchMovie = {
  id: number;
  title: string;
  vote_average: number;
  genre_ids: number[];
};

type SearchResponse = { results: SearchMovie[] };

type MovieDetail = {
  id: number;
  voteAverage: number | null;
  title: string;
  genres: { id: number }[];
  directors: { id: number }[];
  cast: { id: number }[];
  keywords: { id: number }[];
  productionCountries: { iso_3166_1: string }[];
};

type CandidatePayload = {
  id: number;
  vote_average?: number;
  genre_ids?: number[];
  genres?: { id: number }[];
  directors?: { id: number }[];
  cast?: { id: number }[];
  production_countries?: { iso_3166_1: string }[];
};

type UserMoviePayload = {
  id: number;
  directors?: { id: number }[];
  cast?: { id: number }[];
  keywords?: { id: number }[];
  production_countries?: { iso_3166_1: string }[];
};

function detailToUserMovie(d: MovieDetail): UserMoviePayload {
  return {
    id: d.id,
    directors: d.directors.map(({ id }) => ({ id })),
    cast: d.cast.map(({ id }) => ({ id })),
    keywords: d.keywords.map(({ id }) => ({ id })),
    production_countries: d.productionCountries.map((c) => ({ iso_3166_1: c.iso_3166_1 })),
  };
}

function detailToCandidate(d: MovieDetail): CandidatePayload {
  const vote =
    typeof d.voteAverage === 'number' && Number.isFinite(d.voteAverage) ? d.voteAverage : 0;
  return {
    id: d.id,
    vote_average: vote,
    genres: d.genres,
    directors: d.directors.map(({ id }) => ({ id })),
    cast: d.cast.map(({ id }) => ({ id })),
    production_countries: d.productionCountries.map((c) => ({ iso_3166_1: c.iso_3166_1 })),
  };
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res.json() as Promise<T>;
}

async function fetchMovieDetail(id: number): Promise<MovieDetail> {
  return fetchJson<MovieDetail>(`/api/tmdb/movies/${id}`);
}

export default function App() {
  const [health, setHealth] = useState<string | null>(null);
  const [genres, setGenres] = useState<GenreRow[] | null>(null);
  const [genreErr, setGenreErr] = useState<string | null>(null);

  const [query, setQuery] = useState('interstellar');
  const [searching, setSearching] = useState(false);
  const [searchErr, setSearchErr] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<SearchMovie[]>([]);

  const [userPickIds, setUserPickIds] = useState<number[]>([]);
  const [userGenresInput, setUserGenresInput] = useState('18,878');
  const [challengeLevel, setChallengeLevel] = useState(45);

  const [filterBusy, setFilterBusy] = useState(false);
  const [filterErr, setFilterErr] = useState<string | null>(null);
  const [filterResults, setFilterResults] = useState<CandidatePayload[] | null>(null);
  const [filterTitles, setFilterTitles] = useState<Record<number, string>>({});

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data: Health) => {
        if (!data.ok) setHealth('error');
        else setHealth(data.db === 'connected' ? 'DB 연결됨' : 'DB 미설정');
      })
      .catch(() => setHealth('offline'));
  }, []);

  const loadGenres = useCallback(async () => {
    setGenreErr(null);
    try {
      const data = await fetchJson<{ genres: GenreRow[] }>('/api/tmdb/genres/movie');
      setGenres(data.genres ?? []);
    } catch (e) {
      setGenreErr(e instanceof Error ? e.message : '장르 로드 실패');
      setGenres(null);
    }
  }, []);

  const runSearch = useCallback(async () => {
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    setSearchErr(null);
    setFilterResults(null);
    try {
      const params = new URLSearchParams({ query: q, language: 'ko-KR' });
      const data = await fetchJson<SearchResponse>(`/api/tmdb/movies/search?${params}`);
      setSearchResults(data.results ?? []);
      setUserPickIds([]);
    } catch (e) {
      setSearchErr(e instanceof Error ? e.message : '검색 실패');
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, [query]);

  const toggleUserPick = useCallback((id: number) => {
    setUserPickIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  }, []);

  const runReverseFilter = useCallback(async () => {
    const userGenres = userGenresInput
      .split(/[,，\s]+/)
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n));
    if (userGenres.length === 0) {
      setFilterErr('유저 장르 ID를 1개 이상 입력해 주세요 (예: 18,878).');
      return;
    }
    if (userPickIds.length === 0) {
      setFilterErr('검색 결과에서 유저 영화를 1개 이상 선택해 주세요.');
      return;
    }
    if (searchResults.length === 0) {
      setFilterErr('먼저 영화 검색을 실행해 주세요.');
      return;
    }

    setFilterBusy(true);
    setFilterErr(null);
    setFilterResults(null);

    try {
      const userDetails = await Promise.all(userPickIds.map((id) => fetchMovieDetail(id)));
      const userMovies = userDetails.map(detailToUserMovie);

      const candidateIds = searchResults
        .map((r) => r.id)
        .filter((id) => !userPickIds.includes(id))
        .slice(0, 24);

      const candidateDetails = await Promise.all(candidateIds.map((id) => fetchMovieDetail(id)));
      const candidateMovies = candidateDetails.map(detailToCandidate);

      const titles: Record<number, string> = {};
      [...userDetails, ...candidateDetails].forEach((d) => {
        titles[d.id] = d.title;
      });
      setFilterTitles(titles);

      const data = await fetchJson<{ results: CandidatePayload[]; count: number }>(
        '/api/recommend/reverse-filter',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userGenres,
            userMovies,
            challengeLevel,
            candidateMovies,
          }),
        }
      );
      setFilterResults(data.results ?? []);
    } catch (e) {
      setFilterErr(e instanceof Error ? e.message : '필터 실패');
    } finally {
      setFilterBusy(false);
    }
  }, [challengeLevel, searchResults, userGenresInput, userPickIds]);

  return (
    <div className="app">
      <header className="app__header">
        <h1>Looka</h1>
        <p className="app__meta">API: {health === null ? '…' : health}</p>
      </header>

      <section className="panel">
        <h2>장르 목록</h2>
        <button type="button" className="btn" onClick={loadGenres}>
          TMDB 장르 불러오기
        </button>
        {genreErr && <p className="msg msg--err">{genreErr}</p>}
        {genres && (
          <ul className="tag-list">
            {genres.map((g) => (
              <li key={g.id}>
                <span className="tag-id">{g.id}</span> {g.name}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel">
        <h2>영화 검색</h2>
        <div className="row">
          <input
            className="input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="검색어"
            onKeyDown={(e) => e.key === 'Enter' && runSearch()}
          />
          <button type="button" className="btn btn--primary" disabled={searching} onClick={runSearch}>
            {searching ? '검색 중…' : '검색'}
          </button>
        </div>
        {searchErr && <p className="msg msg--err">{searchErr}</p>}
        {searchResults.length > 0 && (
          <ul className="movie-list">
            {searchResults.map((m) => {
              const picked = userPickIds.includes(m.id);
              return (
                <li key={m.id} className={picked ? 'movie-list__item--pick' : undefined}>
                  <label className="movie-list__label">
                    <input
                      type="checkbox"
                      checked={picked}
                      onChange={() => toggleUserPick(m.id)}
                    />
                    <span className="movie-list__title">{m.title}</span>
                    <span className="movie-list__sub">
                      id {m.id} · ★ {m.vote_average?.toFixed(1) ?? '—'}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="panel">
        <h2>역추천 필터 (미리보기)</h2>
        <p className="hint">
          유저가 좋아하는 장르 ID와 도전 강도를 넣고, 위 검색 결과에서 기준으로 쓸 영화를 최대 3개
          선택한 뒤 실행합니다. 후보는 같은 검색 결과에서 선택한 영화를 뺀 나머지(최대 24편)의
          상세 메타를 불러와 필터합니다.
        </p>
        <label className="field">
          <span>유저 장르 ID (쉼표 구분)</span>
          <input
            className="input"
            value={userGenresInput}
            onChange={(e) => setUserGenresInput(e.target.value)}
          />
        </label>
        <label className="field">
          <span>도전 강도 {challengeLevel}</span>
          <input
            type="range"
            min={0}
            max={100}
            value={challengeLevel}
            onChange={(e) => setChallengeLevel(Number(e.target.value))}
          />
        </label>
        <button
          type="button"
          className="btn btn--primary"
          disabled={filterBusy}
          onClick={runReverseFilter}
        >
          {filterBusy ? '처리 중…' : '역추천 필터 실행'}
        </button>
        {filterErr && <p className="msg msg--err">{filterErr}</p>}
        {filterResults && (
          <div className="filter-out">
            <p className="msg msg--ok">{filterResults.length}편 통과 (최대 20편)</p>
            <ol className="result-list">
              {filterResults.map((m) => (
                <li key={m.id}>
                  {filterTitles[m.id] ? `${filterTitles[m.id]} · ` : ''}id {m.id} · ★{' '}
                  {m.vote_average?.toFixed(1) ?? '—'}
                </li>
              ))}
            </ol>
          </div>
        )}
      </section>
    </div>
  );
}
