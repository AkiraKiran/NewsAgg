require('dotenv').config();

const { Pool } = require('pg');
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const API_KEY = process.env.API_KEY;

async function ensureInteractionTables() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS comments (
            id BIGSERIAL PRIMARY KEY,
            article_url TEXT NOT NULL,
            article_title TEXT,
            author TEXT NOT NULL,
            text TEXT NOT NULL,
            likes INTEGER NOT NULL DEFAULT 0,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    `);

    await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_comments_article_url
        ON comments (article_url);
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS article_views (
            id BIGSERIAL PRIMARY KEY,
            article_url TEXT NOT NULL,
            article_title TEXT,
            user_agent TEXT,
            viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    `);

    await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_article_views_article_url
        ON article_views (article_url);
    `);
}

function fetchNews(url, res) {
    axios.get(url)
        .then((response) => {
            if (response.data.totalResults > 0) {
                res.json({
                    status: 200,
                    success: true,
                    message: 'News fetched successfully',
                    data: response.data,
                });
            } else {
                res.json({
                    status: 200,
                    success: true,
                    message: 'No more results',
                });
            }
        })
        .catch((error) => {
            res.json({
                status: 500,
                success: false,
                message: 'Error fetching news from the API',
                error: error.message,
            });
        });
}

// PostgreSQL cloud dataset endpoint
app.get('/api/news-from-db', async (req, res) => {
    try {
        const category = req.query.category;

        let queryText = `
            SELECT
                a.*,
                s.name        AS source_name,
                s.domain      AS source_domain,
                s.country     AS source_country,
                s.language    AS source_language,
                s.logo_url    AS source_logo,
                au.name       AS author_name,
                au.author_url AS author_url
            FROM articles a
            LEFT JOIN sources s  ON a.source_id = s.id
            LEFT JOIN authors au ON a.author_id = au.id
        `;
        const queryParams = [];

        if (category && category !== 'all') {
            queryText += ' WHERE LOWER(a.topic) = LOWER($1)';
            queryParams.push(category);
        }

        queryText += ' ORDER BY a.published_at DESC LIMIT 400';

        const result = await pool.query(queryText, queryParams);

        const categories = [...new Set(
            result.rows
                .map((row) => row.topic)
                .filter((value) => typeof value === 'string' && value.trim().length > 0)
        )];

        const modelValues = [...new Set(
            result.rows
                .map((row) => row.sentiment_model)
                .filter((value) => typeof value === 'string' && value.trim().length > 0)
        )];
        const aiModels = Object.fromEntries(
            modelValues.map((model, index) => [`sentiment_${index + 1}`, model])
        );

        const scrapedTimestamps = result.rows
            .map((row) => new Date(row.scraped_at).getTime())
            .filter((value) => Number.isFinite(value));
        const latestScrapedAt = scrapedTimestamps.length > 0
            ? new Date(Math.max(...scrapedTimestamps)).toISOString()
            : null;

        res.json({
            status: 200,
            success: true,
            datasetStatus: 'ok',
            totalResults: result.rows.length,
            articles: result.rows,
            scrapedAt: latestScrapedAt,
            categories,
            aiModels,
        });
    } catch (err) {
        console.error('Database Error:', err);
        res.status(500).json({ success: false, message: 'Server Database Error' });
    }
});

app.get('/everything', (req, res) => {
    const pageSize = parseInt(req.query.pageSize, 10) || 40;
    const page = parseInt(req.query.page, 10) || 1;
    const url = `https://newsapi.org/v2/everything?q=page=${page}&pageSize=${pageSize}&apiKey=${API_KEY}`;
    fetchNews(url, res);
});

app.options('/top-headlines', cors());
app.get('/top-headlines', async (req, res) => {
    try {
        const category = req.query.category || 'general';

        let queryText = 'SELECT * FROM articles';
        const queryParams = [];

        if (category && category !== 'general' && category !== 'all') {
            queryText += ' WHERE topic = $1';
            queryParams.push(category);
        }

        queryText += ' ORDER BY published_at DESC LIMIT 40';
        const result = await pool.query(queryText, queryParams);

        res.json({
            status: 200,
            success: true,
            message: 'Fetched from PostgreSQL Cloud',
            data: {
                totalResults: result.rows.length,
                articles: result.rows,
            },
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Database error' });
    }
});

app.options('/country/:iso', cors());
app.get('/country/:iso', (req, res) => {
    const pageSize = parseInt(req.query.pageSize, 10) || 80;
    const page = parseInt(req.query.page, 10) || 1;
    const country = req.params.iso;
    const url = `https://newsapi.org/v2/top-headlines?country=${country}&page=${page}&pageSize=${pageSize}&apiKey=${API_KEY}`;
    fetchNews(url, res);
});

app.post('/comments', async (req, res) => {
    try {
        const { articleUrl, articleTitle, author, text } = req.body;
        if (!articleUrl || !author || !text) {
            return res.json({ success: false, error: 'Missing required fields' });
        }

        const result = await pool.query(
            `
                INSERT INTO comments (article_url, article_title, author, text)
                VALUES ($1, $2, $3, $4)
                RETURNING id, article_url, article_title, author, text, likes, created_at
            `,
            [articleUrl, articleTitle || 'Unknown', author, text]
        );
        const row = result.rows[0];

        return res.json({
            success: true,
            data: {
                id: row.id,
                articleUrl: row.article_url,
                articleTitle: row.article_title,
                author: row.author,
                text: row.text,
                likes: row.likes,
                createdAt: row.created_at,
            },
            message: 'Comment posted successfully',
        });
    } catch (error) {
        return res.json({ success: false, error: error.message });
    }
});

app.get('/comments/:articleUrl', async (req, res) => {
    try {
        const decodedUrl = decodeURIComponent(req.params.articleUrl);
        const result = await pool.query(
            `
                SELECT id, article_url, article_title, author, text, likes, created_at
                FROM comments
                WHERE article_url = $1
                ORDER BY created_at DESC
            `,
            [decodedUrl]
        );

        return res.json({
            success: true,
            data: result.rows.map((row) => ({
                id: row.id,
                articleUrl: row.article_url,
                articleTitle: row.article_title,
                author: row.author,
                text: row.text,
                likes: row.likes,
                createdAt: row.created_at,
            })),
        });
    } catch (error) {
        return res.json({ success: false, error: error.message });
    }
});

app.post('/comments/:commentId/like', async (req, res) => {
    try {
        const result = await pool.query(
            `
                UPDATE comments
                SET likes = likes + 1
                WHERE id = $1
                RETURNING id, article_url, article_title, author, text, likes, created_at
            `,
            [req.params.commentId]
        );

        if (result.rows.length === 0) {
            return res.json({ success: false, error: 'Comment not found' });
        }

        const row = result.rows[0];
        return res.json({
            success: true,
            data: {
                id: row.id,
                articleUrl: row.article_url,
                articleTitle: row.article_title,
                author: row.author,
                text: row.text,
                likes: row.likes,
                createdAt: row.created_at,
            },
        });
    } catch (error) {
        return res.json({ success: false, error: error.message });
    }
});

app.post('/track-view', async (req, res) => {
    try {
        const { articleUrl, articleTitle } = req.body;
        if (!articleUrl) {
            return res.json({ success: false, error: 'Missing articleUrl' });
        }

        await pool.query(
            `
                INSERT INTO article_views (article_url, article_title, user_agent)
                VALUES ($1, $2, $3)
            `,
            [articleUrl, articleTitle || 'Unknown', req.headers['user-agent'] || null]
        );

        return res.json({ success: true });
    } catch (error) {
        console.error('View tracking error:', error);
        return res.json({ success: false, error: error.message });
    }
});

app.get('/stats/:articleUrl', async (req, res) => {
    try {
        const decodedUrl = decodeURIComponent(req.params.articleUrl);
        const viewResult = await pool.query(
            'SELECT COUNT(*)::int AS count FROM article_views WHERE article_url = $1',
            [decodedUrl]
        );
        const commentResult = await pool.query(
            'SELECT COUNT(*)::int AS count FROM comments WHERE article_url = $1',
            [decodedUrl]
        );

        const views = viewResult.rows[0]?.count || 0;
        const comments = commentResult.rows[0]?.count || 0;

        return res.json({
            success: true,
            views,
            comments,
            engagement: views + (comments * 10),
        });
    } catch (error) {
        return res.json({ success: false, error: error.message });
    }
});

const PORT = process.env.PORT || 3000;

async function startServer() {
    try {
        await ensureInteractionTables();
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();
