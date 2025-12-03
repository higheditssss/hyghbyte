const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const session = require("express-session");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

// VIEW ENGINE
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// STATIC + BODY
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));

// SESSION (folosim token ca secret fallback)
app.use(
  session({
    secret: process.env.ADMIN_TOKEN || "hyghbyte_fallback_secret",
    resave: false,
    saveUninitialized: false,
  })
);

// DB CONNECT
const DB_PATH = process.env.SQLITE_PATH || "./db/games.db";
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) console.error("DB ERROR:", err);
  else console.log("💾 SQLite connected @", DB_PATH);
});

// DB HELPERS
function dbAll(q, p = []) {
  return new Promise((res, rej) => {
    db.all(q, p, (e, r) => (e ? rej(e) : res(r)));
  });
}

function dbGet(q, p = []) {
  return new Promise((res, rej) => {
    db.get(q, p, (e, r) => (e ? rej(e) : res(r)));
  });
}

function dbRun(q, p = []) {
  return new Promise((res, rej) => {
    db.run(q, p, function (e) {
      e ? rej(e) : res(this);
    });
  });
}

// CREATE TABLE dacă nu există (schema largă ca să nu strice DB-ul tău)
dbRun(`
  CREATE TABLE IF NOT EXISTS games (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    source TEXT,
    steamId TEXT,
    link TEXT,
    imageUrl TEXT,
    genres TEXT,
    featured INTEGER DEFAULT 0,
    visible INTEGER DEFAULT 1
  )
`);

// OPTIONAL: IP LOCK – setezi ADMIN_IP în .env dacă vrei
// ADMIN_IP=1.2.3.4
const ADMIN_IP = process.env.ADMIN_IP || null;
function getClientIp(req) {
  const xff = req.headers["x-forwarded-for"];
  return (xff ? xff.split(",")[0] : req.socket.remoteAddress) || "";
}

// STEAM FETCH (Node 18+ are global fetch)
async function fetchSteamData(appId) {
  try {
    const url = `https://store.steampowered.com/api/appdetails?appids=${appId}&cc=us&l=en`;
    const res = await fetch(url);
    const data = await res.json();

    if (!data[appId]?.success) return null;

    const info = data[appId].data;
    const genres = info.genres
      ? info.genres.map((g) => g.description).join(", ")
      : "Unknown";

    return {
      title: info.name || "Unknown Game",
      genres,
      link: `https://store.steampowered.com/app/${appId}/`,
      image:
        info.header_image ||
        `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg`,
    };
  } catch (err) {
    console.log("Steam API Error:", err);
    return null;
  }
}

// MIDDLEWARE: ADMIN SESSION
function isAdmin(req, res, next) {
  if (req.session.isAdmin) return next();
  return res.status(403).send("⛔ Forbidden");
}

// ─── USER ROUTES ────────────────────────────────────────

// HOME PAGE
app.get("/", async (req, res) => {
  try {
    const games = await dbAll(
      "SELECT * FROM games WHERE visible = 1 ORDER BY id DESC"
    );
    const featuredGames = await dbAll(
      "SELECT * FROM games WHERE featured = 1 AND visible = 1 ORDER BY id DESC LIMIT 6"
    );
    res.render("index", { games, featuredGames });
  } catch (err) {
    console.error(err);
    res.send("DB Error: " + err);
  }
});

// (opțional) /game/:id → redirect direct către link
app.get("/game/:id", async (req, res) => {
  const game = await dbGet("SELECT * FROM games WHERE id = ?", [
    req.params.id,
  ]);
  if (!game) return res.status(404).send("Joc negăsit");
  return res.redirect(game.link);
});

// ─── ADMIN AUTH (fără pagină de login) ──────────────────

// ENTRY POINT SECRET: /admin?token=XXXXX
app.get("/admin", async (req, res) => {
  // dacă deja e logat în sesiune, du-l direct în dashboard
  if (req.session.isAdmin) {
    return res.redirect("/admin-dashboard");
  }

  // 1) IP LOCK (dacă ai ADMIN_IP în .env)
  const clientIp = getClientIp(req);
  if (ADMIN_IP && clientIp !== ADMIN_IP) {
    console.log("❌ Admin blocked IP:", clientIp);
    return res.status(403).send("⛔ Forbidden (IP)");
  }

  // 2) TOKEN în query
  const urlToken = req.query.token;
  const envToken = (process.env.ADMIN_TOKEN || "").trim();

  if (!urlToken || urlToken.trim() !== envToken) {
    return res.status(403).send("⛔ Forbidden (Token)");
  }

  // 3) TOKEN OK → setează sesiune & redirecționează
  req.session.isAdmin = true;
  console.log("✅ Admin session started from IP:", clientIp);
  return res.redirect("/admin-dashboard");
});

// LOGOUT: distruge sesiunea
app.get("/admin-logout", (req, res) => {
  req.session.destroy(() => res.redirect("/"));
});

// ─── ADMIN PANEL ROUTES ─────────────────────────────────

// DASHBOARD
app.get("/admin-dashboard", isAdmin, async (req, res) => {
  const games = await dbAll("SELECT * FROM games ORDER BY id DESC");
  res.render("admin-dashboard", { games });
});

// ADD GAME (Steam sau manual/itch)
app.post("/admin-add", isAdmin, async (req, res) => {
  const { type, steamId, title, link, imageUrl, genres, featured } = req.body;

  let finalTitle = title || "";
  let finalGenres = genres || "";
  let finalLink = link || "";
  let finalImage = imageUrl || "";

  if (type === "steam" && steamId) {
    const data = await fetchSteamData(steamId);
    if (!data) return res.send("Steam ID invalid!");

    finalTitle = data.title;
    finalGenres = data.genres;
    finalLink = data.link;
    finalImage = data.image;
  }

  await dbRun(
    "INSERT INTO games (title, source, steamId, link, imageUrl, genres, featured, visible) VALUES (?, ?, ?, ?, ?, ?, ?, 1)",
    [
      finalTitle,
      type === "steam" ? "Steam" : "Manual",
      type === "steam" ? steamId : null,
      finalLink,
      finalImage,
      finalGenres,
      featured ? 1 : 0,
    ]
  );

  res.redirect("/admin-dashboard");
});

// EDIT PAGE
app.get("/admin-edit/:id", isAdmin, async (req, res) => {
  const game = await dbGet("SELECT * FROM games WHERE id = ?", [
    req.params.id,
  ]);
  if (!game) return res.redirect("/admin-dashboard");
  res.render("admin-edit", { game });
});

// SAVE EDIT
app.post("/admin-edit/:id", isAdmin, async (req, res) => {
  const { title, link, imageUrl, genres, featured, visible } = req.body;

  await dbRun(
    "UPDATE games SET title=?, link=?, imageUrl=?, genres=?, featured=?, visible=? WHERE id=?",
    [
      title,
      link,
      imageUrl,
      genres,
      featured ? 1 : 0,
      visible ? 1 : 0,
      req.params.id,
    ]
  );

  res.redirect("/admin-dashboard");
});

// DELETE
app.get("/admin-delete/:id", isAdmin, async (req, res) => {
  await dbRun("DELETE FROM games WHERE id = ?", [req.params.id]);
  res.redirect("/admin-dashboard");
});

// 404
app.use((req, res) => {
  res.status(404).send("404 — Page Not Found");
});

// START
app.listen(PORT, () =>
  console.log(`🚀 HYGHBYTE server ON → http://localhost:${PORT}`)
);
