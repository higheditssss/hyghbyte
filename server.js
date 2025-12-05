const express = require("express");
const fs = require("fs-extra");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 8080;
const DB_FILE = "./db.json";
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "HyghByteSecured_8912";

app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Ensure database
if (!fs.existsSync(DB_FILE)) {
    fs.writeJsonSync(DB_FILE, { games: [], featured: [] }, { spaces: 2 });
}
const loadDB = () => fs.readJsonSync(DB_FILE);
const saveDB = (data) => fs.writeJsonSync(DB_FILE, data, { spaces: 2 });

// Homepage
app.get("/", (req, res) => {
    const db = loadDB();
    res.render("index", {
        games: db.games,
        featuredGames: db.featured
    });
});

// Admin secure access
app.get("/admin", (req, res) => {
    const token = req.query.token;
    if (!token || token !== ADMIN_TOKEN) {
        return res.status(403).send("Forbidden 😳");
    }

    const db = loadDB();
    res.render("admin", { games: db.games, token });
});

// Add new game from admin
app.post("/admin/add", (req, res) => {
    const token = req.query.token;
    if (!token || token !== ADMIN_TOKEN) return res.status(403).send("Forbidden");

    const { title, genres, imageUrl, link, featured } = req.body;
    const db = loadDB();

    const newGame = {
        id: Date.now(),
        title,
        genres,
        imageUrl,
        link
    };

    db.games.push(newGame);

    if (featured === "on") {
        db.featured.push(newGame);
    }

    saveDB(db);
    res.redirect(`/admin?token=${ADMIN_TOKEN}`);
});

// 404 page
app.get("*", (req, res) => res.status(404).send("Not Found 😳"));

app.listen(PORT, () => console.log("SERVER ON " + PORT));
