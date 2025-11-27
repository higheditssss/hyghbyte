// =====================================================
// HYGHBYTE - SERVER.JS (PostgreSQL Version)
// =====================================================

require("dotenv").config();
const express = require("express");
const path = require("path");
const session = require("express-session");
const { Pool } = require("pg");

const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const app = express();
const PORT = process.env.PORT || 3000;

// =====================================================
// POSTGRESQL CONNECTION
// =====================================================
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // Railway needs SSL
});

// Test DB connection
pool.connect()
  .then(() => console.log("✅ PostgreSQL connected."))
  .catch((err) => console.error("❌ PostgreSQL ERROR:", err));

// =====================================================
// INIT DATABASE
// =====================================================
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS games (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      source TEXT CHECK(source IN ('steam','itch','manual')) NOT NULL,
      steamId TEXT,
      link TEXT,
      imageUrl TEXT,
      genres TEXT,
      featuredImage TEXT,
      featured INTEGER DEFAULT 0,
      createdAt TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  console.log("📦 Table 'games' ready.");
}

initDB();

// =====================================================
// APP CONFIG
// =====================================================
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "HyghByte_2025!$Rsa",
    resave: false,
    saveUninitialized: false,
  })
);

// =====================================================
// LOGIN PROTECTION
// =====================================================
function requireAuth(req, res, next) {
  if (req.session.loggedIn) return next();
  res.render("admin-login", { error: null });
}

// =====================================================
// STEAM FETCH
// =====================================================
async function fetchSteam(appId) {
  const res = await fetch(
    `https://store.steampowered.com/api/appdetails?appids=${appId}`
  );

  const data = await res.json();

  if (!data || !data[appId] || !data[appId].success) {
    throw new Error("Steam ID invalid!");
  }

  const d = data[appId].data;

  return {
    title: d.name,
    imageUrl: d.header_image,
    genres: d.genres?.map((g) => g.description).join(", ") || "",
    link: `https://store.steampowered.com/app/${appId}`,
  };
}

// =====================================================
// HOME PAGE
// =====================================================
app.get("/", async (req, res) => {
  try {
    const gamesRes = await pool.query(
      "SELECT * FROM games ORDER BY createdAt DESC"
    );
    const featuredRes = await pool.query(
      "SELECT * FROM games WHERE featured = 1 ORDER BY createdAt DESC"
    );

    const games = gamesRes.rows.map((g) => ({
      ...g,
      playUrl:
        g.source === "steam" && g.steamid
          ? `https://store.steampowered.com/app/${g.steamid}`
          : g.link,
    }));

    const featuredGames = featuredRes.rows.map((g) => ({
      ...g,
      playUrl:
        g.source === "steam" && g.steamid
          ? `https://store.steampowered.com/app/${g.steamid}`
          : g.link,
    }));

    res.render("index", { games, featuredGames });
  } catch (err) {
    res.send("Database error: " + err);
  }
});

// =====================================================
// ADMIN PAGE
// =====================================================
app.get("/admin", requireAuth, async (req, res) => {
  const result = await pool.query("SELECT * FROM games ORDER BY createdAt DESC");
  res.render("admin", { games: result.rows, error: null });
});

// =====================================================
// LOGIN
// =====================================================
app.post("/admin", (req, res) => {
  if (req.body.password === process.env.ADMIN_PASS || "HyghByte_2025!$Rsa") {
    req.session.loggedIn = true;
    return res.redirect("/admin");
  }

  res.render("admin-login", { error: "Parolă greșită" });
});

// =====================================================
// ADD GAME
// =====================================================
app.post("/addGame", requireAuth, async (req, res) => {
  let { title, genres, imageUrl, playUrl, source, steamId, itchLink } = req.body;

  try {
    let finalLink = null;

    if (source === "steam") {
      steamId = steamId?.trim();
      if (!steamId) return res.send("Steam ID lipsă!");

      const s = await fetchSteam(steamId);
      title = s.title;
      imageUrl = s.imageUrl;
      genres = s.genres;
      finalLink = s.link;
    }

    if (source === "itch") {
      finalLink = itchLink?.trim();
      if (!finalLink || !finalLink.startsWith("http"))
        return res.send("Link itch.io invalid!");
    }

    await pool.query(
      `INSERT INTO games (title, source, steamId, link, imageUrl, genres)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [title, source, steamId || null, finalLink, imageUrl, genres]
    );

    res.redirect("/admin");
  } catch (err) {
    const all = await pool.query("SELECT * FROM games ORDER BY createdAt DESC");
    res.render("admin", { games: all.rows, error: err.message });
  }
});

// =====================================================
// DELETE GAME
// =====================================================
app.post("/deleteGame/:id", requireAuth, async (req, res) => {
  await pool.query("DELETE FROM games WHERE id = $1", [req.params.id]);
  res.redirect("/admin");
});

// =====================================================
// UPDATE FEATURED
// =====================================================
app.post("/updateFeatured", requireAuth, async (req, res) => {
  const featured = Array.isArray(req.body.featured)
    ? req.body.featured.map(Number)
    : [];

  await pool.query("UPDATE games SET featured = 0");

  if (featured.length > 0) {
    const placeholders = featured.map((_, i) => `$${i + 1}`).join(",");
    await pool.query(
      `UPDATE games SET featured = 1 WHERE id IN (${placeholders})`,
      featured
    );
  }

  res.redirect("/admin");
});

// =====================================================
// START SERVER
// =====================================================
app.listen(PORT, () =>
  console.log(`🚀 HYGHBYTE running on http://localhost:${PORT}`)
);
