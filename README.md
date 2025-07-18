# Twitter Clone - Authentication Only

A simplified version of the Twitter clone backend with only authentication functionality.

## Features

- ✅ User Registration
- ✅ User Login
- ✅ JWT Token Management
- ✅ Password Updates
- ✅ Token Refresh
- ✅ Current User Info
- ✅ Logout

## API Endpoints

### Authentication (6 endpoints)

| Method | Endpoint             | Description       | Auth Required |
| ------ | -------------------- | ----------------- | ------------- |
| POST   | `/api/auth/register` | Register new user | ❌            |
| POST   | `/api/auth/login`    | Login user        | ❌            |
| POST   | `/api/auth/logout`   | Logout user       | ✅            |
| POST   | `/api/auth/refresh`  | Refresh JWT token | ❌            |
| GET    | `/api/auth/me`       | Get current user  | ✅            |
| PUT    | `/api/auth/password` | Update password   | ✅            |

### System

| Method | Endpoint  | Description  | Auth Required |
| ------ | --------- | ------------ | ------------- |
| GET    | `/health` | Health check | ❌            |

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Start MongoDB

```bash
docker-compose up -d
```

### 3. Start Server

```bash
npm start
```

Server will run on: `http://localhost:3000`

## Testing with Postman

### 1. Register User

```http
POST http://localhost:3000/api/auth/register
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
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "password123"
}
```

### 3. Get Current User

```http
GET http://localhost:3000/api/auth/me
Authorization: Bearer YOUR_JWT_TOKEN
```

### 4. Update Password

```http
PUT http://localhost:3000/api/auth/password
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "currentPassword": "password123",
  "newPassword": "newpassword456"
}
```

## Environment Variables

Create a `.env` file with:

```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/twitter_clone
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
CORS_ORIGIN=http://localhost:3000
```

## Database

- **MongoDB**: User data and authentication
- **Collections**: `users`

## Security Features

- ✅ Password hashing with bcrypt
- ✅ JWT token authentication
- ✅ Rate limiting
- ✅ CORS protection
- ✅ Helmet security headers
- ✅ Input validation

## Response Format

### Success Response

```json
{
  "message": "Success message",
  "token": "jwt-token-here",
  "user": {
    "id": "user-id",
    "username": "username",
    "email": "email",
    "displayName": "Display Name"
  }
}
```

### Error Response

```json
{
  "error": "Error message",
  "errors": [
    {
      "field": "email",
      "message": "Please enter a valid email"
    }
  ]
}
```

## File Structure

```
src/
├── controllers/
│   └── authController.js
├── models/
│   └── User.js
├── middleware/
│   └── auth.js
├── routes/
│   └── auth.js
├── config/
│   └── mongodb.js
└── app.js
```

## Development

```bash
# Development mode with auto-restart
npm run dev

# Run tests
npm test

# Check server health
curl http://localhost:3000/health
```

Perfect for building authentication microservices or as a starting point for larger applications!
