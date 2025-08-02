const express = require("express");
const { getNotifications } = require("../controllers/notifications.controller");
const { authMiddleware } = require("../middlewares");

const router = express.Router();

/**
 * @swagger
 * /notifications:
 *   get:
 *     summary: Get notifications for the authenticated user
 *     description: Returns a list of notifications for the currently logged-in user (max 50, newest first).
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of notifications
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Notification'
 */

// GET /api/notifications
router.get("/notifications", authMiddleware, getNotifications);

module.exports = router;
