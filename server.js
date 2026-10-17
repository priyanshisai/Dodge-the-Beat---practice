// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public')); // Serves files from public directory

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// API Endpoint for Image & Vibe Analysis
app.post('/api/analyze-character', async (req, res) => {
    try {
        const { imageBase64 } = req.body;

        if (!imageBase64) {
            return res.status(400).json({ success: false, error: 'No image data provided.' });
        }

        const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemma-4-26b-a4b-it:generateContent?key=${GEMINI_API_KEY}`;

        const promptText = `
      You are an arcade game engine API. Look at this user photo and generate parameters for a 4-lane runner game.
      CRITICAL: Return ONLY a raw JSON object. Do NOT include markdown code blocks, do NOT write bullet points, and do NOT include any introductory or concluding conversational text.

      Schema:
      {
        "characterName": "Short funny character title based on image",
        "obstacles": ["4 absurd physical items that fit this person's vibe, e.g. Flying Pumpkin, Hot Hostel Bed, Salty Tomato, Canteen Samosa"],
        "musicOptions": [
          {"genre": "Chill Synthwave", "bpmSpeed": 4, "description": "80 BPM Pace", "spotifyTrackId": "4cOdK2wGLETKBW3PvgPWqT"},
          {"genre": "Campus Pop", "bpmSpeed": 7, "description": "120 BPM Pace", "spotifyTrackId": "0Vj2y1A13Vi48CoI3NeP8f"},
          {"genre": "Cyberpunk Rush", "bpmSpeed": 11, "description": "160 BPM Pace", "spotifyTrackId": "60nZ122Pm911yO31912I5M"}
        ],
        "roast": "A hilarious 1-sentence game over roast."
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
                generationConfig: {
                    response_mime_type: 'application/json'
                }
            })
        });

        const data = await response.json();

        if (data.error) {
            console.error("Google AI Studio API Error:", data.error);
            throw new Error(data.error.message || "API error occurred");
        }

        let rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        let cleanText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();

        const jsonStart = cleanText.indexOf('{');
        const jsonEnd = cleanText.lastIndexOf('}');

        if (jsonStart !== -1 && jsonEnd !== -1) {
            cleanText = cleanText.substring(jsonStart, jsonEnd + 1);
        }

        let parsedData;
        try {
            parsedData = JSON.parse(cleanText);
        } catch (parseErr) {
            console.warn("⚠️ JSON Parse failed, using fallback mock data:", parseErr.message);
            parsedData = {
                characterName: "The Unstoppable Runner",
                obstacles: ["Flying Pumpkin", "Hostel Bed", "Salty Tomato", "Hot Samosa"],
                musicOptions: [
                    { genre: "Chill Synthwave", bpmSpeed: 4, description: "80 BPM Pace", spotifyTrackId: "4cOdK2wGLETKBW3PvgPWqT" },
                    { genre: "Campus Pop", bpmSpeed: 7, description: "120 BPM Pace", spotifyTrackId: "0Vj2y1A13Vi48CoI3NeP8f" },
                    { genre: "Cyberpunk Rush", bpmSpeed: 11, description: "160 BPM Pace", spotifyTrackId: "60nZ122Pm911yO31912I5M" }
                ],
                roast: "You got completely flattened before making it to LT-1!"
            };
        }

        res.json({ success: true, gameData: parsedData });

    } catch (error) {
        console.error('Server error processing image:', error);
        res.json({
            success: true,
            gameData: {
                characterName: "Backup Speedster",
                obstacles: ["Flying Pumpkin", "Hostel Bed", "Salty Tomato", "Hot Samosa"],
                musicOptions: [
                    { genre: "Chill Synthwave", bpmSpeed: 4, description: "80 BPM Pace", spotifyTrackId: "4cOdK2wGLETKBW3PvgPWqT" },
                    { genre: "Campus Pop", bpmSpeed: 7, description: "120 BPM Pace", spotifyTrackId: "0Vj2y1A13Vi48CoI3NeP8f" },
                    { genre: "Cyberpunk Rush", bpmSpeed: 11, description: "160 BPM Pace", spotifyTrackId: "60nZ122Pm911yO31912I5M" }
                ],
                roast: "Network lag caught you before the flying bed did!"
            }
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));