const express = require("express");
const router = express.Router();
const { generalsearch } = require("../controllers/generalsearch.controller");
const { authMiddleware } = require("../middlewares");

// GET /api/search?q=keyword (optional auth for enhanced features)
router.get(
  "/search",
  (req, res, next) => {
    // Try to authenticate, but don't fail if no token
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      authMiddleware(req, res, next);
    } else {
      next();
    }
  },
  generalsearch
);

module.exports = router;
