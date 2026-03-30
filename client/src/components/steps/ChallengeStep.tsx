import MovieCard from '../MovieCard';
import { CHALLENGE_TIER_OPTIONS } from '../../constants/movie';
import type { CandidatePayload, CardMovie } from '../../types/MovieType';

type ChallengeStepProps = {
  challengeLevel: number;
  pickedMovies: CardMovie[];
  filterBusy: boolean;
  filterErr: string | null;
  filterResults: CandidatePayload[] | null;
  filterTitles: Record<number, string>;
  filterPosters: Record<number, string | null>;
  candidatePoolCount: number;
  onBack: () => void;
  onRunReverseFilter: () => void;
  onSelectChallengeLevel: (level: number) => void;
};

function challengeTier(level: number): 'mild' | 'normal' | 'spicy' {
  if (level <= 30) return 'mild';
  if (level <= 70) return 'normal';
  return 'spicy';
}

export default function ChallengeStep({
  challengeLevel,
  pickedMovies,
  filterBusy,
  filterErr,
  filterResults,
  filterTitles,
  filterPosters,
  candidatePoolCount,
  onBack,
  onRunReverseFilter,
  onSelectChallengeLevel,
}: ChallengeStepProps) {
  const activeTier = challengeTier(challengeLevel);

  return (
    <>
      <div className="row row--between">
        <button type="button" className="btn" onClick={onBack}>
          이전
        </button>
        <button
          type="button"
          className="btn btn--primary"
          disabled={filterBusy}
          onClick={onRunReverseFilter}
        >
          {filterBusy ? '추천 생성 중…' : '역추천 실행'}
        </button>
      </div>

      <label className="field">
        <span>도전 강도 선택</span>
        <div className="chip-grid chip-grid--small">
          {CHALLENGE_TIER_OPTIONS.map((option) => (
            <button
              key={option.tier}
              type="button"
              className={`chip ${activeTier === option.tier ? 'chip--active' : ''}`}
              onClick={() => onSelectChallengeLevel(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </label>

      <div className="picked-strip">
        {pickedMovies.map((movie) => (
          <MovieCard key={movie.id} movie={movie} />
        ))}
      </div>

      {filterErr && <p className="msg msg--err">{filterErr}</p>}

      {filterResults && (
        <div className="filter-out">
          <p className="msg msg--ok">
            전역 후보 {candidatePoolCount}편 분석 후 {filterResults.length}편 통과 (최대 20편)
          </p>
          <div className="movie-grid">
            {filterResults.map((movie) => {
              const title = movie.title ?? filterTitles[movie.id] ?? `id ${movie.id}`;
              const posterPath = movie.poster_path ?? filterPosters[movie.id] ?? null;

              return (
                <MovieCard
                  key={movie.id}
                  movie={{
                    id: movie.id,
                    title,
                    voteAverage: movie.vote_average,
                    posterPath,
                  }}
                />
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
