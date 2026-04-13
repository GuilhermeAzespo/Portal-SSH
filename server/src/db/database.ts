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
      // Sectors table
      db.run(`CREATE TABLE IF NOT EXISTS sectors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        description TEXT
      )`);

      // User-Sector junction table (Many-to-Many)
      db.run(`CREATE TABLE IF NOT EXISTS user_sectors (
        userId INTEGER,
        sectorId INTEGER,
        PRIMARY KEY (userId, sectorId),
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (sectorId) REFERENCES sectors(id) ON DELETE CASCADE
      )`);

      // Roles table
      db.run(`CREATE TABLE IF NOT EXISTS roles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        description TEXT,
        permissions TEXT NOT NULL -- Store as JSON array
      )`);

      // Default roles seeding and Migration
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
                console.log('Default roles created. Running migrations...');
                runMigrations();
              }
            });
          });
        } else {
          runMigrations();
        }
      });

      function runMigrations() {
        // Migration: Map old 'role' string to 'roleId'
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
      }

      // Users table
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

      // Default admin user
      db.get("SELECT COUNT(*) AS count FROM users WHERE username = 'admin'", (err, row: any) => {
        if (row && row.count === 0) {
          const defaultPassword = '$2b$10$mb6cDaqTdIJUtdc3R92PbeauKkak8kQbJIVAIKa2M1UplWn8nr9ca';
          db.run(`INSERT INTO users (username, password, role) VALUES ('admin', ?, 'admin')`, [defaultPassword]);
        }
      });

      // SQLite migrations (column additions)
      db.each("PRAGMA table_info(users)", (err, column: any) => {
        const columns = ['email', 'firstName', 'lastName', 'roleId'];
        if (columns.includes(column.name)) {
          columns.splice(columns.indexOf(column.name), 1);
        }
      });
      
      // We rely on CREATE TABLE IF NOT EXISTS and the runMigrations logic above.
    });
  }
});
