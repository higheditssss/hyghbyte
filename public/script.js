console.log("HYGHBYTE script running...");

// FEATURED GAMES
if (typeof featuredGames !== "undefined" && featuredGames.length > 0) {
    let currentIndex = 0;

    const bg = document.getElementById("featured-bg");
    const cover = document.getElementById("featured-cover");
    const title = document.getElementById("featured-title");
    const genres = document.getElementById("featured-genres");
    const link = document.getElementById("featured-link");

    function updateFeatured() {
        const g = featuredGames[currentIndex];

        bg.src = g.imageUrl || "/fallback.jpg";
        cover.src = g.imageUrl || "/fallback.jpg";
        title.innerText = g.title || "N/A";
        genres.innerText = g.genres || "";
        link.href = g.link || "#";
    }

    updateFeatured();

    document.getElementById("featured-next").addEventListener("click", () => {
        currentIndex = (currentIndex + 1) % featuredGames.length;
        updateFeatured();
    });

    document.getElementById("featured-prev").addEventListener("click", () => {
        currentIndex = (currentIndex - 1 + featuredGames.length) % featuredGames.length;
        updateFeatured();
    });
}


// RANDOM POPUP
const popup = document.getElementById("gamePopup");
let rndGame;

document.getElementById("caseBtn").addEventListener("click", () => {
    rndGame = games[Math.floor(Math.random() * games.length)];

    document.getElementById("popup-img").src = rndGame.imageUrl;
    document.getElementById("popup-title").innerText = rndGame.title;
    document.getElementById("popup-genres").innerText = rndGame.genres;
    document.getElementById("popup-play").href = rndGame.link;

    popup.classList.remove("hidden");
});

function closePopup() {
    popup.classList.add("hidden");
}
