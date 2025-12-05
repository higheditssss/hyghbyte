// SERVER.JS — Railway Stable 🚀

const express = require("express");
const fs = require("fs-extra");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 8080;
const DB_FILE = "./db.json";

app.use(express.static("public"));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));

// Ensure DB exists
if (!fs.existsSync(DB_FILE)) {
    fs.writeJsonSync(DB_FILE, { games: [], featured: [] }, { spaces: 2 });
}
const loadDB = () => fs.readJsonSync(DB_FILE);

// HOME
app.get("/", (req, res) => {
    const db = loadDB();

    const featuredGames = db.featured
        .map(id => db.games.find(g => g.id === id))
        .filter(Boolean);

    res.render("index", { games: db.games, featuredGames });
});

// ADMIN PAGE
app.get("/admin", (req, res) => {
    if (req.query.token !== process.env.ADMIN_TOKEN) {
        return res.status(403).send("Access Denied ❌");
    }

    const db = loadDB();
    res.render("admin", { db, token: process.env.ADMIN_TOKEN });
});

// ADD GAME
app.post("/admin/add-game", async (req, res) => {
    if (req.query.token !== process.env.ADMIN_TOKEN) {
        return res.status(403).send("STOP 🛑");
    }

    const db = loadDB();
    const { type, steamId, title, genres, imageUrl, link, featured } = req.body;
    let newGame = { id: Date.now(), featured: !!featured };

    try {
        if (type === "steam") {
            const url = `https://store.steampowered.com/api/appdetails?appids=${steamId}`;
            const apiRes = await fetch(url);
            const data = await apiRes.json();

            if (!data[steamId] || !data[steamId].success) {
                return res.send("Steam ID invalid ❌");
            }

            const g = data[steamId].data;
            newGame.title = g.name;
            newGame.genres = g.genres?.map(x => x.description).join(", ") || "";
            newGame.imageUrl = g.header_image;
            newGame.link = `https://store.steampowered.com/app/${steamId}`;
        } else {
            newGame.title = title;
            newGame.genres = genres;
            newGame.imageUrl = imageUrl;
            newGame.link = link;
        }

        db.games.push(newGame);

        if (featured) {
            db.featured = [newGame.id];
        }

        fs.writeJsonSync(DB_FILE, db, { spaces: 2 });
        res.redirect(`/admin?token=${process.env.ADMIN_TOKEN}`);
    } catch (err) {
        console.log("ADD GAME ERROR:", err);
        res.send("Server Error 😭");
    }
});

app.get("*", (req, res) => res.status(404).send("Not Found 😳"));

app.listen(PORT, () => console.log("SERVER ONLINE on PORT:", PORT));
