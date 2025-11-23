function startSnow() {
  const box = document.createElement("div");
  box.className = "snow-container";
  document.body.appendChild(box);

  setInterval(() => {
    const s = document.createElement("div");
    s.className = "snowflake";
    s.style.left = Math.random()*window.innerWidth + "px";
    s.style.animationDuration = (2 + Math.random()*3) + "s";
    s.style.opacity = Math.random()*0.8 + 0.2;
    box.appendChild(s);
    setTimeout(()=>s.remove(),5000);
  }, 120);
}
startSnow();
