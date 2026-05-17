const express = require('express');
const session = require('express-session');
const path = require('path');

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Session tracking setup
app.use(session({
    secret: 'audit_log_secret_key',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 3600000 } // 1 hour session window
}));

// Route Middlewares
const appRoutes = require('./routes/appRoutes');
app.use('/api', appRoutes);

// Direct serving of views
app.get('/', (req, res) => {
    if (!req.session.username) return res.redirect('/login.html');
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Server executing safely at http://localhost:${PORT}`));