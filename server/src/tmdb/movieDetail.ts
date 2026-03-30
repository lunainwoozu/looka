/** TMDB movie detail + credits + keywords (append_to_response) */

type Genre = { id: number; name: string };
type Country = { iso_3166_1: string; name: string };
type CrewMember = { id: number; name: string; job: string; department: string; profile_path: string | null };
type CastMember = {
  id: number;
  name: string;
  character: string;
  order: number;
  profile_path: string | null;
};
type Keyword = { id: number; name: string };

export type MovieDetailResponse = {
  id: number;
  voteAverage: number | null;
  title: string;
  originalTitle: string;
  overview: string;
  runtime: number | null;
  releaseDate: string | null;
  posterPath: string | null;
  backdropPath: string | null;
  genres: Genre[];
  productionCountries: Country[];
  directors: { id: number; name: string; profilePath: string | null }[];
  cast: { id: number; name: string; character: string; order: number; profilePath: string | null }[];
  keywords: Keyword[];
};

type TmdbMovieDetail = {
  id: number;
  vote_average?: number;
  title: string;
  original_title: string;
  overview: string;
  runtime: number | null;
  release_date: string | null;
  poster_path: string | null;
  backdrop_path: string | null;
  genres: Genre[];
  production_countries: Country[];
  credits?: { crew: CrewMember[]; cast: CastMember[] };
  keywords?: { keywords: Keyword[] };
};

export function mapMovieDetail(raw: TmdbMovieDetail): MovieDetailResponse {
  const crew = raw.credits?.crew ?? [];
  const directors = crew
    .filter((c) => c.job === 'Director')
    .map((d) => ({
      id: d.id,
      name: d.name,
      profilePath: d.profile_path,
    }));

  const cast = (raw.credits?.cast ?? [])
    .sort((a, b) => a.order - b.order)
    .slice(0, 20)
    .map((c) => ({
      id: c.id,
      name: c.name,
      character: c.character,
      order: c.order,
      profilePath: c.profile_path,
    }));

  return {
    id: raw.id,
    voteAverage: raw.vote_average ?? null,
    title: raw.title,
    originalTitle: raw.original_title,
    overview: raw.overview,
    runtime: raw.runtime,
    releaseDate: raw.release_date,
    posterPath: raw.poster_path,
    backdropPath: raw.backdrop_path,
    genres: raw.genres ?? [],
    productionCountries: raw.production_countries ?? [],
    directors,
    cast,
    keywords: raw.keywords?.keywords ?? [],
  };
}
