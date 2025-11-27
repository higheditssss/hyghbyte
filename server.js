const express = require("express");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const session = require("express-session");

const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const app = express();
const PORT = process.env.PORT || 3000;

// ======================= DATABASE ===========================
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
      featuredImage TEXT,
      featured INTEGER DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
});

// ======================= APP SETUP ===========================
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

// ======================= AUTH ===============================
function requireAuth(req, res, next) {
  if (req.session.loggedIn) return next();
  return res.render("admin-login", { error: null });
}

// ======================= STEAM FETCH =========================
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
    genres: (d.genres || []).map((g) => g.description).join(", "),
    link: `https://store.steampowered.com/app/${appId}`,
  };
}

// ======================= HOME PAGE ===========================
app.get("/", (req, res) => {
  db.all("SELECT * FROM games ORDER BY createdAt DESC", [], (err, games) => {
    if (err) return res.status(500).send("DB Error");

    games = games.map((g) => ({
      ...g,
      playUrl:
        g.source === "steam" && g.steamId
          ? `https://store.steampowered.com/app/${g.steamId}`
          : g.link,
    }));

    db.all(
      "SELECT * FROM games WHERE featured = 1 ORDER BY createdAt DESC",
      [],
      (err2, featuredGames) => {
        if (err2) return res.status(500).send("DB Error");

        featuredGames = featuredGames.map((g) => ({
          ...g,
          playUrl:
            g.source === "steam" && g.steamId
              ? `https://store.steampowered.com/app/${g.steamId}`
              : g.link,
        }));

        res.render("index", { games, featuredGames });
      }
    );
  });
});

// ======================= ADMIN PAGE ==========================
app.get("/admin", requireAuth, (req, res) => {
  db.all("SELECT * FROM games ORDER BY createdAt DESC", [], (err, games) => {
    if (err) return res.status(500).send("DB Error");
    res.render("admin", { games, error: null });
  });
});

// ======================= LOGIN ===============================
app.post("/admin", (req, res) => {
  if (req.body.password === "HyghByte_2025!$Rsa") {
    req.session.loggedIn = true;
    return res.redirect("/admin");
  }
  return res.render("admin-login", { error: "Parolă greșită" });
});

// ======================= ADD GAME ===========================
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
      playUrl = s.link;
    }

    if (source === "itch") {
      finalLink = itchLink?.trim();
      if (!finalLink || !finalLink.startsWith("http"))
        return res.send("Link itch.io invalid!");
    }

    db.run(
      `INSERT INTO games (title, source, steamId, link, imageUrl, genres)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [title, source, steamId || null, finalLink, imageUrl, genres],
      () => res.redirect("/admin")
    );
  } catch (err) {
    res.render("admin", { games: [], error: err.message });
  }
});

// ======================= DELETE GAME ==========================
app.post("/deleteGame/:id", requireAuth, (req, res) => {
  db.run("DELETE FROM games WHERE id = ?", [req.params.id], () =>
    res.redirect("/admin")
  );
});

// ======================= UPDATE FEATURED =======================
app.post("/updateFeatured", requireAuth, (req, res) => {
  const featured = Array.isArray(req.body.featured)
    ? req.body.featured.map(Number)
    : [];

  db.run("UPDATE games SET featured = 0", [], () => {
    if (featured.length === 0) return res.redirect("/admin");

    const placeholders = featured.map(() => "?").join(",");
    db.run(
      `UPDATE games SET featured = 1 WHERE id IN (${placeholders})`,
      featured,
      () => res.redirect("/admin")
    );
  });
});

app.listen(PORT, () =>
  console.log(`HYGHBYTE running → http://localhost:${PORT}`)
);
