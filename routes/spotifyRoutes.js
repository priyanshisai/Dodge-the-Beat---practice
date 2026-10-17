// routes/spotifyRoutes.js
const express = require('express');
const router = express.Router();
const spotifyController = require('../controllers/spotifyController');

// GET /api/spotify/search?query=chikni+chameli
router.get('/search', spotifyController.searchTrack);

module.exports = router;