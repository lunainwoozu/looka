import axios from 'axios';
import { Router } from 'express';
import { getTmdbApiKey, getTmdbClient } from '../tmdb/client.js';
import { mapMovieDetail } from '../tmdb/movieDetail.js';
const router = Router();
function requireApiKey(_req, res, next) {
    if (!getTmdbApiKey()) {
        res.status(503).json({
            error: 'TMDB_API_KEY is not configured',
        });
        return;
    }
    next();
}
router.use(requireApiKey);
/** GET /api/tmdb/genres/movie — 영화 장르 목록 */
router.get('/genres/movie', async (req, res, next) => {
    try {
        const language = typeof req.query.language === 'string' ? req.query.language : 'ko-KR';
        const client = getTmdbClient();
        const { data } = await client.get('/genre/movie/list', {
            params: { language },
        });
        res.json(data);
    }
    catch (err) {
        next(err);
    }
});
/** GET /api/tmdb/movies/search — 키워드(텍스트) 영화 검색 */
router.get('/movies/search', async (req, res, next) => {
    try {
        const query = typeof req.query.query === 'string' ? req.query.query.trim() : '';
        if (!query) {
            res.status(400).json({ error: 'query parameter is required' });
            return;
        }
        const language = typeof req.query.language === 'string' ? req.query.language : 'ko-KR';
        const page = typeof req.query.page === 'string' ? req.query.page : '1';
        const includeAdult = req.query.include_adult === 'true';
        const client = getTmdbClient();
        const { data } = await client.get('/search/movie', {
            params: {
                query,
                language,
                page,
                include_adult: includeAdult,
            },
        });
        res.json(data);
    }
    catch (err) {
        next(err);
    }
});
/** GET /api/tmdb/movies/:id — 영화 상세 (장르, 감독, 출연, 국가, 키워드) */
router.get('/movies/:id', async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isFinite(id) || id <= 0) {
            res.status(400).json({ error: 'invalid movie id' });
            return;
        }
        const language = typeof req.query.language === 'string' ? req.query.language : 'ko-KR';
        const client = getTmdbClient();
        const { data } = await client.get(`/movie/${id}`, {
            params: {
                language,
                append_to_response: 'credits,keywords',
            },
        });
        res.json(mapMovieDetail(data));
    }
    catch (err) {
        if (axios.isAxiosError(err)) {
            const status = err.response?.status;
            if (status === 404) {
                res.status(404).json({ error: 'movie not found' });
                return;
            }
        }
        next(err);
    }
});
export default router;
