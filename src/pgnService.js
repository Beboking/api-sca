const fs = require("fs");
const parser = require("pgn-parser");

function getGamesByPlayer(playerName) {
  const raw = fs.readFileSync("games.pgn", "utf8");
  const parsed = parser.parse(raw);

  const filtered = parsed.filter(game => {
    const headers = game.headers;
    const white = headers.find(h => h.name === "White")?.value || "";
    const black = headers.find(h => h.name === "Black")?.value || "";
    return (
      white.toLowerCase().includes(playerName.toLowerCase()) ||
      black.toLowerCase().includes(playerName.toLowerCase())
    );
  });

  return filtered.map(game => {
    const h = game.headers.reduce((acc, { name, value }) => {
      acc[name] = value;
      return acc;
    }, {});
    return {
      event: h.Event || "",
      white: h.White || "",
      black: h.Black || "",
      result: h.Result || "",
      eco: h.ECO || "",
      plyCount: Number(h.PlyCount) || null,
      gameId: h.GameId || "",
      pgn: serializeGame(game)
    };
  });
}

function serializeGame(game) {
  const headers = game.headers.map(h => `[${h.name} "${h.value}"]`).join("\n");

  const movesArray = game.moves.map(m => m.move);

  const moves = movesArray.join(" ");

  return `${headers}\n\n${moves}`;
}


module.exports = { getGamesByPlayer };
