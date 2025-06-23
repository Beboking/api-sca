const fs = require("fs");
const parser = require("pgn-parser");

const PGN_PATH = "games.pgn";
const INDEX_PATH = "pgn_index.json";

function matchesPlayerName(fullName, search) {
  const normalize = str =>
    str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const fullTokens = normalize(fullName).split(/[\s,]+/);
  const searchTokens = normalize(search).split(/[\s,]+/);
  return searchTokens.every(token => fullTokens.includes(token));
}

// Genera el índice solo si no existe
function buildIndex() {
  if (fs.existsSync(INDEX_PATH)) return;

  const raw = fs.readFileSync(PGN_PATH, "utf8");
  const lines = raw.split("\n");
  const index = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("[Event ")) {
      const startOffset = Buffer.byteLength(lines.slice(0, i).join("\n")) + (i > 0 ? 1 : 0);
      const blockLines = [];

      while (i < lines.length && lines[i].trim() !== "") {
        blockLines.push(lines[i++]);
      }

      while (i < lines.length && !lines[i].startsWith("[Event ")) {
        blockLines.push(lines[i++]);
      }

      const block = blockLines.join("\n");

      try {
        const parsed = parser.parse(block);
        const headers = parsed[0]?.headers || [];
        const gameId = headers.find(h => h.name === "GameId")?.value;
        if (gameId) {
          index.push({ gameId, offset: startOffset });
        }
      } catch {
        console.warn("Partida inválida ignorada en offset", startOffset);
      }

      i--;
    }
  }

  fs.writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2));
  console.log("Índice PGN creado.");
}

function getGamesByPlayer(playerName) {
  buildIndex();

  const index = JSON.parse(fs.readFileSync(INDEX_PATH, "utf8"));
  const result = [];

  const fd = fs.openSync(PGN_PATH, "r");

  for (const entry of index) {
    const buffer = Buffer.alloc(8192);
    fs.readSync(fd, buffer, 0, buffer.length, entry.offset);
    const chunk = buffer.toString("utf8");

    const block = chunk.split(/\n\n(?=\[Event )/)[0];
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
      console.warn("Error al parsear una partida en offset", entry.offset);
    }
  }

  fs.closeSync(fd);
  return result;
}

function serializeGame(game) {
  const headers = game.headers.map(h => `[${h.name} "${h.value}"]`).join("\n");
  const movesArray = game.moves?.map(m => m.move) || [];
  const moves = movesArray.join(" ");
  return `${headers}\n\n${moves}`.trim();
}

module.exports = { getGamesByPlayer };
