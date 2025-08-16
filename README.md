# Twitter Clone - Full Featured Backend

A comprehensive Twitter clone backend with authentication, posts, user profiles, and social features using dual-database architecture.

## Features

### 🔐 Authentication System

- ✅ User Registration & Login
- ✅ JWT Token Management & Refresh
- ✅ Password Updates
- ✅ Profile Management
- ✅ Secure Logout

### 📝 Posts & Content

- ✅ Create Posts (text, media, hashtags, mentions)
- ✅ Personalized User Feed
- ✅ Advanced Post Search & Filtering
- ✅ Trending Hashtags Analytics
- ✅ Post Interactions (Like/Unlike)
- ✅ Retweet System with Comments
- ✅ Comprehensive Post Analytics

### 👥 Social Features

- ✅ User Profiles (Public & Private)
- ✅ Follow/Unfollow System
- ✅ Followers & Following Lists
- ✅ User Discovery
- ✅ Profile Information Updates

### 📊 Analytics & Insights

- ✅ Post Engagement Metrics
- ✅ Trending Content Discovery
- ✅ User Activity Tracking
- ✅ Real-time Analytics

## Architecture

### Dual Database System

- **MongoDB**: User authentication, profiles, and social relationships
- **PostgreSQL**: Posts, interactions, analytics with complex queries

### Technology Stack

- **Backend**: Node.js, Express.js
- **Databases**: MongoDB (Mongoose), PostgreSQL (Sequelize)
- **Authentication**: JWT with bcrypt
- **Validation**: express-validator
- **Deployment**: Docker & Docker Compose

## API Endpoints (21 Total)

### 🔐 Authentication

| Method | Endpoint           | Description       | Auth Required |
| ------ | ------------------ | ----------------- | ------------- |
| POST   | /api/auth/register | Register new user | ❌            |
| POST   | /api/auth/login    | Login user        | ❌            |
| POST   | /api/auth/logout   | Logout user       | ✅            |
| POST   | /api/auth/refresh  | Refresh JWT token | ❌            |

### 📝 Posts

| Method | Endpoint                     | Description                     | Auth Required |
| ------ | ---------------------------- | ------------------------------- | ------------- |
| POST   | /api/posts                   | Create new post (media/poll)    | ✅            |
| GET    | /api/posts/live-feeds        | Get latest posts/retweets/polls | ✅            |
| GET    | /api/posts/feed              | Get personalized user feed      | ✅            |
| GET    | /api/posts/search            | Search posts with filters       | ✅            |
| GET    | /api/posts/trending          | Get trending hashtags           | ✅            |
| POST   | /api/posts/:postId/like      | Like/unlike post                | ✅            |
| POST   | /api/posts/:postId/retweet   | Retweet/unretweet post          | ✅            |
| POST   | /api/posts/:postId/comments  | Add a comment to a post         | ✅            |
| GET    | /api/posts/:postId/polls     | Get poll for a post             | ✅            |
| GET    | /api/posts/:postId/analytics | Get detailed post analytics     | ✅            |

### 👥 Users & Social

| Method | Endpoint                     | Description                          | Auth Required |
| ------ | ---------------------------- | ------------------------------------ | ------------- |
| GET    | /api/users/:userId/profile   | Get user public profile              | ✅            |
| PUT    | /api/users/profile           | Update authenticated user's profile  | ✅            |
| GET    | /api/users/me/profile        | Get own profile details              | ✅            |
| POST   | /api/users/:userId/follow    | Follow user                          | ✅            |
| DELETE | /api/users/:userId/follow    | Unfollow user                        | ✅            |
| GET    | /api/users/:userId/followers | Get user's followers list            | ✅            |
| GET    | /api/users/:userId/following | Get user's following list            | ✅            |
| GET    | /api/users/suggestions       | Get follow suggestions               | ✅            |
| GET    | /api/users/search            | Search users by username/displayName | ❌/✅         |

### 🗳️ Polls

| Method | Endpoint        | Description           | Auth Required |
| ------ | --------------- | --------------------- | ------------- |
| POST   | /api/polls/vote | Vote on a poll option | ✅            |

### 🔔 Notifications

| Method | Endpoint           | Description                              | Auth Required |
| ------ | ------------------ | ---------------------------------------- | ------------- |
| GET    | /api/notifications | Get notifications for authenticated user | ✅            |

### � General Search

| Method | Endpoint    | Description                  | Auth Required |
| ------ | ----------- | ---------------------------- | ------------- |
| GET    | /api/search | General search (users/posts) | ❌/✅         |

### 🔧 System

| Method | Endpoint | Description  | Auth Required |
| ------ | -------- | ------------ | ------------- |
| GET    | /health  | Health check | ❌            |

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Databases

```bash
# Start both MongoDB and PostgreSQL
docker-compose up -d

# Or start individually:
docker-compose up -d mongodb
docker-compose up -d postgresql
```

### 3. Environment Setup

Create a `.env` file with:

```env
PORT=8080
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/twitter_clone
POSTGRESQL_HOST=localhost
POSTGRESQL_PORT=5432
POSTGRESQL_DB=twitter_posts
POSTGRESQL_USER=postgres
POSTGRESQL_PASSWORD=password
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
CORS_ORIGIN=http://localhost:3000
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET=your-bucket-name
AWS_S3_REGION=your-region
```

### 4. Start Server

```bash
npm start
# or for development
npm run dev
```

Server will run on: `http://localhost:8080`

## Database Setup

The application uses a dual-database architecture:

### MongoDB Collections

- `users` - User accounts, authentication, profiles
- `userfollows` - Social relationships (followers/following)

### PostgreSQL Tables

- `posts` - All post content and metadata
- `user_likes` - Post like relationships
- `user_retweets` - Retweet relationships with comments
- `user_follows` - Cached follow relationships for post queries

## Testing with Postman

### 1. Register User

```http
POST http://localhost:8080/api/auth/register
Content-Type: application/json

{
  "username": "testuser",
  "email": "test@example.com",
  "password": "password123",
  "displayName": "Test User"
}
```

### 2. Login

```http
POST http://localhost:8080/api/auth/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "password123"
}
```

### 3. Create a Post

```http
POST http://localhost:8080/api/posts
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "content": "My first tweet! #hello @testuser",
  "contentType": "text",
  "location": "New York, NY"
}
```

### 4. Get Personalized Feed

```http
GET http://localhost:8080/api/posts/feed?limit=20&offset=0
Authorization: Bearer YOUR_JWT_TOKEN
```

### 5. Follow a User

```http
POST http://localhost:8080/api/users/USER_ID/follow
Authorization: Bearer YOUR_JWT_TOKEN
```

### 6. Unfollow a User

```http
DELETE http://localhost:8080/api/users/USER_ID/follow
Authorization: Bearer YOUR_JWT_TOKEN
```

### 7. Like a Post

```http
POST http://localhost:8080/api/posts/POST_ID/like
Authorization: Bearer YOUR_JWT_TOKEN
```

### 8. Retweet with Comment

```http
POST http://localhost:8080/api/posts/POST_ID/retweet
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "comment": "Great insight! 👍"
}
```

### 9. Comment on a Post

```http
POST http://localhost:8080/api/posts/POST_ID/comments
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "content": "Nice tweet!"
}
```

### 10. Get Poll for a Post

```http
GET http://localhost:8080/api/posts/POST_ID/polls
Authorization: Bearer YOUR_JWT_TOKEN
```

### 11. Search Posts

```http
GET http://localhost:8080/api/posts/search?q=javascript&type=text&limit=10
Authorization: Bearer YOUR_JWT_TOKEN
```

### 11. Get User Profile

```http
GET http://localhost:8080/api/users/profile/testuser
Authorization: Bearer YOUR_JWT_TOKEN
```

### 12. Update Profile

```http
PUT http://localhost:8080/api/users/profile
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "displayName": "Updated Name",
  "bio": "Software Developer | Tech Enthusiast",
  "location": "San Francisco, CA",
  "website": "https://myportfolio.com"
}
```

## Advanced Features

### 🔍 Search & Discovery

- **Hashtag Search**: Find posts by hashtags with trending analytics
- **User Mentions**: Automatic mention parsing and indexing
- **Content Filtering**: Search by content type, date range, and keywords
- **Trending Topics**: Real-time trending hashtag calculation

### 📊 Analytics & Metrics

- **Post Analytics**: Detailed engagement metrics per post
- **User Engagement**: Track likes, retweets, and interaction rates
- **Follower Growth**: Monitor social network expansion
- **Content Performance**: Hashtag performance and reach analysis

### 🔄 Social Interactions

- **Smart Feed**: Personalized content based on following relationships
- **Retweet System**: Quote tweets with comments and engagement tracking
- **Follow Recommendations**: Discover new users to follow
- **Social Validation**: Real-time like and follow counts

## Environment Variables

```env
# Server Configuration
PORT=8080
NODE_ENV=development

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/twitter_clone

# PostgreSQL Configuration
POSTGRESQL_HOST=localhost
POSTGRESQL_PORT=5432
POSTGRESQL_DB=twitter_posts
POSTGRESQL_USER=postgres
POSTGRESQL_PASSWORD=password

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# AWS S3 Configuration (required for file uploads)
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET=your-bucket-name
AWS_S3_REGION=your-region

# Security & Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
CORS_ORIGIN=http://localhost:3000
```

## Database Schema

### MongoDB Schema (User Data)

```javascript
// User Model
{
  username: String (unique),
  email: String (unique),
  password: String (hashed),
  displayName: String,
  bio: String,
  location: String,
  website: String,
  profilePicture: String,
  coverPhoto: String,
  isVerified: Boolean,
  createdAt: Date,
  updatedAt: Date
}

// UserFollow Model
{
  follower: ObjectId (ref: User),
  following: ObjectId (ref: User),
  createdAt: Date
}
```

### PostgreSQL Schema (Posts & Interactions)

```sql
-- Posts Table
CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    username VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    content_type VARCHAR(50) DEFAULT 'text',
    media_urls TEXT[],
    hashtags TEXT[],
    mentions TEXT[],
    location VARCHAR(255),
    like_count INTEGER DEFAULT 0,
    retweet_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User Interactions Tables
CREATE TABLE user_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    post_id UUID REFERENCES posts(id),
    username VARCHAR(255) NOT NULL,
    liked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_retweets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    post_id UUID REFERENCES posts(id),
    username VARCHAR(255) NOT NULL,
    comment TEXT,
    retweeted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Security Features

- ✅ **Password Security**: bcrypt hashing with salt rounds
- ✅ **JWT Authentication**: Secure token-based authentication
- ✅ **Rate Limiting**: Request throttling to prevent abuse
- ✅ **CORS Protection**: Cross-origin request security
- ✅ **Input Validation**: Comprehensive request validation with express-validator
- ✅ **SQL Injection Prevention**: Parameterized queries and ORM protection
- ✅ **XSS Protection**: Content sanitization and security headers
- ✅ **Database Connection Security**: Connection pooling and timeout handling

## Response Formats

### Success Response

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    // Response data here
  },
  "pagination": {
    // For paginated responses
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": "Error message",
  "message": "Detailed error description",
  "errors": [
    // For validation errors
    {
      "field": "email",
      "message": "Please enter a valid email"
    }
  ]
}
```

### Post Response Example

```json
{
  "success": true,
  "message": "Feed retrieved successfully",
  "posts": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "content": "Hello world! #firstpost",
      "username": "testuser",
      "hashtags": ["firstpost"],
      "mentions": [],
      "like_count": 5,
      "retweet_count": 2,
      "created_at": "2025-07-22T10:30:00Z",
      "isLiked": false,
      "isRetweeted": true
    }
  ],
  "pagination": {
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}
```

## File Structure

```
controllers/
  auth.controller.js         # Authentication logic
  posts.controller.js        # Posts, feed, analytics, polls
  users.controller.js        # User profile & social features
  poll.controller.js         # Poll voting and management
  notifications.controller.js# Notifications logic
  generalsearch.controller.js# General search logic
factories/                   # Error and response factories
middlewares/                 # Auth, validation, upload, etc.
migrations/                  # DB migration scripts
models/
  UserModels.js              # MongoDB user model
  PostgreSQLPost.js          # PostgreSQL post model (with poll support)
  PostgreSQLModels.js        # User interactions models
  PollsModels/               # Poll, PollOption, PollVote models
routes/
  auth.routes.js             # Authentication routes
  posts.routes.js            # Posts & poll routes
  users.routes.js            # User & social routes
  poll.routes.js             # Poll voting routes
  notifications.routes.js    # Notification routes
  generalsearch.routes.js    # Search routes
schemas/                     # Yup validation schemas
utils/
  s3.js                      # AWS S3 file upload/download logic
  notificationService.js      # Notification helpers
  socket.js                   # Socket.IO helpers
uploads/                     # Uploaded files (images, videos)
views/                       # API and system views
app.js                       # Express app configuration
docker-compose.yml           # Docker orchestration
package.json                 # Project dependencies
.env                         # Environment variables
README.md                    # Project documentation
```

## Additional Features

- **File Uploads:** Supports image/video uploads via AWS S3. You must set the AWS S3 environment variables in your `.env` file (see above). See `utils/s3.js` for configuration and upload logic. Use `multipart/form-data` for media posts.
- **Polls:** Create posts with polls by sending a `poll` field (as JSON string) in `multipart/form-data` to `/api/posts`. Vote on polls via `/api/polls/vote`.
- **Live Feed:** Use `/api/posts/live-feeds` for the latest posts, retweets, and polls (paginated, latest first).
- **Real-time:** Socket.IO for notifications and live updates.

## Note

Some endpoint names and request/response formats may differ from earlier documentation. Refer to Swagger docs at `/api/docs` or the latest code for up-to-date details.

## Development Commands

```bash
# Install dependencies
npm install

# Start development server with auto-reload
npm run dev

# Start production server
npm start

# Run tests (if implemented)
npm test

# Check database connections
curl http://localhost:8080/health

# Start specific database services
docker-compose up -d mongodb
docker-compose up -d postgresql

# View logs
docker-compose logs -f
```

## Production Deployment

### Docker Deployment

```bash
# Build and start all services
docker-compose up -d

# Scale the application
docker-compose up -d --scale app=3

# Check service status
docker-compose ps
```

### Environment Configuration

- Set strong `JWT_SECRET` in production
- Configure production database URLs
- Enable SSL/TLS for database connections
- Set appropriate CORS origins
- Configure rate limiting for production load
