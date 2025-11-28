/************************************************************
 * HYGHBYTE — SERVER.JS AUTO DEV/PROD (SQLite local / PostgreSQL Railway)
 ************************************************************/

require("dotenv").config();
const express = require("express");
const path = require("path");
const session = require("express-session");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const app = express();
const PORT = process.env.PORT || 8080;

/************************************************************
 * DATABASE AUTO: PostgreSQL (Railway) -> fallback SQLite
 ************************************************************/
let db = null;
let isSQLite = false;

if (process.env.DATABASE_URL) {
  // ---------- PostgreSQL (Railway) ----------
  const { Pool } = require("pg");
  db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  console.log("🟢 PROD MODE (Railway) → PostgreSQL activ");
} else {
  // ---------- SQLite (Local) ----------
  const sqlite3 = require("sqlite3").verbose();
  db = new sqlite3.Database("./local.db");
  isSQLite = true;
  console.log("🟢 DEV MODE (Local) → SQLite activ");
}

/************************************************************
 * INIT DB
 ************************************************************/
async function initDB() {
  const sqliteSQL = `
    CREATE TABLE IF NOT EXISTS games (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      source TEXT NOT NULL,
      steamId TEXT,
      link TEXT,
      imageUrl TEXT,
      genres TEXT,
      featured INTEGER DEFAULT 0,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const pgSQL = `
    CREATE TABLE IF NOT EXISTS games (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      source TEXT NOT NULL,
      steamId TEXT,
      link TEXT,
      imageUrl TEXT,
      genres TEXT,
      featured INTEGER DEFAULT 0,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  if (isSQLite) {
    db.run(sqliteSQL);
  } else {
    await db.query(pgSQL);
  }

  console.log("📦 DB Ready!");
}

/************************************************************
 * DB HELPERS
 ************************************************************/
function dbAll(query, params = []) {
  return new Promise((resolve, reject) => {
    if (isSQLite) {
      db.all(query, params, (err, rows) => (err ? reject(err) : resolve(rows)));
    } else {
      db.query(query, params)
        .then((res) => resolve(res.rows))
        .catch(reject);
    }
  });
}

function dbRun(query, params = []) {
  return new Promise((resolve, reject) => {
    if (isSQLite) {
      db.run(query, params, function (err) {
        if (err) reject(err);
        else resolve(this);
      });
    } else {
      db.query(query, params)
        .then(resolve)
        .catch(reject);
    }
  });
}

/************************************************************
 * EXPRESS SETTINGS
 ************************************************************/
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.use(
  session({
    secret: "HyghByte_2025!$Rsa",
    resave: false,
    saveUninitialized: false
  })
);

/************************************************************
 * AUTH
 ************************************************************/
function requireAuth(req, res, next) {
  if (req.session.loggedIn) return next();
  res.render("admin-login", { error: null });
}

/************************************************************
 * STEAM FETCH
 ************************************************************/
async function fetchSteam(appId) {
  const res = await fetch(
    `https://store.steampowered.com/api/appdetails?appids=${appId}`
  );
  const data = await res.json();

  if (!data || !data[appId] || !data[appId].success)
    throw new Error("Steam ID invalid!");

  const d = data[appId].data;

  return {
    title: d.name,
    imageUrl: d.header_image,
    genres: d.genres ? d.genres.map((g) => g.description).join(", ") : "",
    link: `https://store.steampowered.com/app/${appId}`
  };
}

/************************************************************
 * NORMALIZE playUrl
 ************************************************************/
function normalize(g) {
  return {
    ...g,
    playUrl:
      g.source === "steam"
        ? `https://store.steampowered.com/app/${g.steamid || g.steamId}`
        : g.link
  };
}

/************************************************************
 * ROUTES
 ************************************************************/

// HOME PAGE
app.get("/", async (req, res) => {
  let games = await dbAll("SELECT * FROM games ORDER BY createdAt DESC");
  let featured = await dbAll("SELECT * FROM games WHERE featured = 1 ORDER BY createdAt DESC");

  games = games.map(normalize);
  featured = featured.map(normalize);

  res.render("index", { games, featuredGames: featured });
});

// ADMIN PANEL
app.get("/admin", requireAuth, async (req, res) => {
  const games = await dbAll("SELECT * FROM games ORDER BY createdAt DESC");
  res.render("admin", { games, error: null });
});

app.post("/admin", (req, res) => {
  if (req.body.password === "HyghByte_2025!$Rsa") {
    req.session.loggedIn = true;
    return res.redirect("/admin");
  }
  res.render("admin-login", { error: "Parolă greșită" });
});

// ADD GAME
app.post("/addGame", requireAuth, async (req, res) => {
  const { source, steamId, title, genres, itchLink, imageUrl } = req.body;

  try {
    let t, g, img, link;

    if (source === "steam") {
      const s = await fetchSteam(steamId.trim());
      t = s.title;
      g = s.genres;
      img = s.imageUrl;
      link = s.link;
    } else {
      t = title;
      g = genres;
      img = imageUrl;
      link = itchLink;
    }

    await dbRun(
      "INSERT INTO games (title, source, steamId, link, imageUrl, genres) VALUES (?, ?, ?, ?, ?, ?)",
      [t, source, steamId || null, link, img, g]
    );

    res.redirect("/admin");
  } catch (err) {
    const games = await dbAll("SELECT * FROM games ORDER BY createdAt DESC");
    res.render("admin", { games, error: err.message });
  }
});

// DELETE
app.post("/deleteGame/:id", requireAuth, async (req, res) => {
  await dbRun("DELETE FROM games WHERE id = ?", [req.params.id]);
  res.redirect("/admin");
});

// UPDATE FEATURED
app.post("/updateFeatured", requireAuth, async (req, res) => {
  const featured = Array.isArray(req.body.featured)
    ? req.body.featured.map(Number)
    : [];

  await dbRun("UPDATE games SET featured = 0");

  if (featured.length > 0) {
    await dbRun(
      `UPDATE games SET featured = 1 WHERE id IN (${featured
        .map(() => "?")
        .join(",")})`,
      featured
    );
  }

  res.redirect("/admin");
});

/************************************************************
 * START SERVER
 ************************************************************/
initDB().then(() => {
  app.listen(PORT, () =>
    console.log(`🚀 HYGHBYTE running → http://localhost:${PORT}`)
  );
});
