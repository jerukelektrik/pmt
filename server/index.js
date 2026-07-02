import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDb, query, hashPassword } from './db.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5005;

app.use(cors());
app.use(express.json());

// Token Decode Helper & Middleware
function getAuthenticatedUser(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  try {
    const base64Token = authHeader.substring(7);
    const decoded = Buffer.from(base64Token, 'base64').toString('ascii');
    const [username, role, id] = decoded.split(':');
    if (!username || !role || !id) return null;
    return { username, role, id: parseInt(id, 10) };
  } catch (err) {
    return null;
  }
}

function requireAuth(req, res, next) {
  const user = getAuthenticatedUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized access' });
  }
  req.user = user;
  next();
}

function requireLead(req, res, next) {
  const user = getAuthenticatedUser(req);
  if (!user || user.role !== 'lead') {
    return res.status(403).json({ error: 'Forbidden: Leads only' });
  }
  req.user = user;
  next();
}

// --- AUTHENTICATION ENDPOINTS ---

// Login Endpoint
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  try {
    const user = await query.get('SELECT * FROM users WHERE username = ?', [username]);
    if (!user) {
      return res.status(401).json({ error: 'Username not found' });
    }
    const hashed = hashPassword(password);
    if (user.password !== hashed) {
      return res.status(401).json({ error: 'Incorrect password' });
    }
    // Generate simple Base64 token
    const token = Buffer.from(`${user.username}:${user.role}:${user.id}`).toString('base64');
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        name: user.name
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Database error: ' + err.message });
  }
});

// Get Current User Endpoint
app.get('/api/auth/me', requireAuth, async (req, res) => {
  try {
    const user = await query.get('SELECT id, username, role, name FROM users WHERE id = ?', [req.user.id]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Database error: ' + err.message });
  }
});

// --- USER MANAGEMENT ENDPOINTS ---

// Get Users List (for task assignment)
app.get('/api/users', requireAuth, async (req, res) => {
  try {
    const users = await query.all('SELECT id, username, role, name FROM users');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Register New User (Lead only)
app.post('/api/users', requireLead, async (req, res) => {
  const { username, password, name, role } = req.body;
  if (!username || !password || !name || !role) {
    return res.status(400).json({ error: 'Missing fields' });
  }
  try {
    const existing = await query.get('SELECT id FROM users WHERE username = ?', [username]);
    if (existing) {
      return res.status(400).json({ error: 'Username sudah digunakan' });
    }
    const hashed = hashPassword(password);
    const result = await query.run(
      'INSERT INTO users (username, password, role, name) VALUES (?, ?, ?, ?)',
      [username, hashed, role, name]
    );
    res.status(201).json({ id: result.lastID, username, role, name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- BRAND ENDPOINTS ---

// Get Brands
app.get('/api/brands', requireAuth, async (req, res) => {
  try {
    const brands = await query.all('SELECT * FROM brands');
    res.json(brands);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create Brand (Lead only)
app.post('/api/brands', requireLead, async (req, res) => {
  const { id, name, color, description } = req.body;
  if (!id || !name || !color) {
    return res.status(400).json({ error: 'Missing fields' });
  }
  const brandId = id.trim().toLowerCase().replace(/\s+/g, '-');
  try {
    const existing = await query.get('SELECT id FROM brands WHERE id = ?', [brandId]);
    if (existing) {
      return res.status(400).json({ error: 'Brand ID sudah ada' });
    }
    await query.run(
      'INSERT INTO brands (id, name, color, description) VALUES (?, ?, ?, ?)',
      [brandId, name, color, description]
    );
    res.status(201).json({ id: brandId, name, color, description });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete Brand (Lead only)
app.delete('/api/brands/:id', requireLead, async (req, res) => {
  const { id } = req.params;
  try {
    await query.run('DELETE FROM brands WHERE id = ?', [id]);
    res.json({ success: true, message: 'Brand deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- TASK MANAGEMENT ENDPOINTS ---

// Get Tasks
app.get('/api/tasks', requireAuth, async (req, res) => {
  const { brand_id, assignee_id, status, category } = req.query;
  let whereClauses = [];
  let params = [];

  if (brand_id) {
    whereClauses.push('t.brand_id = ?');
    params.push(brand_id);
  }
  if (assignee_id) {
    whereClauses.push('t.assignee_id = ?');
    params.push(parseInt(assignee_id, 10));
  }
  if (status) {
    whereClauses.push('t.status = ?');
    params.push(status);
  }
  if (category) {
    whereClauses.push('t.category = ?');
    params.push(category);
  }

  const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
  const sql = `
    SELECT t.*, b.name as brand_name, b.color as brand_color, u.name as assignee_name 
    FROM tasks t
    LEFT JOIN brands b ON t.brand_id = b.id
    LEFT JOIN users u ON t.assignee_id = u.id
    ${whereString}
    ORDER BY 
      CASE t.priority
        WHEN 'urgent' THEN 1
        WHEN 'high' THEN 2
        WHEN 'medium' THEN 3
        WHEN 'low' THEN 4
      END, t.due_date ASC
  `;

  try {
    const tasks = await query.all(sql, params);
    
    // Fetch attached links for each task
    for (let task of tasks) {
      task.links = await query.all('SELECT * FROM task_links WHERE task_id = ?', [task.id]);
    }
    
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Single Task
app.get('/api/tasks/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  try {
    const task = await query.get(
      `SELECT t.*, b.name as brand_name, b.color as brand_color, u.name as assignee_name 
       FROM tasks t
       LEFT JOIN brands b ON t.brand_id = b.id
       LEFT JOIN users u ON t.assignee_id = u.id
       WHERE t.id = ?`,
      [id]
    );
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    task.links = await query.all('SELECT * FROM task_links WHERE task_id = ?', [id]);
    res.json(task);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create Task (Lead only)
app.post('/api/tasks', requireLead, async (req, res) => {
  const { title, description, brand_id, priority, category, assignee_id, due_date } = req.body;
  if (!title || !brand_id) {
    return res.status(400).json({ error: 'Title and Brand ID are required' });
  }
  const now = new Date().toISOString();
  try {
    const result = await query.run(
      `INSERT INTO tasks (title, description, brand_id, status, priority, category, assignee_id, due_date, created_at, updated_at) 
       VALUES (?, ?, ?, 'todo', ?, ?, ?, ?, ?, ?)`,
      [title, description || '', brand_id, priority || 'medium', category || 'others', assignee_id || null, due_date || null, now, now]
    );
    res.status(201).json({ id: result.lastID, title, status: 'todo' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update Task (Lead can edit all, Members can edit status)
app.put('/api/tasks/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { title, description, brand_id, status, priority, category, assignee_id, due_date } = req.body;
  const now = new Date().toISOString();

  try {
    const existing = await query.get('SELECT * FROM tasks WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (req.user.role === 'member') {
      // Members can only update status
      if (status && status !== existing.status) {
        const completedAt = status === 'done' ? now : null;
        await query.run(
          'UPDATE tasks SET status = ?, completed_at = ?, updated_at = ? WHERE id = ?',
          [status, completedAt, now, id]
        );
        return res.json({ success: true, message: 'Task status updated' });
      }
      return res.status(403).json({ error: 'Members can only update task status' });
    }

    // Lead or Boss can edit anything
    const completedAt = status === 'done' ? (existing.completed_at || now) : null;
    
    await query.run(
      `UPDATE tasks SET 
        title = ?, 
        description = ?, 
        brand_id = ?, 
        status = ?, 
        priority = ?, 
        category = ?, 
        assignee_id = ?, 
        due_date = ?, 
        completed_at = ?,
        updated_at = ? 
       WHERE id = ?`,
      [
        title !== undefined ? title : existing.title,
        description !== undefined ? description : existing.description,
        brand_id !== undefined ? brand_id : existing.brand_id,
        status !== undefined ? status : existing.status,
        priority !== undefined ? priority : existing.priority,
        category !== undefined ? category : existing.category,
        assignee_id !== undefined ? assignee_id : existing.assignee_id,
        due_date !== undefined ? due_date : existing.due_date,
        completedAt,
        now,
        id
      ]
    );

    res.json({ success: true, message: 'Task updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete Task (Lead only)
app.delete('/api/tasks/:id', requireLead, async (req, res) => {
  const { id } = req.params;
  try {
    await query.run('DELETE FROM tasks WHERE id = ?', [id]);
    res.json({ success: true, message: 'Task deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- TASK LINKS (DOCUMENT MANAGER) ENDPOINTS ---

// Get all links (Global documents viewer)
app.get('/api/links', requireAuth, async (req, res) => {
  const { brand_id } = req.query;
  let sql = `
    SELECT tl.*, t.title as task_title, b.name as brand_name, b.color as brand_color 
    FROM task_links tl
    JOIN tasks t ON tl.task_id = t.id
    LEFT JOIN brands b ON t.brand_id = b.id
  `;
  let params = [];
  if (brand_id) {
    sql += ' WHERE t.brand_id = ?';
    params.push(brand_id);
  }
  sql += ' ORDER BY tl.created_at DESC';

  try {
    const links = await query.all(sql, params);
    res.json(links);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add Link to Task
app.post('/api/tasks/:id/links', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { title, url, type } = req.body;
  if (!title || !url) {
    return res.status(400).json({ error: 'Title and URL are required' });
  }
  const now = new Date().toISOString();
  try {
    const task = await query.get('SELECT id FROM tasks WHERE id = ?', [id]);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    const result = await query.run(
      'INSERT INTO task_links (task_id, title, url, type, created_at) VALUES (?, ?, ?, ?, ?)',
      [id, title, url, type || 'other', now]
    );
    res.status(201).json({ id: result.lastID, task_id: parseInt(id, 10), title, url, type });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete Link
app.delete('/api/links/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  try {
    await query.run('DELETE FROM task_links WHERE id = ?', [id]);
    res.json({ success: true, message: 'Link deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- REPORTING / BOSS OVERVIEW ENDPOINT ---

app.get('/api/reports/progress', requireAuth, async (req, res) => {
  try {
    // 1. Overall stats
    const overall = await query.get(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'todo' THEN 1 ELSE 0 END) as todo,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN status = 'in_review' THEN 1 ELSE 0 END) as in_review
      FROM tasks
    `);

    // 2. Brand stats
    const brandsList = await query.all('SELECT id, name, color FROM brands');
    const brandStats = [];
    for (const brand of brandsList) {
      const stats = await query.get(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as completed
        FROM tasks WHERE brand_id = ?
      `, [brand.id]);
      
      const total = stats.total || 0;
      const completed = stats.completed || 0;
      const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
      
      brandStats.push({
        id: brand.id,
        name: brand.name,
        color: brand.color,
        total,
        completed,
        percentage: percent
      });
    }

    // 3. Category stats
    const categories = await query.all(`
      SELECT category, COUNT(*) as count 
      FROM tasks 
      GROUP BY category
    `);

    // 4. Bottlenecks (urgent/high status: todo/in_progress)
    const bottlenecks = await query.all(`
      SELECT t.*, b.name as brand_name, b.color as brand_color, u.name as assignee_name
      FROM tasks t
      LEFT JOIN brands b ON t.brand_id = b.id
      LEFT JOIN users u ON t.assignee_id = u.id
      WHERE t.status IN ('todo', 'in_progress') AND t.priority IN ('high', 'urgent')
      ORDER BY t.priority DESC, t.due_date ASC
      LIMIT 10
    `);

    // 5. Recent completed tasks (last 10)
    const recentCompletions = await query.all(`
      SELECT t.*, b.name as brand_name, b.color as brand_color, u.name as assignee_name
      FROM tasks t
      LEFT JOIN brands b ON t.brand_id = b.id
      LEFT JOIN users u ON t.assignee_id = u.id
      WHERE t.status = 'done'
      ORDER BY t.completed_at DESC
      LIMIT 10
    `);

    res.json({
      overall: {
        total: overall.total || 0,
        completed: overall.completed || 0,
        todo: overall.todo || 0,
        in_progress: overall.in_progress || 0,
        in_review: overall.in_review || 0,
        percentage: overall.total > 0 ? Math.round(((overall.completed || 0) / overall.total) * 100) : 0
      },
      brandStats,
      categories,
      bottlenecks,
      recentCompletions
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve frontend build static files in production (optional, since Vite handles dev, but good for preview)
const distDir = path.join(__dirname, '../dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('*', (req, res, next) => {
    // If request starts with /api, forward to next (it will 404 if not found in routes)
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

// Start Server and database
async function start() {
  try {
    await initDb();
    app.listen(PORT, () => {
      console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    });
  } catch (err) {
    console.error('Error starting server:', err);
    process.exit(1);
  }
}

start();
