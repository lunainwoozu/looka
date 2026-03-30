/** TMDB movie detail + credits + keywords (append_to_response) */
export function mapMovieDetail(raw) {
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
