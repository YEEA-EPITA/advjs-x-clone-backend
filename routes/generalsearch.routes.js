const express = require("express");
const router = express.Router();
const { generalsearch } = require("../controllers/generalsearch.controller");

// GET /api/search?q=keyword
router.get("/search", generalsearch);

module.exports = router;
