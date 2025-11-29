import express from "express";
import pg from "pg";
import bodyParser from "body-parser";
import session from "express-session";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.set("view engine", "ejs");

// 🔐 SESSION — pentru login admin
app.use(
  session({
    secret: "supersecretkey123",
    resave: false,
    saveUninitialized: true,
  })
);

// 🟢 Railway PostgreSQL
const db = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// ==========================
//  PROTECT ROUTES (middleware)
// ==========================
function requireLogin(req, res, next) {
  if (!req.session.loggedIn) return res.redirect("/login");
  next();
}


// ==========================
// LOGIN PAGE
// ==========================
app.get("/login", (req, res) => {
  res.render("login", { error: null });
});

app.post("/login", (req, res) => {
  const { user, pass } = req.body;

  // 🔐 PAROLA ADMIN (schimb-o cum vrei)
  if (user === "admin" && pass === "hyghbyte2025") {
    req.session.loggedIn = true;
    return res.redirect("/admin");
  }

  res.render("login", { error: "Date incorecte!" });
});

app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
});


// ==========================
// INDEX — Jocuri pe site
// ==========================
app.get("/", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM games ORDER BY id DESC");
    res.render("index", { games: result.rows, featuredGames: [] });
  } catch (err) {
    res.send("Eroare DB: " + err);
  }
});


// ==========================
// ADMIN — PROTEJAT CU LOGIN
// ==========================
app.get("/admin", requireLogin, async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM games ORDER BY id DESC");
    res.render("admin", { games: result.rows });
  } catch (err) {
    res.send("Eroare DB Admin: " + err);
  }
});


// ==========================
// ADD GAME
// ==========================
app.post("/admin/add", requireLogin, async (req, res) => {
  const { title, source, link, imageurl, genres, badge } = req.body;

  try {
    await db.query(
      "INSERT INTO games (title, source, link, imageurl, genres, badge) VALUES ($1,$2,$3,$4,$5,$6)",
      [title, source, link, imageurl, genres, badge]
    );
    res.redirect("/admin");
  } catch (err) {
    res.send("Eroare ADD: " + err);
  }
});


// ==========================
// DELETE GAME
// ==========================
app.post("/admin/delete/:id", requireLogin, async (req, res) => {
  try {
    await db.query("DELETE FROM games WHERE id = $1", [req.params.id]);
    res.redirect("/admin");
  } catch (err) {
    res.send("Eroare DELETE: " + err);
  }
});


// ==========================
// START SERVER
// ==========================
app.listen(process.env.PORT || 8080, () => {
  console.log("Server pornit pe portul 8080");
});
