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
                    spotifyTrackId: track.id,
                    previewUrl: track.preview_url || null
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

// Default obstacles with stickers/emojis
const DEFAULT_OBSTACLES = [
    { name: "Flying Pumpkin", emoji: "🎃" },
    { name: "Hostel Bed", emoji: "🛏️" },
    { name: "Salty Tomato", emoji: "🍅" },
    { name: "Hot Samosa", emoji: "🥟" }
];

function resolveObstacleEmoji(name, vibe = "FUN") {
    if (!name || typeof name !== 'string') return "⚡";
    const lower = name.toLowerCase();

    if (lower.includes('pumpkin') || lower.includes('halloween')) return "🎃";
    if (lower.includes('bed') || lower.includes('pillow') || lower.includes('mattress')) return "🛏️";
    if (lower.includes('tomato')) return "🍅";
    if (lower.includes('samosa') || lower.includes('dumpling') || lower.includes('pakora')) return "🥟";
    if (lower.includes('pizza')) return "🍕";
    if (lower.includes('burger')) return "🍔";
    if (lower.includes('coffee') || lower.includes('chai') || lower.includes('tea') || lower.includes('mug')) return "☕";
    if (lower.includes('book') || lower.includes('textbook') || lower.includes('study') || lower.includes('notes')) return "📚";
    if (lower.includes('exam') || lower.includes('paper') || lower.includes('pen') || lower.includes('pencil')) return "📝";
    if (lower.includes('laptop') || lower.includes('computer') || lower.includes('screen') || lower.includes('code')) return "💻";
    if (lower.includes('phone') || lower.includes('mobile')) return "📱";
    if (lower.includes('shoe') || lower.includes('sneaker') || lower.includes('boot')) return "👟";
    if (lower.includes('dumbbell') || lower.includes('weight') || lower.includes('gym')) return "🏋️";
    if (lower.includes('beer') || lower.includes('drink') || lower.includes('alcohol') || lower.includes('bottle')) return "🍺";
    if (lower.includes('cocktail') || lower.includes('wine') || lower.includes('glass')) return "🍸";
    if (lower.includes('disco') || lower.includes('ball')) return "🪩";
    if (lower.includes('party') || lower.includes('confetti') || lower.includes('popper')) return "🎉";
    if (lower.includes('guitar') || lower.includes('music') || lower.includes('instrument')) return "🎸";
    if (lower.includes('headphone') || lower.includes('earphone')) return "🎧";
    if (lower.includes('mic') || lower.includes('microphone')) return "🎤";
    if (lower.includes('ghost')) return "👻";
    if (lower.includes('skull') || lower.includes('skeleton')) return "💀";
    if (lower.includes('alien') || lower.includes('ufo')) return "👽";
    if (lower.includes('cat') || lower.includes('kitten')) return "🐱";
    if (lower.includes('dog') || lower.includes('puppy') || lower.includes('doge')) return "🐶";
    if (lower.includes('poop')) return "💩";
    if (lower.includes('fire') || lower.includes('flame') || lower.includes('hot')) return "🔥";
    if (lower.includes('bomb') || lower.includes('tnt')) return "💣";
    if (lower.includes('heart') || lower.includes('love')) return "💖";
    if (lower.includes('tear') || lower.includes('cry') || lower.includes('tissue')) return "😭";
    if (lower.includes('clock') || lower.includes('alarm') || lower.includes('watch')) return "⏰";
    if (lower.includes('car') || lower.includes('bus') || lower.includes('truck')) return "🚗";
    if (lower.includes('banana')) return "🍌";
    if (lower.includes('donut') || lower.includes('doughnut')) return "🍩";
    if (lower.includes('cake')) return "🎂";
    if (lower.includes('cactus')) return "🌵";
    if (lower.includes('money') || lower.includes('cash') || lower.includes('dollar')) return "💵";
    if (lower.includes('shades') || lower.includes('sunglasses')) return "🕶️";

    const vibeFallbacks = {
        "PARTY": ["🪩", "🎉", "🍹", "🕶️"],
        "SAD": ["🌧️", "💔", "🧻", "🥀"],
        "FUN": ["🎈", "🛹", "🍌", "🍕"],
        "CHILL": ["☕", "🛋️", "🌴", "🎧"],
        "WORKOUT": ["🏋️", "🥊", "🥑", "⚡"],
        "ROMANTIC": ["🌹", "💌", "🍫", "💖"]
    };
    const list = vibeFallbacks[vibe] || vibeFallbacks["FUN"];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = (hash + name.charCodeAt(i)) % list.length;
    return list[hash];
}

function normalizeObstacles(obstacles, vibe = "FUN") {
    if (!Array.isArray(obstacles) || obstacles.length === 0) return DEFAULT_OBSTACLES;
    return obstacles.slice(0, 4).map(item => {
        if (typeof item === 'string') {
            return {
                name: item,
                emoji: resolveObstacleEmoji(item, vibe)
            };
        } else if (item && typeof item === 'object') {
            const name = item.name || item.label || "Obstacle";
            return {
                name: name,
                emoji: item.emoji || resolveObstacleEmoji(name, vibe)
            };
        }
        return { name: "Mystery Item", emoji: "🎁" };
    });
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
        "obstacles": [
          { "name": "Absurd physical obstacle 1 found/related to room", "emoji": "matching single emoji" },
          { "name": "Absurd physical obstacle 2 found/related to room", "emoji": "matching single emoji" },
          { "name": "Absurd physical obstacle 3 found/related to room", "emoji": "matching single emoji" },
          { "name": "Absurd physical obstacle 4 found/related to room", "emoji": "matching single emoji" }
        ],
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
        const finalObstacles = normalizeObstacles(parsedData.obstacles, assignedVibe);

        res.json({
            success: true,
            gameData: {
                vibeCategory: assignedVibe,
                vibeBadge: VIBE_CATEGORIES[assignedVibe]?.badge || "FUN 🥳",
                characterName: parsedData.characterName || "Vibe Runner",
                obstacles: finalObstacles,
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
                obstacles: DEFAULT_OBSTACLES,
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
            activeRooms[roomId] = {
                players: {},
                gameStarted: false,
                trackId: "0Vj2y1A13Vi48CoI3NeP8f",
                trackName: "Vibe Track 1",
                speed: 7
            };
        }

        const room = activeRooms[roomId];
        const isHost = Object.keys(room.players).length === 0;

        room.players[socket.id] = {
            id: socket.id,
            lane: 1,
            score: 0,
            image: playerImage,
            name: characterName || 'Player',
            isHost: isHost,
            isReady: isHost ? true : false,
            isDead: false
        };

        io.to(roomId).emit('roomState', room);
    });

    // Guest Player clicks "I'm Ready!"
    socket.on('playerReady', ({ roomId }) => {
        const room = activeRooms[roomId];
        if (room && room.players[socket.id]) {
            room.players[socket.id].isReady = true;
            io.to(roomId).emit('roomState', room);
        }
    });

    // Host selects song & syncs to opponent
    socket.on('selectTrack', ({ roomId, trackId, speed, trackName }) => {
        const room = activeRooms[roomId];
        if (room) {
            room.trackId = trackId;
            room.speed = speed;
            room.trackName = trackName || "Spotify Beat";
            io.to(roomId).emit('trackSelected', {
                trackId,
                speed,
                trackName: room.trackName
            });
        }
    });

    // Only Host can start game when guest is ready
    socket.on('startGame', ({ roomId }) => {
        const room = activeRooms[roomId];
        if (room && room.players[socket.id]?.isHost) {
            room.gameStarted = true;
            io.to(roomId).emit('gameStart', { speed: room.speed });
        }
    });

    // Sync player lane movement live
    socket.on('moveLane', ({ roomId, lane }) => {
        const room = activeRooms[roomId];
        if (room && room.players[socket.id]) {
            room.players[socket.id].lane = lane;
            socket.to(roomId).emit('opponentMoved', { id: socket.id, lane });
        }
    });

    // Sync score live
    socket.on('updateScore', ({ roomId, score }) => {
        const room = activeRooms[roomId];
        if (room && room.players[socket.id]) {
            room.players[socket.id].score = score;
            socket.to(roomId).emit('opponentScore', { id: socket.id, score });
        }
    });

    // Match Ends for BOTH players as soon as ONE player loses
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
server.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));