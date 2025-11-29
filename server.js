import express from "express";
import pg from "pg";
import bodyParser from "body-parser";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.set("view engine", "ejs");

// 🔥 FIX Railway: folosește baza PostgreSQL
const db = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});


// ========================
//   INDEX — LISTĂ JOCURI
// ========================
app.get("/", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM games ORDER BY id DESC");
    res.render("index", { games: result.rows, featuredGames: [] });
  } catch (err) {
    res.send("Eroare DB: " + err);
  }
});


// ========================
//   ADMIN PANEL
// ========================
app.get("/admin", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM games ORDER BY id DESC");
    res.render("admin", { games: result.rows });
  } catch (err) {
    res.send("Eroare DB Admin: " + err);
  }
});


// ========================
//   ADAUGĂ JOC
// ========================
app.post("/admin/add", async (req, res) => {
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


// ========================
//   ȘTERGE JOC
// ========================
app.post("/admin/delete/:id", async (req, res) => {
  try {
    await db.query("DELETE FROM games WHERE id = $1", [req.params.id]);
    res.redirect("/admin");
  } catch (err) {
    res.send("Eroare DELETE: " + err);
  }
});


// ========================
//   PORNEȘTE SERVERUL
// ========================
app.listen(process.env.PORT || 8080, () => {
  console.log("Server pornit pe portul 8080");
});
