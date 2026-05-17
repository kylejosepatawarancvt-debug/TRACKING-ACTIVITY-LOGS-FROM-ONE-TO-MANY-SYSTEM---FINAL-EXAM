const express = require('express');
const router = express.Router();
const db = require('../config/database');
const bcrypt = require('bcryptjs');

// Helper function to insert activity logs automatically
async function logActivity(username, actionType, entity, details) {
    try {
        await db.execute(
            'INSERT INTO activity_logs (username, action_type, entity_affected, details) VALUES (?, ?, ?, ?)',
            [username, actionType, entity, details]
        );
    } catch (err) {
        console.error("Failed to write to activity logs:", err);
    }
}

// 1. AUTHENTICATION MODULES
router.post('/register', async (req, res) => {
    const { username, password } = req.body;
    try {
        const [rows] = await db.execute('SELECT username FROM users WHERE username = ?', [username]);
        if (rows.length > 0) return res.status(400).json({ error: "Username already exists!" }); // Rule: No duplicate usernames

        const hashedPassword = await bcrypt.hash(password, 10);
        await db.execute('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword]);
        
        await logActivity(username, 'CREATE', 'Users', `Registered user account: ${username}`);
        res.json({ success: "Account created successfully!" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const [rows] = await db.execute('SELECT * FROM users WHERE username = ?', [username]);
        if (rows.length === 0) return res.status(400).json({ error: "User not found!" });

        const user = rows[0];
        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(400).json({ error: "Incorrect details!" });

        req.session.username = user.username;
        await logActivity(user.username, 'READ', 'Users', `Logged into the platform.`);
        res.json({ success: "Logged in", username: user.username });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/user-session', (req, res) => {
    if (req.session.username) res.json({ loggedIn: true, username: req.session.username });
    else res.json({ loggedIn: false });
});

router.get('/logout', (req, res) => {
    if (req.session.username) {
        logActivity(req.session.username, 'READ', 'Users', `Logged out out of system.`);
    }
    req.session.destroy();
    res.redirect('/login.html');
});

// 2. SEARCH FUNCTIONALITY (Parent & Child Tables combined search)
router.get('/search', async (req, res) => {
    const term = req.query.q || '';
    try {
        // Search Projects
        const [projects] = await db.execute('SELECT * FROM projects WHERE project_name LIKE ? OR description LIKE ?', [`%${term}%`, `%${term}%`]);
        // Search Tasks
        const [tasks] = await db.execute('SELECT t.*, p.project_name FROM tasks t JOIN projects p ON t.project_id = p.id WHERE t.task_name LIKE ? OR t.assigned_to LIKE ?', [`%${term}%`, `%${term}%`]);
        
        if (req.session.username && term !== '') {
            await logActivity(req.session.username, 'READ', 'Search Engine', `Searched query term: "${term}"`);
        }
        res.json({ projects, tasks });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. PARENT ENTITY (PROJECTS) CRUD
router.get('/projects', async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM projects');
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/projects', async (req, res) => {
    const { project_name, description, deadline } = req.body;
    const user = req.session.username || 'System Guest';
    try {
        const [result] = await db.execute('INSERT INTO projects (project_name, description, deadline) VALUES (?, ?, ?)', [project_name, description, deadline]);
        await logActivity(user, 'CREATE', 'Projects', `Created Project: ${project_name} (ID: ${result.insertId})`);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/projects/:id', async (req, res) => {
    const { project_name, description, deadline } = req.body;
    const user = req.session.username || 'System Guest';
    try {
        await db.execute('UPDATE projects SET project_name = ?, description = ?, deadline = ? WHERE id = ?', [project_name, description, deadline, req.params.id]);
        await logActivity(user, 'UPDATE', 'Projects', `Modified project profile: ${project_name} (ID: ${req.params.id})`);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/projects/:id', async (req, res) => {
    const user = req.session.username || 'System Guest';
    try {
        await db.execute('DELETE FROM projects WHERE id = ?', [req.params.id]);
        await logActivity(user, 'DELETE', 'Projects', `Permanently purged project ID ${req.params.id} and child tasks.`);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 4. CHILD ENTITY (TASKS) CRUD
router.get('/tasks', async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT t.*, p.project_name FROM tasks t JOIN projects p ON t.project_id = p.id');
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/tasks', async (req, res) => {
    const { project_id, task_name, assigned_to, status } = req.body;
    const user = req.session.username || 'System Guest';
    try {
        await db.execute('INSERT INTO tasks (project_id, task_name, assigned_to, status) VALUES (?, ?, ?, ?)', [project_id, task_name, assigned_to, status]);
        await logActivity(user, 'CREATE', 'Tasks', `Assigned new task "${task_name}" to Project reference ID: ${project_id}`);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/tasks/:id', async (req, res) => {
    const { task_name, assigned_to, status } = req.body;
    const user = req.session.username || 'System Guest';
    try {
        await db.execute('UPDATE tasks SET task_name = ?, assigned_to = ?, status = ? WHERE id = ?', [task_name, assigned_to, status, req.params.id]);
        await logActivity(user, 'UPDATE', 'Tasks', `Altered task details for "${task_name}" (Status changed to: ${status})`);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/tasks/:id', async (req, res) => {
    const user = req.session.username || 'System Guest';
    try {
        await db.execute('DELETE FROM tasks WHERE id = ?', [req.params.id]);
        await logActivity(user, 'DELETE', 'Tasks', `Erased child Task row tracking ID: ${req.params.id}`);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 5. ACTIVITY LOGS VIEW API (No UPDATE or DELETE routes exist here!)
router.get('/logs', async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM activity_logs ORDER BY timestamp DESC');
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;