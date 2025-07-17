/**
 * Authentication Response Views
 *
 * These functions format the response data for authentication endpoints
 * Following the MVC pattern - Views handle data presentation
 */

// Format user data for responses (exclude sensitive info)
const formatUserResponse = (user) => {
  return {
    id: user._id,
    username: user.username,
    email: user.email,
    displayName: user.displayName,
    bio: user.bio || "",
    profilePicture: user.profilePicture || "",
    coverPicture: user.coverPicture || "",
    isVerified: user.isVerified,
    isPrivate: user.isPrivate,
    location: user.location || "",
    website: user.website || "",
    joinDate: user.createdAt,
    lastActive: user.lastActive,
    followersCount: user.followers ? user.followers.length : 0,
    followingCount: user.following ? user.following.length : 0,
  };
};

// Success response for login/register
const authSuccessView = (message, token, user) => {
  return {
    success: true,
    message,
    token,
    user: formatUserResponse(user),
    timestamp: new Date().toISOString(),
  };
};

// Success response for user data
const userDataView = (message, user) => {
  return {
    success: true,
    message,
    user: formatUserResponse(user),
    timestamp: new Date().toISOString(),
  };
};

// Success response for operations without data
const successView = (message, additionalData = {}) => {
  return {
    success: true,
    message,
    timestamp: new Date().toISOString(),
    ...additionalData,
  };
};

// Error response format
const errorView = (error, statusCode = 500, details = null) => {
  return {
    success: false,
    error,
    statusCode,
    details,
    timestamp: new Date().toISOString(),
  };
};

// Validation error response
const validationErrorView = (errors) => {
  return {
    success: false,
    error: "Validation failed",
    statusCode: 400,
    errors: errors.array(),
    timestamp: new Date().toISOString(),
  };
};

module.exports = {
  formatUserResponse,
  authSuccessView,
  userDataView,
  successView,
  errorView,
  validationErrorView,
};
