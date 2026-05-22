require('dotenv').config();

// PostgreSQL 连线配置
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const express = require('express');
const cors = require('cors');
const app = express();
const axios = require('axios');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcryptjs = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const API_KEY = process.env.API_KEY;

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/newsagg')
    .then(() => console.log('MongoDB connected successfully'))
    .catch(err => console.log('MongoDB connection error:', err));

// ─────────────────── PostgreSQL Tables ───────────────────
// Create users table if it doesn't exist
const createUsersTable = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        avatar VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Users table created or already exists');
  } catch (err) {
    console.error('Error creating users table:', err);
  }
};

// Create bookmarks table if it doesn't exist
const createBookmarksTable = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bookmarks (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        article_id VARCHAR(500) NOT NULL,
        article_title TEXT,
        article_url TEXT,
        url_to_image VARCHAR(500),
        source_name VARCHAR(255),
        topic VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(user_id, article_id)
      )
    `);
    console.log('Bookmarks table created or already exists');
  } catch (err) {
    console.error('Error creating bookmarks table:', err);
  }
};

// Initialize tables
createUsersTable();
createBookmarksTable();

// ─────────────────── JWT Middleware ───────────────────
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ success: false, error: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
};

// Comment Schema
const commentSchema = new mongoose.Schema({
    articleUrl: String,
    articleTitle: String,
    author: String,
    text: String,
    likes: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
});

const Comment = mongoose.model('Comment', commentSchema);

// View Schema
const viewSchema = new mongoose.Schema({
    articleUrl: String,
    articleTitle: String,
    viewedAt: { type: Date, default: Date.now },
    userAgent: String
});

const View = mongoose.model('View', viewSchema);

// Function to fetch news from the API
function fetchNews(url, res) {
    axios.get(url)
        .then(response => {
            if (response.data.totalResults > 0) {
                res.json({
                    status: 200,
                    success: true,
                    message: 'News fetched successfully',
                    data: response.data
                });
            } else {
                res.json({
                    status: 200,
                    success: true,
                    message: 'No more results',
                });
            }
        })
        .catch(error => {
            res.json({
                status: 500,
                success: false,
                message: 'Error fetching news from the API',
                error: error.message
            });
        });
}

// --- 从 PostgreSQL 云端资料库读取新闻 ---
app.get('/api/news-from-db', async (req, res) => {
    try {
        const category = req.query.category; 
        
        // 加入 JOIN，把来源 (sources) 和作者 (authors) 的详细资料一并抓出来
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
        let queryParams =[];

        if (category && category !== 'all') {
            queryText += ' WHERE LOWER(a.topic) = LOWER($1)';
            queryParams.push(category);
        }

        queryText += ' ORDER BY a.published_at DESC LIMIT 400';

        const result = await pool.query(queryText, queryParams);
        
        res.json({
            status: 200,
            success: true,
            totalResults: result.rows.length,
            articles: result.rows 
        });
    } catch (err) {
        console.error('Database Error:', err);
        res.status(500).json({ success: false, message: 'Server Database Error' });
    }
});

// Fetch news
app.get('/everything', (req, res) => {
    let pageSize = parseInt(req.query.pageSize) || 40;
    let page = parseInt(req.query.page) || 1;
    let url = `https://newsapi.org/v2/everything?q=page=${page}&pageSize=${pageSize}&apiKey=${process.env.API_KEY}`;
    fetchNews(url, res);
});

// Top Headlines
app.options('/top-headlines', cors());
app.get('/top-headlines', async (req, res) => {
    try {
        const category = req.query.category || 'general';
        
        // 从 PostgreSQL 拿资料
        let queryText = 'SELECT * FROM articles';
        let queryParams = [];
        
        if (category && category !== 'general' && category !== 'all') {
            queryText += ' WHERE topic = $1';
            queryParams.push(category);
        }
        
        queryText += ' ORDER BY published_at DESC LIMIT 40';
        
        const result = await pool.query(queryText, queryParams);

        // 包装成前端原本预期的格式，这样前端一行代码都不用改
        res.json({
            status: 200,
            success: true,
            message: 'Fetched from PostgreSQL Cloud',
            data: {
                totalResults: result.rows.length,
                articles: result.rows // 这里的字段名要确保和旧的 JSON 一致
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Database error' });
    }
});

// Country-specific headlines
app.options('/country/:iso', cors());
app.get("/country/:iso", (req, res) => {
    let pageSize = parseInt(req.query.pageSize) || 80;
    let page = parseInt(req.query.page) || 1;
    const country = req.params.iso;
    let url = `https://newsapi.org/v2/top-headlines?country=${country}&page=${page}&pageSize=${pageSize}&apiKey=${process.env.API_KEY}`;
    fetchNews(url, res);
});

// Comments Endpoints
app.post('/comments', async (req, res) => {
    try {
        const { articleUrl, articleTitle, author, text } = req.body;

        if (!articleUrl || !author || !text) {
            return res.json({ success: false, error: 'Missing required fields' });
        }

        const comment = new Comment({
            articleUrl,
            articleTitle: articleTitle || 'Unknown',
            author,
            text
        });

        await comment.save();
        res.json({ success: true, data: comment, message: 'Comment posted successfully' });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

app.get('/comments/:articleUrl', async (req, res) => {
    try {
        const decodedUrl = decodeURIComponent(req.params.articleUrl);
        const comments = await Comment.find({ articleUrl: decodedUrl }).sort({ createdAt: -1 });
        res.json({ success: true, data: comments });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

app.post('/comments/:commentId/like', async (req, res) => {
    try {
        const comment = await Comment.findByIdAndUpdate(
            req.params.commentId,
            { $inc: { likes: 1 } },
            { new: true }
        );
        res.json({ success: true, data: comment });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// View Tracking
app.post('/track-view', async (req, res) => {
    try {
        const { articleUrl, articleTitle } = req.body;

        if (!articleUrl) {
            return res.json({ success: false, error: 'Missing articleUrl' });
        }

        const view = new View({
            articleUrl,
            articleTitle: articleTitle || 'Unknown',
            userAgent: req.headers['user-agent']
        });

        await view.save();
        res.json({ success: true });
    } catch (error) {
        console.error('View tracking error:', error);
        res.json({ success: false });
    }
});

// Get Article Statistics
app.get('/stats/:articleUrl', async (req, res) => {
    try {
        const decodedUrl = decodeURIComponent(req.params.articleUrl);
        const viewCount = await View.countDocuments({ articleUrl: decodedUrl });
        const commentCount = await Comment.countDocuments({ articleUrl: decodedUrl });

        res.json({
            success: true,
            views: viewCount,
            comments: commentCount,
            engagement: viewCount + (commentCount * 10) // weight comments more
        });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// ─────────────────── Authentication Routes ───────────────────
// Register
app.post('/auth/register', async (req, res) => {
    try {
        const { email, username, password } = req.body;
        
        if (!email || !username || !password) {
            return res.json({ success: false, error: 'Missing required fields' });
        }

        // Check if user already exists
        const userCheck = await pool.query(
            'SELECT id FROM users WHERE email = $1 OR username = $2',
            [email, username]
        );

        if (userCheck.rows.length > 0) {
            return res.json({ success: false, error: 'Email or username already exists' });
        }

        // Hash password
        const hashedPassword = await bcryptjs.hash(password, 10);

        // Create user
        const result = await pool.query(
            'INSERT INTO users (email, username, password) VALUES ($1, $2, $3) RETURNING id, email, username',
            [email, username, hashedPassword]
        );

        const user = result.rows[0];
        const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

        res.json({
            success: true,
            token,
            user: { id: user.id, username: user.username, email: user.email }
        });
    } catch (error) {
        console.error('Register error:', error);
        res.json({ success: false, error: error.message });
    }
});

// Login
app.post('/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.json({ success: false, error: 'Missing email or password' });
        }

        // Find user
        const result = await pool.query(
            'SELECT id, email, username, password FROM users WHERE email = $1',
            [email]
        );

        if (result.rows.length === 0) {
            return res.json({ success: false, error: 'User not found' });
        }

        const user = result.rows[0];

        // Check password
        const isPasswordValid = await bcryptjs.compare(password, user.password);
        if (!isPasswordValid) {
            return res.json({ success: false, error: 'Invalid password' });
        }

        const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

        res.json({
            success: true,
            token,
            user: { id: user.id, username: user.username, email: user.email }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.json({ success: false, error: error.message });
    }
});

// ─────────────────── Bookmark Routes ───────────────────
// Add bookmark
app.post('/bookmarks', verifyToken, async (req, res) => {
    try {
        const { articleId, articleTitle, articleUrl, urlToImage, sourceName, topic } = req.body;

        if (!articleId || !articleUrl) {
            return res.json({ success: false, error: 'Missing required fields' });
        }

        const result = await pool.query(
            `INSERT INTO bookmarks (user_id, article_id, article_title, article_url, url_to_image, source_name, topic)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [req.userId, articleId, articleTitle, articleUrl, urlToImage, sourceName, topic]
        );

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        // Check if it's a duplicate error
        if (error.code === '23505') {
            return res.json({ success: false, error: 'Article already bookmarked' });
        }
        console.error('Bookmark add error:', error);
        res.json({ success: false, error: error.message });
    }
});

// Get user bookmarks
app.get('/bookmarks', verifyToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM bookmarks WHERE user_id = $1 ORDER BY created_at DESC',
            [req.userId]
        );

        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Bookmarks fetch error:', error);
        res.json({ success: false, error: error.message });
    }
});

// Remove bookmark
app.delete('/bookmarks/:bookmarkId', verifyToken, async (req, res) => {
    try {
        const result = await pool.query(
            'DELETE FROM bookmarks WHERE id = $1 AND user_id = $2 RETURNING id',
            [req.params.bookmarkId, req.userId]
        );

        if (result.rows.length === 0) {
            return res.json({ success: false, error: 'Bookmark not found' });
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Bookmark delete error:', error);
        res.json({ success: false, error: error.message });
    }
});

// Check if article is bookmarked
app.get('/bookmarks/check/:articleId', verifyToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id FROM bookmarks WHERE user_id = $1 AND article_id = $2',
            [req.userId, req.params.articleId]
        );

        res.json({ 
            success: true, 
            isBookmarked: result.rows.length > 0,
            bookmarkId: result.rows[0]?.id || null
        });
    } catch (error) {
        console.error('Bookmark check error:', error);
        res.json({ success: false, error: error.message });
    }
});

// 

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/newsagg');

// // Comment schema and model
// const commentSchema = new mongoose.Schema({
//     articleUrl: String,
//     username: String,
//     content: String,
//     timestamp: { type: Date, default: Date.now }
// });

// const Comment = mongoose.model('Comment', commentSchema);

// // Endpoints
// app.post('/comments', async (req, res) => {
//     try {
//         const comment = new Comment(req.body);
//         await comment.save();
//         res.json({ success: true, data: comment });
//     } catch (error) {
//         res.json({ success: false, error: error.message });
//     }
// });

// app.get('/comments/:articleUrl', async (req, res) => {
//     try {
//         const comments = await Comment.find({ articleUrl: req.params.articleUrl });
//         res.json({ success: true, data: comments });
//     } catch (error) {
//         res.json({ success: false, error: error.message });
//     }
// });