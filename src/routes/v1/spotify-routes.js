const express = require('express');

const router = express.Router();


router.get('/login', function(req, res) {

  const state = "q1w2e3r4";
  const scope = 'user-read-private user-read-email';

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.SPOTIFY_CLIENT_ID,
    scope: scope,
    redirect_uri: process.env.SPOTIFY_CALLBACK_URL,
    state: state
  });

  res.redirect('https://accounts.spotify.com/authorize?' +params.toString());
});

router.get('/callback', async (req, res) => {
  const code = req.query.code;
  
  try {
    const response = await axios.post('https://accounts.spotify.com/api/token', {
      grant_type: 'authorization_code',
      code,
      redirect_uri: 'YOUR_PORTFOLIO_URL/spotify/callback'
    }, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64')}`
      }
    });
    
    // Save this refresh_token to your environment variables
    console.log('Refresh Token:', response.data.refresh_token);
    res.json({ refresh_token: response.data.refresh_token });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



module.exports = router;