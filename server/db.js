import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

const dbPath = process.env.DATABASE_PATH || './data/seo_pm.db';

// Ensure data folder exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Open Database Connection
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Failed to connect to SQLite database:', err.message);
  } else {
    console.log(`Connected to SQLite database at: ${dbPath}`);
  }
});

// Convert SQLite callback patterns to elegant Promise wrappers
export const query = {
  run: (sql, params = []) => new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  }),
  
  get: (sql, params = []) => new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  }),
  
  all: (sql, params = []) => new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  }),
  
  exec: (sql) => new Promise((resolve, reject) => {
    db.exec(sql, (err) => {
      if (err) reject(err);
      else resolve();
    });
  })
};

export function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Initial Relational Database Schema Migrations
export async function initDb() {
  console.log('Preparing SEO PM Tool database schema...');
  
  // Table 1: users
  await query.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT CHECK(role IN ('lead', 'boss', 'member')) DEFAULT 'member',
      name TEXT NOT NULL
    )
  `);

  // Table 2: brands
  await query.run(`
    CREATE TABLE IF NOT EXISTS brands (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT NOT NULL,
      description TEXT
    )
  `);

  // Table 3: tasks
  await query.run(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      brand_id TEXT,
      status TEXT CHECK(status IN ('todo', 'in_progress', 'in_review', 'done')) DEFAULT 'todo',
      priority TEXT CHECK(priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
      category TEXT CHECK(category IN ('technical_seo', 'content_opt', 'link_building', 'web_dev', 'reporting', 'others')) DEFAULT 'others',
      assignee_id INTEGER,
      due_date TEXT,
      completed_at TEXT,
      created_at TEXT,
      updated_at TEXT,
      FOREIGN KEY(brand_id) REFERENCES brands(id) ON DELETE SET NULL,
      FOREIGN KEY(assignee_id) REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  // Table 4: task_links
  await query.run(`
    CREATE TABLE IF NOT EXISTS task_links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      type TEXT CHECK(type IN ('spreadsheet', 'drive', 'slide', 'document', 'figma', 'other')) DEFAULT 'other',
      created_at TEXT,
      FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE
    )
  `);

  // Seeding initial brands
  const initialBrands = [
    { id: 'ruangguru', name: 'Ruangguru', color: '#0f9488', description: 'Main Brand Ruangguru Website' },
    { id: 'ruangguru-privat', name: 'Ruangguru Privat', color: '#0284c7', description: 'Ruangguru Private Tutoring Service' },
    { id: 'app-ruangguru', name: 'App Ruangguru', color: '#e11d48', description: 'Ruangguru Mobile App Platform' },
    { id: 'brainacademy', name: 'Brain Academy', color: '#7c3aed', description: 'Brain Academy Tutoring Center' },
    { id: 'englishacademy', name: 'English Academy', color: '#d97706', description: 'English Academy Online Language Course' },
    { id: 'skillacademy', name: 'Skill Academy', color: '#db2777', description: 'Skill Academy Skills & Vocational Courses' }
  ];

  for (const brand of initialBrands) {
    const existing = await query.get('SELECT id FROM brands WHERE id = ?', [brand.id]);
    if (!existing) {
      await query.run(
        'INSERT INTO brands (id, name, color, description) VALUES (?, ?, ?, ?)',
        [brand.id, brand.name, brand.color, brand.description]
      );
    }
  }

  // Seeding default users
  const defaultUsers = [
    { username: 'admin', name: 'SEO & Web Lead', role: 'lead', password: 'admin' },
    { username: 'boss', name: 'Head of Growth (Boss)', role: 'boss', password: 'boss' },
    { username: 'writer', name: 'Content Writer (Staff)', role: 'member', password: 'writer' },
    { username: 'dev', name: 'Web Developer (Staff)', role: 'member', password: 'dev' }
  ];

  for (const user of defaultUsers) {
    const existing = await query.get('SELECT id FROM users WHERE username = ?', [user.username]);
    if (!existing) {
      const hashed = hashPassword(user.password);
      await query.run(
        'INSERT INTO users (username, password, role, name) VALUES (?, ?, ?, ?)',
        [user.username, hashed, user.role, user.name]
      );
    }
  }

  // Seeding some sample tasks for demo
  const taskCount = await query.get('SELECT COUNT(*) as count FROM tasks');
  if (taskCount.count === 0) {
    const adminUser = await query.get('SELECT id FROM users WHERE username = ?', ['admin']);
    const devUser = await query.get('SELECT id FROM users WHERE username = ?', ['dev']);
    const writerUser = await query.get('SELECT id FROM users WHERE username = ?', ['writer']);

    const now = new Date().toISOString();
    
    // Sample tasks
    const sampleTasks = [
      {
        title: 'Audit Core Web Vitals & PageSpeed ruangguru.com',
        description: 'Inspect LCP and CLS on the homepage and blog pages post new deployment.',
        brand_id: 'ruangguru',
        status: 'todo',
        priority: 'urgent',
        category: 'technical_seo',
        assignee_id: devUser.id,
        due_date: '2026-07-10',
        links: [
          { title: 'Speed Audit Report', url: 'https://docs.google.com/spreadsheets/d/1demo-sheet-cwv/edit', type: 'spreadsheet' }
        ]
      },
      {
        title: 'Revamp "Effective Learning Methods" article on Brain Academy',
        description: 'Update LSI keywords, insert internal links to related BA products, and optimize the meta description.',
        brand_id: 'brainacademy',
        status: 'in_progress',
        priority: 'medium',
        category: 'content_opt',
        assignee_id: writerUser.id,
        due_date: '2026-07-05',
        links: [
          { title: 'Article Draft (Google Doc)', url: 'https://docs.google.com/document/d/1demo-doc-revamp/edit', type: 'document' }
        ]
      },
      {
        title: 'Setup Tracking Redirects & Google Analytics for English Academy Promo',
        description: 'Implement GTM tags and setup custom event tracking for the summer camp promo campaign.',
        brand_id: 'englishacademy',
        status: 'done',
        priority: 'high',
        category: 'web_dev',
        assignee_id: adminUser.id,
        due_date: '2026-06-28',
        completed_at: '2026-06-27T10:00:00.000Z',
        links: [
          { title: 'Tracking Plan (Google Slides)', url: 'https://docs.google.com/presentation/d/1demo-slide-tracking/edit', type: 'slide' }
        ]
      }
    ];

    for (const t of sampleTasks) {
      const res = await query.run(
        `INSERT INTO tasks (title, description, brand_id, status, priority, category, assignee_id, due_date, completed_at, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [t.title, t.description, t.brand_id, t.status, t.priority, t.category, t.assignee_id, t.due_date, t.completed_at || null, now, now]
      );
      
      const taskId = res.lastID;
      if (t.links) {
        for (const link of t.links) {
          await query.run(
            `INSERT INTO task_links (task_id, title, url, type, created_at) VALUES (?, ?, ?, ?, ?)`,
            [taskId, link.title, link.url, link.type, now]
          );
        }
      }
    }
  }

  console.log('SEO PM Tool database schema is ready.');
}

export default db;
