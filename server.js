const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const session = require("express-session");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config();

const app = express();

// HOST + PORT COMPATIBIL RAILWAY
const host = "0.0.0.0";
const PORT = process.env.PORT || 8080;

// VIEW ENGINE
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// STATIC FILES
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));

// SESSION FIX Railway
app.use(
    session({
        secret: process.env.ADMIN_TOKEN || "hyghbyte_secret",
        resave: false,
        saveUninitialized: true,
        cookie: { secure: false }
    })
);

// DATABASE — FIXED PATH FOR RAILWAY
const dbPath = path.join(process.cwd(), "db", "games.db");
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error("DB ERROR:", err);
    else console.log("💾 SQLite connected:", dbPath);
});

// PROMISE DB HELPERS
const dbAll = (q, p = []) =>
    new Promise((res, rej) => db.all(q, p, (e, r) => (e ? rej(e) : res(r))));
const dbGet = (q, p = []) =>
    new Promise((res, rej) => db.get(q, p, (e, r) => (e ? rej(e) : res(r))));
const dbRun = (q, p = []) =>
    new Promise((res, rej) =>
        db.run(q, p, function (e) {
            if (e) rej(e);
            else res(this);
        })
    );

// ADMIN MIDDLEWARE
function isAdmin(req, res, next) {
    if (req.session.isAdmin) return next();
    res.status(403).send("Forbidden");
}

// HOME PAGE
app.get("/", async (req, res) => {
    try {
        const games = await dbAll(
            "SELECT * FROM games WHERE visible = 1 ORDER BY id DESC"
        );
        const featuredGames = await dbAll(
            "SELECT * FROM games WHERE featured = 1 AND visible = 1 LIMIT 5"
        );
        res.render("index", { games, featuredGames });
    } catch (err) {
        res.send("DB Error: " + err);
    }
});

// GAME PAGE (optional)
app.get("/game/:id", async (req, res) => {
    const game = await dbGet("SELECT * FROM games WHERE id = ?", [
        req.params.id,
    ]);
    if (!game) return res.send("Game not found");
    res.render("game", { game });
});

// ADMIN CHECK (ONLY TOKEN VERIFY)
app.get("/admin", (req, res) => {
    if (!process.env.ADMIN_TOKEN) return res.send("No admin token set!");
    res.send("Admin mode activated only via token usage.");
});

// ADMIN DASHBOARD
app.get("/admin-dashboard", isAdmin, async (req, res) => {
    const games = await dbAll("SELECT * FROM games ORDER BY id DESC");
    res.render("admin-dashboard", { games });
});

// LOGIN USING ONLY TOKEN 🔥
app.get("/auth/:token", (req, res) => {
    const { token } = req.params;
    if (token === process.env.ADMIN_TOKEN) {
        req.session.isAdmin = true;
        return res.redirect("/admin-dashboard");
    }
    return res.status(403).send("Invalid token");
});

// ADD GAME
app.post("/admin-add", isAdmin, async (req, res) => {
    const { title, link, imageUrl, genres, featured } = req.body;
    await dbRun(
        "INSERT INTO games (title, link, imageUrl, genres, featured, visible) VALUES (?, ?, ?, ?, ?, 1)",
        [title, link, imageUrl, genres, featured ? 1 : 0]
    );
    res.redirect("/admin-dashboard");
});

// EDIT GAME
app.post("/admin-edit/:id", isAdmin, async (req, res) => {
    const { title, link, imageUrl, genres, featured } = req.body;
    await dbRun(
        "UPDATE games SET title=?, link=?, imageUrl=?, genres=?, featured=? WHERE id=?",
        [title, link, imageUrl, genres, featured ? 1 : 0, req.params.id]
    );
    res.redirect("/admin-dashboard");
});

// DELETE
app.get("/admin-delete/:id", isAdmin, async (req, res) => {
    await dbRun("DELETE FROM games WHERE id = ?", [req.params.id]);
    res.redirect("/admin-dashboard");
});

// LOGOUT
app.get("/logout", (req, res) => {
    req.session.destroy(() => res.redirect("/"));
});

// 404
app.use((req, res) => res.status(404).send("404 | Not Found"));

// START SERVER
app.listen(PORT, host, () =>
    console.log(`🚀 Running on http://${host}:${PORT}`)
);
