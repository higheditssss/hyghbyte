const express = require("express");
const fs = require("fs-extra");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 8080;
const DB_FILE = "./db.json";
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "HyghByteSecured_8912";

app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

if (!fs.existsSync(DB_FILE)) {
    fs.writeJsonSync(DB_FILE, { games: [], featured: [] }, { spaces: 2 });
}

const loadDB = () => fs.readJsonSync(DB_FILE);
const saveDB = (db) => fs.writeJsonSync(DB_FILE, db, { spaces: 2 });

function requireAdmin(req, res, next) {
    if (req.query.token === ADMIN_TOKEN) return next();
    return res.status(403).send("STOP 🚫");
}

// HOME PAGE
app.get("/", (req, res) => {
    const db = loadDB();
    res.render("index", {
        games: db.games,
        featuredGames: db.featured
    });
});

// ADMIN PAGE (add game)
app.get("/admin", requireAdmin, (req, res) => {
    const db = loadDB();
    res.render("admin", {
        token: ADMIN_TOKEN,
        games: db.games,
        featuredGames: db.featured
    });
});

// ADD GAME
app.post("/admin/add", requireAdmin, (req, res) => {
    const db = loadDB();
    const { title, genres, imageUrl, link } = req.body;

    db.games.push({
        id: Date.now(),
        title,
        genres,
        imageUrl,
        link
    });

    saveDB(db);
    res.redirect(`/admin?token=${ADMIN_TOKEN}`);
});

// SET FEATURED GAME
app.post("/admin/feature", requireAdmin, (req, res) => {
    const db = loadDB();
    const { id } = req.body;

    const game = db.games.find(g => g.id == id);
    if (!game) return res.send("Game not found 😢");

    db.featured = [game];
    saveDB(db);

    res.redirect(`/admin?token=${ADMIN_TOKEN}`);
});

app.get("*", (req, res) => res.status(404).send("Not Found 😳"));

app.listen(PORT, () => console.log("SERVER ONLINE ON " + PORT));
