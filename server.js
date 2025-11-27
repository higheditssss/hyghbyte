require("dotenv").config();
const express = require("express");
const path = require("path");
const session = require("express-session");
const { Pool } = require("pg");

if (!process.env.DATABASE_URL) {
  console.error("❌ ERROR: Missing DATABASE_URL in environment!");
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS games (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        source TEXT NOT NULL,
        steamId TEXT,
        link TEXT,
        imageUrl TEXT,
        genres TEXT,
        featuredImage TEXT,
        featured INTEGER DEFAULT 0,
        createdAt TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log("✅ PostgreSQL connected & tables ready!");
  } catch (err) {
    console.error("❌ DB ERROR:", err);
  }
}

initDB();

const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const app = express();
const PORT = process.env.PORT || 8080;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.use(
  session({
    secret: "HyghByte_2025!$Rsa",
    resave: false,
    saveUninitialized: false,
  })
);

function requireAuth(req, res, next) {
  if (req.session.loggedIn) return next();
  res.render("admin-login", { error: null });
}

async function fetchSteam(appId) {
  const res = await fetch(
    `https://store.steampowered.com/api/appdetails?appids=${appId}`
  );
  const data = await res.json();

  if (!data[appId] || !data[appId].success)
    throw new Error("Steam ID invalid!");

  const d = data[appId].data;

  return {
    title: d.name,
    imageUrl: d.header_image,
    genres: d.genres?.map(g => g.description).join(", ") || "",
    link: `https://store.steampowered.com/app/${appId}`
  };
}

// ========================= HOME =========================

app.get("/", async (req, res) => {
  const gamesQuery = await pool.query("SELECT * FROM games ORDER BY id DESC");
  const featuredQuery = await pool.query("SELECT * FROM games WHERE featured = 1");

  const games = gamesQuery.rows.map(g => ({
    ...g,
    playUrl: g.source === "steam" ? `https://store.steampowered.com/app/${g.steamid}` : g.link
  }));

  const featuredGames = featuredQuery.rows.map(g => ({
    ...g,
    playUrl: g.source === "steam" ? `https://store.steampowered.com/app/${g.steamid}` : g.link
  }));

  res.render("index", { games, featuredGames });
});

// ========================= ADMIN =========================

app.get("/admin", requireAuth, async (req, res) => {
  const games = (await pool.query("SELECT * FROM games ORDER BY id DESC")).rows;
  res.render("admin", { games, error: null });
});

app.post("/admin", (req, res) => {
  if (req.body.password === "HyghByte_2025!$Rsa") {
    req.session.loggedIn = true;
    return res.redirect("/admin");
  }
  res.render("admin-login", { error: "Parolă greșită" });
});

// ========================= ADD GAME =========================

app.post("/addGame", requireAuth, async (req, res) => {
  let { title, genres, imageUrl, playUrl, source, steamId, itchLink } = req.body;

  try {
    let finalLink = playUrl;

    if (source === "steam") {
      const s = await fetchSteam(steamId.trim());
      title = s.title;
      imageUrl = s.imageUrl;
      genres = s.genres;
      finalLink = s.link;
    }

    if (source === "itch") {
      finalLink = itchLink.trim();
      if (!finalLink.startsWith("http"))
        throw new Error("Invalid itch link");
    }

    await pool.query(
      `INSERT INTO games (title, source, steamId, link, imageUrl, genres)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [title, source, steamId || null, finalLink, imageUrl, genres]
    );

    res.redirect("/admin");
  } catch (err) {
    const games = (await pool.query("SELECT * FROM games")).rows;
    res.render("admin", { games, error: err.message });
  }
});

// ========================= DELETE =========================

app.post("/deleteGame/:id", requireAuth, async (req, res) => {
  await pool.query("DELETE FROM games WHERE id=$1", [req.params.id]);
  res.redirect("/admin");
});

// ========================= FEATURED =========================

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

app.listen(PORT, () => {
  console.log(`🚀 HYGHBYTE running on http://localhost:${PORT}`);
});
