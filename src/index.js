const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
// const spotifyRoute = require('./routes/spotify-routes')


dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// app.use('/spotify',spotifyRoute);


app.listen(process.env.PORT, () => {
  console.log(`Server is running on port ${process.env.PORT}`);
});