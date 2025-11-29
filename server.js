/************************************************************
 * HYGHBYTE — SERVER.JS (FINAL COPY–PASTE)
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
 * DATABASE: AUTO SQLITE (LOCAL) / POSTGRES (RAILWAY)
 ************************************************************/
let db = null;
let isSQLite = false;

if (process.env.DATABASE_URL) {
  const { Pool } = require("pg");
  db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  console.log("🟢 PROD: PostgreSQL activ (Railway)");
} else {
  const sqlite3 = require("sqlite3").verbose();
  db = new sqlite3.Database("./local.db");
  isSQLite = true;
  console.log("🟢 DEV: SQLite activ");
}

/************************************************************
 * INIT DB
 ************************************************************/
async function initDB() {
  const sqliteSQL = `
    CREATE TABLE IF NOT EXISTS games (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      source TEXT,
      steamId TEXT,
      link TEXT,
      imageUrl TEXT,
      genres TEXT,
      badge TEXT DEFAULT 'FREE',
      featured INTEGER DEFAULT 0,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const pgSQL = `
    CREATE TABLE IF NOT EXISTS games (
      id SERIAL PRIMARY KEY,
      title TEXT,
      source TEXT,
      steamId TEXT,
      link TEXT,
      imageUrl TEXT,
      genres TEXT,
      badge TEXT DEFAULT 'FREE',
      featured INTEGER DEFAULT 0,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  if (isSQLite) db.run(sqliteSQL);
  else await db.query(pgSQL);

  console.log("📦 Database ready!");
}

/************************************************************
 * HELPERS
 ************************************************************/
function dbAll(query, params = []) {
  return new Promise((resolve, reject) => {
    if (isSQLite) {
      db.all(query, params, (err, rows) =>
        err ? reject(err) : resolve(rows)
      );
    } else {
      db.query(query, params)
        .then(res => resolve(res.rows))
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
 * APP CONFIG
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
    genres: (d.genres || []).map((g) => g.description).join(", "),
    link: `https://store.steampowered.com/app/${appId}`
  };
}

/************************************************************
 * NORMALIZE URL
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
app.get("/", async (req, res) => {
  let games = await dbAll("SELECT * FROM games ORDER BY createdAt DESC");
  let featured = await dbAll(
    "SELECT * FROM games WHERE featured = 1 ORDER BY createdAt DESC"
  );

  games = games.map(normalize);
  featured = featured.map(normalize);

  res.render("index", { games, featuredGames: featured });
});

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

app.post("/addGame", requireAuth, async (req, res) => {
  let { source, steamId, title, genres, itchLink, imageUrl, badge } = req.body;

  try {
    let finalTitle, finalGenres, finalImage, finalLink;

    if (source === "steam") {
      const s = await fetchSteam(steamId.trim());
      finalTitle = s.title;
      finalGenres = s.genres;
      finalImage = s.imageUrl;
      finalLink = s.link;
    } else {
      finalTitle = title;
      finalGenres = genres;
      finalImage = imageUrl;
      finalLink = itchLink;
    }

    await dbRun(
      "INSERT INTO games (title, source, steamId, link, imageUrl, genres, badge) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        finalTitle,
        source,
        steamId || null,
        finalLink,
        finalImage,
        finalGenres,
        badge || "FREE"
      ]
    );

    res.redirect("/admin");
  } catch (err) {
    const games = await dbAll("SELECT * FROM games ORDER BY createdAt DESC");
    res.render("admin", { games, error: err.message });
  }
});

app.post("/deleteGame/:id", requireAuth, async (req, res) => {
  await dbRun("DELETE FROM games WHERE id = ?", [req.params.id]);
  res.redirect("/admin");
});

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
 * START
 ************************************************************/
initDB().then(() => {
  app.listen(PORT, () =>
    console.log(`🚀 HYGHBYTE running → http://localhost:${PORT}`)
  );
});
