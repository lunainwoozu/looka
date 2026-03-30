import MovieCard from '../MovieCard';
import type { SearchMovie } from '../../types/MovieType';

type MovieSelectionStepProps = {
  selectedGenreIds: number[];
  genreNameMap: Record<number, string>;
  genreMovieMap: Record<number, SearchMovie[]>;
  pickedMovieIds: number[];
  searchQuery: string;
  searching: boolean;
  searchErr: string | null;
  searchResults: SearchMovie[];
  onBack: () => void;
  onNext: () => void;
  onToggleMoviePick: (movieId: number) => void;
  onSearchQueryChange: (value: string) => void;
  onSearch: () => void;
};

export default function MovieSelectionStep({
  selectedGenreIds,
  genreNameMap,
  genreMovieMap,
  pickedMovieIds,
  searchQuery,
  searching,
  searchErr,
  searchResults,
  onBack,
  onNext,
  onToggleMoviePick,
  onSearchQueryChange,
  onSearch,
}: MovieSelectionStepProps) {
  return (
    <>
      <div className="row row--between">
        <button type="button" className="btn" onClick={onBack}>
          이전
        </button>
        <button type="button" className="btn btn--primary" onClick={onNext}>
          다음: 도전 강도
        </button>
      </div>

      <p className="hint">장르별 상위 평점 영화 5개입니다. 최소 2개를 선택해 주세요.</p>

      {selectedGenreIds.map((genreId) => (
        <div key={genreId} className="genre-section">
          <h3>{genreNameMap[genreId] ?? `장르 ${genreId}`}</h3>
          <div className="movie-grid">
            {(genreMovieMap[genreId] ?? []).map((movie) => (
              <MovieCard
                key={movie.id}
                movie={{
                  id: movie.id,
                  title: movie.title,
                  voteAverage: movie.vote_average,
                  posterPath: movie.poster_path,
                }}
                selected={pickedMovieIds.includes(movie.id)}
                onClick={() => onToggleMoviePick(movie.id)}
              />
            ))}
          </div>
          {(genreMovieMap[genreId] ?? []).length === 0 && (
            <p className="msg">해당 장르 상위 영화가 충분하지 않아 검색으로 추가 선택해 주세요.</p>
          )}
        </div>
      ))}

      <div className="search-block">
        <p className="hint">원하는 영화가 없다면 검색으로 추가할 수 있습니다.</p>
        <div className="row">
          <input
            className="input"
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            placeholder="영화 검색"
            onKeyDown={(e) => e.key === 'Enter' && onSearch()}
          />
          <button type="button" className="btn" disabled={searching} onClick={onSearch}>
            {searching ? '검색 중…' : '검색'}
          </button>
        </div>

        {searchErr && <p className="msg msg--err">{searchErr}</p>}

        {searchResults.length > 0 && (
          <div className="movie-grid movie-grid--compact">
            {searchResults.map((movie) => (
              <MovieCard
                key={movie.id}
                movie={{
                  id: movie.id,
                  title: movie.title,
                  voteAverage: movie.vote_average,
                  posterPath: movie.poster_path,
                }}
                selected={pickedMovieIds.includes(movie.id)}
                onClick={() => onToggleMoviePick(movie.id)}
              />
            ))}
          </div>
        )}
      </div>

      <p className="msg msg--ok">선택한 영화: {pickedMovieIds.length}편</p>
    </>
  );
}
