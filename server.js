const express = require("express");
const fs = require("fs-extra");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 8080;
const DB_FILE = "./db.json";

// Middleware
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Ensure DB exists
if (!fs.existsSync(DB_FILE)) {
    fs.writeJsonSync(DB_FILE, { games: [], featured: [] }, { spaces: 2 });
}

const loadDB = () => fs.readJsonSync(DB_FILE);
const saveDB = (data) => fs.writeJsonSync(DB_FILE, data, { spaces: 2 });

// ROUTE: Homepage
app.get("/", (req, res) => {
    const db = loadDB();
    res.render("index", {
        games: db.games,
        featuredGames: db.featured
    });
});

// ROUTE: Admin (Protected via token)
app.get("/admin", (req, res) => {
    const token = req.query.token;
    const realToken = process.env.ADMIN_TOKEN || "HyghByteSecured_8912";

    if (token !== realToken) {
        return res.status(401).send("Access Denied 🚫");
    }

    res.send(`
        <h1 style="color:white;">Admin Panel ✔</h1>
        <p style="color:white;">Aici vom adăuga formularul pentru jocuri 🎮</p>
        <p style="color:white;">Token valid! 🎉</p>
    `);
});

// 404 fallback
app.get("*", (req, res) => res.status(404).send("Not Found 😳"));

// START SERVER
app.listen(PORT, () => console.log("Running on port " + PORT));
