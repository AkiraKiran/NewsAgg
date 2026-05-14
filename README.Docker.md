# NewsAgg Docker Guide

## Services

`docker-compose.yml` sekarang menjalankan:

1. `server` (Express + PostgreSQL/Neon) di port `3000`
2. `client` (Nginx static frontend) di port `8080`

## Required environment

### `server/.env`

Minimal isi:

```env
API_KEY=your_newsapi_key
DATABASE_URL=your_neon_postgres_url
NEON_DSN=your_neon_postgres_url
```

### `server/.hf.env`

Dipakai scraper Python:

```env
HF_TOKEN=your_huggingface_token
```

## Run

Dari root repository:

```bash
docker compose up --build
```

Lalu buka:

- Frontend: `http://localhost:8080`
- Server API: `http://localhost:3000`

## Notes

- Tidak ada lagi dependency MongoDB pada stack ini.
- Root `Dockerfile` build backend image dari root context.
- `server/Dockerfile` expose port `3000` sesuai `server.js`.
