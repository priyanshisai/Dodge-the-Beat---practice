// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const spotifyRoutes = require('./routes/spotifyRoutes');
const { getSpotifyAccessToken } = require('./controllers/spotifyController');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Register Spotify API Routes
app.use('/api/spotify', spotifyRoutes);

// Vibe Mapping for Gemma 4
const VIBE_CATEGORIES = {
    "SAD": { query: "sad acoustic heartbreak", bpmSpeed: 4, badge: "SAD 😭" },
    "PARTY": { query: "club edm party bangers", bpmSpeed: 11, badge: "PARTY 🎉" },
    "FUN": { query: "feel good upbeat pop", bpmSpeed: 7, badge: "FUN 🥳" },
    "CHILL": { query: "lofi chill beats", bpmSpeed: 5, badge: "CHILL ☕" },
    "WORKOUT": { query: "gym motivation hype", bpmSpeed: 14, badge: "WORKOUT 🏋️" },
    "ROMANTIC": { query: "bollywood romantic hits", bpmSpeed: 6, badge: "ROMANTIC ❤️" }
};

// Helper: Query Spotify API directly for live genre tracks
async function fetchGenreTracksFromSpotify(vibeKey) {
    const category = VIBE_CATEGORIES[vibeKey] || VIBE_CATEGORIES["FUN"];

    try {
        const token = await getSpotifyAccessToken();
        if (token) {
            const searchUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(category.query)}&type=track&limit=10`;
            const res = await fetch(searchUrl, { headers: { 'Authorization': `Bearer ${token}` } });
            const data = await res.json();

            if (data.tracks?.items?.length >= 3) {
                const shuffled = data.tracks.items.sort(() => 0.5 - Math.random()).slice(0, 3);
                return shuffled.map(track => ({
                    genre: `${vibeKey} - Spotify Match`,
                    bpmSpeed: category.bpmSpeed,
                    description: `${track.name} by ${track.artists[0]?.name}`,
                    spotifyTrackId: track.id
                }));
            }
        }
    } catch (err) {
        console.warn("Spotify catalog query failed, using default track IDs:", err.message);
    }

    // Fallback track list
    return [
        { genre: `${vibeKey} - Track 1`, bpmSpeed: category.bpmSpeed, description: `Vibe Track 1`, spotifyTrackId: "0Vj2y1A13Vi48CoI3NeP8f" },
        { genre: `${vibeKey} - Track 2`, bpmSpeed: category.bpmSpeed, description: `Vibe Track 2`, spotifyTrackId: "4cOdK2wGLETKBW3PvgPWqT" },
        { genre: `${vibeKey} - Track 3`, bpmSpeed: category.bpmSpeed, description: `Vibe Track 3`, spotifyTrackId: "60nZ122Pm911yO31912I5M" }
    ];
}

// Gemma 4 Image Analysis Endpoint
app.post('/api/analyze-character', async (req, res) => {
    try {
        const { imageBase64 } = req.body;
        if (!imageBase64) return res.status(400).json({ success: false, error: 'No image provided.' });

        const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemma-4-26b-a4b-it:generateContent?key=${GEMINI_API_KEY}`;

        const promptText = `
      Analyze this photo for an arcade game engine.
      Categorize this image into EXACTLY ONE of these 6 genres: "SAD", "PARTY", "FUN", "CHILL", "WORKOUT", "ROMANTIC".

      Return ONLY a JSON object:
      {
        "vibeCategory": "SAD" | "PARTY" | "FUN" | "CHILL" | "WORKOUT" | "ROMANTIC",
        "characterName": "Funny 2-word title based on image",
        "obstacles": ["4 funny obstacles related to room/background"],
        "roast": "1 sentence funny roast"
      }
    `;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: promptText },
                        { inline_data: { mime_type: 'image/jpeg', data: cleanBase64 } }
                    ]
                }],
                generationConfig: { response_mime_type: 'application/json' }
            })
        });

        const data = await response.json();
        let rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        let cleanText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();

        const jsonStart = cleanText.indexOf('{');
        const jsonEnd = cleanText.lastIndexOf('}');
        if (jsonStart !== -1 && jsonEnd !== -1) cleanText = cleanText.substring(jsonStart, jsonEnd + 1);

        const parsedData = JSON.parse(cleanText);
        const assignedVibe = parsedData.vibeCategory ? parsedData.vibeCategory.toUpperCase() : "FUN";

        // Dynamic Live Spotify Fetching based on photo vibe
        const dynamicSongs = await fetchGenreTracksFromSpotify(assignedVibe);

        res.json({
            success: true,
            gameData: {
                vibeCategory: assignedVibe,
                vibeBadge: VIBE_CATEGORIES[assignedVibe]?.badge || "FUN 🥳",
                characterName: parsedData.characterName || "Vibe Runner",
                obstacles: parsedData.obstacles || ["Flying Pumpkin", "Hostel Bed", "Salty Tomato", "Samosa"],
                musicOptions: dynamicSongs,
                roast: parsedData.roast || "You got completely flattened!"
            }
        });

    } catch (error) {
        console.error('Image analysis error:', error);
        const fallbackSongs = await fetchGenreTracksFromSpotify("FUN");
        res.json({
            success: true,
            gameData: {
                vibeCategory: "FUN",
                vibeBadge: "FUN 🥳",
                characterName: "Backup Speedster",
                obstacles: ["Flying Pumpkin", "Hostel Bed", "Salty Tomato", "Hot Samosa"],
                musicOptions: fallbackSongs,
                roast: "Network lag caught you before the flying bed did!"
            }
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));