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
const saveDB = db => fs.writeJsonSync(DB_FILE, db, { spaces: 2 });

function requireToken(req, res, next) {
    if (req.query.token === ADMIN_TOKEN) return next();
    return res.status(403).send("Forbidden 😳");
}

app.get("/", (req, res) => {
    const db = loadDB();
    const featuredGames = db.games.filter(g => db.featured.includes(g.id));
    res.render("index", { games: db.games, featuredGames });
});

app.get("/admin", requireToken, (req, res) => {
    const db = loadDB();
    res.render("admin", { games: db.games, featured: db.featured, token: ADMIN_TOKEN });
});


app.post("/admin/add", requireToken, async (req, res) => {
    const db = loadDB();
    const platform = req.body.platform;
    let game = {};

    if (platform === "steam") {
        const appId = req.body.steamId?.trim();
        if (!appId) return res.send("❌ Steam ID invalid!");

        // 1) încerc API alternativ
        try {
            const response = await fetch(`https://api.steamcmd.net/v1/info/${appId}`);
            const data = await response.json();
            const info = data.data?.[appId]?.common;
            const store = data.data?.[appId]?.store;

            if (info && store) {
                game = {
                    id: Date.now(),
                    title: info.name,
                    genres: (store.categories || []).join(", "),
                    imageUrl: store.header_image || store.capsule,
                    link: `https://store.steampowered.com/app/${appId}/`
                };
            } else {
                throw new Error("No store info");
            }

        } catch (err) {
            console.log("Steam API fallback – error:", err);

            // 2) fallback: scraping Steam store page
            try {
                const resp2 = await fetch(`https://store.steampowered.com/app/${appId}/`);
                const html = await resp2.text();
                // Simple regex scraping
                const titleMatch = html.match(/<title>(.*?) on Steam<\/title>/);
                const imgMatch = html.match(/data-appimage="(https:\/\/cdn\.akamai.+?)"/);

                if (!titleMatch) {
                    return res.send("❌ Nu am găsit jocul pe Steam");
                }

                game = {
                    id: Date.now(),
                    title: titleMatch[1],
                    genres: "Steam (unknown)", // genurile nu sunt ușor de extras
                    imageUrl: imgMatch ? imgMatch[1] : "",
                    link: `https://store.steampowered.com/app/${appId}/`
                };

            } catch (err2) {
                console.log("Scrape error:", err2);
                return res.send("🥲 Nu am reușit să iau datele jocului!");
            }
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


app.post("/admin/feature", requireToken, (req, res) => {
    const db = loadDB();
    const id = parseInt(req.body.id);
    if (!db.featured.includes(id)) db.featured.push(id);
    saveDB(db);
    res.redirect("/admin?token=" + ADMIN_TOKEN);
});

app.post("/admin/delete", requireToken, (req, res) => {
    const db = loadDB();
    const id = parseInt(req.body.id);
    db.games = db.games.filter(g => g.id !== id);
    db.featured = db.featured.filter(f => f !== id);
    saveDB(db);
    res.redirect("/admin?token=" + ADMIN_TOKEN);
});

app.get("*", (_, res) => res.status(404).send("Not Found 😳"));

app.listen(PORT, () => console.log("SERVER ONLINE on PORT", PORT));
