const express = require("express");
const cors = require("cors");
const { getGamesByPlayer } = require("./pgnService");

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;

app.get("/games", (req, res) => {
  const player = req.query.player;

  if (!player) {
    return res.status(400).json({ error: "Missing parameter ?player=" });
  }

  try {
    const games = getGamesByPlayer(player);
    res.json(games);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error processing PGN file" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
