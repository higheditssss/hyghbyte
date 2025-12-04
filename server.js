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
const saveDB = (data) => fs.writeJsonSync(DB_FILE, data, { spaces: 2 });

// HOME
app.get("/", (req, res) => {
    const db = loadDB();
    res.render("index", {
        games: db.games,
        featuredGames: db.featured
    });
});

// ADMIN UI
app.get("/admin", (req, res) => {
    const token = req.query.token;
    if (token !== ADMIN_TOKEN) return res.status(401).send("Access Denied 🚫");

    const db = loadDB();
    res.render("admin", {
        games: db.games,
        token: token
    });
});

// ADD GAME
app.post("/admin/add", (req, res) => {
    const token = req.query.token;
    if (token !== ADMIN_TOKEN) return res.status(401).send("Unauthorized");

    const db = loadDB();
    const newGame = {
        id: Date.now(),
        title: req.body.title,
        genres: req.body.genres,
        imageUrl: req.body.imageUrl,
        link: req.body.link
    };

    db.games.push(newGame);
    if (req.body.featured) db.featured.push(newGame);

    saveDB(db);
    res.redirect("/admin?token=" + token);
});

// DELETE GAME
app.post("/admin/delete/:id", (req, res) => {
    const token = req.query.token;
    if (token !== ADMIN_TOKEN) return res.status(401).send("Unauthorized");

    const db = loadDB();
    const id = Number(req.params.id);

    db.games = db.games.filter(g => g.id !== id);
    db.featured = db.featured.filter(g => g.id !== id);

    saveDB(db);
    res.redirect("/admin?token=" + token);
});

app.get("*", (req, res) => res.status(404).send("Not Found 😳"));

app.listen(PORT, () => console.log("Running on port " + PORT));
