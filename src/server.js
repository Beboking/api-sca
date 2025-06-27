const express = require("express");
const cors = require("cors");
const { getGamesByPlayer, loadGamesToMemory } = require("./pgnService");

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;

loadGamesToMemory();

app.get("/games", (req, res) => {
  const player = req.query.player;

  if (!player) {
    return res.status(400).json({ error: "Missing ?player= parameter" });
  }

  try {
    const games = getGamesByPlayer(player);
    res.json(games);
  } catch (error) {
    console.error("❌ Error getting games:", error);
    res.status(500).json({ error: "Failed to load games." });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
