const fs = require("fs");
const parser = require("pgn-parser");

function matchesPlayerName(fullName, search) {
  const normalize = str =>
    str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const fullTokens = normalize(fullName).split(/[\s,]+/);
  const searchTokens = normalize(search).split(/[\s,]+/);
  return searchTokens.every(token => fullTokens.includes(token));
}

function getGamesByPlayer(playerName) {
  let raw;
  try {
    raw = fs.readFileSync("games.pgn", "utf8");
  } catch (err) {
    console.error("Error reading PGN:", err);
    return [];
  }

  const gameBlocks = raw.split(/\n\n(?=\[Event )/);
  const result = [];

  for (const block of gameBlocks) {
    try {
      const parsed = parser.parse(block);
      if (!parsed || !parsed[0]) continue;

      const game = parsed[0];
      const headers = game.headers || [];

      const white = headers.find(h => h.name === "White")?.value || "";
      const black = headers.find(h => h.name === "Black")?.value || "";

      if (
        matchesPlayerName(white, playerName) ||
        matchesPlayerName(black, playerName)
      ) {
        const h = headers.reduce((acc, { name, value }) => {
          acc[name] = value;
          return acc;
        }, {});
        result.push({
          event: h.Event || "",
          white: h.White || "",
          black: h.Black || "",
          result: h.Result || "",
          eco: h.ECO || "",
          plyCount: Number(h.PlyCount) || null,
          gameId: h.GameId || "",
          pgn: serializeGame(game),
        });
      }
    } catch (err) {
      console.warn("Invalid game");
    }
  }

  return result;
}

function serializeGame(game) {
  const headers = game.headers.map(h => `[${h.name} "${h.value}"]`).join("\n");
  const movesArray = game.moves?.map(m => m.move) || [];
  const moves = movesArray.join(" ");
  return `${headers}\n\n${moves}`.trim();
}

module.exports = { getGamesByPlayer };
