# Twitter Clone

## Current Structure:

```
TWITTER/
├── src/
│   ├── app.js                 # Main server file (auth-only)
│   ├── server.js              # Alternative server file
│   ├── config/
│   │   └── mongodb.js         # MongoDB connection
│   ├── controllers/
│   │   └── authController.js  # Auth logic (simplified)
│   ├── middleware/
│   │   └── auth.js            # JWT middleware
│   ├── models/
│   │   └── User.js            # User model
│   └── routes/
│       └── auth.js            # Auth routes
├── tests/
│   └── auth.test.js           # Auth tests
├── docker-compose.yml         # MongoDB only
├── package.json               # Simplified dependencies
├── .env                       # Auth-only environment
└── README.md                  # Auth-only documentation
```

## API Endpoints (Auth Only):

1. POST /api/auth/register - Register user
2. POST /api/auth/login - Login user
3. POST /api/auth/logout - Logout user
4. POST /api/auth/refresh - Refresh token
5. GET /api/auth/me - Get current user
6. PUT /api/auth/password - Update password
7. GET /health - Health check

## Dependencies (Simplified):

- express (4.18.2)
- mongoose (for MongoDB)
- jsonwebtoken (for JWT)
- bcrypt (for password hashing)
- express-validator (for validation)
- Other essential middleware only

## Ready to Use:

- ✅ MongoDB running via Docker
- ✅ Server running on port 3000
- ✅ Authentication API working
- ✅ Clean, minimal codebase
- ✅ JWT token management
- ✅ Password security
- ✅ Input validation
- ✅ Error handling

Perfect for auth microservices or starting new projects!
