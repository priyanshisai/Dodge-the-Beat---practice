// controllers/spotifyController.js

let spotifyAccessToken = '';
let tokenExpirationTime = 0;

// Fetch Client Credentials Access Token from Spotify
async function getSpotifyAccessToken() {
    const now = Date.now();
    if (spotifyAccessToken && now < tokenExpirationTime) {
        return spotifyAccessToken;
    }

    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        console.warn("⚠️ SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET missing in .env");
        return null;
    }

    const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${authHeader}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
    });

    const data = await response.json();
    if (data.access_token) {
        spotifyAccessToken = data.access_token;
        tokenExpirationTime = Date.now() + (data.expires_in - 60) * 1000;
        return spotifyAccessToken;
    }

    throw new Error("Failed to retrieve Spotify access token");
}

// Controller Method: Search Spotify Tracks
exports.searchTrack = async (req, res) => {
    try {
        const { query } = req.query;
        if (!query) {
            return res.status(400).json({ success: false, error: 'Query parameter required.' });
        }

        const token = await getSpotifyAccessToken();

        if (!token) {
            return res.json({
                success: true,
                spotifyTrackId: "0Vj2y1A13Vi48CoI3NeP8f",
                warning: "Spotify API credentials missing in .env. Using fallback track."
            });
        }

        const searchUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=1`;
        const spotifyRes = await fetch(searchUrl, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await spotifyRes.json();
        const track = data.tracks?.items?.[0];

        if (track) {
            return res.json({
                success: true,
                spotifyTrackId: track.id,
                trackName: `${track.name} - ${track.artists.map(a => a.name).join(', ')}`,
                previewUrl: track.preview_url || null
            });
        }

        res.json({ success: true, spotifyTrackId: "0Vj2y1A13Vi48CoI3NeP8f" });

    } catch (error) {
        console.error("Spotify Search Controller Error:", error);
        res.json({ success: true, spotifyTrackId: "0Vj2y1A13Vi48CoI3NeP8f" });
    }
};

exports.getSpotifyAccessToken = getSpotifyAccessToken;