const express = require("express");
const fs = require("fs-extra");
const path = require("path");
const fetch = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args));

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

// Token verification
function requireToken(req, res, next) {
    if (req.query.token === ADMIN_TOKEN) return next();
    return res.status(403).send("Forbidden 😳");
}

// Home Page
app.get("/", (req, res) => {
    const db = loadDB();
    const featuredGames = db.games.filter(g => db.featured.includes(g.id));
    res.render("index", { featuredGames, games: db.games });
});

// Admin Page
app.get("/admin", requireToken, (req, res) => {
    const db = loadDB();
    res.render("admin", { games: db.games, token: ADMIN_TOKEN });
});

// Add game route
app.post("/admin/add", requireToken, async (req, res) => {
    const db = loadDB();
    let game = {};

    if (req.body.platform === "steam") {
        const appId = req.body.steamId?.trim();
        if (!appId) return res.send("❌ Steam ID invalid!");

        try {
            const response = await fetch(`https://store.steampowered.com/api/appdetails?appids=${appId}`);
            const result = await response.json();
            const data = result[appId];

            if (!data?.success) {
                return res.send("❌ Steam ID invalid sau joc inexistent!");
            }

            const info = data.data;
            game = {
                id: Date.now(),
                title: info.name,
                genres: info.genres?.map(g => g.description).join(", ") || "Unknown",
                imageUrl: info.header_image,
                link: `https://store.steampowered.com/app/${appId}/`
            };

        } catch (err) {
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

// Featured select
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
    
    db.games = db.games.filter(g => g.id !== id);
    db.featured = db.featured.filter(f => f !== id);

    saveDB(db);
    res.redirect("/admin?token=" + ADMIN_TOKEN);
});

// 404 route
app.get("*", (_, res) => res.status(404).send("Not Found 😳"));

app.listen(PORT, () => console.log("SERVER ONLINE on " + PORT));
