import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = path.resolve(__dirname, '../../db_data/database.sqlite');
const dbDir = path.dirname(dbPath);

// Ensure directory exists
if (!fs.existsSync(dbDir)) {
  console.log('[Database] Creating directory:', dbDir);
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    
    // Create necessary tables
    db.serialize(() => {
      // 1. Roles table
      db.run(`CREATE TABLE IF NOT EXISTS roles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        description TEXT,
        permissions TEXT NOT NULL -- Store as JSON array
      )`);

      // 2. Sectors table
      db.run(`CREATE TABLE IF NOT EXISTS sectors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        description TEXT
      )`);

      // 3. Users table
      db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE,
        password TEXT NOT NULL,
        firstName TEXT,
        lastName TEXT,
        role TEXT NOT NULL DEFAULT 'user',
        roleId INTEGER,
        FOREIGN KEY (roleId) REFERENCES roles(id)
      )`);

      // 4. User-Sector junction table
      db.run(`CREATE TABLE IF NOT EXISTS user_sectors (
        userId INTEGER,
        sectorId INTEGER,
        PRIMARY KEY (userId, sectorId),
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (sectorId) REFERENCES sectors(id) ON DELETE CASCADE
      )`);

      // Seed Roles & Run Migrations
      db.get("SELECT COUNT(*) AS count FROM roles", (err, row: any) => {
        if (row && row.count === 0) {
          const defaultRoles = [
            { name: 'Administrador', description: 'Acesso total ao sistema', permissions: JSON.stringify(['dashboard.view', 'users.view', 'users.manage', 'hosts.view', 'hosts.manage', 'terminal.access', 'permissions.manage', 'settings.view']) },
            { name: 'Operador', description: 'Pode gerenciar hosts e acessar o terminal', permissions: JSON.stringify(['dashboard.view', 'hosts.view', 'hosts.manage', 'terminal.access', 'settings.view']) },
            { name: 'Visualizador', description: 'Acesso apenas para visualização', permissions: JSON.stringify(['dashboard.view', 'hosts.view', 'settings.view']) }
          ];
          const stmt = db.prepare(`INSERT INTO roles (name, description, permissions) VALUES (?, ?, ?)`);
          
          let completed = 0;
          defaultRoles.forEach(r => {
            stmt.run(r.name, r.description, r.permissions, () => {
              completed++;
              if (completed === defaultRoles.length) {
                stmt.finalize();
                console.log('Default roles created. Seeding users...');
                seedUsersAndMigrate();
              }
            });
          });
        } else {
          seedUsersAndMigrate();
        }
      });

      function seedUsersAndMigrate() {
        // Default admin user
        db.get("SELECT COUNT(*) AS count FROM users WHERE username = 'admin'", (err, row: any) => {
          const defaultPassword = '$2b$10$mb6cDaqTdIJUtdc3R92PbeauKkak8kQbJIVAIKa2M1UplWn8nr9ca';
          if (row && row.count === 0) {
            db.run(`INSERT INTO users (username, password, role) VALUES ('admin', ?, 'admin')`, [defaultPassword], (err) => {
              if (!err) {
                console.log('Admin user created. Applying migrations...');
                applyMigrations();
              }
            });
          } else {
            applyMigrations();
          }
        });
      }

      function applyMigrations() {
        // Migration: Map old 'role' string and roleName to 'roleId'
        db.get("SELECT id FROM roles WHERE name = 'Administrador'", (err, role: any) => {
          if (role) {
            db.run(`UPDATE users SET roleId = ? WHERE (role = 'admin' OR role = 'Administrador') AND roleId IS NULL`, [role.id]);
          }
        });

        db.get("SELECT id FROM roles WHERE name = 'Visualizador'", (err, role: any) => {
          if (role) {
            db.run(`UPDATE users SET roleId = ? WHERE (role = 'user' OR role = 'Visualizador') AND roleId IS NULL`, [role.id]);
          }
        });
        console.log('Migrations completed successfully.');
      }
    });
  }
});
