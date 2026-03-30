import type { CandidatePayload, MovieDetail, UserMoviePayload } from '../types/MovieType';

export function detailToUserMovie(d: MovieDetail): UserMoviePayload {
  return {
    id: d.id,
    directors: d.directors.map(({ id }) => ({ id })),
    cast: d.cast.map(({ id }) => ({ id })),
    keywords: d.keywords.map(({ id }) => ({ id })),
    production_countries: d.productionCountries.map((c) => ({ iso_3166_1: c.iso_3166_1 })),
  };
}

export function detailToCandidate(d: MovieDetail): CandidatePayload {
  const vote =
    typeof d.voteAverage === 'number' && Number.isFinite(d.voteAverage) ? d.voteAverage : 0;

  return {
    id: d.id,
    title: d.title,
    poster_path: d.posterPath,
    vote_average: vote,
    genres: d.genres,
    directors: d.directors.map(({ id }) => ({ id })),
    cast: d.cast.map(({ id }) => ({ id })),
    production_countries: d.productionCountries.map((c) => ({ iso_3166_1: c.iso_3166_1 })),
  };
}
