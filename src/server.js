const express = require("express");
const { getGamesByPlayer } = require("./pgnService");

const app = express();

const PORT = process.env.PORT || 3000;

app.get("/games", (req, res) => {
  const player = req.query.player;

  if (!player) {
    return res.status(400).json({ error: "Falta el parámetro ?player=" });
  }

  try {
    const games = getGamesByPlayer(player);
    res.json(games);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al procesar el archivo PGN" });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
