require("dotenv").config();
const express = require("express");
const path = require("path");
const session = require("express-session");
const fetch = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args));
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 8080;

// ========================= DB CONNECT ============================
if (!process.env.DATABASE_URL) {
  console.error("❌ ERROR: Missing DATABASE_URL");
  process.exit(1);
}

const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// ========================= APP SETUP =============================
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

// ========================= AUTH ==================================
function requireAuth(req, res, next) {
  if (req.session.loggedIn) return next();
  res.render("admin-login", { error: null });
}

// ========================= STEAM FETCH ===========================
async function fetchSteamData(appId) {
  const res = await fetch(`https://store.steampowered.com/api/appdetails?appids=${appId}`);
  const data = await res.json();

  if (!data || !data[appId] || !data[appId].success) {
    throw new Error("Steam ID invalid!");
  }

  const d = data[appId].data;

  return {
    title: d.name,
    imageUrl: d.header_image,
    genres: (d.genres || []).map(g => g.description).join(", "),
    link: `https://store.steampowered.com/app/${appId}`
  };
}

// ========================= INIT TABLE ============================
async function initDB() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS games (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      source TEXT NOT NULL,
      steamId TEXT,
      link TEXT,
      imageUrl TEXT,
      genres TEXT,
      featuredImage TEXT,
      featured BOOLEAN DEFAULT FALSE,
      createdAt TIMESTAMP DEFAULT NOW()
    );
  `);
  console.log("📦 PostgreSQL connected & tables ready!");
}
initDB();

// ========================= HOME ================================
app.get("/", async (req, res) => {
  const all = await db.query(`SELECT * FROM games ORDER BY createdAt DESC`);
  const featured = await db.query(`SELECT * FROM games WHERE featured = TRUE ORDER BY createdAt DESC`);

  const games = all.rows.map(g => ({
    ...g,
    playUrl:
      g.source === "steam" ? `https://store.steampowered.com/app/${g.steamId}` : g.link
  }));

  const featuredGames = featured.rows.map(g => ({
    ...g,
    playUrl:
      g.source === "steam" ? `https://store.steampowered.com/app/${g.steamId}` : g.link
  }));

  res.render("index", { games, featuredGames });
});

// ========================= ADMIN PAGE ============================
app.get("/admin", requireAuth, async (req, res) => {
  const games = await db.query(`SELECT * FROM games ORDER BY createdAt DESC`);
  res.render("admin", { games: games.rows, error: null });
});

// ========================= LOGIN ================================
app.post("/admin", (req, res) => {
  if (req.body.password === "HyghByte_2025!$Rsa") {
    req.session.loggedIn = true;
    return res.redirect("/admin");
  }
  res.render("admin-login", { error: "Parolă greșită" });
});

// ========================= ADD GAME =============================
app.post("/addGame", requireAuth, async (req, res) => {
  let { source, steamId, itchLink, imageUrl, title, genres } = req.body;

  try {
    let finalLink = null;

    // --- STEAM
    if (source === "steam") {
      if (!steamId) return res.send("Lipsește Steam ID!");

      const s = await fetchSteamData(steamId);
      title = s.title;
      imageUrl = s.imageUrl;
      genres = s.genres;
      finalLink = s.link;
    }

    // --- ITCH.IO
    if (source === "itch") {
      if (!itchLink || !itchLink.startsWith("http"))
        return res.send("Link itch.io invalid!");

      finalLink = itchLink;
      // titlu & genres le iei manual din formular
    }

    await db.query(
      `INSERT INTO games (title, source, steamId, link, imageUrl, genres)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [title, source, steamId || null, finalLink, imageUrl, genres]
    );

    res.redirect("/admin");
  } catch (err) {
    const games = await db.query("SELECT * FROM games ORDER BY createdAt DESC");
    res.render("admin", { games: games.rows, error: err.message });
  }
});

// ========================= DELETE GAME ==========================
app.post("/deleteGame/:id", requireAuth, async (req, res) => {
  await db.query("DELETE FROM games WHERE id = $1", [req.params.id]);
  res.redirect("/admin");
});

// ========================= FEATURED UPDATE ======================
app.post("/updateFeatured", requireAuth, async (req, res) => {
  let featured = req.body.featured || [];

  if (!Array.isArray(featured)) featured = [featured];

  await db.query("UPDATE games SET featured = FALSE");
  if (featured.length > 0) {
    await db.query(
      `UPDATE games SET featured = TRUE WHERE id = ANY($1)`,
      [featured.map(Number)]
    );
  }

  res.redirect("/admin");
});

// ========================= START APP ============================
app.listen(PORT, () => console.log(`🚀 HYGHBYTE running on http://localhost:${PORT}`));
