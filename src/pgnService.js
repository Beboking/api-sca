const fs = require("fs");
const parser = require("pgn-parser");

function normalizeName(name) {
  return name.toLowerCase().replace(",", "").split(" ").filter(Boolean);
}

function matchesPlayerName(fullName, searchInput) {
  const fullNameWords = normalizeName(fullName);
  const searchWords = normalizeName(searchInput);

  return searchWords.every(word => fullNameWords.some(n => n.includes(word)));
}

function getGamesByPlayer(playerName) {
  const raw = fs.readFileSync("games.pgn", "utf8");
  const parsed = parser.parse(raw);

  const filtered = parsed.filter(game => {
    const headers = game.headers;
    const white = headers.find(h => h.name === "White")?.value || "";
    const black = headers.find(h => h.name === "Black")?.value || "";

    return (
      matchesPlayerName(white, playerName) ||
      matchesPlayerName(black, playerName)
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
