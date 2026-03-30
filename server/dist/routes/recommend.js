import { Router } from 'express';
import { filterReverseCandidates, } from '../recommendation/reverseFilter.js';
const router = Router();
function isNumberArray(v) {
    return Array.isArray(v) && v.every((x) => typeof x === 'number' && Number.isFinite(x));
}
function isUserMovieList(v) {
    if (!Array.isArray(v))
        return false;
    return v.every((m) => typeof m === 'object' &&
        m !== null &&
        typeof m.id === 'number' &&
        Number.isFinite(m.id));
}
router.post('/reverse-filter', (req, res) => {
    const body = req.body;
    if (!isNumberArray(body.userGenres) ||
        !isUserMovieList(body.userMovies) ||
        !Array.isArray(body.candidateMovies) ||
        typeof body.challengeLevel !== 'number' ||
        !Number.isFinite(body.challengeLevel)) {
        res.status(400).json({
            error: 'Invalid body. Expected { userGenres: number[], userMovies: object[], candidateMovies: object[], challengeLevel: number }',
        });
        return;
    }
    try {
        const results = filterReverseCandidates({
            userGenres: body.userGenres,
            userMovies: body.userMovies,
            challengeLevel: body.challengeLevel,
            candidateMovies: body.candidateMovies,
        });
        res.json({ results, count: results.length });
    }
    catch {
        res.status(500).json({ error: 'filter_failed' });
    }
});
export default router;
