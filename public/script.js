if (featuredGames.length) {
    let i = 0;

    function update() {
        const f = featuredGames[i];
        document.getElementById("featured-bg").src = f.imageUrl;
        document.getElementById("featured-cover").src = f.imageUrl;
        document.getElementById("featured-title").innerText = f.title;
        document.getElementById("featured-genres").innerText = f.genres;
        document.getElementById("featured-link").href = f.link;
    }

    update();

    document.getElementById("next").onclick = () => {
        i = (i+1) % featuredGames.length;
        update();
    };
    document.getElementById("prev").onclick = () => {
        i = (i-1+featuredGames.length) % featuredGames.length;
        update();
    };
}
