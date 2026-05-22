# Account & Bookmark Setup Guide

## ✅ Implementation Complete

I've successfully implemented full account and bookmark functionality for your NewsAgg application using PostgreSQL for user/bookmark storage and JWT authentication.

## 📁 Files Created/Modified

### Backend (server/)
- **Modified**: `server.js`
  - Added User & Bookmark PostgreSQL tables
  - JWT middleware for auth
  - Auth routes: `/auth/register`, `/auth/login`
  - Bookmark routes: POST/GET/DELETE `/bookmarks`, GET `/bookmarks/check/:articleId`
  - Password hashing with bcryptjs

### Frontend (client/src/app/)

**New Services:**
- `services/authService.ts` - Authentication API calls & token management
- `services/bookmarkService.ts` - Bookmark CRUD operations

**New Pages:**
- `pages/BookmarksPage.tsx` - Display user bookmarks with remove functionality

**Modified Components:**
- `contexts/AppContext.tsx` - Added user & bookmark state
- `components/AccountDrawer.tsx` - Full login/signup UI with forms
- `components/NewsCard.tsx` - Bookmark button on each article card
- `components/Header.tsx` - Bookmarks link with badge counter
- `routes.tsx` - Added `/bookmarks` route

## 🚀 Setup Instructions

### 1. Install Dependencies (Already Done ✅)
```bash
cd server
npm install jsonwebtoken bcryptjs
```

### 2. Configure Environment Variables

Create/update `.env` file in the **server** folder:
```env
DATABASE_URL=postgresql://user:password@host:port/database
JWT_SECRET=your-very-secret-key-change-this-in-production
MONGODB_URI=mongodb://localhost:27017/newsagg
API_KEY=your_newsapi_key
PORT=3000
```

**Optional for client** (`client/.env.local`):
```env
VITE_API_URL=http://localhost:3000
```

### 3. Start the Application

**Terminal 1 - Server:**
```bash
cd server
npm start
```

**Terminal 2 - Client:**
```bash
cd client
npm run dev
```

## 🔐 Features Implemented

### Authentication
- **Sign Up**: Create account with email, username, password
- **Sign In**: Login with email/password
- **Session Persistence**: Tokens stored in localStorage
- **Sign Out**: Clear session and redirect to home

### Bookmarks
- **Add Bookmark**: Click bookmark icon on any article card
- **View Bookmarks**: Navigate to `/bookmarks` route (only when logged in)
- **Remove Bookmark**: Delete bookmarks from the Bookmarks page
- **Bookmark Count**: Badge in header shows total bookmarks

### UI/UX
- **Login/Signup Forms**: In AccountDrawer component
- **Bookmark Button**: Appears on NewsCard, changes color when active
- **Bookmarks Page**: Grid layout with article preview, source, and actions
- **Protected Routes**: Bookmarks page requires authentication
- **Error Handling**: User-friendly error messages

## 📊 Database Schema

### Users Table
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  avatar VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

### Bookmarks Table
```sql
CREATE TABLE bookmarks (
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
```

## 🧪 Testing Workflow

1. **Open app**: http://localhost:5173 (or your Vite port)
2. **Click Account button** (avatar in top-left)
3. **Click "Create Account"**
4. **Fill in form**: Email, username, password
5. **Sign Up** → Returns to account view, shows logout button
6. **Browse articles** and click bookmark icon (⭐) on any card
7. **View bookmarks**: Click bookmark link in header or navigate to `/bookmarks`
8. **Manage bookmarks**: Remove articles from bookmarks page
9. **Sign out**: Click "Sign Out" in account drawer

## 🔄 API Endpoints

### Authentication
```
POST /auth/register
POST /auth/login

Headers: Content-Type: application/json
Body: { email, username, password } for register
      { email, password } for login
```

### Bookmarks (Protected - Requires JWT)
```
POST /bookmarks
  - Headers: Authorization: Bearer <token>
  - Body: { articleId, articleTitle, articleUrl, urlToImage, sourceName, topic }

GET /bookmarks
  - Headers: Authorization: Bearer <token>

GET /bookmarks/check/:articleId
  - Headers: Authorization: Bearer <token>

DELETE /bookmarks/:bookmarkId
  - Headers: Authorization: Bearer <token>
```

## 🐛 Troubleshooting

### "No token provided" Error
- Make sure you're logged in before accessing bookmarks
- Check localStorage for `authToken`

### "Invalid token" Error
- Token may have expired (7 days)
- Try logging out and back in

### Bookmarks not persisting
- Verify PostgreSQL is running
- Check `DATABASE_URL` in `.env`
- Check server console for database errors

### Password requirements
- Minimum 6 characters during signup

## 🎨 Styling Notes

All components use:
- **Tailwind CSS** for responsive design
- **Dark/Light theme support** via `isDark` from AppContext
- **Lucide React** icons (Bookmark, UserPlus, LogOut, etc.)
- **Motion React** for smooth animations

## 📝 Next Steps (Optional Enhancements)

- Add email verification
- Implement password reset
- Add social login (Google, GitHub)
- Add bookmark collections/folders
- Add bookmark sharing
- Add reading list/queue feature
- Export bookmarks to PDF/CSV

---

**Setup complete!** You now have a full account system with bookmark functionality. 🎉
