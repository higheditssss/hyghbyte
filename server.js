const express = require("express");
const fs = require("fs-extra");
const path = require("path");
const dotenv = require("dotenv");
dotenv.config();
const fetch = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args));

const app = express();
const PORT = process.env.PORT || 8080;
const DB_FILE = "./db.json";
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "HyghByteSecured_8912";

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

if (!fs.existsSync(DB_FILE)) {
    fs.writeJsonSync(DB_FILE, { games: [], featured: [] }, { spaces: 2 });
}

const loadDB = () => fs.readJsonSync(DB_FILE);
const saveDB = (db) => fs.writeJsonSync(DB_FILE, db, { spaces: 2 });

// Home page
app.get("/", (req, res) => {
    const db = loadDB();
    res.render("index", {
        games: db.games,
        featuredGames: db.featured
    });
});

// Admin Panel
app.get("/admin", (req, res) => {
    const token = req.query.token;
    if (token !== ADMIN_TOKEN) return res.status(403).send("Not Found 🤯");

    const db = loadDB();
    res.render("admin", {
        games: db.games,
        token
    });
});

// Add game
app.post("/admin/add", async (req, res) => {
    const token = req.query.token;
    if (token !== ADMIN_TOKEN) return res.status(403).send("Unauthorized");

    const db = loadDB();

    if (req.body.source === "steam") {
        const appId = req.body.steamId;
        try {
            const response = await fetch(`https://store.steampowered.com/api/appdetails?appids=${appId}`);
            const data = await response.json();
            const app = data[appId].data;

            const newGame = {
                id: Date.now(),
                title: app.name,
                genres: app.genres?.map(g => g.description).join(", ") || "Unknown",
                imageUrl: app.header_image,
                link: `https://store.steampowered.com/app/${appId}`
            };

            db.games.push(newGame);
            db.featured.push(newGame);

        } catch (err) {
            console.log("Steam fetch error:", err);
        }
    } else {
        const newGame = {
            id: Date.now(),
            title: req.body.title,
            genres: req.body.genres,
            imageUrl: req.body.imageUrl,
            link: req.body.link
        };

        db.games.push(newGame);
        if (req.body.featured) db.featured.push(newGame);
    }

    saveDB(db);
    res.redirect("/admin?token=" + token);
});

app.get("*", (req, res) => res.status(404).send("Not Found 😳"));

app.listen(PORT, () => console.log("🚀 Running on port " + PORT));
