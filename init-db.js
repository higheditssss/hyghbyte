const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");

// Asigurăm ca folderul db există
if (!fs.existsSync("./db")) {
  fs.mkdirSync("./db");
}

const db = new sqlite3.Database("./db/games.db");

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS games (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      source TEXT,
      steamId TEXT,
      link TEXT,
      imageUrl TEXT,
      genres TEXT,
      badge TEXT,
      featured INTEGER DEFAULT 0,
      visible INTEGER DEFAULT 1,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    INSERT INTO games (title, source, steamId, link, imageUrl, genres, badge, featured, visible)
    VALUES
    ('Counter-Strike 2', 'steam', '730',
     'https://store.steampowered.com/app/730',
     'https://cdn.cloudflare.steamstatic.com/steam/apps/730/header.jpg',
     'FPS, Shooter, Multiplayer', 'FREE', 1, 1),
     
    ('Hollow Knight', 'steam', '367520',
     'https://store.steampowered.com/app/367520',
     'https://cdn.cloudflare.steamstatic.com/steam/apps/367520/header.jpg',
     'Indie, Metroidvania', 'PAID', 0, 1),

    ('ROBLOX', 'manual', NULL,
     'https://www.roblox.com',
     'https://tr.rbxcdn.com/723cd33e78c3f2e78abfc9b29fac1c34/768/432/Image/Png',
     'Sandbox, Multiplayer', 'FREE', 0, 1)
  `);
});

db.close();
console.log("🎮 Database created successfully!");
