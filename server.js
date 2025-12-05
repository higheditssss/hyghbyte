const express = require("express");
const fs = require("fs-extra");
const path = require("path");
const fetch = require("node-fetch");

const app = express();
const PORT = process.env.PORT || 8080;
const DB_FILE = "./db.json";
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "HyghByteSecured_8912";

app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

if (!fs.existsSync(DB_FILE)) {
    fs.writeJsonSync(DB_FILE, { games: [], featured: [] }, { spaces: 2 });
}

const loadDB = () => fs.readJsonSync(DB_FILE);
const saveDB = (db) => fs.writeJsonSync(DB_FILE, db, { spaces: 2 });

// Security Token Check
function requireToken(req, res, next) {
    if (req.query.token === ADMIN_TOKEN) return next();
    return res.status(403).send("Forbidden 😳");
}

// Home
app.get("/", (req, res) => {
    const db = loadDB();
    const featuredGames = db.games.filter(g => db.featured.includes(g.id));
    res.render("index", { games: db.games, featuredGames });
});

// Admin UI
app.get("/admin", requireToken, (req, res) => {
    const db = loadDB();
    res.render("admin", { games: db.games, featured: db.featured, token: ADMIN_TOKEN });
});

// Add Game (Steam sau manual)
app.post("/admin/add", requireToken, async (req, res) => {
    const db = loadDB();
    const platform = req.body.platform;
    let game = {};

    if (platform === "steam") {
        const appId = req.body.steamId.trim();

        try {
            const response = await fetch(
                `https://store.steampowered.com/api/appdetails?appids=${appId}&cc=us&l=en`
            );
            const data = await response.json();
            const info = data[appId]?.data;

            if (!info) return res.send("❌ Steam ID invalid!");

            const genres = info.genres?.map(g => g.description).join(", ") || "N/A";

            game = {
                id: Date.now(),
                title: info.name,
                genres: genres,
                imageUrl: info.header_image,
                link: `https://store.steampowered.com/app/${appId}/`
            };

        } catch (err) {
            console.log("STEAM API ERROR:", err);
            return res.send("🥲 Eroare la Steam API!");
        }
    } else {
        game = {
            id: Date.now(),
            title: req.body.title,
            genres: req.body.genres,
            imageUrl: req.body.imageUrl,
            link: req.body.link
        };
    }

    db.games.push(game);
    saveDB(db);

    res.redirect("/admin?token=" + ADMIN_TOKEN);
});

// Set Featured
app.post("/admin/feature", requireToken, (req, res) => {
    const db = loadDB();
    const id = parseInt(req.body.id);
    if (!db.featured.includes(id)) db.featured.push(id);
    saveDB(db);
    res.redirect("/admin?token=" + ADMIN_TOKEN);
});

// Delete Game
app.post("/admin/delete", requireToken, (req, res) => {
    const db = loadDB();
    const id = parseInt(req.body.id);

    db.games = db.games.filter(game => game.id !== id);
    db.featured = db.featured.filter(fid => fid !== id);

    saveDB(db);
    res.redirect("/admin?token=" + ADMIN_TOKEN);
});

app.get("*", (_, res) => res.status(404).send("Not Found 😳"));

app.listen(PORT, () => console.log(`SERVER ONLINE @ ${PORT}`));
