const express = require('express');
const spotifyRoutes = require('./spotify-routes')
const router = express.Router();

router.use('/spotify',spotifyRoutes)



module.exports = router;