const fs = require("fs");
const parser = require("pgn-parser");

const PGN_PATH = "games.pgn";

let parsedGames = [];

function normalizeName(str) {
  return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function matchesPlayerName(fullName, search) {
  const fullTokens = normalizeName(fullName).split(/[\s,]+/);
  const searchTokens = normalizeName(search).split(/[\s,]+/);
  return searchTokens.every(token => fullTokens.includes(token));
}

function loadGamesToMemory() {
  const raw = fs.readFileSync(PGN_PATH, "utf8");
  const blocks = raw.split(/\n(?=\[Event )/); 

  parsedGames = [];

  for (const block of blocks) {
    try {
      const parsed = parser.parse(block)[0];
      if (!parsed) continue;

      const headers = parsed.headers.reduce((acc, h) => {
        acc[h.name] = h.value;
        return acc;
      }, {});

      parsedGames.push({
        headers,
        game: parsed,
      });
    } catch (e) {
      console.warn("Invalid game skipped.");
    }
  }

}

function getGamesByPlayer(playerName) {
  return parsedGames
    .filter(({ headers }) => {
      const white = headers.White || "";
      const black = headers.Black || "";
      return (
        matchesPlayerName(white, playerName) ||
        matchesPlayerName(black, playerName)
      );
    })
    .map(({ headers, game }) => ({
      event: headers.Event || "",
      white: headers.White || "",
      black: headers.Black || "",
      result: headers.Result || "",
      eco: headers.ECO || "",
      plyCount: Number(headers.PlyCount) || null,
      gameId: headers.GameId || "",
      pgn: serializeGame(game),
    }));
}

function serializeGame(game) {
  const headers = game.headers.map(h => `[${h.name} "${h.value}"]`).join("\n");
  const movesArray = game.moves?.map(m => m.move) || [];
  const moves = movesArray.join(" ");
  return `${headers}\n\n${moves}`.trim();
}

module.exports = {
  loadGamesToMemory,
  getGamesByPlayer,
};
