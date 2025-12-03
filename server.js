require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const session = require("express-session");
const Database = require("better-sqlite3");

// === CONFIG ===
const app = express();
const PORT = process.env.PORT || 8080;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "HyghByteSecured_8912";

// DB Init
const db = new Database("./database.db");

// Create tables if missing
db.prepare(`
CREATE TABLE IF NOT EXISTS games (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  genres TEXT NOT NULL,
  link TEXT NOT NULL,
  imageUrl TEXT,
  featured INTEGER DEFAULT 0
)
`).run();

// === MIDDLEWARE ===
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
  secret: process.env.ADMIN_SECRET || "HyghByteSuperSecret_2025",
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

// 🔐 Admin Protection — simple & effective
function requireAdmin(req, res, next) {
  if (req.query.token === ADMIN_TOKEN) {
    req.session.isAdmin = true;
  }
  if (req.session.isAdmin) return next();
  return res.status(403).send("Forbidden ❌");
}

// === ROUTES ===

// HOME PAGE
app.get("/", (req, res) => {
  const games = db.prepare(`SELECT * FROM games ORDER BY id DESC`).all();
  const featuredGames = db.prepare(`SELECT * FROM games WHERE featured = 1`).all();
  res.render("index", { games, featuredGames });
});

// ADMIN Dashboard
app.get("/admin", requireAdmin, (req, res) => {
  const games = db.prepare(`SELECT * FROM games ORDER BY id DESC`).all();
  res.render("admin-dashboard", { games });
});

// Add Game
app.post("/admin/add", requireAdmin, (req, res) => {
  const { title, genres, link, imageUrl, featured } = req.body;

  db.prepare(`
    INSERT INTO games (title, genres, link, imageUrl, featured)
    VALUES (?, ?, ?, ?, ?)
  `).run(title, genres, link, imageUrl, featured ? 1 : 0);

  res.redirect("/admin?token=" + ADMIN_TOKEN);
});

// Delete Game
app.get("/admin/delete/:id", requireAdmin, (req, res) => {
  db.prepare("DELETE FROM games WHERE id = ?").run(req.params.id);
  res.redirect("/admin?token=" + ADMIN_TOKEN);
});

// Toggle Featured
app.get("/admin/feature/:id", requireAdmin, (req, res) => {
  const game = db.prepare("SELECT featured FROM games WHERE id = ?").get(req.params.id);
  const newStatus = game.featured ? 0 : 1;
  db.prepare("UPDATE games SET featured = ? WHERE id = ?").run(newStatus, req.params.id);
  res.redirect("/admin?token=" + ADMIN_TOKEN);
});

// === 404 Handler ===
app.use((req, res) => {
  res.status(404).send("Not found 🤯");
});

// === START SERVER ===
app.listen(PORT, () =>
  console.log(`🚀 HYGHBYTE running on http://localhost:${PORT}`)
);
