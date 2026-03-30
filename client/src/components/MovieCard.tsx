import type { CardMovie } from '../types/MovieType';
import { TMDB_IMAGE_BASE } from '../constants/movie';

function toPosterUrl(path?: string | null): string | null {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE}${path}`;
}

function voteText(vote?: number | null): string {
  if (typeof vote !== 'number' || !Number.isFinite(vote)) return '—';
  return vote.toFixed(1);
}

function MovieCard({
  movie,
  selected,
  onClick,
}: {
  movie: CardMovie;
  selected?: boolean;
  onClick?: () => void;
}) {
  const posterUrl = toPosterUrl(movie.posterPath);
  return (
    <button
      type="button"
      className={`movie-card ${selected ? 'movie-card--selected' : ''}`}
      onClick={onClick}
      disabled={!onClick}
    >
      <div className="movie-card__poster-wrap">
        {posterUrl ? (
          <img className="movie-card__poster" src={posterUrl} alt={`${movie.title} 포스터`} />
        ) : (
          <div className="movie-card__poster movie-card__poster--empty">No Poster</div>
        )}
      </div>
      <div className="movie-card__body">
        <p className="movie-card__title">{movie.title}</p>
        <p className="movie-card__meta">★ {voteText(movie.voteAverage)}</p>
      </div>
    </button>
  );
}

export default MovieCard;
