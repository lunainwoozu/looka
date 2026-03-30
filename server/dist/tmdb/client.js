import axios from 'axios';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
let client = null;
export function getTmdbApiKey() {
    return process.env.TMDB_API_KEY;
}
export function getTmdbClient() {
    const apiKey = getTmdbApiKey();
    if (!apiKey) {
        throw new Error('TMDB_API_KEY is not set');
    }
    if (!client) {
        client = axios.create({
            baseURL: TMDB_BASE_URL,
            params: { api_key: apiKey },
            timeout: 20_000,
            headers: { Accept: 'application/json' },
        });
    }
    return client;
}
