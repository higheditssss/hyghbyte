const session = require("express-session");

app.use(session({
    secret: process.env.ADMIN_SECRET || "HyghByteSuperSecret_2025",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
}));

// Verificare login admin
function requireAdmin(req, res, next) {
    if (req.session && req.session.isAdmin) {
        return next();
    }
    return res.redirect("/admin-login");
}

// Page login admin
app.get("/admin-login", (req, res) => {
    res.render("admin-login");
});

// Handle login
app.post("/admin-login", (req, res) => {
    const { password } = req.body;
    
    if (password === process.env.ADMIN_PASSWORD) {
        req.session.isAdmin = true;
        return res.redirect("/admin");
    }
    res.render("admin-login", { error: "Parolă greșită! 😳" });
});

// Admin page (protejată)
app.get("/admin", requireAdmin, (req, res) => {
    res.render("admin");
});
