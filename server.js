const express = require("express");
const path = require("path");
const session = require("express-session");
const sqlite3 = require("sqlite3").verbose();

// node-fetch wrapper ESM
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const app = express();
const PORT = process.env.PORT || 3000;

// ------------------------ DB ------------------------
const db = new sqlite3.Database("./games.db");

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS games (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      source TEXT CHECK(source IN ('steam','itch','manual')) NOT NULL,
      steamId TEXT,
      link TEXT,
      imageUrl TEXT,
      genres TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
});

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.use(
  session({
    secret: "HyghByte2025Strong",
    resave: false,
    saveUninitialized: false,
  })
);

const ADMIN_PASSWORD = "HyghByte_2025!$Rsa";

function requireAuth(req, res, next) {
  if (req.session.loggedIn) return next();
  return res.redirect("/admin/login");
}

// ------------------------ Steam Preluare ------------------------
async function fetchSteamGame(appId) {
  const res = await fetch(
    `https://store.steampowered.com/api/appdetails?appids=${appId}`
  );
  const data = await res.json();

  const info = data[appId];
  if (!info || !info.success) throw new Error("ID Steam invalid");

  const d = info.data;
  return {
    title: d.name,
    genres: (d.genres || []).map((g) => g.description).join(", "),
    imageUrl: d.header_image,
  };
}

// ------------------------ ROUTE PUBLICE ------------------------
app.get("/", (req, res) => {
  db.all("SELECT * FROM games ORDER BY createdAt DESC", [], (err, rows) => {
    if (err) return res.status(500).send("Eroare DB");

    const games = rows.map((g) => ({
      ...g,
      playUrl:
        g.source === "steam" && g.steamId
          ? `https://store.steampowered.com/app/${g.steamId}`
          : g.link,
    }));

    res.render("index", { games });
  });
});

// ------------------------ LOGIN ------------------------
app.get("/admin/login", (req, res) => {
  res.render("admin-login", { error: null });
});

app.post("/admin/login", (req, res) => {
  if (req.body.password === ADMIN_PASSWORD) {
    req.session.loggedIn = true;
    return res.redirect("/admin");
  }
  res.render("admin-login", { error: "Parolă greșită." });
});

// ------------------------ ADMIN HOME ------------------------
app.get("/admin", requireAuth, (req, res) => {
  db.all("SELECT * FROM games ORDER BY createdAt DESC", [], (err, rows) => {
    if (err) return res.status(500).send("Eroare");

    res.render("admin", { games: rows });
  });
});

// ------------------------ ADD GAME ------------------------
app.post("/admin/games", requireAuth, async (req, res) => {
  let { title, source, steamId, link, imageUrl, genres, steamMode } = req.body;

  try {
    if (source === "steam" && steamMode === "auto" && steamId) {
      const data = await fetchSteamGame(steamId.trim());
      title = data.title;
      imageUrl = data.imageUrl;
      genres = data.genres;
      link = `https://store.steampowered.com/app/${steamId}`;
    }

    db.run(
      `INSERT INTO games (title, source, steamId, link, imageUrl, genres)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [title, source, steamId || null, link, imageUrl || null, genres],
      (err) => {
        if (err) return res.status(500).send("Eroare DB");
        res.redirect("/admin");
      }
    );
  } catch (e) {
    console.error(e);
    res.status(500).send("Eroare Steam");
  }
});

// ------------------------ DELETE GAME ------------------------
app.post("/admin/games/:id/delete", requireAuth, (req, res) => {
  db.run("DELETE FROM games WHERE id = ?", [req.params.id], () => {
    res.redirect("/admin");
  });
});

// ------------------------ SERVER ------------------------
app.listen(PORT, () =>
  console.log(`HYGHBYTE live pe http://localhost:${PORT}`)
);
