import express from 'express';
import { createServer as createViteServer } from 'vite';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database('pilltrack_v2.db');

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS drugs (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    dosage TEXT,
    amount TEXT,
    interval INTEGER DEFAULT 0,
    startDate TEXT NOT NULL,
    color TEXT,
    stock REAL DEFAULT 0,
    decrementPerDose REAL DEFAULT 1,
    lowStockThreshold REAL DEFAULT 5,
    lastStockUpdateDate TEXT
  );

  CREATE TABLE IF NOT EXISTS logs (
    drugId TEXT,
    takenAt TEXT,
    PRIMARY KEY (drugId, takenAt)
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

// Seed initial data if empty
const drugCount = db.prepare('SELECT COUNT(*) as count FROM drugs').get() as { count: number };
if (drugCount.count === 0) {
  const insertDrug = db.prepare(`
    INSERT INTO drugs (id, name, dosage, amount, interval, startDate, color, stock, decrementPerDose, lowStockThreshold, lastStockUpdateDate)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Default data as requested by user (based on their current app state)
  insertDrug.run('1', '激素药', '早饭后', '1粒', 2, '2026-03-05', 'bg-blue-500', 29, 1, 5, '2026-03-05');
  insertDrug.run('2', '羟氯喹', '早上', '1粒', 1, '2026-03-05', 'bg-rose-500', 56, 1, 10, '2026-03-05');
  insertDrug.run('3', '中药', '晚饭后', '1袋', 2, '2024-01-01', 'bg-emerald-500', 30, 1, 5, '2024-01-01');

  db.prepare("INSERT INTO settings (key, value) VALUES ('notificationsEnabled', 'false')").run();
  db.prepare("INSERT INTO settings (key, value) VALUES ('language', 'zh-cn')").run();
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // API Routes
  app.get('/api/data', (req, res) => {
    const drugs = db.prepare('SELECT * FROM drugs').all();
    const logs = db.prepare('SELECT * FROM logs').all();
    const settingsRows = db.prepare('SELECT * FROM settings').all() as { key: string, value: string }[];
    
    const settings = settingsRows.reduce((acc, row) => {
      acc[row.key] = row.value === 'true' ? true : row.value === 'false' ? false : row.value;
      return acc;
    }, {} as any);

    res.json({ drugs, logs, settings });
  });

  app.post('/api/drugs', (req, res) => {
    const drug = req.body;
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO drugs (id, name, dosage, amount, interval, startDate, color, stock, decrementPerDose, lowStockThreshold, lastStockUpdateDate)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      drug.id, 
      drug.name, 
      drug.dosage, 
      drug.amount, 
      drug.interval, 
      drug.startDate, 
      drug.color, 
      drug.stock, 
      drug.decrementPerDose, 
      drug.lowStockThreshold, 
      drug.lastStockUpdateDate
    );
    res.json({ success: true });
  });

  app.delete('/api/drugs/:id', (req, res) => {
    const { id } = req.params;
    db.prepare('DELETE FROM drugs WHERE id = ?').run(id);
    db.prepare('DELETE FROM logs WHERE drugId = ?').run(id);
    res.json({ success: true });
  });

  app.post('/api/logs/toggle', (req, res) => {
    const { drugId, takenAt } = req.body;
    const existing = db.prepare('SELECT * FROM logs WHERE drugId = ? AND takenAt = ?').get(drugId, takenAt);
    
    if (existing) {
      db.prepare('DELETE FROM logs WHERE drugId = ? AND takenAt = ?').run(drugId, takenAt);
    } else {
      db.prepare('INSERT INTO logs (drugId, takenAt) VALUES (?, ?)').run(drugId, takenAt);
    }
    res.json({ success: true });
  });

  app.post('/api/settings', (req, res) => {
    const { key, value } = req.body;
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, String(value));
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
