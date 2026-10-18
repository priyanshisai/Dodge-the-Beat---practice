// routes/spotifyRoutes.js
const express = require('express');
const router = express.Router();
const spotifyController = require('../controllers/spotifyController');

router.get('/search', spotifyController.searchTrack);

module.exports = router;