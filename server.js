import express from "express";
import session from "express-session";
import pg from "pg";
import bcrypt from "bcrypt";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(express.static("public"));
app.set("view engine", "ejs");

// ----------------------
// DATABASE (PostgreSQL)
// ----------------------
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// ----------------------
// SESSION SECURITY
// ----------------------
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "strict",
      secure: false
    }
  })
);

// ----------------------
// AUTH MIDDLEWARE
// ----------------------
function requireAdmin(req, res, next) {
  if (!req.session.admin || req.session.token !== process.env.ADMIN_TOKEN) {
    return res.redirect("/login");
  }
  next();
}

// ----------------------
// LOGIN PAGE
// ----------------------
app.get("/login", (req, res) => {
  res.render("login", { error: null });
});

// ----------------------
// LOGIN POST
// ----------------------
app.post("/login", async (req, res) => {
  const { password } = req.body;

  const valid = await bcrypt.compare(
    password,
    process.env.ADMIN_PASSWORD_HASH
  );

  if (!valid) {
    return res.render("login", { error: "Parolă greșită" });
  }

  req.session.admin = true;
  req.session.token = process.env.ADMIN_TOKEN;
  res.redirect("/admin");
});

// ----------------------
// ADMIN PAGE (PROTEJAT)
// ----------------------
app.get("/admin", requireAdmin, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM games ORDER BY id ASC");
    res.render("admin", { games: result.rows });
  } catch (err) {
    res.send("Eroare DB Admin: " + err);
  }
});

// ----------------------
// ADD GAME
// ----------------------
app.post("/admin/add", requireAdmin, async (req, res) => {
  const { title, source, link, imageurl, genres, badge } = req.body;

  try {
    await pool.query(
      "INSERT INTO games (title, source, link, imageurl, genres, badge) VALUES ($1,$2,$3,$4,$5,$6)",
      [title, source, link, imageurl, genres, badge]
    );

    res.redirect("/admin");
  } catch (err) {
    res.send("Eroare la adăugare joc: " + err);
  }
});

// ----------------------
// DELETE GAME
// ----------------------
app.post("/admin/delete/:id", requireAdmin, async (req, res) => {
  try {
    await pool.query("DELETE FROM games WHERE id=$1", [req.params.id]);
    res.redirect("/admin");
  } catch (err) {
    res.send("Eroare la ștergere: " + err);
  }
});

// ----------------------
// INDEX PAGE
// ----------------------
app.get("/", async (req, res) => {
  try {
    const games = await pool.query("SELECT * FROM games ORDER BY id ASC");
    res.render("index", {
      games: games.rows,
      featuredGames: []
    });
  } catch (err) {
    res.send("Eroare DB: " + err);
  }
});

app.listen(8080, () =>
  console.log("HYGHBYTE Server running → http://localhost:8080")
);
