const express = require("express");
const { getNotifications } = require("../controllers/notifications.controller");
const { authMiddleware } = require("../middlewares");

const router = express.Router();

// GET /api/notifications
router.get("/", authMiddleware, getNotifications);

module.exports = router;
