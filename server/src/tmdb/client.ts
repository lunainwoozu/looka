import axios, { type AxiosInstance } from 'axios';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

let client: AxiosInstance | null = null;

export function getTmdbApiKey(): string | undefined {
  return process.env.TMDB_API_KEY;
}

export function getTmdbClient(): AxiosInstance {
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
