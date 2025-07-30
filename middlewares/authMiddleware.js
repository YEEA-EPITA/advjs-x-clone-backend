const jwt = require("jsonwebtoken");
const User = require("../models/UserModels");
const { authController } = require("../controllers");
const { ErrorFactory } = require("../factories");

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return ErrorFactory.tokenMissing({
        res,
        message: "Authentication token is missing",
      });
    }

    // Check if token is blacklisted
    if (authController.isTokenBlacklisted(token)) {
      return ErrorFactory.tokenRevoked({ res });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return ErrorFactory.tokenInvalid({
        res,
        message: "Invalid token. User not found.",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return ErrorFactory.internalServerError({
      res,
      message: "Token verification failed.",
    });
  }
};

module.exports = authMiddleware;
