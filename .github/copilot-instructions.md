<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# Twitter/X Clone Backend - Copilot Instructions

## Project Overview

This is a comprehensive backend API for a Twitter/X clone built with Node.js, Express, MongoDB, PostgreSQL, and Socket.IO. The project implements social media features including posts, polls, real-time updates, user management, and analytics.

## Code Style and Patterns

### General Guidelines

- Use async/await instead of promises where possible
- Follow RESTful API conventions
- Use consistent error handling with try-catch blocks
- Implement proper input validation using express-validator
- Use meaningful variable and function names
- Add JSDoc comments for complex functions

### Database Patterns

- **MongoDB**: Use for user data, posts, polls, and notifications
- **PostgreSQL**: Use for analytics, trends, and session management
- Always use indexes for performance-critical queries
- Use mongoose virtual fields for computed properties
- Implement proper schema validation

### Authentication & Security

- Use JWT tokens for authentication
- Implement rate limiting on all API endpoints
- Validate and sanitize all user inputs
- Use bcrypt for password hashing
- Implement proper CORS configuration

### Real-time Features

- Use Socket.IO for real-time updates
- Implement proper socket authentication
- Use rooms for targeted broadcasting
- Handle connection/disconnection gracefully

### Error Handling

- Always return consistent error responses
- Use HTTP status codes appropriately
- Log errors for debugging but don't expose sensitive information
- Implement global error handling middleware

### File Structure

- Controllers: Handle HTTP requests and responses
- Models: Define database schemas and validation
- Services: Contain business logic
- Utils: Helper functions and utilities
- Middleware: Custom middleware functions

## API Response Format

```javascript
// Success Response
{
  "message": "Success message",
  "data": {} // actual data
}

// Error Response
{
  "error": "Error message",
  "details": {} // optional error details
}
```

## Common Patterns to Follow

### Controller Pattern

```javascript
exports.controllerFunction = async (req, res) => {
  try {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Business logic
    const result = await someService();

    // Send response
    res.json({ message: "Success", data: result });
  } catch (error) {
    console.error("Controller error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
```

### Middleware Pattern

```javascript
const middleware = async (req, res, next) => {
  try {
    // Middleware logic
    next();
  } catch (error) {
    res.status(500).json({ error: "Middleware error" });
  }
};
```

### Model Pattern

```javascript
const schema = new mongoose.Schema(
  {
    // Define schema fields
  },
  {
    timestamps: true,
  }
);

// Add virtuals for computed properties
schema.virtual("computedField").get(function () {
  return this.field1 + this.field2;
});

// Add methods
schema.methods.customMethod = function () {
  // Method implementation
};
```

## Features to Implement

### Core Features

- User registration and authentication
- Post creation, editing, and deletion
- Like, retweet, and reply functionality
- Follow/unfollow users
- Real-time notifications
- Poll creation and voting
- Media upload handling
- Hashtag and mention support

### Advanced Features

- Search functionality
- Trending hashtags
- User analytics
- Rate limiting
- Content moderation
- Push notifications
- Mobile API compatibility

## Dependencies Usage

### Key Dependencies

- **express**: Web framework
- **mongoose**: MongoDB ODM
- **pg**: PostgreSQL client
- **socket.io**: Real-time communication
- **bcrypt**: Password hashing
- **jsonwebtoken**: JWT authentication
- **multer**: File upload handling
- **helmet**: Security headers
- **cors**: Cross-origin resource sharing
- **express-validator**: Input validation
- **express-rate-limit**: Rate limiting

### Testing

- Use Jest for unit testing
- Use Supertest for API testing
- Test both success and error cases
- Mock external dependencies

## Environment Variables

Always use environment variables for:

- Database connection strings
- JWT secrets
- API keys
- File upload paths
- Rate limiting configurations

## Performance Considerations

- Use pagination for large data sets
- Implement caching where appropriate
- Optimize database queries with indexes
- Use compression middleware
- Handle file uploads efficiently

## Security Best Practices

- Never expose sensitive information in responses
- Implement proper authentication on all protected routes
- Use HTTPS in production
- Validate all user inputs
- Implement proper session management
- Use secure file upload practices
