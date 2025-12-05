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

// Ensure DB file exists
if (!fs.existsSync(DB_FILE)) {
    fs.writeJsonSync(DB_FILE, { games: [], featured: [] }, { spaces: 2 });
}

const loadDB = () => fs.readJsonSync(DB_FILE);
const saveDB = (db) => fs.writeJsonSync(DB_FILE, db, { spaces: 2 });

// Security check
function requireToken(req, res, next) {
    if (req.query.token === ADMIN_TOKEN) return next();
    return res.status(403).send("Access Interzis 🔒");
}

// HOME PAGE
app.get("/", (req, res) => {
    const db = loadDB();
    const featuredGames = db.games.filter(g => db.featured.includes(g.id));
    res.render("index", { games: db.games, featuredGames });
});

// ADMIN PANEL
app.get("/admin", requireToken, (req, res) => {
    const db = loadDB();
    res.render("admin", {
        games: db.games,
        featured: db.featured,
        token: ADMIN_TOKEN
    });
});

// ADD GAME
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
            const json = await response.json();
            const info = json[appId]?.data;
            if (!info) return res.send("❌ Steam ID invalid!");

            game = {
                id: Date.now(),
                title: info.name,
                genres: info.genres?.map(g => g.description).join(", ") || "N/A",
                imageUrl: info.header_image,
                link: `https://store.steampowered.com/app/${appId}`
            };

        } catch (e) {
            return res.send("🥲 Steam API error, încearcă alt ID!");
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

// FEATURE MULTIPLE
app.post("/admin/feature", requireToken, (req, res) => {
    const db = loadDB();
    let selected = req.body.ids || [];
    if (!Array.isArray(selected)) selected = [selected];
    db.featured = selected.map(id => parseInt(id));
    saveDB(db);
    res.redirect("/admin?token=" + ADMIN_TOKEN);
});

// DELETE GAME
app.post("/admin/delete", requireToken, (req, res) => {
    const db = loadDB();
    const id = parseInt(req.body.id);

    db.games = db.games.filter(g => g.id !== id);
    db.featured = db.featured.filter(fid => fid !== id);

    saveDB(db);
    res.redirect("/admin?token=" + ADMIN_TOKEN);
});

// FALLBACK 404
app.get("*", (_, res) => res.status(404).send("404 Not Found 😳"));

app.listen(PORT, () => console.log("🚀 ONLINE @ PORT", PORT));
