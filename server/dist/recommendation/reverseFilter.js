/**
 * 역추천(취향 바깥) 후보 필터링 — 도전 강도에 따라 조건 분기
 */
export const REVERSE_FILTER_MIN_VOTE = 6.0;
export const REVERSE_FILTER_MAX_RESULTS = 20;
function clampChallenge(level) {
    return Math.max(0, Math.min(100, level));
}
function tierFromLevel(level) {
    const l = clampChallenge(level);
    if (l <= 30)
        return 1;
    if (l <= 70)
        return 2;
    return 3;
}
export function getCandidateGenreIds(m) {
    if (m.genre_ids?.length)
        return m.genre_ids;
    if (m.genres?.length)
        return m.genres.map((g) => g.id);
    return [];
}
function buildUserPools(userMovies) {
    const directorIds = new Set();
    const castIds = new Set();
    const countryCodes = new Set();
    for (const m of userMovies) {
        m.directors?.forEach((d) => directorIds.add(d.id));
        m.cast?.forEach((c) => castIds.add(c.id));
        m.production_countries?.forEach((c) => countryCodes.add(c.iso_3166_1));
    }
    return { directorIds, castIds, countryCodes };
}
/** 편안한 확장(1단): 감독·출연·국가 중 하나라도 유저 풀과 다르면 통과 */
function passesComfortableTier(m, pools) {
    const dirs = m.directors ?? [];
    const casts = m.cast ?? [];
    const countries = m.production_countries ?? [];
    const poolEmpty = pools.directorIds.size === 0 && pools.castIds.size === 0 && pools.countryCodes.size === 0;
    if (poolEmpty) {
        return true;
    }
    const hasNewDirector = dirs.some((d) => !pools.directorIds.has(d.id));
    const hasNewCast = casts.some((c) => !pools.castIds.has(c.id));
    const hasNewCountry = countries.some((c) => !pools.countryCodes.has(c.iso_3166_1));
    return hasNewDirector || hasNewCast || hasNewCountry;
}
/** 중간(2단): 장르가 하나 이상 달라야 하고(유저 장르 집합에 없는 장르가 후보에 있음), 감독은 유저와 겹치면 안 됨 */
function passesMiddleTier(m, userGenreSet, userDirectorIds) {
    const gids = getCandidateGenreIds(m);
    const hasGenreOutsideUser = gids.some((g) => !userGenreSet.has(g));
    if (!hasGenreOutsideUser)
        return false;
    const dirs = m.directors ?? [];
    if (dirs.length === 0) {
        return userDirectorIds.size === 0;
    }
    const sharesDirectorWithUser = dirs.some((d) => userDirectorIds.has(d.id));
    return !sharesDirectorWithUser;
}
/** 진짜 도전(3단): 유저가 고른 장르와 한 건도 겹치지 않음 */
function passesHardTier(m, userGenreSet) {
    const gids = getCandidateGenreIds(m);
    if (gids.length === 0)
        return false;
    return !gids.some((g) => userGenreSet.has(g));
}
function passesVote(m) {
    return typeof m.vote_average === 'number' && m.vote_average >= REVERSE_FILTER_MIN_VOTE;
}
/**
 * 역추천 조건을 만족하는 후보만 남기고, 평점 내림차순으로 최대 20개 반환.
 */
export function filterReverseCandidates(input) {
    const { userGenres, userMovies, challengeLevel, candidateMovies } = input;
    const tier = tierFromLevel(challengeLevel);
    const userGenreSet = new Set(userGenres);
    const userMovieIds = new Set(userMovies.map((m) => m.id));
    const pools = buildUserPools(userMovies);
    const filtered = candidateMovies.filter((m) => {
        if (userMovieIds.has(m.id))
            return false;
        if (!passesVote(m))
            return false;
        if (tier === 1)
            return passesComfortableTier(m, pools);
        if (tier === 2)
            return passesMiddleTier(m, userGenreSet, pools.directorIds);
        return passesHardTier(m, userGenreSet);
    });
    const sorted = [...filtered].sort((a, b) => {
        const va = a.vote_average ?? 0;
        const vb = b.vote_average ?? 0;
        return vb - va;
    });
    return sorted.slice(0, REVERSE_FILTER_MAX_RESULTS);
}
