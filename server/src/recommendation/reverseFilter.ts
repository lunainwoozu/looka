export const REVERSE_FILTER_MIN_VOTE = 6.0;
export const REVERSE_FILTER_MAX_RESULTS = 20;

/** 키워드 겹침 비율 임계값 — 후보 키워드의 50% 이상이 유저 pool과 겹치면 Tier 3 탈락 */
const KEYWORD_OVERLAP_THRESHOLD = 0.5;

export type UserMovieInput = {
  id: number;
  directors?: { id: number }[];
  cast?: { id: number }[];
  keywords?: { id: number }[];
  production_countries?: { iso_3166_1: string }[];
};

export type CandidateMovie = {
  id: number;
  vote_average?: number;
  genre_ids?: number[];
  genres?: { id: number }[];
  directors?: { id: number }[];
  cast?: { id: number }[];
  keywords?: { id: number }[]; // ✅ 추가
  production_countries?: { iso_3166_1: string }[];
};

export type ReverseFilterInput = {
  userGenres: number[];
  userMovies: UserMovieInput[];
  challengeLevel: number;
  candidateMovies: CandidateMovie[];
};

function clampChallenge(level: number): number {
  return Math.max(0, Math.min(100, level));
}

function tierFromLevel(level: number): 1 | 2 | 3 {
  const l = clampChallenge(level);
  if (l <= 30) return 1;
  if (l <= 70) return 2;
  return 3;
}

export function getCandidateGenreIds(m: CandidateMovie): number[] {
  if (m.genre_ids?.length) return m.genre_ids;
  if (m.genres?.length) return m.genres.map((g) => g.id);
  return [];
}

function buildUserPools(userMovies: UserMovieInput[]) {
  const directorIds = new Set<number>();
  const keywordIds = new Set<number>(); // ✅ 추가, countryCodes 제거

  for (const m of userMovies) {
    m.directors?.forEach((d) => directorIds.add(d.id));
    m.keywords?.forEach((k) => keywordIds.add(k.id)); // ✅ 추가
  }

  return { directorIds, keywordIds };
}

/** Tier 1 — 장르는 겹쳐도 되고, 감독만 새로우면 통과 */
function passesComfortableTier(m: CandidateMovie, userDirectorIds: Set<number>): boolean {
  const dirs = m.directors ?? [];
  if (dirs.length === 0) return true;
  return dirs.some((d) => !userDirectorIds.has(d.id));
}

/** Tier 2 — 장르 하나 이상 이탈 + 감독 완전히 새로워야 함 */
function passesMiddleTier(
  m: CandidateMovie,
  userGenreSet: Set<number>,
  userDirectorIds: Set<number>
): boolean {
  const gids = getCandidateGenreIds(m);
  const hasGenreOutsideUser = gids.some((g) => !userGenreSet.has(g));
  if (!hasGenreOutsideUser) return false;

  const dirs = m.directors ?? [];
  if (dirs.length === 0) return true;
  return !dirs.some((d) => userDirectorIds.has(d.id));
}

/** Tier 3 — 장르 완전 이탈 + 키워드 겹침 비율이 임계값 미만이어야 함 */
function passesHardTier(
  m: CandidateMovie,
  userGenreSet: Set<number>,
  userKeywordIds: Set<number>
): boolean {
  const gids = getCandidateGenreIds(m);
  if (gids.length === 0) return false;
  if (gids.some((g) => userGenreSet.has(g))) return false;

  // 키워드 겹침 체크
  // 유저 keyword pool이 없으면 키워드 조건은 스킵
  if (userKeywordIds.size > 0) {
    const keywords = m.keywords ?? [];
    if (keywords.length > 0) {
      const overlapCount = keywords.filter((k) => userKeywordIds.has(k.id)).length;
      const overlapRatio = overlapCount / keywords.length;
      if (overlapRatio >= KEYWORD_OVERLAP_THRESHOLD) return false;
    }
  }

  return true;
}

function passesVote(m: CandidateMovie): boolean {
  return typeof m.vote_average === 'number' && m.vote_average >= REVERSE_FILTER_MIN_VOTE;
}

export function filterReverseCandidates(input: ReverseFilterInput): CandidateMovie[] {
  const { userGenres, userMovies, challengeLevel, candidateMovies } = input;
  const tier = tierFromLevel(challengeLevel);
  const userGenreSet = new Set(userGenres);
  const userMovieIds = new Set(userMovies.map((m) => m.id));
  const pools = buildUserPools(userMovies);

  const filtered = candidateMovies.filter((m) => {
    if (userMovieIds.has(m.id)) return false;
    if (!passesVote(m)) return false;

    if (tier === 1) return passesComfortableTier(m, pools.directorIds);
    if (tier === 2) return passesMiddleTier(m, userGenreSet, pools.directorIds);
    return passesHardTier(m, userGenreSet, pools.keywordIds);
  });

  return [...filtered]
    .sort((a, b) => (b.vote_average ?? 0) - (a.vote_average ?? 0))
    .slice(0, REVERSE_FILTER_MAX_RESULTS);
}
