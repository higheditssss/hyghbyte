const express = require("express");
const path = require("path");
const Database = require("better-sqlite3");
const session = require("express-session");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// DB PATH
const dbPath = path.join(process.cwd(), "db", "games.db");
const db = new Database(dbPath);

// DB WRAPPERS
const dbAll = (q, p = []) => db.prepare(q).all(p);
const dbGet = (q, p = []) => db.prepare(q).get(p);
const dbRun = (q, p = []) => db.prepare(q).run(p);

// VIEW ENGINE
app.set("view engine", "ejs");
app.set("views", path.join(process.cwd(), "views"));
app.use(express.static(path.join(process.cwd(), "public")));
app.use(express.urlencoded({ extended: true }));

// SESSION FOR ADMIN SECRET
app.use(
  session({
    secret: process.env.ADMIN_SECRET || "supersecretkey123",
    resave: false,
    saveUninitialized: false,
  })
);

// HOME PAGE
app.get("/", (req, res) => {
  const games = dbAll("SELECT * FROM games ORDER BY RANDOM() LIMIT 50");
  const featuredGames = dbAll("SELECT * FROM games WHERE featured = 1 LIMIT 10");

  res.render("index", {
    games,
    featuredGames,
  });
});

// ADMIN ADD GAME
app.get("/admin-add", (req, res) => {
  if (!req.query.key || req.query.key !== process.env.ADMIN_SECRET) {
    return res.status(403).send("Forbidden");
  }
  res.render("admin-add");
});

app.post("/admin-add", (req, res) => {
  const { title, genres, link, imageUrl, featured } = req.body;
  dbRun(
    "INSERT INTO games (title, genres, link, imageUrl, featured) VALUES (?, ?, ?, ?, ?)",
    [title, genres, link, imageUrl, featured ? 1 : 0]
  );
  res.redirect("/?added=true");
});

// 404
app.use((req, res) => res.status(404).send("Not found 😢"));

// SERVER START
app.listen(PORT, () =>
  console.log(`🚀 HYGHBYTE online → http://localhost:${PORT}`)
);
