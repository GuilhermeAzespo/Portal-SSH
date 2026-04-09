import sqlite3 from 'sqlite3';
import path from 'path';

const dbPath = path.resolve(__dirname, '../../db_data/database.sqlite');

export const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    
    // Create necessary tables
    db.serialize(() => {
      // Users table
      db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE,
        password TEXT NOT NULL,
        firstName TEXT,
        lastName TEXT,
        role TEXT NOT NULL DEFAULT 'user'
      )`);

      // SQLite migrations (safe failure if already exists)
      db.run(`ALTER TABLE users ADD COLUMN email TEXT`, () => {});
      db.run(`ALTER TABLE users ADD COLUMN firstName TEXT`, () => {});
      db.run(`ALTER TABLE users ADD COLUMN lastName TEXT`, () => {});

      // Hosts table
      db.run(`CREATE TABLE IF NOT EXISTS hosts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        host TEXT NOT NULL,
        port INTEGER DEFAULT 22,
        username TEXT NOT NULL,
        password TEXT,
        privateKey TEXT
      )`);
      
      // Default admin user if does not exist
      db.get("SELECT COUNT(*) AS count FROM users WHERE role = 'admin'", (err, row: any) => {
        if (row && row.count === 0) {
          // bcrypt hashed 'admin' for default password
          const defaultPassword = '$2b$10$mb6cDaqTdIJUtdc3R92PbeauKkak8kQbJIVAIKa2M1UplWn8nr9ca'; 
          db.run(`INSERT INTO users (username, password, role) VALUES ('admin', ?, 'admin')`, [defaultPassword], (err) => {
            if (err) console.error("Error creating default admin:", err.message);
            else console.log('Default admin created. (admin/admin)');
          });
        }
      });
    });
  }
});
