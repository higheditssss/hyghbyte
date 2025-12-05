app.post("/admin/add-game", async (req, res) => {
    const db = loadDB();
    const { type, steamId, title, genres, imageUrl, link, featured } = req.body;

    let newGame = { id: Date.now(), featured: !!featured };

    if (type === "steam") {
        try {
            const data = await fetch(`https://store.steampowered.com/api/appdetails?appids=${steamId}`)
                .then(r => r.json());

            const gameInfo = data[steamId].data;

            newGame.title = gameInfo.name;
            newGame.genres = gameInfo.genres.map(g => g.description).join(", ");
            newGame.imageUrl = gameInfo.header_image;
            newGame.link = `https://store.steampowered.com/app/${steamId}`;
        } catch(e) {
            return res.send("Eroare Steam API 🚫");
        }
    } else {
        newGame.title = title;
        newGame.genres = genres;
        newGame.imageUrl = imageUrl;
        newGame.link = link;
    }

    db.games.push(newGame);

    if (featured) db.featured = [ newGame.id ]; // doar unul recomandat pt început

    fs.writeJsonSync(DB_FILE, db, { spaces: 2 });
    res.redirect("/admin?token=" + process.env.ADMIN_TOKEN);
});
