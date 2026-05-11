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

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const API_KEY = process.env.API_KEY;

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/newsagg')
    .then(() => console.log('MongoDB connected successfully'))
    .catch(err => console.log('MongoDB connection error:', err));

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

// Server port
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

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