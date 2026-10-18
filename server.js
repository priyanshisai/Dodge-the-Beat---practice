// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const spotifyRoutes = require('./routes/spotifyRoutes');
const { getSpotifyAccessToken } = require('./controllers/spotifyController');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Register Spotify API Routes
app.use('/api/spotify', spotifyRoutes);

// Vibe Mapping Categories
const VIBE_CATEGORIES = {
    "SAD": { query: "sad acoustic heartbreak", bpmSpeed: 4, badge: "SAD 😭" },
    "PARTY": { query: "club edm party bangers", bpmSpeed: 11, badge: "PARTY 🎉" },
    "FUN": { query: "feel good upbeat pop", bpmSpeed: 7, badge: "FUN 🥳" },
    "CHILL": { query: "lofi chill beats", bpmSpeed: 5, badge: "CHILL ☕" },
    "WORKOUT": { query: "gym motivation hype", bpmSpeed: 14, badge: "WORKOUT 🏋️" },
    "ROMANTIC": { query: "bollywood romantic hits", bpmSpeed: 6, badge: "ROMANTIC ❤️" }
};

// Helper: Query Spotify API for live genre tracks
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
                    genre: `${vibeKey} Match`,
                    bpmSpeed: category.bpmSpeed,
                    description: `${track.name} by ${track.artists[0]?.name}`,
                    spotifyTrackId: track.id
                }));
            }
        }
    } catch (err) {
        console.warn("Spotify catalog query failed:", err.message);
    }

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

// ==========================================
// REAL-TIME MULTIPLAYER SOCKET.IO ENGINE
// ==========================================
const activeRooms = {};

io.on('connection', (socket) => {
    console.log(`🔌 Player Connected: ${socket.id}`);

    // Join Room
    socket.on('joinRoom', ({ roomId, playerImage, characterName }) => {
        socket.join(roomId);
        if (!activeRooms[roomId]) {
            activeRooms[roomId] = { players: {}, gameStarted: false, trackId: "0Vj2y1A13Vi48CoI3NeP8f", speed: 7 };
        }

        activeRooms[roomId].players[socket.id] = {
            id: socket.id,
            lane: 1,
            score: 0,
            image: playerImage,
            name: characterName || 'Player',
            isHost: Object.keys(activeRooms[roomId].players).length === 0,
            isDead: false
        };

        io.to(roomId).emit('roomState', activeRooms[roomId]);
    });

    // Host selects song & syncs to opponent
    socket.on('selectTrack', ({ roomId, trackId, speed }) => {
        if (activeRooms[roomId]) {
            activeRooms[roomId].trackId = trackId;
            activeRooms[roomId].speed = speed;
            io.to(roomId).emit('trackSelected', { trackId, speed });
        }
    });

    // Start game simultaneously for all players in room
    socket.on('startGame', ({ roomId }) => {
        if (activeRooms[roomId]) {
            activeRooms[roomId].gameStarted = true;
            io.to(roomId).emit('gameStart', { speed: activeRooms[roomId].speed });
        }
    });

    // Sync player lane movement live
    socket.on('moveLane', ({ roomId, lane }) => {
        if (activeRooms[roomId] && activeRooms[roomId].players[socket.id]) {
            activeRooms[roomId].players[socket.id].lane = lane;
            socket.to(roomId).emit('opponentMoved', { id: socket.id, lane });
        }
    });

    // Sync score live
    socket.on('updateScore', ({ roomId, score }) => {
        if (activeRooms[roomId] && activeRooms[roomId].players[socket.id]) {
            activeRooms[roomId].players[socket.id].score = score;
            socket.to(roomId).emit('opponentScore', { id: socket.id, score });
        }
    });

    // CRITICAL FIX: Match Ends for BOTH players as soon as ONE player loses
    socket.on('playerDied', ({ roomId, score, obstacleHit, roast }) => {
        const room = activeRooms[roomId];
        if (room && room.players[socket.id]) {
            room.players[socket.id].isDead = true;
            room.players[socket.id].score = score;

            const playerIds = Object.keys(room.players);
            const loserId = socket.id;
            const winnerId = playerIds.find(id => id !== loserId);

            const loserName = room.players[loserId]?.name || 'Player';
            const winnerName = winnerId ? room.players[winnerId]?.name : 'Opponent';

            // Broadcast Match Over to BOTH players
            io.to(roomId).emit('matchEnded', {
                loserId,
                winnerId,
                loserName,
                winnerName,
                obstacleHit,
                roast: roast || "Got completely flattened!",
                scores: {
                    [loserId]: room.players[loserId]?.score || score,
                    [winnerId]: room.players[winnerId]?.score || 0
                }
            });
        }
    });

    // Handle Disconnect
    socket.on('disconnect', () => {
        for (const roomId in activeRooms) {
            if (activeRooms[roomId].players[socket.id]) {
                delete activeRooms[roomId].players[socket.id];
                io.to(roomId).emit('roomState', activeRooms[roomId]);
                if (Object.keys(activeRooms[roomId].players).length === 0) {
                    delete activeRooms[roomId];
                }
            }
        }
        console.log(`❌ Player Disconnected: ${socket.id}`);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Multiplayer Server running on http://localhost:${PORT}`));