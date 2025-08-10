const express = require('express');

const router = express.Router();

router.get('/login', function(req, res) {

  const state = generateRandomString(16);
  const scope = 'user-read-private user-read-email';

  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: process.env.SPOTIFY_CLIENT_ID,
      scope: scope,
      redirect_uri: process.env.SPOTIFY_CALLBACK_URL,
      state: state
    }));
});

module.exports = router;