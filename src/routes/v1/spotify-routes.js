const express = require('express');
const axios = require('axios');
const crypto = require('crypto');

const router = express.Router();


router.get('/login', function(req, res) {

  const state = crypto.randomBytes(16).toString('hex');

  const cookieOptions = {
    httpOnly: true,
    secure: true,
    path: '/spotify',
    expires: new Date(Date.now() + 60 * 60 * 1000) // 1 hour
  };

  res.cookie('stateValue', state, cookieOptions);

  const scope = [
    'user-read-currently-playing',
    'user-top-read',
    'user-follow-read',
    'user-modify-playback-state'
  ].join(' ');

  const queryString = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.SPOTIFY_CLIENT_ID,
    scope: scope,
    redirect_uri: process.env.SPOTIFY_CALLBACK_URL,
    state: state
  })
  res.redirect('https://accounts.spotify.com/authorize?' + queryString.toString());
});

router.get('/callback', async (req, res) => {
  const { code, state } = req.query;
  if (!code || !state) {
    return res.status(400).json({ error: 'Missing code or state parameter' });
  }

  const storedState = req.cookies.stateValue;

  if(!storedState){
    return res.status(400).json({
      error: 'Missing state value cookie'
    })
  }

  res.clearCookie('stateValue');
  if (state !== storedState) {
    return res.status(403).json({ error: 'State mismatch' });
  }

  try {
    const response = await axios.post('https://accounts.spotify.com/api/token', {
      grant_type: 'authorization_code',
      code,
      redirect_uri: process.env.SPOTIFY_CALLBACK_URL
    }, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64')}`
      }
    });
    const refreshToken = response.data.refresh_token;
    if (!refreshToken) {
      return res.status(500).json({ error: 'Failed to retrieve refresh token' });
    }

    // Store the refresh token securely (e.g., in a cookie)

    const refreshTokenCookieOptions = {
      httpOnly: true,
      secure: true,
      path:'/spotify',
      expires: new Date(Date.now() + 60 * 60 * 24 * 30) // 30 days
    };
    res.cookie('spotifyRefreshToken', refreshToken, refreshTokenCookieOptions);
    res.redirect('/main'+ '?refresh_token=' + refreshToken);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// Function to get access token using refresh token
async function getAccessToken(req) {
  try {

    const refreshToken = req.cookies.spotifyRefreshToken;
    const response = await axios.post('https://accounts.spotify.com/api/token', {
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    }, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64')}`
      }
    });
    
    const accessToken = response.data.access_token;
    console.log('Access Token:', accessToken);
    return accessToken;
  } catch (error) {
    throw error;
  }
}

// Main Spotify endpoint
router.get('/main', async (req, res) => {
  try {
    const token = await getAccessToken(req);
    
    // Get all required data in parallel
    const [topTracks, currentTrack, followedArtists] = await Promise.all([
      getTopTracks(token),
      getCurrentTrack(token),
      getFollowedArtists(token)
    ]);
    
    res.json({
      success: true,
      data: {
        topTracks: topTracks.slice(0, 10), // Limit to top 10
        currentTrack,
        followedArtists,
        actions: {
          stopCurrent: 'main/stop',
          playTrack: 'main/play/:track_id'
        }
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch Spotify data',
      details: error.message
    });
  }
});

// Get user's top 10 tracks
async function getTopTracks(token) {
  try {
    const response = await axios.get('https://api.spotify.com/v1/me/top/tracks', {
      headers: { 'Authorization': `Bearer ${token}` },
      params: { limit: 10, time_range: 'medium_term' }
    });
    
    return response.data.items.map(track => ({
      id: track.id,
      name: track.name,
      artist: track.artists.map(artist => artist.name).join(', '),
      album: track.album.name,
      duration_ms: track.duration_ms,
      external_url: track.external_urls.spotify,
      preview_url: track.preview_url
    }));
  } catch (error) {
    console.error('Error fetching top tracks:', error);
    return [];
  }
}

// Get currently playing track
async function getCurrentTrack(token) {
  try {
    const response = await axios.get('https://api.spotify.com/v1/me/player/currently-playing', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.data && response.data.item) {
      const track = response.data.item;
      return {
        id: track.id,
        name: track.name,
        artist: track.artists.map(artist => artist.name).join(', '),
        album: track.album.name,
        is_playing: response.data.is_playing,
        progress_ms: response.data.progress_ms,
        duration_ms: track.duration_ms,
        external_url: track.external_urls.spotify
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching current track:', error);
    return null;
  }
}

// Get followed artists
async function getFollowedArtists(token) {
  try {
    const response = await axios.get('https://api.spotify.com/v1/me/following', {
      headers: { 'Authorization': `Bearer ${token}` },
      params: { type: 'artist', limit: 50 }
    });
    
    return response.data.artists.items.map(artist => ({
      id: artist.id,
      name: artist.name,
      genres: artist.genres,
      followers: artist.followers.total,
      popularity: artist.popularity,
      external_url: artist.external_urls.spotify,
      image: artist.images[0]?.url || null
    }));
  } catch (error) {
    console.error('Error fetching followed artists:', error);
    return [];
  }
}

// Stop currently playing song
router.post('/main/stop', async (req, res) => {
  try {
    const token = await getAccessToken();
    
    await axios.put('https://api.spotify.com/v1/me/player/pause', {}, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    res.json({
      success: true,
      message: 'Playback stopped successfully'
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to stop playback',
      details: error.message
    });
  }
});

// Play specific track
router.post('/main/play/:track_id', async (req, res) => {
  try {
    const token = await getAccessToken();
    const trackId = req.params.track_id;
    
    await axios.put('https://api.spotify.com/v1/me/player/play', {
      uris: [`spotify:track:${trackId}`]
    }, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    res.json({
      success: true,
      message: `Started playing track: ${trackId}`
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to start playback',
      details: error.message
    });
  }
});

module.exports = router;